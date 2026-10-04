package com.discordmini.server.dao;

import com.discordmini.server.model.Message;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class MessageDAO {

    public Message save(int roomId, int userId, String senderDisplayName, String content) throws SQLException {
        String sql = "INSERT INTO messages (room_id, user_id, content) VALUES (?, ?, ?) RETURNING id, created_at";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, roomId);
            ps.setInt(2, userId);
            ps.setString(3, content);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                int id = rs.getInt("id");
                Timestamp ts = rs.getTimestamp("created_at");
                String timestampStr = ts != null ? ts.toString() : "";
                return new Message(id, roomId, userId, senderDisplayName, content, timestampStr);
            }
        }
        return null;
    }

    public List<Message> history(int roomId) throws SQLException {
        List<Message> list = new ArrayList<>();
        String sql = "SELECT m.id, m.room_id, m.user_id, u.display_name, m.content, m.created_at " +
                     "FROM messages m JOIN users u ON m.user_id = u.id " +
                     "WHERE m.room_id = ? ORDER BY m.created_at ASC";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, roomId);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                Timestamp ts = rs.getTimestamp("created_at");
                String timestampStr = ts != null ? ts.toString() : "";
                list.add(new Message(
                    rs.getInt("id"),
                    rs.getInt("room_id"),
                    rs.getInt("user_id"),
                    rs.getString("display_name"),
                    rs.getString("content"),
                    timestampStr
                ));
            }
        }
        return list;
    }
}
