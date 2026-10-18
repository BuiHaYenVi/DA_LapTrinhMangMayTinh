package com.discordmini.server.dao;

import com.discordmini.server.model.Room;
import com.discordmini.server.model.User;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * [HAI-04] Room DAO: Quản lý phòng chat và thành viên phòng.
 * Sử dụng PreparedStatement và try-with-resources để phòng tránh rò rỉ kết nối.
 */
public class RoomDAO {
    private static volatile boolean schemaChecked = false;

    public RoomDAO() {
        if (!schemaChecked) {
            synchronized (RoomDAO.class) {
                if (!schemaChecked) {
                    try (Connection conn = DatabaseConnection.getConnection()) {
                        if (conn != null) {
                            ensureRoomColumnsExist(conn);
                            schemaChecked = true;
                        }
                    } catch (Exception ignored) {}
                }
            }
        }
    }

    /**
     * Đảm bảo các cột mở rộng (description, invite_code, is_private) luôn tồn tại trong bảng rooms.
     */
    public static void ensureRoomColumnsExist(Connection conn) {
        if (conn == null) return;
        try (Statement st = conn.createStatement()) {
            st.executeUpdate("ALTER TABLE rooms ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''");
            st.executeUpdate("ALTER TABLE rooms ADD COLUMN IF NOT EXISTS invite_code VARCHAR(20) DEFAULT ''");
            st.executeUpdate("ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE");
            st.executeUpdate("UPDATE rooms SET is_private = TRUE WHERE created_by IS NOT NULL AND created_by > 0 AND LOWER(name) NOT IN ('general', 'gaming', 'study')");
        } catch (Exception e) {
            System.err.println("[RoomDAO] Kiểm tra cột bảng rooms: " + e.getMessage());
        }
    }

    /**
     * Tạo một phòng chat mới kèm kênh mặc định 'chung' và quyền OWNER.
     * Cả 3 thao tác được thực hiện nhất quán trong một Transaction duy nhất.
     */
    public Room createRoom(String roomName, int createdBy) {
        if (roomName == null || roomName.isBlank()) return null;
        String trimmedName = roomName.trim();
        if (trimmedName.length() > 50) return null;
        if (findRoomByName(trimmedName) != null) return null;

        boolean isPrivateRoom = createdBy > 0;
        String insertRoomSql = "INSERT INTO rooms (name, created_by, is_private) VALUES (?, ?, ?) RETURNING id, created_at";
        String insertMemberSql = "INSERT INTO room_members (room_id, user_id, role) VALUES (?, ?, ?) ON CONFLICT (room_id, user_id) DO UPDATE SET role = EXCLUDED.role";
        String insertChannelSql = "INSERT INTO channels (room_id, name) VALUES (?, ?) ON CONFLICT (room_id, name) DO NOTHING";

        Connection conn = null;
        try {
            conn = DatabaseConnection.getConnection();
            if (conn == null) return null;
            conn.setAutoCommit(false);

            int roomId = -1;
            Timestamp createdAt = null;

            // 1. Tạo phòng trong bảng rooms
            try (PreparedStatement psRoom = conn.prepareStatement(insertRoomSql)) {
                psRoom.setString(1, trimmedName);
                if (createdBy > 0) {
                    psRoom.setInt(2, createdBy);
                } else {
                    psRoom.setNull(2, Types.INTEGER);
                }
                psRoom.setBoolean(3, isPrivateRoom);
                try (ResultSet rs = psRoom.executeQuery()) {
                    if (rs.next()) {
                        roomId = rs.getInt("id");
                        createdAt = rs.getTimestamp("created_at");
                    }
                }
            }

            if (roomId <= 0) {
                conn.rollback();
                return null;
            }

            // 2. Thêm người tạo với quyền OWNER
            if (createdBy > 0) {
                try (PreparedStatement psMember = conn.prepareStatement(insertMemberSql)) {
                    psMember.setInt(1, roomId);
                    psMember.setInt(2, createdBy);
                    psMember.setString(3, "OWNER");
                    psMember.executeUpdate();
                }
            }

            // 3. Tạo kênh chữ mặc định 'chung' trong transaction
            try (PreparedStatement psChannel = conn.prepareStatement(insertChannelSql)) {
                psChannel.setInt(1, roomId);
                psChannel.setString(2, "chung");
                psChannel.executeUpdate();
            }

            // Commit thành công toàn bộ transaction
            conn.commit();

            Room room = new Room(roomId, trimmedName, createdBy, createdAt);
            room.setUserRole("OWNER");
            room.setPrivate(isPrivateRoom);
            if (createdBy > 0) {
                room.getMemberIds().add(createdBy);
            }
            return room;

        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi tạo phòng kèm kênh mặc định '" + roomName + "': " + e.getMessage());
            if (conn != null) {
                try {
                    conn.rollback();
                } catch (SQLException ex) {
                    System.err.println("[RoomDAO ERROR] Rollback thất bại: " + ex.getMessage());
                }
            }
        } finally {
            if (conn != null) {
                try {
                    conn.setAutoCommit(true);
                    conn.close();
                } catch (SQLException ignored) {}
            }
        }
        return null;
    }

    /**
     * Thêm một thành viên vào phòng chat với vai trò chỉ định ('MEMBER' hoặc 'OWNER').
     */
    public boolean addMember(int roomId, int userId, String role) {
        String r = (role != null && !role.isBlank()) ? role.trim().toUpperCase() : "MEMBER";
        String sql = "INSERT INTO room_members (room_id, user_id, role) VALUES (?, ?, ?) " +
                     "ON CONFLICT (room_id, user_id) DO UPDATE SET role = CASE WHEN room_members.role = 'OWNER' THEN 'OWNER' ELSE EXCLUDED.role END";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, roomId);
            ps.setInt(2, userId);
            ps.setString(3, r);
            int rows = ps.executeUpdate();
            return rows > 0;
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi thêm user (ID=" + userId + ", role=" + r + ") vào room (ID=" + roomId + "): " + e.getMessage());
            return false;
        }
    }

    /**
     * Thêm một thành viên vào phòng chat (mặc định role MEMBER).
     */
    public boolean addMember(int roomId, int userId) {
        return addMember(roomId, userId, "MEMBER");
    }

    /**
     * Kiểm tra xem một người dùng có phải là Trưởng nhóm (OWNER) của phòng không.
     */
    public boolean isRoomOwner(int roomId, int userId) {
        String sql = "SELECT role FROM room_members WHERE room_id = ? AND user_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, roomId);
            ps.setInt(2, userId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return "OWNER".equalsIgnoreCase(rs.getString("role"));
                }
            }
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi isRoomOwner (roomID=" + roomId + ", userID=" + userId + "): " + e.getMessage());
        }
        return false;
    }

    /**
     * Lấy vai trò của người dùng trong phòng ('OWNER', 'MEMBER', hoặc null nếu không thuộc phòng).
     */
    public String getMemberRole(int roomId, int userId) {
        String sql = "SELECT role FROM room_members WHERE room_id = ? AND user_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, roomId);
            ps.setInt(2, userId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getString("role");
                }
            }
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi getMemberRole: " + e.getMessage());
        }
        return null;
    }

    /**
     * Alias method joinRoom cho tương thích ngược.
     */
    public void joinRoom(int roomId, int userId) throws SQLException {
        addMember(roomId, userId);
    }

    /**
     * Xóa một thành viên ra khỏi phòng chat.
     */
    public boolean removeMember(int roomId, int userId) {
        String sql = "DELETE FROM room_members WHERE room_id = ? AND user_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, roomId);
            ps.setInt(2, userId);
            int rows = ps.executeUpdate();
            return rows > 0;
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi xóa user (ID=" + userId + ") khỏi room (ID=" + roomId + "): " + e.getMessage());
            return false;
        }
    }

    /**
     * Lấy danh sách tất cả phòng mà người dùng đã tham gia.
     */
    public List<Room> getJoinedRooms(int userId) {
        List<Room> list = new ArrayList<>();
        String sql = "SELECT r.id, r.name, r.created_by, r.created_at, r.description, r.invite_code, rm.role " +
                     "FROM rooms r JOIN room_members rm ON r.id = rm.room_id " +
                     "WHERE rm.user_id = ? ORDER BY r.id ASC";

        try (Connection conn = DatabaseConnection.getConnection()) {
            if (conn == null) return list;
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setInt(1, userId);
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        Room r = new Room(
                            rs.getInt("id"),
                            rs.getString("name"),
                            rs.getInt("created_by"),
                            rs.getTimestamp("created_at")
                        );
                        try {
                            r.setDescription(rs.getString("description"));
                            r.setInviteCode(rs.getString("invite_code"));
                            String role = rs.getString("role");
                            r.setUserRole(role != null ? role : (r.getCreatedBy() == userId ? "OWNER" : "MEMBER"));
                        } catch (Exception ignored) {}
                        list.add(r);
                    }
                }
                loadMemberIdsBatch(conn, list);
            } catch (SQLException e) {
                if (e.getMessage() != null && (e.getMessage().toLowerCase().contains("description") || e.getMessage().toLowerCase().contains("invite_code"))) {
                    ensureRoomColumnsExist(conn);
                    String fallbackSql = "SELECT r.id, r.name, r.created_by, r.created_at, rm.role " +
                                         "FROM rooms r JOIN room_members rm ON r.id = rm.room_id " +
                                         "WHERE rm.user_id = ? ORDER BY r.id ASC";
                    try (PreparedStatement ps = conn.prepareStatement(fallbackSql)) {
                        ps.setInt(1, userId);
                        try (ResultSet rs = ps.executeQuery()) {
                            while (rs.next()) {
                                Room r = new Room(
                                    rs.getInt("id"),
                                    rs.getString("name"),
                                    rs.getInt("created_by"),
                                    rs.getTimestamp("created_at")
                                );
                                String role = rs.getString("role");
                                r.setUserRole(role != null ? role : (r.getCreatedBy() == userId ? "OWNER" : "MEMBER"));
                                list.add(r);
                            }
                            loadMemberIdsBatch(conn, list);
                            return list;
                        }
                    } catch (SQLException ignored) {}
                }
                System.err.println("[RoomDAO ERROR] Lỗi getJoinedRooms (userID=" + userId + "): " + e.getMessage());
            }
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi kết nối getJoinedRooms: " + e.getMessage());
        }
        return list;
    }

    /**
     * Lấy danh sách tất cả thành viên (đối tượng User kèm role trong phòng) trong một phòng chat.
     */
    public List<User> getRoomMembers(int roomId) {
        List<User> members = new ArrayList<>();
        String sql = "SELECT u.id, u.username, u.password, u.display_name, u.status, u.created_at, rm.role " +
                     "FROM users u JOIN room_members rm ON u.id = rm.user_id " +
                     "WHERE rm.room_id = ? ORDER BY u.id ASC";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, roomId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    User u = new User(
                        rs.getInt("id"),
                        rs.getString("username"),
                        rs.getString("password"),
                        rs.getString("display_name"),
                        rs.getString("status"),
                        rs.getTimestamp("created_at")
                    );
                    String role = rs.getString("role");
                    u.setRole(role != null ? role : "MEMBER");
                    members.add(u);
                }
            }
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi getRoomMembers (roomID=" + roomId + "): " + e.getMessage());
        }
        return members;
    }

    /**
     * Lấy danh sách phòng mà người dùng có quyền truy cập (bao gồm phòng public và phòng người dùng là thành viên).
     */
    public List<Room> listRoomsForUser(int userId) {
        List<Room> list = new ArrayList<>();
        String sql = "SELECT r.id, r.name, r.created_by, r.created_at, r.description, r.invite_code, r.is_private, rm.role " +
                     "FROM rooms r " +
                     "LEFT JOIN room_members rm ON r.id = rm.room_id AND rm.user_id = ? " +
                     "WHERE r.is_private = false OR rm.user_id IS NOT NULL " +
                     "ORDER BY r.id ASC";
        try (Connection conn = DatabaseConnection.getConnection()) {
            if (conn == null) return list;
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setInt(1, userId);
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        Room r = new Room(
                            rs.getInt("id"),
                            rs.getString("name"),
                            rs.getInt("created_by"),
                            rs.getTimestamp("created_at")
                        );
                        try {
                            r.setDescription(rs.getString("description"));
                            r.setInviteCode(rs.getString("invite_code"));
                            r.setPrivate(rs.getBoolean("is_private"));
                            String role = rs.getString("role");
                            r.setUserRole(role != null ? role : (r.getCreatedBy() == userId ? "OWNER" : "MEMBER"));
                        } catch (Exception ignored) {}
                        list.add(r);
                    }
                }
                loadMemberIdsBatch(conn, list);
            } catch (SQLException e) {
                if (e.getMessage() != null && (e.getMessage().toLowerCase().contains("description") || e.getMessage().toLowerCase().contains("invite_code") || e.getMessage().toLowerCase().contains("is_private"))) {
                    ensureRoomColumnsExist(conn);
                    String fallbackSql = "SELECT r.id, r.name, r.created_by, r.created_at, rm.role " +
                                         "FROM rooms r " +
                                         "LEFT JOIN room_members rm ON r.id = rm.room_id AND rm.user_id = ? " +
                                         "WHERE LOWER(r.name) IN ('general', 'gaming', 'study') OR rm.user_id IS NOT NULL " +
                                         "ORDER BY r.id ASC";
                    try (PreparedStatement ps = conn.prepareStatement(fallbackSql)) {
                        ps.setInt(1, userId);
                        try (ResultSet rs = ps.executeQuery()) {
                            while (rs.next()) {
                                Room r = new Room(
                                    rs.getInt("id"),
                                    rs.getString("name"),
                                    rs.getInt("created_by"),
                                    rs.getTimestamp("created_at")
                                );
                                String role = rs.getString("role");
                                r.setUserRole(role != null ? role : (r.getCreatedBy() == userId ? "OWNER" : "MEMBER"));
                                list.add(r);
                            }
                            loadMemberIdsBatch(conn, list);
                            return list;
                        }
                    } catch (SQLException ignored) {}
                }
                System.err.println("[RoomDAO ERROR] Lỗi listRoomsForUser (userID=" + userId + "): " + e.getMessage());
            }
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi kết nối listRoomsForUser: " + e.getMessage());
        }
        return list;
    }

    /**
     * Lấy tất cả các phòng chat hiện có trong hệ thống.
     */
    public List<Room> listRooms() {
        List<Room> list = new ArrayList<>();
        String sql = "SELECT id, name, created_by, created_at, description, invite_code, is_private FROM rooms ORDER BY id ASC";
        try (Connection conn = DatabaseConnection.getConnection()) {
            if (conn == null) return list;
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery(sql)) {

                while (rs.next()) {
                    Room r = new Room(
                        rs.getInt("id"),
                        rs.getString("name"),
                        rs.getInt("created_by"),
                        rs.getTimestamp("created_at")
                    );
                    try {
                        r.setDescription(rs.getString("description"));
                        r.setInviteCode(rs.getString("invite_code"));
                        r.setPrivate(rs.getBoolean("is_private"));
                    } catch (Exception ignored) {}
                    loadMemberIds(conn, r);
                    list.add(r);
                }
            } catch (SQLException e) {
                if (e.getMessage() != null && (e.getMessage().toLowerCase().contains("description") || e.getMessage().toLowerCase().contains("invite_code") || e.getMessage().toLowerCase().contains("is_private"))) {
                    ensureRoomColumnsExist(conn);
                    String fallbackSql = "SELECT id, name, created_by, created_at FROM rooms ORDER BY id ASC";
                    try (Statement stmt = conn.createStatement();
                         ResultSet rs = stmt.executeQuery(fallbackSql)) {
                        while (rs.next()) {
                            Room r = new Room(
                                rs.getInt("id"),
                                rs.getString("name"),
                                rs.getInt("created_by"),
                                rs.getTimestamp("created_at")
                            );
                            loadMemberIds(conn, r);
                            list.add(r);
                        }
                        return list;
                    } catch (SQLException ignored) {}
                }
                System.err.println("[RoomDAO ERROR] Lỗi listRooms: " + e.getMessage());
            }
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi kết nối listRooms: " + e.getMessage());
        }
        return list;
    }

    /**
     * Tìm thông tin chi tiết phòng theo ID.
     */
    public Room findRoom(int id) {
        String sql = "SELECT id, name, created_by, created_at, description, invite_code, is_private FROM rooms WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection()) {
            if (conn == null) return null;
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setInt(1, id);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        Room r = new Room(
                            rs.getInt("id"),
                            rs.getString("name"),
                            rs.getInt("created_by"),
                            rs.getTimestamp("created_at")
                        );
                        try {
                            r.setDescription(rs.getString("description"));
                            r.setInviteCode(rs.getString("invite_code"));
                            r.setPrivate(rs.getBoolean("is_private"));
                        } catch (Exception ignored) {}
                        loadMemberIds(conn, r);
                        return r;
                    }
                }
            } catch (SQLException e) {
                if (e.getMessage() != null && (e.getMessage().toLowerCase().contains("description") || e.getMessage().toLowerCase().contains("invite_code") || e.getMessage().toLowerCase().contains("is_private"))) {
                    ensureRoomColumnsExist(conn);
                    String fallbackSql = "SELECT id, name, created_by, created_at FROM rooms WHERE id = ?";
                    try (PreparedStatement ps = conn.prepareStatement(fallbackSql)) {
                        ps.setInt(1, id);
                        try (ResultSet rs = ps.executeQuery()) {
                            if (rs.next()) {
                                Room r = new Room(
                                    rs.getInt("id"),
                                    rs.getString("name"),
                                    rs.getInt("created_by"),
                                    rs.getTimestamp("created_at")
                                );
                                loadMemberIds(conn, r);
                                return r;
                            }
                        }
                    } catch (SQLException ignored) {}
                }
                System.err.println("[RoomDAO ERROR] Lỗi findRoom (ID=" + id + "): " + e.getMessage());
            }
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi kết nối findRoom: " + e.getMessage());
        }
        return null;
    }

    /**
     * Tìm thông tin phòng theo tên phòng.
     */
    public Room findRoomByName(String name) {
        if (name == null || name.isBlank()) return null;
        String sql = "SELECT id, name, created_by, created_at, description, invite_code, is_private FROM rooms WHERE LOWER(name) = LOWER(?)";
        try (Connection conn = DatabaseConnection.getConnection()) {
            if (conn == null) return null;
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, name.trim());
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        Room r = new Room(
                            rs.getInt("id"),
                            rs.getString("name"),
                            rs.getInt("created_by"),
                            rs.getTimestamp("created_at")
                        );
                        try {
                            r.setDescription(rs.getString("description"));
                            r.setInviteCode(rs.getString("invite_code"));
                            r.setPrivate(rs.getBoolean("is_private"));
                        } catch (Exception ignored) {}
                        loadMemberIds(conn, r);
                        return r;
                    }
                }
            } catch (SQLException e) {
                if (e.getMessage() != null && (e.getMessage().toLowerCase().contains("description") || e.getMessage().toLowerCase().contains("invite_code"))) {
                    ensureRoomColumnsExist(conn);
                    String fallbackSql = "SELECT id, name, created_by, created_at FROM rooms WHERE LOWER(name) = LOWER(?)";
                    try (PreparedStatement ps = conn.prepareStatement(fallbackSql)) {
                        ps.setString(1, name.trim());
                        try (ResultSet rs = ps.executeQuery()) {
                            if (rs.next()) {
                                Room r = new Room(
                                    rs.getInt("id"),
                                    rs.getString("name"),
                                    rs.getInt("created_by"),
                                    rs.getTimestamp("created_at")
                                );
                                loadMemberIds(conn, r);
                                return r;
                            }
                        }
                    } catch (SQLException ignored) {}
                }
                System.err.println("[RoomDAO ERROR] Lỗi findRoomByName: " + e.getMessage());
            }
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi kết nối findRoomByName: " + e.getMessage());
        }
        return null;
    }

    /**
     * Nạp tập hợp ID thành viên của phòng vào đối tượng Room.
     */
    private void loadMemberIds(Connection conn, Room room) {
        String sql = "SELECT user_id FROM room_members WHERE room_id = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, room.getId());
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    room.getMemberIds().add(rs.getInt("user_id"));
                }
            }
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi loadMemberIds (roomID=" + room.getId() + "): " + e.getMessage());
        }
    }

    /**
     * Nạp tập hợp ID thành viên cho danh sách nhiều phòng chỉ trong 1 truy vấn SQL.
     */
    private void loadMemberIdsBatch(Connection conn, List<Room> rooms) {
        if (rooms == null || rooms.isEmpty()) return;
        java.util.Map<Integer, Room> map = new java.util.HashMap<>();
        StringBuilder sb = new StringBuilder("SELECT room_id, user_id FROM room_members WHERE room_id IN (");
        for (int i = 0; i < rooms.size(); i++) {
            Room r = rooms.get(i);
            map.put(r.getId(), r);
            if (i > 0) sb.append(',');
            sb.append(r.getId());
        }
        sb.append(')');
        try (Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery(sb.toString())) {
            while (rs.next()) {
                Room r = map.get(rs.getInt("room_id"));
                if (r != null) {
                    r.getMemberIds().add(rs.getInt("user_id"));
                }
            }
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi loadMemberIdsBatch: " + e.getMessage());
        }
    }

    /**
     * [GIAI ĐOẠN 2] Đổi tên phòng chat.
     */
    public boolean renameRoom(int roomId, String newName) {
        if (newName == null || newName.isBlank()) return false;
        String sql = "UPDATE rooms SET name = ? WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, newName.trim());
            ps.setInt(2, roomId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi renameRoom: " + e.getMessage());
            return false;
        }
    }

    /**
     * [GIAI ĐOẠN 2] Xóa toàn bộ phòng chat (Các tin nhắn và thành viên tự xóa do cascade).
     */
    public boolean deleteRoom(int roomId) {
        String sql = "DELETE FROM rooms WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, roomId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi deleteRoom: " + e.getMessage());
            return false;
        }
    }

    /**
     * [GIAI ĐOẠN 2] Cập nhật mô tả phòng chat.
     */
    public boolean updateDescription(int roomId, String description) {
        String sql = "UPDATE rooms SET description = ? WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, description != null ? description.trim() : "");
            ps.setInt(2, roomId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi updateDescription: " + e.getMessage());
            return false;
        }
    }

    /**
     * [GIAI ĐOẠN 2] Chuyển giao quyền Chủ phòng (Owner) cho thành viên khác.
     */
    public boolean transferOwnership(int roomId, int oldOwnerId, int newOwnerId) {
        Connection conn = null;
        try {
            conn = DatabaseConnection.getConnection();
            conn.setAutoCommit(false);

            // 1. Hạ vai trò của chủ cũ xuống ADMIN
            String demoteSql = "UPDATE room_members SET role = 'ADMIN' WHERE room_id = ? AND user_id = ?";
            try (PreparedStatement ps1 = conn.prepareStatement(demoteSql)) {
                ps1.setInt(1, roomId);
                ps1.setInt(2, oldOwnerId);
                ps1.executeUpdate();
            }

            // 2. Nâng vai trò của chủ mới lên OWNER
            String promoteSql = "UPDATE room_members SET role = 'OWNER' WHERE room_id = ? AND user_id = ?";
            try (PreparedStatement ps2 = conn.prepareStatement(promoteSql)) {
                ps2.setInt(1, roomId);
                ps2.setInt(2, newOwnerId);
                ps2.executeUpdate();
            }

            // 3. Cập nhật created_by của bảng rooms
            String updateRoomSql = "UPDATE rooms SET created_by = ? WHERE id = ?";
            try (PreparedStatement ps3 = conn.prepareStatement(updateRoomSql)) {
                ps3.setInt(1, newOwnerId);
                ps3.setInt(2, roomId);
                ps3.executeUpdate();
            }

            conn.commit();
            return true;
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi transferOwnership: " + e.getMessage());
            if (conn != null) {
                try { conn.rollback(); } catch (SQLException ignored) {}
            }
            return false;
        } finally {
            if (conn != null) {
                try { conn.setAutoCommit(true); conn.close(); } catch (SQLException ignored) {}
            }
        }
    }

    /**
     * [GIAI ĐOẠN 2] Cập nhật vai trò thành viên ('OWNER', 'ADMIN', 'MEMBER').
     */
    public boolean setMemberRole(int roomId, int userId, String role) {
        String sql = "UPDATE room_members SET role = ? WHERE room_id = ? AND user_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, role != null ? role.toUpperCase() : "MEMBER");
            ps.setInt(2, roomId);
            ps.setInt(3, userId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi setMemberRole: " + e.getMessage());
            return false;
        }
    }
}
