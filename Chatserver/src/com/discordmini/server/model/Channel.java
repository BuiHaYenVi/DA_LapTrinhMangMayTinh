package com.discordmini.server.model;

import java.sql.Timestamp;

public class Channel {
    private int id;
    private int roomId;
    private String name;
    private Timestamp createdAt;

    public Channel(int id, int roomId, String name) {
        this(id, roomId, name, null);
    }

    public Channel(int id, int roomId, String name, Timestamp createdAt) {
        this.id = id;
        this.roomId = roomId;
        this.name = name;
        this.createdAt = createdAt;
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

    @Override
    public String toString() {
        return "Channel{id=" + id + ", roomId=" + roomId + ", name='" + name + "'}";
    }
}
