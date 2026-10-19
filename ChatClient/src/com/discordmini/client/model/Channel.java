package com.discordmini.client.model;

public record Channel(int id, int roomId, String name) {
    public int getId() { return id; }
    public int getRoomId() { return roomId; }
    public String getName() { return name; }
}
