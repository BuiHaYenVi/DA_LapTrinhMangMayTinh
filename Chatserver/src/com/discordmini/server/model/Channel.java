package com.discordmini.server.model;

import java.sql.Timestamp;

public class Channel {
    private int id;
    private int roomId;
    private String name;
    private Timestamp createdAt;
    private String type;
    private boolean isPrivate;

    public Channel(int id, int roomId, String name) {
        this(id, roomId, name, null, "text", false);
    }

    public Channel(int id, int roomId, String name, Timestamp createdAt) {
        this(id, roomId, name, createdAt, "text", false);
    }

    public Channel(int id, int roomId, String name, Timestamp createdAt, String type, boolean isPrivate) {
        this.id = id;
        this.roomId = roomId;
        this.name = name;
        this.createdAt = createdAt;
        this.type = normalizeType(type);
        this.isPrivate = isPrivate;
    }

    public static String normalizeType(String type) {
        if (type == null || type.isBlank()) return "text";
        String t = type.trim().toLowerCase();
        if ("forum".equals(t) || "voice".equals(t) || "text".equals(t)) {
            return t;
        }
        return "text";
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getRoomId() {
        return roomId;
    }

    public void setRoomId(int roomId) {
        this.roomId = roomId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Timestamp getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Timestamp createdAt) {
        this.createdAt = createdAt;
    }

    public String getType() {
        return type == null || type.isBlank() ? "text" : type;
    }

    public void setType(String type) {
        this.type = normalizeType(type);
    }

    public boolean isPrivate() {
        return isPrivate;
    }

    public void setPrivate(boolean aPrivate) {
        isPrivate = aPrivate;
    }

    @Override
    public String toString() {
        return "Channel{id=" + id + ", roomId=" + roomId + ", name='" + name + "', type='" + getType() + "', isPrivate=" + isPrivate + "}";
    }
}
