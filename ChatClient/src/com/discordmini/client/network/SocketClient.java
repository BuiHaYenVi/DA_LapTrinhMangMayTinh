package com.discordmini.client.network;

import com.discordmini.client.protocol.ProtocolHandler;
import java.io.*;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.function.Consumer;

public class SocketClient {
    private Socket socket;
    private BufferedReader in;
    private PrintWriter out;
    private Thread readerThread;
    private Consumer<String> listener;

    public void setListener(Consumer<String> listener) { this.listener = listener; }

    public synchronized void connect(String host, int port) throws IOException {
        if (isConnected()) return;
        socket = new Socket(host, port);
        socket.setKeepAlive(true);
        in = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
        out = new PrintWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8), true);
        readerThread = new Thread(() -> {
            try {
                String line;
                while ((line = in.readLine()) != null) {
                    if (listener != null) listener.accept(line);
                }
            } catch (IOException ignored) {
                if (listener != null) listener.accept("CLIENT_DISCONNECTED");
            }
        }, "ServerListener");
        readerThread.setDaemon(true);
        readerThread.start();
    }

    public synchronized boolean isConnected() { return socket != null && socket.isConnected() && !socket.isClosed(); }

    public synchronized void send(String command) {
        if (out != null) out.println(command);
    }

    public void sendCommand(String type, String... fields) { send(ProtocolHandler.command(type, fields)); }

    public synchronized void close() {
        try { if (socket != null) socket.close(); } catch (IOException ignored) {}
    }
}
