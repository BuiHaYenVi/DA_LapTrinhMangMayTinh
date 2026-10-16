package com.discordmini.client.network;

import com.discordmini.client.protocol.ProtocolHandler;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/**
 * Owns one TCP connection and the client-side reliability checks.
 *
 * Requests carry a unique @RID trailer. The server responds with ACK|id|OK
 * after successful handling, or ERROR|encodedMessage|id on failure. Requests
 * are not retried automatically: blindly retrying SEND_MESSAGE could duplicate
 * a message if the original response was merely delayed.
 */
public class SocketClient {
    private static final int CONNECT_TIMEOUT_MS = 5_000;
    private static final long HEARTBEAT_INTERVAL_MS = 15_000;
    private static final long HEARTBEAT_TIMEOUT_MS = 40_000;
    private static final long REQUEST_TIMEOUT_MS = 10_000;

    private Socket socket;
    private BufferedReader in;
    private PrintWriter out;
    private Thread readerThread;
    private volatile Consumer<String> listener;
    private volatile boolean connected;
    private volatile long lastPongAt;
    private volatile long lastPingAt;
    private volatile long generation;
    private ScheduledFuture<?> monitorTask;

    private final ScheduledExecutorService monitor =
            Executors.newSingleThreadScheduledExecutor(r -> {
                Thread t = new Thread(r, "ChatClient-ReliabilityMonitor");
                t.setDaemon(true);
                return t;
            });
    private final ConcurrentMap<String, PendingRequest> pendingRequests = new ConcurrentHashMap<>();

    private record PendingRequest(long createdAt, String command) {}

    public void setListener(Consumer<String> listener) {
        this.listener = listener;
    }

    public synchronized void connect(String host, int port) throws IOException {
        if (isConnected()) return;
        closeSocketQuietly();

        Socket newSocket = new Socket();
        newSocket.connect(new InetSocketAddress(host, port), CONNECT_TIMEOUT_MS);
        newSocket.setKeepAlive(true);

        socket = newSocket;
        in = new BufferedReader(new InputStreamReader(newSocket.getInputStream(), StandardCharsets.UTF_8));
        out = new PrintWriter(new OutputStreamWriter(newSocket.getOutputStream(), StandardCharsets.UTF_8), true);
        connected = true;
        long thisGeneration = ++generation;
        lastPongAt = System.currentTimeMillis();
        lastPingAt = 0;

        BufferedReader reader = in;
        readerThread = new Thread(() -> readLoop(reader, thisGeneration), "ServerListener");
        readerThread.setDaemon(true);
        readerThread.start();

        if (monitorTask != null) monitorTask.cancel(false);
        monitorTask = monitor.scheduleAtFixedRate(
                () -> monitorConnection(thisGeneration), 1, 1, TimeUnit.SECONDS);
    }

    public boolean isConnected() {
        Socket current = socket;
        return connected && current != null && current.isConnected() && !current.isClosed();
    }

    /**
     * Sends a command with a request ID. The command name and its existing
     * fields remain unchanged; the optional trailer is backwards-compatible
     * with handlers that only read the fields they need.
     */
    public void send(String command) {
        if (command == null || command.isBlank() || !isConnected()) return;

        final String commandName;
        try {
            commandName = ProtocolHandler.split(command)[0];
        } catch (IllegalArgumentException ex) {
            notifyListener("PROTOCOL_ERROR|" + ProtocolHandler.encode(ex.getMessage()));
            return;
        }

        String requestId = UUID.randomUUID().toString();
        String framed = command + "|" + ProtocolHandler.REQUEST_ID_MARKER + "|" + requestId;
        if (framed.length() > ProtocolHandler.MAX_LINE_LENGTH) {
            notifyListener("PROTOCOL_ERROR|" + ProtocolHandler.encode("Request exceeds maximum frame length."));
            return;
        }

        pendingRequests.put(requestId, new PendingRequest(System.currentTimeMillis(), commandName));
        if (!writeRaw(framed)) {
            pendingRequests.remove(requestId);
            markDisconnected(generation);
        }
    }

    public void sendCommand(String type, String... fields) {
        send(ProtocolHandler.command(type, fields));
    }

    public synchronized void close() {
        connected = false;
        generation++;
        if (monitorTask != null) {
            monitorTask.cancel(false);
            monitorTask = null;
        }
        pendingRequests.clear();
        closeSocketQuietly();
    }

    private void readLoop(BufferedReader reader, long readerGeneration) {
        try {
            String line;
            while (isGenerationConnected(readerGeneration) && (line = reader.readLine()) != null) {
                if (line.length() > ProtocolHandler.MAX_LINE_LENGTH) {
                    notifyListener("PROTOCOL_ERROR|" + ProtocolHandler.encode("Server frame exceeded maximum length."));
                    markDisconnected(readerGeneration);
                    return;
                }
                handleControlFrame(line);
                notifyListener(line);
            }
        } catch (IOException ex) {
            markDisconnected(readerGeneration);
        } finally {
            markDisconnected(readerGeneration);
        }
    }

    private void handleControlFrame(String line) {
        try {
            String[] parts = ProtocolHandler.split(line);
            if ("PONG".equals(parts[0])) {
                lastPongAt = System.currentTimeMillis();
            } else if ("ACK".equals(parts[0]) && parts.length >= 2) {
                pendingRequests.remove(parts[1]);
            } else if ("ERROR".equals(parts[0]) && parts.length >= 3) {
                pendingRequests.remove(parts[2]);
            }
        } catch (IllegalArgumentException ignored) {
            // The UI receives the frame and can report a protocol problem.
        }
    }

    private void monitorConnection(long monitorGeneration) {
        if (!isGenerationConnected(monitorGeneration)) return;
        long now = System.currentTimeMillis();

        for (var entry : pendingRequests.entrySet()) {
            PendingRequest request = entry.getValue();
            if (now - request.createdAt() >= REQUEST_TIMEOUT_MS
                    && pendingRequests.remove(entry.getKey(), request)) {
                notifyListener("REQUEST_TIMEOUT|" + entry.getKey() + "|" + request.command());
            }
        }

        if (now - lastPongAt >= HEARTBEAT_TIMEOUT_MS) {
            markDisconnected(monitorGeneration);
            return;
        }

        if (now - lastPingAt >= HEARTBEAT_INTERVAL_MS) {
            lastPingAt = now;
            // Heartbeat is intentionally not tracked as a user request.
            if (!writeRaw("PING")) markDisconnected(monitorGeneration);
        }
    }

    private boolean writeRaw(String line) {
        synchronized (this) {
            if (!connected || out == null) return false;
            out.println(line);
            return !out.checkError();
        }
    }

    private boolean isGenerationConnected(long expectedGeneration) {
        return connected && generation == expectedGeneration;
    }

    private void markDisconnected(long expectedGeneration) {
        Consumer<String> callback;
        synchronized (this) {
            if (generation != expectedGeneration || !connected) return;
            connected = false;
            if (monitorTask != null) {
                monitorTask.cancel(false);
                monitorTask = null;
            }
            pendingRequests.clear();
            closeSocketQuietly();
            callback = listener;
        }
        if (callback != null) callback.accept("CLIENT_DISCONNECTED");
    }

    private synchronized void closeSocketQuietly() {
        try {
            if (socket != null) socket.close();
        } catch (IOException ignored) {
        } finally {
            socket = null;
            in = null;
            out = null;
        }
    }

    private void notifyListener(String packet) {
        Consumer<String> callback = listener;
        if (callback != null) {
            try {
                callback.accept(packet);
            } catch (RuntimeException ex) {
                // A UI callback failure must not silently kill the socket reader.
                System.err.println("[CLIENT] Listener error: " + ex.getMessage());
            }
        }
    }
}
