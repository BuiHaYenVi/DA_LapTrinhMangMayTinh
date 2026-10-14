package com.discordmini.client.service;
import com.discordmini.client.network.SocketClient;
public class ChatService {
    private final SocketClient client;
    public ChatService(SocketClient client) { this.client = client; }
    public void sendMessage(String content) { client.sendCommand("SEND_MESSAGE", content); }
    public void sendPrivateMessage(int targetUserId, String content) { client.sendCommand("SEND_PRIVATE_MESSAGE", String.valueOf(targetUserId), content); }
    public void getHistory() { client.sendCommand("GET_HISTORY"); }
}
