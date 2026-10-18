package com.discordmini.server.model;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class Message {
    private int id;
    private int roomId;
    private int channelId;
    private int userId; // sender_id
    private String sender; // sender display_name
    private String content;
    private String timestamp; // formatted sent_at
    private boolean isEdited = false;

    public Message(int id, int roomId, int channelId, int userId, String sender, String content, String timestamp, boolean isEdited) {
        this.id = id;
        this.roomId = roomId;
        this.channelId = channelId;
        this.userId = userId;
        this.sender = sender;
        this.content = content;
        this.timestamp = timestamp;
        this.isEdited = isEdited;
    }

    public Message(int id, int roomId, int channelId, int userId, String sender, String content, String timestamp) {
        this(id, roomId, channelId, userId, sender, content, timestamp, false);
    }

    public Message(int id, int roomId, int userId, String sender, String content, String timestamp, boolean isEdited) {
        this(id, roomId, 0, userId, sender, content, timestamp, isEdited);
    }

    public Message(int id, int roomId, int userId, String sender, String content, String timestamp) {
        this(id, roomId, 0, userId, sender, content, timestamp, false);
    }

    public Message(int id, int roomId, int userId, String sender, String content) {
        this(id, roomId, 0, userId, sender, content,
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")), false);
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public int getRoomId() { return roomId; }
    public void setRoomId(int roomId) { this.roomId = roomId; }

    public int getChannelId() { return channelId; }
    public void setChannelId(int channelId) { this.channelId = channelId; }

    public int getUserId() { return userId; }
    public int getSenderId() { return userId; }
    public void setUserId(int userId) { this.userId = userId; }

    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getTimestamp() { return timestamp; }
    public String getSentAt() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public boolean isEdited() { return isEdited; }
    public void setEdited(boolean edited) { this.isEdited = edited; }

    @Override
    public String toString() {
        return "Message{id=" + id + ", roomId=" + roomId + ", userId=" + userId + ", sender='" + sender + "', content='" + content + "', timestamp='" + timestamp + "', isEdited=" + isEdited + "}";
    }
}
