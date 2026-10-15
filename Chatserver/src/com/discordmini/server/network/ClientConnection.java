package com.discordmini.server.network;

import java.io.BufferedReader;
import java.io.Closeable;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

public class ClientConnection implements Closeable {
    /** Must exceed the client's 15-second heartbeat interval. */
    public static final int READ_TIMEOUT_MS = 45_000;

    private final Socket socket;
    private final BufferedReader in;
    private final PrintWriter out;

    public ClientConnection(Socket socket) throws IOException {
        this.socket = socket;
        this.socket.setKeepAlive(true);
        this.socket.setSoTimeout(READ_TIMEOUT_MS);
        this.in = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
        this.out = new PrintWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8), true);
    }

    public String readLine() throws IOException {
        return in.readLine();
    }

    public synchronized void send(String line) {
        if (out != null) {
            out.println(line);
            if (out.checkError()) {
                try {
                    socket.close();
                } catch (IOException ignored) {
                }
            }
        }
    }

    public boolean isClosed() {
    return socket.isClosed();
    }

    @Override
    public synchronized void close() throws IOException {
        socket.close();
    }
}
