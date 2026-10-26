package com.discordmini.client.model;

public record Channel(int id, int roomId, String name, String type, boolean isPrivate) {
    public Channel(int id, int roomId, String name) {
        this(id, roomId, name, "text", false);
    }

    public int getId() { return id; }
    public int getRoomId() { return roomId; }
    public String getName() { return name; }
    public String getType() { return (type == null || type.isBlank()) ? "text" : type; }
    public boolean getIsPrivate() { return isPrivate; }
}
