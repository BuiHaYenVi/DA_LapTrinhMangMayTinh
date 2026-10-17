package com.discordmini.server.dao;

import com.discordmini.server.model.Room;
import com.discordmini.server.model.User;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * [HAI-04] Room DAO: Quản lý phòng chat / kênh (channel_id = room_id) và thành viên phòng.
 * Sử dụng PreparedStatement và try-with-resources để phòng tránh rò rỉ kết nối.
 */
public class RoomDAO {

    private Room mapRoom(ResultSet rs) throws SQLException {
        Room r = new Room(
            rs.getInt("id"),
            rs.getString("name"),
            rs.getInt("created_by"),
            rs.getTimestamp("created_at")
        );
        try {
            int guildId = rs.getInt("guild_id");
            if (!rs.wasNull() && guildId > 0) {
                r.setGuildId(guildId);
            }
        } catch (SQLException ignored) {
        }
        try {
            String channelType = rs.getString("channel_type");
            if (channelType != null && !channelType.isBlank()) {
                r.setChannelType(channelType);
            }
        } catch (SQLException ignored) {
        }
        try {
            r.setPosition(rs.getInt("position"));
        } catch (SQLException ignored) {
        }
        try {
            String topic = rs.getString("topic");
            r.setTopic(topic != null ? topic : "");
        } catch (SQLException ignored) {
        }
        try {
            r.setUnreadCount(rs.getInt("unread_count"));
        } catch (SQLException ignored) {
        }
        return r;
    }

    /**
     * Tạo một phòng chat mới (mặc định thuộc guildId = 1, channelType = 'text').
     * Tự động thêm người tạo phòng vào danh sách thành viên của phòng đó.
     */
    public Room createRoom(String roomName, int createdBy) {
        return createChannel(1, roomName, "text", "", 0, createdBy);
    }

    /**
     * Tạo một kênh (text hoặc voice) trong một Guild.
     */
    public Room createChannel(int guildId, String name, String channelType, String topic, int position, int createdBy) {
        if (name == null || name.isBlank()) return null;

        int targetGuildId = guildId > 0 ? guildId : 1;
        String cleanType = (channelType != null && "voice".equalsIgnoreCase(channelType.trim())) ? "voice" : "text";
        String cleanTopic = topic != null ? topic.trim() : "";

        String insertSql = "INSERT INTO rooms (name, created_by, is_private, guild_id, channel_type, position, topic) " +
                           "VALUES (?, ?, false, ?, ?, ?, ?) RETURNING id, created_at";

        try (Connection conn = DatabaseConnection.getConnection()) {
            try (PreparedStatement ps = conn.prepareStatement(insertSql)) {
                ps.setString(1, name.trim());
                if (createdBy > 0) {
                    ps.setInt(2, createdBy);
                } else {
                    ps.setNull(2, Types.INTEGER);
                }
                ps.setInt(3, targetGuildId);
                ps.setString(4, cleanType);
                ps.setInt(5, position);
                ps.setString(6, cleanTopic);

                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        int roomId = rs.getInt("id");
                        Timestamp createdAt = rs.getTimestamp("created_at");
                        Room room = new Room(roomId, name.trim(), createdBy, createdAt,
                                targetGuildId, cleanType, position, cleanTopic);

                        if (createdBy > 0) {
                            addMember(roomId, createdBy, "OWNER");
                            room.getMemberIds().add(createdBy);
                        }
                        // Thêm các thành viên hiện tại của guild vào kênh mới
                        try (PreparedStatement gmPs = conn.prepareStatement(
                                "INSERT INTO room_members (room_id, user_id, role) " +
                                "SELECT ?, gm.user_id, gm.role FROM guild_members gm WHERE gm.guild_id = ? " +
                                "ON CONFLICT (room_id, user_id) DO NOTHING")) {
                            gmPs.setInt(1, roomId);
                            gmPs.setInt(2, targetGuildId);
                            gmPs.executeUpdate();
                        } catch (SQLException ignored) {
                        }
                        loadMemberIds(conn, room);
                        return room;
                    }
                }
            } catch (SQLException fallbackEx) {
                // Fallback khi schema chưa chạy V003
                String fallbackSql = "INSERT INTO rooms (name, created_by) VALUES (?, ?) RETURNING id, created_at";
                try (PreparedStatement ps2 = conn.prepareStatement(fallbackSql)) {
                    ps2.setString(1, name.trim());
                    if (createdBy > 0) {
                        ps2.setInt(2, createdBy);
                    } else {
                        ps2.setNull(2, Types.INTEGER);
                    }
                    try (ResultSet rs = ps2.executeQuery()) {
                        if (rs.next()) {
                            int roomId = rs.getInt("id");
                            Timestamp createdAt = rs.getTimestamp("created_at");
                            Room room = new Room(roomId, name.trim(), createdBy, createdAt,
                                    targetGuildId, cleanType, position, cleanTopic);
                            if (createdBy > 0) {
                                addMember(roomId, createdBy, "OWNER");
                                room.getMemberIds().add(createdBy);
                            }
                            return room;
                        }
                    }
                }
            }
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi tạo kênh '" + name + "': " + e.getMessage());
        }
        return null;
    }

    /**
     * Lấy danh sách tất cả kênh thuộc một Guild kèm số tin nhắn chưa đọc (unread_count) của userId.
     */
    public List<Room> listChannelsByGuild(int guildId, int userId) {
        List<Room> list = new ArrayList<>();
        String sql = "SELECT r.id, r.name, r.created_by, r.created_at, " +
                     "COALESCE(r.guild_id, 1) AS guild_id, " +
                     "COALESCE(r.channel_type, 'text') AS channel_type, " +
                     "COALESCE(r.position, 0) AS position, " +
                     "COALESCE(r.topic, '') AS topic, " +
                     "CASE WHEN ? > 0 AND COALESCE(r.channel_type, 'text') = 'text' THEN (" +
                     "    SELECT COUNT(*)::int FROM messages m " +
                     "    WHERE m.room_id = r.id AND m.deleted_at IS NULL " +
                     "      AND m.id > COALESCE(urr.last_read_message_id, 0)" +
                     ") ELSE 0 END AS unread_count " +
                     "FROM rooms r " +
                     "LEFT JOIN user_room_reads urr ON urr.room_id = r.id AND urr.user_id = ? " +
                     "WHERE COALESCE(r.guild_id, 1) = ? " +
                     "ORDER BY COALESCE(r.position, 0) ASC, r.id ASC";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, userId);
            ps.setInt(2, userId);
            ps.setInt(3, guildId);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Room r = mapRoom(rs);
                    loadMemberIds(conn, r);
                    list.add(r);
                }
            }
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi listChannelsByGuild (guildId=" + guildId + "): " + e.getMessage());
            if (guildId == 1) {
                return listRooms();
            }
        }
        return list;
    }

    /**
     * Cập nhật vai trò ('OWNER', 'ADMIN', 'MEMBER') của một thành viên trong phòng / kênh.
     */
    public boolean updateMemberRole(int roomId, int userId, String role) {
        String r = (role != null && !role.isBlank()) ? role.trim().toUpperCase() : "MEMBER";
        if (!"OWNER".equals(r) && !"ADMIN".equals(r) && !"MEMBER".equals(r)) {
            r = "MEMBER";
        }
        String sql = "INSERT INTO room_members (room_id, user_id, role) VALUES (?, ?, ?) " +
                     "ON CONFLICT (room_id, user_id) DO UPDATE SET role = EXCLUDED.role";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, roomId);
            ps.setInt(2, userId);
            ps.setString(3, r);
            int updated = ps.executeUpdate();

            try (PreparedStatement gmPs = conn.prepareStatement(
                    "UPDATE guild_members SET role = ? " +
                    "WHERE user_id = ? AND guild_id = (SELECT guild_id FROM rooms WHERE id = ?)")) {
                gmPs.setString(1, r);
                gmPs.setInt(2, userId);
                gmPs.setInt(3, roomId);
                gmPs.executeUpdate();
            } catch (SQLException ignored) {
            }
            return updated > 0;
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi updateMemberRole (roomId=" + roomId + ", userId=" + userId + "): " + e.getMessage());
            return false;
        }
    }

    /**
     * Đánh dấu đã đọc tin nhắn trong phòng cho người dùng.
     */
    public boolean markRead(int userId, int roomId, int lastReadMessageId) {
        if (userId <= 0 || roomId <= 0) return false;

        String sql = "INSERT INTO user_room_reads (user_id, room_id, last_read_message_id, last_read_at) " +
                     "VALUES (?, ?, CASE WHEN ? > 0 THEN ? ELSE (SELECT MAX(id) FROM messages WHERE room_id = ?) END, CURRENT_TIMESTAMP) " +
                     "ON CONFLICT (user_id, room_id) DO UPDATE SET " +
                     "last_read_message_id = GREATEST(COALESCE(user_room_reads.last_read_message_id, 0), COALESCE(EXCLUDED.last_read_message_id, 0)), " +
                     "last_read_at = CURRENT_TIMESTAMP";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ps.setInt(2, roomId);
            ps.setInt(3, lastReadMessageId);
            ps.setInt(4, lastReadMessageId);
            ps.setInt(5, roomId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi markRead (userId=" + userId + ", roomId=" + roomId + "): " + e.getMessage());
            return false;
        }
    }

    /**
     * Thêm một thành viên vào phòng chat với vai trò chỉ định ('MEMBER', 'ADMIN', hoặc 'OWNER').
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
        String role = getMemberRole(roomId, userId);
        return "OWNER".equalsIgnoreCase(role);
    }

    /**
     * Lấy vai trò của người dùng trong phòng ('OWNER', 'ADMIN', 'MEMBER', hoặc null nếu không thuộc phòng).
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
            // Fallback sang guild_members nếu user là thành viên của guild chứa room này
            String guildRoleSql = "SELECT gm.role FROM guild_members gm " +
                                  "JOIN rooms r ON r.guild_id = gm.guild_id " +
                                  "WHERE r.id = ? AND gm.user_id = ?";
            try (PreparedStatement gmPs = conn.prepareStatement(guildRoleSql)) {
                gmPs.setInt(1, roomId);
                gmPs.setInt(2, userId);
                try (ResultSet gmRs = gmPs.executeQuery()) {
                    if (gmRs.next()) {
                        return gmRs.getString("role");
                    }
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
        String sql = "SELECT r.* FROM rooms r JOIN room_members rm ON r.id = rm.room_id " +
                     "WHERE rm.user_id = ? ORDER BY COALESCE(r.position, 0) ASC, r.id ASC";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, userId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Room r = mapRoom(rs);
                    loadMemberIds(conn, r);
                    list.add(r);
                }
            }
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi getJoinedRooms (userID=" + userId + "): " + e.getMessage());
        }
        return list;
    }

    /**
     * Lấy danh sách tất cả thành viên (đối tượng User) trong một phòng chat.
     */
    public List<User> getRoomMembers(int roomId) {
        List<User> members = new ArrayList<>();
        String sql = "SELECT u.*, rm.role AS member_role " +
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
                    try {
                        String avatarColor = rs.getString("avatar_color");
                        if (avatarColor != null && !avatarColor.isBlank()) {
                            u.setAvatarColor(avatarColor);
                        }
                    } catch (SQLException ignored) {
                    }
                    try {
                        String presenceStatus = rs.getString("presence_status");
                        if (presenceStatus != null && !presenceStatus.isBlank()) {
                            u.setPresenceStatus(presenceStatus);
                        }
                    } catch (SQLException ignored) {
                    }
                    try {
                        String customStatus = rs.getString("custom_status");
                        if (customStatus != null) {
                            u.setCustomStatus(customStatus);
                        }
                    } catch (SQLException ignored) {
                    }
                    try {
                        String role = rs.getString("member_role");
                        if (role != null && !role.isBlank()) {
                            u.setRole(role);
                        }
                    } catch (SQLException ignored) {
                    }
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
        String sql = "SELECT DISTINCT r.* " +
                     "FROM rooms r " +
                     "LEFT JOIN room_members rm ON r.id = rm.room_id " +
                     "WHERE COALESCE(r.is_private, false) = false OR rm.user_id = ? " +
                     "ORDER BY r.id ASC";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Room r = mapRoom(rs);
                    loadMemberIds(conn, r);
                    list.add(r);
                }
            }
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi listRoomsForUser (userID=" + userId + "): " + e.getMessage());
        }
        return list;
    }

    /**
     * Lấy tất cả các phòng chat hiện có trong hệ thống.
     */
    public List<Room> listRooms() {
        List<Room> list = new ArrayList<>();
        String sql = "SELECT * FROM rooms ORDER BY COALESCE(position, 0) ASC, id ASC";
        try (Connection conn = DatabaseConnection.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {

            while (rs.next()) {
                Room r = mapRoom(rs);
                loadMemberIds(conn, r);
                list.add(r);
            }
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi listRooms: " + e.getMessage());
        }
        return list;
    }

    /**
     * Tìm thông tin chi tiết phòng theo ID.
     */
    public Room findRoom(int id) {
        String sql = "SELECT * FROM rooms WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    Room r = mapRoom(rs);
                    loadMemberIds(conn, r);
                    return r;
                }
            }
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi findRoom (ID=" + id + "): " + e.getMessage());
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
}
