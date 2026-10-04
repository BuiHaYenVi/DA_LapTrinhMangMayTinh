package com.discordmini.client.network;

import java.util.function.Consumer;

public class ServerListener {
    private final SocketClient client;
    private Consumer<String> consumer;
    public ServerListener(SocketClient client) { this.client = client; }
    public void setConsumer(Consumer<String> consumer) { this.consumer = consumer; client.setListener(consumer); }
}
