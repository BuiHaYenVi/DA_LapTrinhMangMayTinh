package com.discordmini.server.dao;

import com.discordmini.server.model.Attachment;
import com.discordmini.server.model.DirectConversation;
import com.discordmini.server.model.DirectMessage;

import java.sql.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * DAO quản lý hội thoại trực tiếp 1-1 (Direct Conversations & Direct Messages).
 */
public class DirectMessageDAO {

    private DirectConversation mapConversation(ResultSet rs) throws SQLException {
        Timestamp ts = rs.getTimestamp("created_at");
        String presence = rs.getString("peer_presence_status");
        if (presence == null || presence.isBlank()) {
            presence = rs.getString("peer_status");
        }
        return new DirectConversation(
            rs.getLong("id"),
            rs.getInt("user_low_id"),
            rs.getInt("user_high_id"),
            rs.getInt("peer_user_id"),
            rs.getString("peer_username"),
            rs.getString("peer_display_name"),
            rs.getString("peer_avatar_color"),
            presence != null ? presence : "OFFLINE",
            rs.getString("last_message_preview"),
            ts != null ? ts.toString() : ""
        );
    }

    /**
     * Lấy danh sách tất cả cuộc trò chuyện 1-1 của người dùng kèm tin nhắn cuối cùng.
     */
    public List<DirectConversation> listConversations(int userId) {
        List<DirectConversation> list = new ArrayList<>();
        String sql = "SELECT dc.id, dc.user_low_id, dc.user_high_id, dc.created_at, " +
                     "u.id AS peer_user_id, u.username AS peer_username, u.display_name AS peer_display_name, " +
                     "COALESCE(u.avatar_color, '#2563EB') AS peer_avatar_color, " +
                     "u.presence_status AS peer_presence_status, u.status AS peer_status, " +
                     "(SELECT dm.content FROM direct_messages dm " +
                     " WHERE dm.conversation_id = dc.id AND dm.deleted_at IS NULL " +
                     " ORDER BY dm.id DESC LIMIT 1) AS last_message_preview " +
                     "FROM direct_conversations dc " +
                     "JOIN users u ON u.id = (CASE WHEN dc.user_low_id = ? THEN dc.user_high_id ELSE dc.user_low_id END) " +
                     "WHERE dc.user_low_id = ? OR dc.user_high_id = ? " +
                     "ORDER BY COALESCE((SELECT MAX(dm2.id) FROM direct_messages dm2 WHERE dm2.conversation_id = dc.id), 0) DESC, dc.id DESC";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, userId);
            ps.setInt(2, userId);
            ps.setInt(3, userId);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(mapConversation(rs));
                }
            }
        } catch (SQLException e) {
            System.err.println("[DirectMessageDAO ERROR] Lỗi listConversations (userId=" + userId + "): " + e.getMessage());
        }
        return list;
    }

    /**
     * Lấy hoặc tạo mới cuộc hội thoại 1-1 giữa userA (người gọi) và userB (đối phương).
     */
    public DirectConversation getOrCreateConversation(int userA, int userB) {
        if (userA <= 0 || userB <= 0 || userA == userB) return null;

        int low = Math.min(userA, userB);
        int high = Math.max(userA, userB);

        String upsertSql = "INSERT INTO direct_conversations (user_low_id, user_high_id) VALUES (?, ?) " +
                           "ON CONFLICT (user_low_id, user_high_id) DO NOTHING";
        String selectSql = "SELECT dc.id, dc.user_low_id, dc.user_high_id, dc.created_at, " +
                           "u.id AS peer_user_id, u.username AS peer_username, u.display_name AS peer_display_name, " +
                           "COALESCE(u.avatar_color, '#2563EB') AS peer_avatar_color, " +
                           "u.presence_status AS peer_presence_status, u.status AS peer_status, " +
                           "(SELECT dm.content FROM direct_messages dm " +
                           " WHERE dm.conversation_id = dc.id AND dm.deleted_at IS NULL " +
                           " ORDER BY dm.id DESC LIMIT 1) AS last_message_preview " +
                           "FROM direct_conversations dc " +
                           "JOIN users u ON u.id = ? " +
                           "WHERE dc.user_low_id = ? AND dc.user_high_id = ?";

        try (Connection conn = DatabaseConnection.getConnection()) {
            try (PreparedStatement upPs = conn.prepareStatement(upsertSql)) {
                upPs.setInt(1, low);
                upPs.setInt(2, high);
                upPs.executeUpdate();
            }

            try (PreparedStatement selPs = conn.prepareStatement(selectSql)) {
                selPs.setInt(1, userB);
                selPs.setInt(2, low);
                selPs.setInt(3, high);
                try (ResultSet rs = selPs.executeQuery()) {
                    if (rs.next()) {
                        return mapConversation(rs);
                    }
                }
            }
        } catch (SQLException e) {
            System.err.println("[DirectMessageDAO ERROR] Lỗi getOrCreateConversation (" + userA + ", " + userB + "): " + e.getMessage());
        }
        return null;
    }

    /**
     * Lấy danh sách tin nhắn trong cuộc trò chuyện 1-1 theo con trỏ beforeId, trả về thứ tự TĂNG DẦN (ASC).
     */
    public List<DirectMessage> getMessages(long conversationId, Long beforeId, int limit) {
        List<DirectMessage> list = new ArrayList<>();
        int validLimit = (limit <= 0 || limit > 200) ? 50 : limit;
        boolean hasCursor = beforeId != null && beforeId > 0;

        String sql = "SELECT dm.id, dm.conversation_id, dm.sender_id, u.display_name, " +
                     "COALESCE(u.avatar_color, '#2563EB') AS avatar_color, " +
                     "dm.content, dm.sent_at, dm.edited_at, dm.deleted_at, dm.reply_to_message_id " +
                     "FROM direct_messages dm " +
                     "JOIN users u ON dm.sender_id = u.id " +
                     "WHERE dm.conversation_id = ? " +
                     (hasCursor ? "AND dm.id < ? " : "") +
                     "ORDER BY dm.id DESC LIMIT ?";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            int idx = 1;
            ps.setLong(idx++, conversationId);
            if (hasCursor) {
                ps.setLong(idx++, beforeId);
            }
            ps.setInt(idx, validLimit);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Timestamp sentTs = rs.getTimestamp("sent_at");
                    Timestamp editedTs = rs.getTimestamp("edited_at");
                    Timestamp deletedTs = rs.getTimestamp("deleted_at");
                    Long replyId = rs.getObject("reply_to_message_id") != null ? rs.getLong("reply_to_message_id") : null;
                    list.add(new DirectMessage(
                        rs.getLong("id"),
                        rs.getLong("conversation_id"),
                        rs.getInt("sender_id"),
                        rs.getString("display_name"),
                        rs.getString("avatar_color"),
                        rs.getString("content"),
                        sentTs != null ? sentTs.toString() : "",
                        editedTs != null ? editedTs.toString() : null,
                        deletedTs != null ? deletedTs.toString() : null,
                        replyId
                    ));
                }
            }
            Collections.reverse(list);
            hydrateDmAttachments(conn, conversationId, list);
        } catch (SQLException e) {
            System.err.println("[DirectMessageDAO ERROR] Lỗi getMessages (conversationId=" + conversationId + "): " + e.getMessage());
        }
        return list;
    }

    private void hydrateDmAttachments(Connection conn, long conversationId, List<DirectMessage> messages) {
        if (messages == null || messages.isEmpty()) return;

        Map<Integer, DirectMessage> byId = new LinkedHashMap<>();
        StringBuilder placeholders = new StringBuilder();
        for (DirectMessage dm : messages) {
            byId.put((int) dm.getId(), dm);
            if (placeholders.length() > 0) placeholders.append(",");
            placeholders.append("?");
        }

        String sql = "SELECT id, uploader_id, room_id, direct_conversation_id, message_id, " +
                     "original_name, stored_name, content_type, size_bytes, sha256, created_at " +
                     "FROM attachments WHERE direct_conversation_id = ? AND message_id IN (" + placeholders + ") ORDER BY id ASC";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            int idx = 1;
            ps.setLong(idx++, conversationId);
            for (Integer msgId : byId.keySet()) {
                ps.setInt(idx++, msgId);
            }
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    int msgId = rs.getInt("message_id");
                    DirectMessage target = byId.get(msgId);
                    if (target != null) {
                        Timestamp ts = rs.getTimestamp("created_at");
                        target.getAttachments().add(new Attachment(
                            rs.getLong("id"),
                            rs.getInt("uploader_id"),
                            null,
                            conversationId,
                            msgId,
                            rs.getString("original_name"),
                            rs.getString("stored_name"),
                            rs.getString("content_type"),
                            rs.getLong("size_bytes"),
                            rs.getString("sha256"),
                            ts != null ? ts.toString() : ""
                        ));
                    }
                }
            }
        } catch (SQLException ignored) {
        }
    }

    /**
     * Lưu một tin nhắn trực tiếp 1-1 mới và gắn kết các tệp đính kèm nếu có.
     */
    public DirectMessage saveDirectMessage(long conversationId, int senderId, String content,
                                           Long replyToId, List<Long> attachmentIds) {
        boolean hasAttachments = attachmentIds != null && !attachmentIds.isEmpty();
        if ((content == null || content.isBlank()) && !hasAttachments) {
            return null;
        }
        String finalContent = (content != null && !content.isBlank()) ? content.trim() : "[Attachment]";

        String insertSql = "INSERT INTO direct_messages (conversation_id, sender_id, content, reply_to_message_id) " +
                           "VALUES (?, ?, ?, ?) RETURNING id, sent_at";

        try (Connection conn = DatabaseConnection.getConnection()) {
            long msgId = -1;
            String sentAtStr = "";
            try (PreparedStatement ps = conn.prepareStatement(insertSql)) {
                ps.setLong(1, conversationId);
                ps.setInt(2, senderId);
                ps.setString(3, finalContent);
                if (replyToId != null && replyToId > 0) {
                    ps.setLong(4, replyToId);
                } else {
                    ps.setNull(4, Types.BIGINT);
                }
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        msgId = rs.getLong("id");
                        Timestamp ts = rs.getTimestamp("sent_at");
                        sentAtStr = ts != null ? ts.toString() : "";
                    }
                }
            }

            if (msgId <= 0) return null;

            if (hasAttachments) {
                String linkSql = "UPDATE attachments SET direct_conversation_id = ?, room_id = NULL, message_id = ? WHERE id = ?";
                try (PreparedStatement attPs = conn.prepareStatement(linkSql)) {
                    for (Long attId : attachmentIds) {
                        if (attId == null || attId <= 0) continue;
                        attPs.setLong(1, conversationId);
                        attPs.setInt(2, (int) msgId);
                        attPs.setLong(3, attId);
                        attPs.addBatch();
                    }
                    attPs.executeBatch();
                } catch (SQLException ignored) {
                }
            }

            String senderDisplayName = "User#" + senderId;
            String senderAvatarColor = "#2563EB";
            try (PreparedStatement uPs = conn.prepareStatement(
                    "SELECT display_name, COALESCE(avatar_color, '#2563EB') AS avatar_color FROM users WHERE id = ?")) {
                uPs.setInt(1, senderId);
                try (ResultSet uRs = uPs.executeQuery()) {
                    if (uRs.next()) {
                        senderDisplayName = uRs.getString("display_name");
                        senderAvatarColor = uRs.getString("avatar_color");
                    }
                }
            } catch (SQLException ignored) {
            }

            DirectMessage dm = new DirectMessage(
                msgId, conversationId, senderId,
                senderDisplayName, senderAvatarColor,
                finalContent, sentAtStr, null, null, replyToId
            );
            hydrateDmAttachments(conn, conversationId, Collections.singletonList(dm));
            return dm;
        } catch (SQLException e) {
            System.err.println("[DirectMessageDAO ERROR] Lỗi saveDirectMessage (conversationId=" + conversationId + "): " + e.getMessage());
            return null;
        }
    }
}
