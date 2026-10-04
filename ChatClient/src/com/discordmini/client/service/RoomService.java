package com.discordmini.client.service;
import com.discordmini.client.network.SocketClient;
public class RoomService {
    private final SocketClient client;
    public RoomService(SocketClient client) { this.client = client; }
    public void listRooms() { client.sendCommand("LIST_ROOMS"); }
    public void createRoom(String name) { client.sendCommand("CREATE_ROOM", name); }
    public void joinRoom(int roomId) { client.send("JOIN_ROOM|" + roomId); }
    public void leaveRoom() { client.sendCommand("LEAVE_ROOM"); }
}
