package com.discordmini.server.dao;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import com.discordmini.server.config.DatabaseConnection;

/**
 * Data Access Object quản lý tin nhắn riêng 1-1 (Direct Messages).
 * Bảng: direct_messages (id, sender_id, receiver_id, content, sent_at, is_read).
 */
public class DirectMessageDAO {

    public record DirectMessageItem(
            long id,
            int senderId,
            String senderUsername,
            String senderDisplayName,
            int receiverId,
            String receiverUsername,
            String receiverDisplayName,
            String content,
            Timestamp sentAt,
            boolean isRead
    ) {}

    /**
     * Lưu một tin nhắn riêng vào cơ sở dữ liệu và trả về thông tin đầy đủ kèm messageId và thời gian.
     */
    public DirectMessageItem saveMessage(int senderId, int receiverId, String content) {
        String insertSql = "INSERT INTO direct_messages (sender_id, receiver_id, content, sent_at, is_read) "
                + "VALUES (?, ?, ?, CURRENT_TIMESTAMP, FALSE) RETURNING id, sent_at";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(insertSql)) {
            ps.setInt(1, senderId);
            ps.setInt(2, receiverId);
            ps.setString(3, content);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    long id = rs.getLong("id");
                    Timestamp sentAt = rs.getTimestamp("sent_at");

                    // Lấy username và display_name của cả 2 bên
                    String senderUsername = "";
                    String senderDisplayName = "";
                    String receiverUsername = "";
                    String receiverDisplayName = "";

                    String userSql = "SELECT id, username, display_name FROM users WHERE id IN (?, ?)";
                    try (PreparedStatement psU = conn.prepareStatement(userSql)) {
                        psU.setInt(1, senderId);
                        psU.setInt(2, receiverId);
                        try (ResultSet rsU = psU.executeQuery()) {
                            while (rsU.next()) {
                                int uid = rsU.getInt("id");
                                if (uid == senderId) {
                                    senderUsername = rsU.getString("username");
                                    senderDisplayName = rsU.getString("display_name");
                                } else if (uid == receiverId) {
                                    receiverUsername = rsU.getString("username");
                                    receiverDisplayName = rsU.getString("display_name");
                                }
                            }
                        }
                    }

                    return new DirectMessageItem(
                            id, senderId, senderUsername, senderDisplayName,
                            receiverId, receiverUsername, receiverDisplayName,
                            content, sentAt, false
                    );
                }
            }
        } catch (SQLException e) {
            System.err.println("[DirectMessageDAO ERROR] saveMessage: " + e.getMessage());
        }
        return null;
    }

    /**
     * Lấy lịch sử tin nhắn riêng giữa 2 người dùng (sắp xếp tăng dần theo thời gian).
     */
    public List<DirectMessageItem> getHistory(int userId1, int userId2, int limit) {
        List<DirectMessageItem> list = new ArrayList<>();
        String sql = """
            SELECT m.id, m.sender_id, u1.username AS s_user, u1.display_name AS s_name,
                   m.receiver_id, u2.username AS r_user, u2.display_name AS r_name,
                   m.content, m.sent_at, m.is_read
            FROM (
                SELECT * FROM direct_messages
                WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
                ORDER BY id DESC
                LIMIT ?
            ) m
            JOIN users u1 ON m.sender_id = u1.id
            JOIN users u2 ON m.receiver_id = u2.id
            ORDER BY m.id ASC
        """;

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId1);
            ps.setInt(2, userId2);
            ps.setInt(3, userId2);
            ps.setInt(4, userId1);
            ps.setInt(5, limit > 0 ? limit : 50);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(new DirectMessageItem(
                            rs.getLong("id"),
                            rs.getInt("sender_id"),
                            rs.getString("s_user"),
                            rs.getString("s_name"),
                            rs.getInt("receiver_id"),
                            rs.getString("r_user"),
                            rs.getString("r_name"),
                            rs.getString("content"),
                            rs.getTimestamp("sent_at"),
                            rs.getBoolean("is_read")
                    ));
                }
            }
        } catch (SQLException e) {
            System.err.println("[DirectMessageDAO ERROR] getHistory: " + e.getMessage());
        }
        return list;
    }

    /**
     * Lấy danh sách ID các người dùng đã từng có cuộc hội thoại riêng với userId.
     */
    public List<Integer> getConversations(int userId) {
        List<Integer> list = new ArrayList<>();
        String sql = """
            SELECT DISTINCT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS partner_id
            FROM direct_messages
            WHERE sender_id = ? OR receiver_id = ?
        """;

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ps.setInt(2, userId);
            ps.setInt(3, userId);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(rs.getInt("partner_id"));
                }
            }
        } catch (SQLException e) {
            System.err.println("[DirectMessageDAO ERROR] getConversations: " + e.getMessage());
        }
        return list;
    }

    /**
     * Đánh dấu đã đọc các tin nhắn gửi đến userId từ senderId.
     */
    public void markAsRead(int receiverId, int senderId) {
        String sql = "UPDATE direct_messages SET is_read = TRUE WHERE receiver_id = ? AND sender_id = ? AND is_read = FALSE";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, receiverId);
            ps.setInt(2, senderId);
            ps.executeUpdate();
        } catch (SQLException e) {
            System.err.println("[DirectMessageDAO ERROR] markAsRead: " + e.getMessage());
        }
    }
}
