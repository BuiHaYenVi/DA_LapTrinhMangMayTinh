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

    /**
     * Tạo một phòng chat mới.
     * Tự động thêm người tạo phòng vào danh sách thành viên của phòng đó.
     */
    public Room createRoom(String roomName, int createdBy) {
        if (roomName == null || roomName.isBlank()) return null;

        String insertRoomSql = "INSERT INTO rooms (name, created_by) VALUES (?, ?) RETURNING id, created_at";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(insertRoomSql)) {

            ps.setString(1, roomName.trim());
            if (createdBy > 0) {
                ps.setInt(2, createdBy);
            } else {
                ps.setNull(2, Types.INTEGER);
            }

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    int roomId = rs.getInt("id");
                    Timestamp createdAt = rs.getTimestamp("created_at");
                    Room room = new Room(roomId, roomName.trim(), createdBy, createdAt);

                    // Nếu người tạo hợp lệ, tự động thêm vào phòng
                    if (createdBy > 0) {
                        addMember(roomId, createdBy);
                        room.getMemberIds().add(createdBy);
                    }
                    return room;
                }
            }
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi tạo phòng '" + roomName + "': " + e.getMessage());
        }
        return null;
    }

    /**
     * Thêm một thành viên vào phòng chat.
     */
    public boolean addMember(int roomId, int userId) {
        String sql = "INSERT INTO room_members (room_id, user_id) VALUES (?, ?) ON CONFLICT (room_id, user_id) DO NOTHING";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, roomId);
            ps.setInt(2, userId);
            int rows = ps.executeUpdate();
            return rows > 0;
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi thêm user (ID=" + userId + ") vào room (ID=" + roomId + "): " + e.getMessage());
            return false;
        }
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
        String sql = "SELECT r.id, r.name, r.created_by, r.created_at " +
                     "FROM rooms r JOIN room_members rm ON r.id = rm.room_id " +
                     "WHERE rm.user_id = ? ORDER BY r.id ASC";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, userId);
            try (ResultSet rs = ps.executeQuery()) {
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
        String sql = "SELECT u.id, u.username, u.password, u.display_name, u.status, u.created_at " +
                     "FROM users u JOIN room_members rm ON u.id = rm.user_id " +
                     "WHERE rm.room_id = ? ORDER BY u.id ASC";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, roomId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    members.add(new User(
                        rs.getInt("id"),
                        rs.getString("username"),
                        rs.getString("password"),
                        rs.getString("display_name"),
                        rs.getString("status"),
                        rs.getTimestamp("created_at")
                    ));
                }
            }
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi getRoomMembers (roomID=" + roomId + "): " + e.getMessage());
        }
        return members;
    }

    /**
     * Lấy tất cả các phòng chat hiện có trong hệ thống.
     */
    public List<Room> listRooms() {
        List<Room> list = new ArrayList<>();
        String sql = "SELECT id, name, created_by, created_at FROM rooms ORDER BY id ASC";
        try (Connection conn = DatabaseConnection.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {

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
        } catch (SQLException e) {
            System.err.println("[RoomDAO ERROR] Lỗi listRooms: " + e.getMessage());
        }
        return list;
    }

    /**
     * Tìm thông tin chi tiết phòng theo ID.
     */
    public Room findRoom(int id) {
        String sql = "SELECT id, name, created_by, created_at FROM rooms WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

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
