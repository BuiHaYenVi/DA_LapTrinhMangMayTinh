package com.discordmini.server.service;

import com.discordmini.server.dao.MessageDAO;
import com.discordmini.server.model.Message;
import com.discordmini.server.model.User;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class ChatService {
    private final MessageDAO messageDAO;

    public ChatService(MessageDAO messageDAO) {
        this.messageDAO = messageDAO;
    }

    public Message save(int roomId, User user, String content) throws Exception {
        return messageDAO.save(roomId, user.getId(), user.getDisplayName(), content);
    }

    public List<Message> history(int roomId) {
        try {
            return messageDAO.history(roomId);
        } catch (SQLException e) {
            System.err.println("Loi lay lich su chat Database: " + e.getMessage());
            return new ArrayList<>();
        }
    }
}
