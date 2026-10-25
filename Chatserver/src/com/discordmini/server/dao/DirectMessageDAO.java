package com.discordmini.server.dao;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import com.discordmini.server.config.DatabaseConnection;
import com.discordmini.server.security.MessageEncryptionUtil;

/**
 * Data Access Object quản lý tin nhắn riêng 1-1 (Direct Messages).
 * Bảng: direct_messages (id, sender_id, receiver_id, content, sent_at, is_read).
 */
public class DirectMessageDAO {
    private static volatile boolean schemaChecked = false;

    public DirectMessageDAO() {
        if (!schemaChecked) {
            synchronized (DirectMessageDAO.class) {
                if (!schemaChecked) {
                    try (Connection conn = DatabaseConnection.getConnection()) {
                        if (conn != null) {
                            try (Statement st = conn.createStatement()) {
                                st.executeUpdate("ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE");
                            } catch (Exception ignored) {}
                            schemaChecked = true;
                        }
                    } catch (Exception ignored) {}
                }
            }
        }
    }

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
            boolean isRead,
            boolean isEdited
    ) {
        public DirectMessageItem(
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
        ) {
            this(id, senderId, senderUsername, senderDisplayName, receiverId, receiverUsername, receiverDisplayName, content, sentAt, isRead, false);
        }

        public long sentAtEpochMs() {
            return sentAt != null ? sentAt.getTime() : System.currentTimeMillis();
        }
    }

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
            ps.setString(3, MessageEncryptionUtil.encrypt(content));

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
                            content, sentAt, false, false
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
                   m.content, m.sent_at, m.is_read, m.is_edited
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
                    boolean isEdited = false;
                    try { isEdited = rs.getBoolean("is_edited"); } catch (Exception ignored) {}
                    list.add(new DirectMessageItem(
                            rs.getLong("id"),
                            rs.getInt("sender_id"),
                            rs.getString("s_user"),
                            rs.getString("s_name"),
                            rs.getInt("receiver_id"),
                            rs.getString("r_user"),
                            rs.getString("r_name"),
                            MessageEncryptionUtil.decrypt(rs.getString("content")),
                            rs.getTimestamp("sent_at"),
                            rs.getBoolean("is_read"),
                            isEdited
                    ));
                }
            }
        } catch (SQLException e) {
            System.err.println("[DirectMessageDAO ERROR] getHistory: " + e.getMessage());
        }
        return list;
    }

    /**
     * Sửa nội dung tin nhắn riêng của chính người gửi. Trả về ID người nhận nếu sửa thành công, hoặc -1 nếu thất bại.
     */
    public int editMessage(long messageId, int senderId, String newContent) {
        if (newContent == null || newContent.isBlank()) return -1;
        String sql = "UPDATE direct_messages SET content = ?, is_edited = TRUE WHERE id = ? AND sender_id = ? RETURNING receiver_id";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, MessageEncryptionUtil.encrypt(newContent.trim()));
            ps.setLong(2, messageId);
            ps.setInt(3, senderId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt("receiver_id");
                }
            }
        } catch (SQLException e) {
            System.err.println("[DirectMessageDAO ERROR] editMessage: " + e.getMessage());
        }
        return -1;
    }

    /**
     * Xóa tin nhắn riêng của chính người gửi. Trả về ID người nhận nếu xóa thành công, hoặc -1 nếu thất bại.
     */
    public int deleteMessage(long messageId, int senderId) {
        String sql = "DELETE FROM direct_messages WHERE id = ? AND sender_id = ? RETURNING receiver_id";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, messageId);
            ps.setInt(2, senderId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt("receiver_id");
                }
            }
        } catch (SQLException e) {
            System.err.println("[DirectMessageDAO ERROR] deleteMessage: " + e.getMessage());
        }
        return -1;
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
