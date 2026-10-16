package com.discordmini.server.service;

import com.discordmini.server.dao.MessageDAO;
import com.discordmini.server.model.Message;
import com.discordmini.server.model.User;

import java.util.ArrayList;
import java.util.List;

/**
 * Service xử lý tin nhắn kết hợp ChatPersistenceService để đảm bảo
 * tin nhắn được lưu vào PostgreSQL trước khi được gửi tới Client.
 */
public class ChatService {
    private final MessageDAO messageDAO;
    private final ChatPersistenceService persistenceService;

    public ChatService(MessageDAO messageDAO) {
        this.messageDAO = messageDAO != null ? messageDAO : new MessageDAO();
        this.persistenceService = new ChatPersistenceService(this.messageDAO);
    }

    /**
     * [HAI-06] Ghi tin nhắn vào PostgreSQL đồng bộ trước khi cho phép broadcast.
     */
    public Message save(int roomId, User user, String content) throws Exception {
        if (user == null) {
            throw new IllegalArgumentException("User không hợp lệ.");
        }
        return persistenceService.persistBeforeBroadcast(roomId, user.getId(), user.getDisplayName(), content);
    }

    /**
     * [HAI-07] Truy vấn lịch sử tin nhắn của phòng.
     */
    public List<Message> history(int roomId) {
        try {
            return persistenceService.fetchHistory(roomId, 100);
        } catch (Exception e) {
            System.err.println("[ChatService ERROR] Lỗi lấy lịch sử chat: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    public ChatPersistenceService getPersistenceService() {
        return persistenceService;
    }
}
