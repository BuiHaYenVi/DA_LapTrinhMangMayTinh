package com.discordmini.client.network;

public class ConnectionManager {
    private final SocketClient client;
    public ConnectionManager(SocketClient client) { this.client = client; }
    public SocketClient getClient() { return client; }
}
