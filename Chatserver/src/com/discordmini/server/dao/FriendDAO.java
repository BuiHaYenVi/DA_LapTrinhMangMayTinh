package com.discordmini.server.dao;

import com.discordmini.server.model.User;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * FriendDAO: Quản lý mối quan hệ bạn bè và các lời mời kết bạn (Friend Requests).
 * Tương tác với bảng 'friendships' và 'users' trong PostgreSQL.
 */
public class FriendDAO {

    /**
     * DTO đại diện cho một lời mời kết bạn đang chờ xử lý.
     */
    public record FriendRequestItem(int requestId, int senderId, String senderUsername, String senderDisplayName, Timestamp createdAt) {}

    /**
     * Tìm kiếm người dùng theo username hoặc display_name (không phân biệt hoa thường).
     * Loại trừ chính người dùng đang tìm kiếm (currentUserId).
     */
    public List<User> searchUsers(int currentUserId, String query) {
        List<User> list = new ArrayList<>();
        if (query == null || query.isBlank()) return list;

        String pattern = "%" + query.trim().toLowerCase() + "%";
        String sql = "SELECT id, username, display_name, status, created_at FROM users " +
                     "WHERE id <> ? AND (LOWER(username) LIKE ? OR LOWER(display_name) LIKE ?) " +
                     "ORDER BY username ASC LIMIT 20";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, currentUserId);
            ps.setString(2, pattern);
            ps.setString(3, pattern);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(new User(
                        rs.getInt("id"),
                        rs.getString("username"),
                        "",
                        rs.getString("display_name"),
                        rs.getString("status"),
                        rs.getTimestamp("created_at")
                    ));
                }
            }
        } catch (SQLException e) {
            System.err.println("[FriendDAO ERROR] searchUsers: " + e.getMessage());
        }
        return list;
    }

    /**
     * Gửi lời mời kết bạn từ senderId tới receiverId.
     * Trả về kết quả:
     * - "OK": Gửi thành công.
     * - "SELF_REQUEST": Cố gắng tự kết bạn với chính mình.
     * - "ALREADY_FRIENDS": Đã là bạn bè từ trước.
     * - "ALREADY_REQUESTED": Đã gửi lời mời trước đó đang chờ xử lý.
     * - "INCOMING_EXISTS": Người kia đã gửi lời mời cho bạn từ trước (có thể chấp nhận luôn).
     * - "USER_NOT_FOUND": Không tìm thấy người dùng đích.
     * - "ERROR": Lỗi database.
     */
    public String sendFriendRequest(int senderId, int receiverId) {
        if (senderId == receiverId) {
            return "SELF_REQUEST";
        }

        String checkExistingSql = "SELECT id, requester_id, addressee_id, status FROM friendships " +
                                  "WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)";

        String insertSql = "INSERT INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, 'PENDING') RETURNING id";

        try (Connection conn = DatabaseConnection.getConnection()) {
            try (PreparedStatement checkPs = conn.prepareStatement(checkExistingSql)) {
                checkPs.setInt(1, senderId);
                checkPs.setInt(2, receiverId);
                checkPs.setInt(3, receiverId);
                checkPs.setInt(4, senderId);

                try (ResultSet rs = checkPs.executeQuery()) {
                    if (rs.next()) {
                        String st = rs.getString("status");
                        int req = rs.getInt("requester_id");
                        if ("ACCEPTED".equalsIgnoreCase(st)) {
                            return "ALREADY_FRIENDS";
                        }
                        if ("PENDING".equalsIgnoreCase(st)) {
                            if (req == senderId) {
                                return "ALREADY_REQUESTED";
                            } else {
                                return "INCOMING_EXISTS";
                            }
                        }
                    }
                }
            }

            try (PreparedStatement ps = conn.prepareStatement(insertSql)) {
                ps.setInt(1, senderId);
                ps.setInt(2, receiverId);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        return "OK";
                    }
                }
            }
        } catch (SQLException e) {
            System.err.println("[FriendDAO ERROR] sendFriendRequest: " + e.getMessage());
        }
        return "ERROR";
    }

    /**
     * Lấy danh sách các lời mời kết bạn đang chờ (PENDING) gửi đến userId.
     */
    public List<FriendRequestItem> getPendingRequests(int userId) {
        List<FriendRequestItem> list = new ArrayList<>();
        String sql = "SELECT f.id, f.requester_id, u.username, u.display_name, f.created_at " +
                     "FROM friendships f JOIN users u ON f.requester_id = u.id " +
                     "WHERE f.addressee_id = ? AND f.status = 'PENDING' " +
                     "ORDER BY f.created_at DESC";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(new FriendRequestItem(
                        rs.getInt("id"),
                        rs.getInt("requester_id"),
                        rs.getString("username"),
                        rs.getString("display_name"),
                        rs.getTimestamp("created_at")
                    ));
                }
            }
        } catch (SQLException e) {
            System.err.println("[FriendDAO ERROR] getPendingRequests: " + e.getMessage());
        }
        return list;
    }

    /**
     * Chấp nhận lời mời kết bạn theo requestId hoặc theo senderId/receiverId.
     */
    public boolean acceptRequest(int requestId, int currentUserId) {
        String sql = "UPDATE friendships SET status = 'ACCEPTED', updated_at = CURRENT_TIMESTAMP " +
                     "WHERE id = ? AND addressee_id = ? AND status = 'PENDING'";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, requestId);
            ps.setInt(2, currentUserId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("[FriendDAO ERROR] acceptRequest by id: " + e.getMessage());
            return false;
        }
    }

    /**
     * Chấp nhận lời mời kết bạn theo senderId (người đã gửi lời mời cho currentUserId).
     */
    public boolean acceptRequestFromUser(int senderId, int currentUserId) {
        String sql = "UPDATE friendships SET status = 'ACCEPTED', updated_at = CURRENT_TIMESTAMP " +
                     "WHERE requester_id = ? AND addressee_id = ? AND status = 'PENDING'";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, senderId);
            ps.setInt(2, currentUserId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("[FriendDAO ERROR] acceptRequestFromUser: " + e.getMessage());
            return false;
        }
    }

    /**
     * Từ chối lời mời kết bạn (Xóa bản ghi PENDING khỏi CSDL).
     */
    public boolean rejectRequest(int requestId, int currentUserId) {
        String sql = "DELETE FROM friendships WHERE id = ? AND addressee_id = ? AND status = 'PENDING'";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, requestId);
            ps.setInt(2, currentUserId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("[FriendDAO ERROR] rejectRequest: " + e.getMessage());
            return false;
        }
    }

    /**
     * Lấy danh sách bạn bè (status = 'ACCEPTED') của một người dùng.
     */
    public List<User> getFriends(int userId) {
        List<User> list = new ArrayList<>();
        String sql = "SELECT u.id, u.username, u.display_name, u.status, u.created_at " +
                     "FROM friendships f " +
                     "JOIN users u ON (CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END) = u.id " +
                     "WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status = 'ACCEPTED' " +
                     "ORDER BY u.display_name ASC";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ps.setInt(2, userId);
            ps.setInt(3, userId);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(new User(
                        rs.getInt("id"),
                        rs.getString("username"),
                        "",
                        rs.getString("display_name"),
                        rs.getString("status"),
                        rs.getTimestamp("created_at")
                    ));
                }
            }
        } catch (SQLException e) {
            System.err.println("[FriendDAO ERROR] getFriends: " + e.getMessage());
        }
        return list;
    }

    /**
     * Kiểm tra xem 2 người đã là bạn bè (status = 'ACCEPTED') chưa.
     */
    public boolean areFriends(int userId1, int userId2) {
        String sql = "SELECT 1 FROM friendships WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)) AND status = 'ACCEPTED'";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId1);
            ps.setInt(2, userId2);
            ps.setInt(3, userId2);
            ps.setInt(4, userId1);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        } catch (SQLException e) {
            System.err.println("[FriendDAO ERROR] areFriends: " + e.getMessage());
            return false;
        }
    }
}
