package com.discordmini.server.dao;

import com.discordmini.server.model.Message;
import com.discordmini.server.security.MessageEncryptionUtil;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * [HAI-05 & HAI-07] Message DAO: Ghi nhận tin nhắn và truy vấn lịch sử tin nhắn.
 * Đảm bảo dữ liệu bền vững (Persistence) trước khi phát tán.
 */
public class MessageDAO {
    private static volatile boolean schemaChecked = false;

    public MessageDAO() {
        ensureSchemaChecked();
    }

    private static void ensureSchemaChecked() {
        if (!schemaChecked) {
            synchronized (MessageDAO.class) {
                if (!schemaChecked) {
                    try (Connection conn = DatabaseConnection.getConnection()) {
                        if (conn != null) {
                            ensureMessageColumnsExist(conn);
                            schemaChecked = true;
                        }
                    } catch (Exception ignored) {}
                }
            }
        }
    }

    public static void ensureMessageColumnsExist(Connection conn) {
        if (conn == null) return;
        try (Statement st = conn.createStatement()) {
            st.executeUpdate("ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel_id INT REFERENCES channels(id) ON DELETE CASCADE");
            st.executeUpdate("ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id INT REFERENCES users(id) ON DELETE CASCADE");
            st.executeUpdate("ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE");
            st.executeUpdate("ALTER TABLE messages ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        } catch (Exception e) {
            System.err.println("[MessageDAO] Kiểm tra cột bảng messages: " + e.getMessage());
        }
    }

    /**
     * [HAI-05] Lưu tin nhắn vào PostgreSQL kèm channel_id.
     * Trả về đối tượng Message hoàn chỉnh với ID tự sinh và thời gian sent_at từ CSDL.
     */
    public Message saveMessage(int roomId, int channelId, int senderId, String content) {
        return save(roomId, channelId, senderId, null, content);
    }

    public Message saveMessage(int roomId, int senderId, String content) {
        return save(roomId, 0, senderId, null, content);
    }

    /**
     * Lưu thông báo hệ thống (ví dụ: mời bạn bè vào phòng) vào CSDL để không bị mất khi chuyển phòng.
     */
    public Message saveSystemMessage(int roomId, int channelId, String content) {
        return save(roomId, channelId, -1, "Hệ thống", content);
    }

    /**
     * Overload method lưu tin nhắn với channel_id và tên hiển thị trực tiếp.
     */
    public Message save(int roomId, int channelId, int senderId, String senderDisplayName, String content) {
        if (content == null || content.isBlank() || roomId <= 0) return null;
        ensureSchemaChecked();

        String name = (senderDisplayName != null && !senderDisplayName.isBlank()) ? senderDisplayName : null;
        String insertSql = "INSERT INTO messages (room_id, channel_id, sender_id, content) VALUES (?, ?, ?, ?) RETURNING id, sent_at";

        try (Connection conn = DatabaseConnection.getConnection()) {
            if (name == null && senderId > 0) {
                String fetchSenderSql = "SELECT display_name FROM users WHERE id = ?";
                try (PreparedStatement senderPs = conn.prepareStatement(fetchSenderSql)) {
                    senderPs.setInt(1, senderId);
                    try (ResultSet sRs = senderPs.executeQuery()) {
                        if (sRs.next()) {
                            name = sRs.getString("display_name");
                        }
                    }
                }
            }
            if (name == null) {
                name = (senderId <= 0) ? "Hệ thống" : ("User#" + senderId);
            }

            // Nếu channelId chưa truyền (<= 0), tìm kênh mặc định của phòng
            int effectiveChannelId = channelId;
            if (effectiveChannelId <= 0) {
                String fetchDefChSql = "SELECT id FROM channels WHERE room_id = ? ORDER BY CASE WHEN LOWER(name) = 'chung' THEN 0 ELSE 1 END, id ASC LIMIT 1";
                try (PreparedStatement chPs = conn.prepareStatement(fetchDefChSql)) {
                    chPs.setInt(1, roomId);
                    try (ResultSet chRs = chPs.executeQuery()) {
                        if (chRs.next()) {
                            effectiveChannelId = chRs.getInt("id");
                        }
                    }
                }
            }

            try (PreparedStatement ps = conn.prepareStatement(insertSql)) {
                ps.setInt(1, roomId);
                if (effectiveChannelId > 0) {
                    ps.setInt(2, effectiveChannelId);
                } else {
                    ps.setNull(2, Types.INTEGER);
                }
                if (senderId > 0) {
                    ps.setInt(3, senderId);
                } else {
                    ps.setNull(3, Types.INTEGER);
                }
                ps.setString(4, MessageEncryptionUtil.encrypt(content.trim()));

                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        int id = rs.getInt("id");
                        Timestamp ts = rs.getTimestamp("sent_at");
                        String timeStr = ts != null ? ts.toString() : "";
                        return new Message(id, roomId, effectiveChannelId, senderId, name, content.trim(), timeStr);
                    }
                }
            }
        } catch (SQLException e) {
            System.err.println("[MessageDAO ERROR] Lỗi save (roomID=" + roomId + ", channelId=" + channelId + ", senderID=" + senderId + "): " + e.getMessage());
        }
        return null;
    }

    public Message save(int roomId, int senderId, String senderDisplayName, String content) {
        return save(roomId, 0, senderId, senderDisplayName, content);
    }

    /**
     * [HAI-07] Lấy ra danh sách N tin nhắn gần nhất theo thứ tự thời gian TĂNG DẦN (ASC).
     * @param roomId ID phòng chat
     * @param limit Số lượng tin nhắn tối đa cần nạp (ví dụ: 50, 100)
     */
    public List<Message> getMessageHistory(int roomId, int limit) {
        ensureSchemaChecked();
        List<Message> list = new ArrayList<>();
        if (limit <= 0) limit = 50;

        String sql = "SELECT sub.id, sub.room_id, COALESCE(sub.channel_id, 0) AS channel_id, sub.sender_id, sub.display_name, sub.content, sub.sent_at, sub.is_edited FROM (" +
                     "   SELECT m.id, m.room_id, m.channel_id, COALESCE(m.sender_id, -1) AS sender_id, COALESCE(u.display_name, 'Hệ thống') AS display_name, m.content, m.sent_at, COALESCE(m.is_edited, false) AS is_edited " +
                     "   FROM messages m LEFT JOIN users u ON m.sender_id = u.id " +
                     "   WHERE m.room_id = ? " +
                     "   ORDER BY m.sent_at DESC, m.id DESC " +
                     "   LIMIT ? " +
                     ") sub ORDER BY sub.sent_at ASC, sub.id ASC";

        try (Connection conn = DatabaseConnection.getConnection()) {
            if (conn == null) return list;
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setInt(1, roomId);
                ps.setInt(2, limit);

                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        Timestamp ts = rs.getTimestamp("sent_at");
                        String timeStr = ts != null ? ts.toString() : "";
                        boolean isEdited = false;
                        try { isEdited = rs.getBoolean("is_edited"); } catch (Exception ignored) {}
                        list.add(new Message(
                            rs.getInt("id"),
                            rs.getInt("room_id"),
                            rs.getInt("channel_id"),
                            rs.getInt("sender_id"),
                            rs.getString("display_name"),
                            MessageEncryptionUtil.decrypt(rs.getString("content")),
                            timeStr,
                            isEdited
                        ));
                    }
                }
            } catch (SQLException e) {
                if (e.getMessage() != null && e.getMessage().toLowerCase().contains("is_edited")) {
                    ensureMessageColumnsExist(conn);
                }
                System.err.println("[MessageDAO ERROR] Lỗi getMessageHistory (roomID=" + roomId + "): " + e.getMessage());
            }
        } catch (SQLException e) {
            System.err.println("[MessageDAO ERROR] Lỗi kết nối getMessageHistory: " + e.getMessage());
        }
        return list;
    }

    /**
     * Lấy danh sách N tin nhắn gần nhất của một KÊNH cụ thể theo thứ tự thời gian tăng dần.
     */
    public List<Message> getChannelMessageHistory(int channelId, int limit) {
        ensureSchemaChecked();
        List<Message> list = new ArrayList<>();
        if (channelId <= 0) return list;
        if (limit <= 0) limit = 50;

        String sql = "SELECT sub.id, sub.room_id, sub.channel_id, sub.sender_id, sub.display_name, sub.content, sub.sent_at, sub.is_edited FROM (" +
                     "   SELECT m.id, m.room_id, COALESCE(m.channel_id, ?) AS channel_id, COALESCE(m.sender_id, -1) AS sender_id, COALESCE(u.display_name, 'Hệ thống') AS display_name, m.content, m.sent_at, COALESCE(m.is_edited, false) AS is_edited " +
                     "   FROM messages m LEFT JOIN users u ON m.sender_id = u.id " +
                     "   WHERE m.channel_id = ? " +
                     "      OR (m.channel_id IS NULL AND m.room_id = (SELECT c.room_id FROM channels c WHERE c.id = ?)) " +
                     "   ORDER BY m.sent_at DESC, m.id DESC " +
                     "   LIMIT ? " +
                     ") sub ORDER BY sub.sent_at ASC, sub.id ASC";

        try (Connection conn = DatabaseConnection.getConnection()) {
            if (conn == null) return list;
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setInt(1, channelId);
                ps.setInt(2, channelId);
                ps.setInt(3, channelId);
                ps.setInt(4, limit);

                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        Timestamp ts = rs.getTimestamp("sent_at");
                        String timeStr = ts != null ? ts.toString() : "";
                        boolean isEdited = false;
                        try { isEdited = rs.getBoolean("is_edited"); } catch (Exception ignored) {}
                        list.add(new Message(
                            rs.getInt("id"),
                            rs.getInt("room_id"),
                            rs.getInt("channel_id"),
                            rs.getInt("sender_id"),
                            rs.getString("display_name"),
                            MessageEncryptionUtil.decrypt(rs.getString("content")),
                            timeStr,
                            isEdited
                        ));
                    }
                }
            } catch (SQLException e) {
                if (e.getMessage() != null && (e.getMessage().toLowerCase().contains("is_edited") || e.getMessage().toLowerCase().contains("channel_id"))) {
                    ensureMessageColumnsExist(conn);
                    String fallbackSql = "SELECT sub.id, sub.room_id, sub.channel_id, sub.sender_id, sub.display_name, sub.content, sub.sent_at FROM (" +
                                         "   SELECT m.id, m.room_id, COALESCE(m.channel_id, ?) AS channel_id, COALESCE(m.sender_id, -1) AS sender_id, COALESCE(u.display_name, 'Hệ thống') AS display_name, m.content, m.sent_at " +
                                         "   FROM messages m LEFT JOIN users u ON m.sender_id = u.id " +
                                         "   WHERE m.channel_id = ? " +
                                         "      OR (m.channel_id IS NULL AND m.room_id = (SELECT c.room_id FROM channels c WHERE c.id = ?)) " +
                                         "   ORDER BY m.sent_at DESC, m.id DESC " +
                                         "   LIMIT ? " +
                                         ") sub ORDER BY sub.sent_at ASC, sub.id ASC";
                    try (PreparedStatement ps = conn.prepareStatement(fallbackSql)) {
                        ps.setInt(1, channelId);
                        ps.setInt(2, channelId);
                        ps.setInt(3, channelId);
                        ps.setInt(4, limit);
                        try (ResultSet rs = ps.executeQuery()) {
                            while (rs.next()) {
                                Timestamp ts = rs.getTimestamp("sent_at");
                                String timeStr = ts != null ? ts.toString() : "";
                                list.add(new Message(
                                    rs.getInt("id"),
                                    rs.getInt("room_id"),
                                    rs.getInt("channel_id"),
                                    rs.getInt("sender_id"),
                                    rs.getString("display_name"),
                                    MessageEncryptionUtil.decrypt(rs.getString("content")),
                                    timeStr,
                                    false
                                ));
                            }
                            return list;
                        }
                    } catch (SQLException ignored) {}
                }
                System.err.println("[MessageDAO ERROR] Lỗi getChannelMessageHistory (channelID=" + channelId + "): " + e.getMessage());
            }
        } catch (SQLException e) {
            System.err.println("[MessageDAO ERROR] Lỗi kết nối getChannelMessageHistory: " + e.getMessage());
        }
        return list;
    }

    /**
     * Lấy thêm tin nhắn cũ hơn trước một mốc ID của một KÊNH cụ thể (phân trang cuộn lên).
     */
    public List<Message> getChannelMessageHistoryBefore(int channelId, int beforeMessageId, int limit) {
        ensureSchemaChecked();
        List<Message> list = new ArrayList<>();
        if (channelId <= 0) return list;
        if (limit <= 0) limit = 30;

        String sql = "SELECT sub.id, sub.room_id, sub.channel_id, sub.sender_id, sub.display_name, sub.content, sub.sent_at, sub.is_edited FROM (" +
                     "   SELECT m.id, m.room_id, COALESCE(m.channel_id, ?) AS channel_id, COALESCE(m.sender_id, -1) AS sender_id, COALESCE(u.display_name, 'Hệ thống') AS display_name, m.content, m.sent_at, COALESCE(m.is_edited, false) AS is_edited " +
                     "   FROM messages m LEFT JOIN users u ON m.sender_id = u.id " +
                     "   WHERE (m.channel_id = ? OR (m.channel_id IS NULL AND m.room_id = (SELECT c.room_id FROM channels c WHERE c.id = ?))) AND m.id < ? " +
                     "   ORDER BY m.sent_at DESC, m.id DESC " +
                     "   LIMIT ? " +
                     ") sub ORDER BY sub.sent_at ASC, sub.id ASC";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, channelId);
            ps.setInt(2, channelId);
            ps.setInt(3, channelId);
            ps.setInt(4, beforeMessageId);
            ps.setInt(5, limit);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Timestamp ts = rs.getTimestamp("sent_at");
                    String timeStr = ts != null ? ts.toString() : "";
                    boolean isEdited = false;
                    try { isEdited = rs.getBoolean("is_edited"); } catch (Exception ignored) {}
                    list.add(new Message(
                        rs.getInt("id"),
                        rs.getInt("room_id"),
                        rs.getInt("channel_id"),
                        rs.getInt("sender_id"),
                        rs.getString("display_name"),
                        MessageEncryptionUtil.decrypt(rs.getString("content")),
                        timeStr,
                        isEdited
                    ));
                }
            }
        } catch (SQLException e) {
            System.err.println("[MessageDAO ERROR] Lỗi getChannelMessageHistoryBefore (channelID=" + channelId + "): " + e.getMessage());
        }
        return list;
    }

    /**
     * Lấy toàn bộ lịch sử tin nhắn của phòng (Hỗ trợ tương thích ngược).
     */
    public List<Message> history(int roomId) {
        return getMessageHistory(roomId, 100);
    }

    /**
     * [GIAI ĐOẠN 2] Lấy thêm lịch sử tin nhắn cũ hơn một mốc ID cụ thể (Phân trang khi cuộn lên).
     */
    public List<Message> getMessageHistoryBefore(int roomId, int beforeMessageId, int limit) {
        ensureSchemaChecked();
        List<Message> list = new ArrayList<>();
        if (limit <= 0) limit = 30;

        String sql = "SELECT sub.id, sub.room_id, sub.sender_id, sub.display_name, sub.content, sub.sent_at, sub.is_edited FROM (" +
                     "   SELECT m.id, m.room_id, COALESCE(m.sender_id, -1) AS sender_id, COALESCE(u.display_name, 'Hệ thống') AS display_name, m.content, m.sent_at, COALESCE(m.is_edited, false) AS is_edited " +
                     "   FROM messages m LEFT JOIN users u ON m.sender_id = u.id " +
                     "   WHERE m.room_id = ? AND m.id < ? " +
                     "   ORDER BY m.sent_at DESC, m.id DESC " +
                     "   LIMIT ? " +
                     ") sub ORDER BY sub.sent_at ASC, sub.id ASC";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, roomId);
            ps.setInt(2, beforeMessageId);
            ps.setInt(3, limit);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Timestamp ts = rs.getTimestamp("sent_at");
                    String timeStr = ts != null ? ts.toString() : "";
                    boolean isEdited = false;
                    try { isEdited = rs.getBoolean("is_edited"); } catch (Exception ignored) {}
                    list.add(new Message(
                        rs.getInt("id"),
                        rs.getInt("room_id"),
                        rs.getInt("sender_id"),
                        rs.getString("display_name"),
                        MessageEncryptionUtil.decrypt(rs.getString("content")),
                        timeStr,
                        isEdited
                    ));
                }
            }
        } catch (SQLException e) {
            System.err.println("[MessageDAO ERROR] Lỗi getMessageHistoryBefore: " + e.getMessage());
        }
        return list;
    }

    /**
     * [GIAI ĐOẠN 2] Sửa nội dung tin nhắn của chính mình.
     */
    public boolean editMessage(int messageId, int senderId, String newContent) {
        if (newContent == null || newContent.isBlank()) return false;
        ensureSchemaChecked();
        String sql = "UPDATE messages SET content = ?, is_edited = true WHERE id = ? AND sender_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, MessageEncryptionUtil.encrypt(newContent.trim()));
            ps.setInt(2, messageId);
            ps.setInt(3, senderId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("[MessageDAO ERROR] Lỗi editMessage: " + e.getMessage());
            return false;
        }
    }

    /**
     * [GIAI ĐOẠN 2] Xóa tin nhắn (chính mình hoặc admin/chủ phòng).
     */
    public boolean deleteMessage(int messageId, int userId, boolean isAdminOrOwner) {
        String sql = isAdminOrOwner
            ? "DELETE FROM messages WHERE id = ?"
            : "DELETE FROM messages WHERE id = ? AND sender_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, messageId);
            if (!isAdminOrOwner) {
                ps.setInt(2, userId);
            }
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("[MessageDAO ERROR] Lỗi deleteMessage: " + e.getMessage());
            return false;
        }
    }

    /**
     * [GIAI ĐOẠN 2] Lấy thông tin tin nhắn để kiểm tra quyền và room_id / channel_id.
     */
    public Message getMessageById(int messageId) {
        ensureSchemaChecked();
        String sql = "SELECT m.id, m.room_id, COALESCE(m.channel_id, 0) AS channel_id, COALESCE(m.sender_id, -1) AS sender_id, COALESCE(u.display_name, 'Hệ thống') AS display_name, m.content, m.sent_at, COALESCE(m.is_edited, false) AS is_edited " +
                     "FROM messages m LEFT JOIN users u ON m.sender_id = u.id WHERE m.id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, messageId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    Timestamp ts = rs.getTimestamp("sent_at");
                    boolean isEdited = false;
                    try { isEdited = rs.getBoolean("is_edited"); } catch (Exception ignored) {}
                    return new Message(
                        rs.getInt("id"),
                        rs.getInt("room_id"),
                        rs.getInt("channel_id"),
                        rs.getInt("sender_id"),
                        rs.getString("display_name"),
                        MessageEncryptionUtil.decrypt(rs.getString("content")),
                        ts != null ? ts.toString() : "",
                        isEdited
                    );
                }
            }
        } catch (SQLException e) {
            System.err.println("[MessageDAO ERROR] Lỗi getMessageById: " + e.getMessage());
        }
        return null;
    }
}
