package com.discordmini.server.model;

public class RoomMember {
    private final int roomId;
    private final int userId;

    public RoomMember(int roomId, int userId) {
        this.roomId = roomId;
        this.userId = userId;
    }

    public int getRoomId() { return roomId; }
    public int getUserId() { return userId; }
}
