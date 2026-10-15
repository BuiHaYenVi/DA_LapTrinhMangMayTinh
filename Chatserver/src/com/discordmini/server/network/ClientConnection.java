package com.discordmini.server.network;

import java.io.*;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

public class ClientConnection implements Closeable {
    private final Socket socket;
    private final BufferedReader in;
    private final PrintWriter out;

    public ClientConnection(Socket socket) throws IOException {
        this.socket = socket;
        this.in = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
        this.out = new PrintWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8), true);
    }
    public String readLine() throws IOException { return in.readLine(); }
    public synchronized void send(String line) {
        if (out != null) {
            out.println(line);
        }
    }
    @Override public void close() throws IOException { socket.close(); }
}
