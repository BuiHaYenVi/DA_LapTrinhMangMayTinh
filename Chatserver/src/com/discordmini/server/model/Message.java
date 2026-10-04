package com.discordmini.server.model;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class Message {
    private final int id;
    private final int roomId;
    private final int userId;
    private final String sender;
    private final String content;
    private final String timestamp;

    public Message(int id, int roomId, int userId, String sender, String content, String timestamp) {
        this.id = id;
        this.roomId = roomId;
        this.userId = userId;
        this.sender = sender;
        this.content = content;
        this.timestamp = timestamp;
    }

    public Message(int id, int roomId, int userId, String sender, String content) {
        this(id, roomId, userId, sender, content,
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
    }

    public int getId() { return id; }
    public int getRoomId() { return roomId; }
    public int getUserId() { return userId; }
    public String getSender() { return sender; }
    public String getContent() { return content; }
    public String getTimestamp() { return timestamp; }
}
