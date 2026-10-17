package com.discordmini.server.dao;

import com.discordmini.server.model.Message;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * [HAI-05 & HAI-07] Message DAO: Ghi nhận tin nhắn và truy vấn lịch sử tin nhắn.
 * Đảm bảo dữ liệu bền vững (Persistence) trước khi phát tán.
 */
public class MessageDAO {

    /**
     * [HAI-05] Lưu tin nhắn vào PostgreSQL.
     * Trả về đối tượng Message hoàn chỉnh với ID tự sinh và thời gian sent_at từ CSDL.
     */
    public Message saveMessage(int roomId, int senderId, String content) {
        if (content == null || content.isBlank()) return null;

        String insertSql = "INSERT INTO messages (room_id, sender_id, content) VALUES (?, ?, ?) RETURNING id, sent_at";
        String fetchSenderSql = "SELECT display_name FROM users WHERE id = ?";

        try (Connection conn = DatabaseConnection.getConnection()) {
            // 1. Tìm tên hiển thị người gửi
            String senderDisplayName = "User#" + senderId;
            try (PreparedStatement senderPs = conn.prepareStatement(fetchSenderSql)) {
                senderPs.setInt(1, senderId);
                try (ResultSet sRs = senderPs.executeQuery()) {
                    if (sRs.next()) {
                        senderDisplayName = sRs.getString("display_name");
                    }
                }
            }

            // 2. Lưu tin nhắn
            try (PreparedStatement ps = conn.prepareStatement(insertSql)) {
                ps.setInt(1, roomId);
                ps.setInt(2, senderId);
                ps.setString(3, content.trim());

                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        int id = rs.getInt("id");
                        Timestamp ts = rs.getTimestamp("sent_at");
                        String timeStr = ts != null ? ts.toString() : "";
                        return new Message(id, roomId, senderId, senderDisplayName, content.trim(), timeStr);
                    }
                }
            }
        } catch (SQLException e) {
            System.err.println("[MessageDAO ERROR] Lỗi saveMessage (roomID=" + roomId + ", senderID=" + senderId + "): " + e.getMessage());
        }
        return null;
    }

    /**
     * Overload method lưu tin nhắn với tên hiển thị trực tiếp để giảm thiểu roundtrip query DB.
     */
    public Message save(int roomId, int senderId, String senderDisplayName, String content) {
        if (content == null || content.isBlank()) return null;

        String name = (senderDisplayName != null && !senderDisplayName.isBlank()) ? senderDisplayName : null;
        String insertSql = "INSERT INTO messages (room_id, sender_id, content) VALUES (?, ?, ?) RETURNING id, sent_at";

        try (Connection conn = DatabaseConnection.getConnection()) {
            if (name == null) {
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
            if (name == null) name = "User#" + senderId;

            try (PreparedStatement ps = conn.prepareStatement(insertSql)) {
                ps.setInt(1, roomId);
                ps.setInt(2, senderId);
                ps.setString(3, content.trim());

                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        int id = rs.getInt("id");
                        Timestamp ts = rs.getTimestamp("sent_at");
                        String timeStr = ts != null ? ts.toString() : "";
                        return new Message(id, roomId, senderId, name, content.trim(), timeStr);
                    }
                }
            }
        } catch (SQLException e) {
            System.err.println("[MessageDAO ERROR] Lỗi save (roomID=" + roomId + ", senderID=" + senderId + "): " + e.getMessage());
        }
        return null;
    }

    /**
     * [HAI-07] Lấy ra danh sách N tin nhắn gần nhất theo thứ tự thời gian TĂNG DẦN (ASC).
     * @param roomId ID phòng chat
     * @param limit Số lượng tin nhắn tối đa cần nạp (ví dụ: 50, 100)
     */
    public List<Message> getMessageHistory(int roomId, int limit) {
        List<Message> list = new ArrayList<>();
        if (limit <= 0) limit = 50;

        // Subquery lấy N tin mới nhất (sent_at DESC) rồi sắp xếp lại tăng dần (ASC)
        String sql = "SELECT sub.id, sub.room_id, sub.sender_id, sub.display_name, sub.content, sub.sent_at, sub.is_edited FROM (" +
                     "   SELECT m.id, m.room_id, m.sender_id, u.display_name, m.content, m.sent_at, m.is_edited " +
                     "   FROM messages m JOIN users u ON m.sender_id = u.id " +
                     "   WHERE m.room_id = ? " +
                     "   ORDER BY m.sent_at DESC, m.id DESC " +
                     "   LIMIT ? " +
                     ") sub ORDER BY sub.sent_at ASC, sub.id ASC";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

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
                        rs.getInt("sender_id"),
                        rs.getString("display_name"),
                        rs.getString("content"),
                        timeStr,
                        isEdited
                    ));
                }
            }
        } catch (SQLException e) {
            System.err.println("[MessageDAO ERROR] Lỗi getMessageHistory (roomID=" + roomId + "): " + e.getMessage());
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
        List<Message> list = new ArrayList<>();
        if (limit <= 0) limit = 30;

        String sql = "SELECT sub.id, sub.room_id, sub.sender_id, sub.display_name, sub.content, sub.sent_at, sub.is_edited FROM (" +
                     "   SELECT m.id, m.room_id, m.sender_id, u.display_name, m.content, m.sent_at, m.is_edited " +
                     "   FROM messages m JOIN users u ON m.sender_id = u.id " +
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
                        rs.getString("content"),
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
        String sql = "UPDATE messages SET content = ?, is_edited = true WHERE id = ? AND sender_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, newContent.trim());
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
     * [GIAI ĐOẠN 2] Lấy thông tin tin nhắn để kiểm tra quyền và room_id.
     */
    public Message getMessageById(int messageId) {
        String sql = "SELECT m.id, m.room_id, m.sender_id, u.display_name, m.content, m.sent_at, m.is_edited " +
                     "FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?";
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
                        rs.getInt("sender_id"),
                        rs.getString("display_name"),
                        rs.getString("content"),
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
