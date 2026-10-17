package com.discordmini.client.bridge;

import com.discordmini.client.network.SocketClient;
import com.discordmini.client.protocol.ProtocolHandler;
import com.discordmini.client.service.AuthCallback;
import com.discordmini.client.service.AuthResult;
import com.discordmini.client.service.AuthService;
import com.discordmini.client.service.ChatService;
import com.discordmini.client.service.FriendService;
import com.discordmini.client.service.RoomService;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;

/**
 * UiBridgeServer: Cầu nối HTTP/SSE giữa giao diện Web (React/TypeScript) và tầng mạng Java TCP Client.
 *
 * Tính năng chính:
 * 1. Khởi động trước khi người dùng đăng nhập; cung cấp các endpoint xác thực:
 *    - POST /api/register
 *    - POST /api/login
 *    - GET  /api/session
 *    - POST /api/logout
 *    - GET  /api/status
 * 2. Quản lý phiên độc lập đa người dùng (Multi-Session):
 *    - Mỗi phiên được định danh bằng mã ngẫu nhiên qua Cookie HttpOnly `DISCORD_SESSION`.
 *    - Mỗi phiên sở hữu riêng một SocketClient kết nối TCP tới ChatServer, đảm bảo cách ly hoàn toàn dữ liệu.
 * 3. Bảo mật:
 *    - Bind loopback (127.0.0.1) an toàn.
 *    - Hỗ trợ CORS có định danh nguồn (không dùng '*') tương thích với Cookie/Credentials.
 *    - Kiểm tra CSRF/Origin cho các yêu cầu thay đổi dữ liệu.
 *    - Không log mật khẩu hay thông tin nhạy cảm.
 * 4. Phục vụ tĩnh frontend/dist với cơ chế SPA fallback và độc lập với thư mục làm việc của NetBeans.
 */
public class UiBridgeServer {
    public static final String SESSION_COOKIE_NAME = "DISCORD_SESSION";
    private static final int DEFAULT_PORT = 8080;

    private final int port;
    private final String chatServerHost;
    private final int chatServerPort;

    private HttpServer server;
    private int actualPort;

    private final Map<String, UserSession> sessions = new ConcurrentHashMap<>();

    public UiBridgeServer(int port, String chatServerHost, int chatServerPort) {
        this.port = port > 0 ? port : DEFAULT_PORT;
        this.actualPort = this.port;
        this.chatServerHost = (chatServerHost != null && !chatServerHost.isBlank()) ? chatServerHost : "127.0.0.1";
        this.chatServerPort = chatServerPort > 0 ? chatServerPort : 5000;
    }

    public UiBridgeServer(int port) {
        this(port, "127.0.0.1", 5000);
    }

    public UiBridgeServer() {
        this(DEFAULT_PORT, "127.0.0.1", 5000);
    }

    /**
     * Constructor tương thích ngược cho mã nguồn cũ nếu cần.
     */
    public UiBridgeServer(int port, SocketClient socketClient, int userId, String displayName) {
        this(port, "127.0.0.1", 5000);
        if (socketClient != null) {
            String seedSessionId = UUID.randomUUID().toString();
            UserSession session = new UserSession(seedSessionId, userId, displayName, displayName, socketClient, new AuthService(socketClient));
            sessions.put(seedSessionId, session);
        }
    }

    public int getPort() {
        return actualPort;
    }

    public String getChatServerHost() {
        return chatServerHost;
    }

    public int getChatServerPort() {
        return chatServerPort;
    }

    public Map<String, UserSession> getSessions() {
        return Collections.unmodifiableMap(sessions);
    }

    public void start() throws IOException {
        IOException lastEx = null;
        for (int p = port; p < port + 20; p++) {
            try {
                // Ràng buộc nghiêm ngặt vào loopback 127.0.0.1 theo yêu cầu an toàn
                server = HttpServer.create(new InetSocketAddress("127.0.0.1", p), 0);
                actualPort = p;
                break;
            } catch (IOException ex) {
                lastEx = ex;
            }
        }
        if (server == null) {
            throw (lastEx != null) ? lastEx : new IOException("Không thể mở cổng HTTP server trong khoảng " + port + "-" + (port + 20));
        }

        // Endpoint trạng thái kết nối máy chủ
        server.createContext("/api/status", new StatusHandler());

        // Các endpoint xác thực (Không yêu cầu session trước)
        server.createContext("/api/register", new RegisterHandler());
        server.createContext("/api/login", new LoginHandler());
        server.createContext("/api/session", new SessionHandler());
        server.createContext("/api/logout", new LogoutHandler());

        // Realtime SSE Stream (Yêu cầu session hợp lệ)
        server.createContext("/api/events", new SseHandler());

        // State & Action Endpoints (Yêu cầu session hợp lệ)
        server.createContext("/api/state", new StateHandler());
        server.createContext("/api/rooms/join", new JoinRoomHandler());
        server.createContext("/api/rooms/create", new CreateRoomHandler());
        server.createContext("/api/rooms/leave", new LeaveRoomHandler());
        server.createContext("/api/rooms/invite", new InviteRoomHandler());
        server.createContext("/api/rooms/kick", new KickRoomHandler());
        server.createContext("/api/messages/send", new SendMessageHandler());
        server.createContext("/api/messages/private", new SendPrivateMessageHandler());
        server.createContext("/api/friends/request", new FriendRequestHandler());
        server.createContext("/api/friends/accept", new FriendAcceptHandler());
        server.createContext("/api/friends/reject", new FriendRejectHandler());
        server.createContext("/api/friends/refresh", new FriendRefreshHandler());
        server.createContext("/api/friends/search", new FriendSearchHandler());

        // Phục vụ frontend tĩnh với SPA fallback
        server.createContext("/", new StaticFileHandler());

        server.setExecutor(Executors.newCachedThreadPool());
        server.start();
    }

    public void stop() {
        for (UserSession s : sessions.values()) {
            try {
                s.close();
            } catch (Exception ignored) {}
        }
        sessions.clear();
        if (server != null) {
            server.stop(0);
        }
    }

    // ==========================================
    // Quản lý Phiên Người dùng (UserSession)
    // ==========================================

    public static class UserSession {
        public final String sessionId;
        public final int userId;
        public final String username;
        public final String displayName;
        public final SocketClient socketClient;
        public final AuthService authService;
        public final RoomService roomService;
        public final ChatService chatService;
        public final FriendService friendService;

        public final List<PrintWriter> sseClients = new CopyOnWriteArrayList<>();

        public volatile Integer currentRoomId = null;
        public volatile String currentRoomName = "";
        public final List<Map<String, Object>> roomCache = new CopyOnWriteArrayList<>();
        public final List<Map<String, Object>> messageCache = new CopyOnWriteArrayList<>();
        public final List<Map<String, Object>> memberCache = new CopyOnWriteArrayList<>();
        public final List<Map<String, Object>> friendCache = new CopyOnWriteArrayList<>();
        public final List<Map<String, Object>> pendingCache = new CopyOnWriteArrayList<>();

        private final Consumer<String> packetListener;
        private final Consumer<String> connectionListener;
        private final AtomicBoolean closed = new AtomicBoolean(false);

        public UserSession(String sessionId, int userId, String username, String displayName,
                           SocketClient socketClient, AuthService authService) {
            this.sessionId = sessionId;
            this.userId = userId;
            this.username = username;
            this.displayName = displayName;
            this.socketClient = socketClient;
            this.authService = authService;
            this.roomService = new RoomService(socketClient);
            this.chatService = new ChatService(socketClient);
            this.friendService = new FriendService(socketClient);

            this.packetListener = this::handleServerPacket;
            this.socketClient.addListener(this.packetListener);

            this.connectionListener = evt -> {
                if ("CLIENT_DISCONNECTED".equals(evt)) {
                    broadcastSse("STATUS", Map.of("connected", false, "reason", "Mất kết nối tới ChatServer"));
                }
            };
            this.socketClient.addConnectionListener(this.connectionListener);
        }

        public void broadcastSse(String event, Map<String, Object> data) {
            String json = JsonHelper.toJson(Map.of("event", event, "data", data));
            for (PrintWriter writer : sseClients) {
                try {
                    writer.print("data: " + json + "\n\n");
                    writer.flush();
                } catch (Exception e) {
                    sseClients.remove(writer);
                }
            }
        }

        private void handleServerPacket(String line) {
            String[] p = ProtocolHandler.split(line);
            if (p.length == 0) return;
            String opcode = p[0];

            switch (opcode) {
                case "ROOMS" -> {
                    roomCache.clear();
                    for (int i = 1; i < p.length; i++) {
                        String[] x = p[i].split(",", 2);
                        if (x.length == 2) {
                            Map<String, Object> r = new HashMap<>();
                            r.put("id", Integer.parseInt(x[0]));
                            r.put("name", ProtocolHandler.decode(x[1]));
                            roomCache.add(r);
                        }
                    }
                    broadcastSse("ROOMS", Map.of("rooms", roomCache));
                }
                case "OK" -> {
                    if (p.length > 1 && "JOIN_ROOM".equals(p[1])) {
                        currentRoomId = Integer.parseInt(p[2]);
                        currentRoomName = ProtocolHandler.decode(p[3]);
                        messageCache.clear();
                        broadcastSse("ROOM_JOINED", Map.of("room", Map.of("id", currentRoomId, "name", currentRoomName)));
                    } else if (p.length > 1 && "ROOM_CREATED".equals(p[1])) {
                        roomService.listRooms();
                    } else if (p.length > 1 && "FRIEND_ACCEPT".equals(p[1])) {
                        friendService.getPendingRequests();
                        friendService.getFriendList();
                    }
                }
                case "HISTORY_BEGIN" -> messageCache.clear();
                case "HISTORY_ITEM" -> {
                    int msgId = Integer.parseInt(p[1]);
                    String sender = ProtocolHandler.decode(p[2]);
                    String content = ProtocolHandler.decode(p[3]);
                    String time = ProtocolHandler.decode(p[4]);
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", msgId);
                    m.put("senderId", sender.equalsIgnoreCase(displayName) ? userId : 0);
                    m.put("senderName", sender);
                    m.put("content", content);
                    m.put("timestamp", time);
                    messageCache.add(m);
                }
                case "HISTORY_END" -> broadcastSse("HISTORY", Map.of("messages", messageCache));
                case "NEW_MESSAGE" -> {
                    int msgId = Integer.parseInt(p[1]);
                    String sender = ProtocolHandler.decode(p[3]);
                    String content = ProtocolHandler.decode(p[4]);
                    String time = ProtocolHandler.decode(p[5]);
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", msgId);
                    m.put("senderId", sender.equalsIgnoreCase(displayName) ? userId : 0);
                    m.put("senderName", sender);
                    m.put("content", content);
                    m.put("timestamp", time);
                    messageCache.add(m);
                    broadcastSse("NEW_MESSAGE", Map.of("message", m));
                }
                case "NEW_PRIVATE_MESSAGE" -> {
                    int sId = Integer.parseInt(p[1]);
                    String sName = ProtocolHandler.decode(p[2]);
                    String content = ProtocolHandler.decode(p[3]);
                    String time = ProtocolHandler.decode(p[4]);
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", (int) (System.currentTimeMillis() % 100000));
                    m.put("senderId", sId);
                    m.put("senderName", sName + " (Riêng)");
                    m.put("content", content);
                    m.put("timestamp", time);
                    messageCache.add(m);
                    broadcastSse("NEW_MESSAGE", Map.of("message", m));
                }
                case "ROOM_MEMBERS" -> {
                    memberCache.clear();
                    for (int i = 1; i < p.length; i++) {
                        String[] x = p[i].split(",", 4);
                        if (x.length >= 2) {
                            Map<String, Object> mem = new HashMap<>();
                            mem.put("id", Integer.parseInt(x[0]));
                            mem.put("displayName", ProtocolHandler.decode(x[1]));
                            mem.put("role", x.length >= 3 ? x[2] : "MEMBER");
                            mem.put("online", x.length >= 4 && "ONLINE".equalsIgnoreCase(x[3]));
                            memberCache.add(mem);
                        }
                    }
                    broadcastSse("MEMBERS", Map.of("members", memberCache));
                }
                case "FRIEND_LIST" -> {
                    friendCache.clear();
                    for (int i = 1; i < p.length; i++) {
                        String[] x = p[i].split(",", 4);
                        if (x.length >= 3) {
                            Map<String, Object> f = new HashMap<>();
                            f.put("id", Integer.parseInt(x[0]));
                            f.put("username", ProtocolHandler.decode(x[1]));
                            f.put("displayName", ProtocolHandler.decode(x[2]));
                            f.put("online", x.length >= 4 && "ONLINE".equalsIgnoreCase(x[3]));
                            friendCache.add(f);
                        }
                    }
                    broadcastSse("FRIENDS", Map.of("friends", friendCache));
                }
                case "FRIEND_PENDING_LIST" -> {
                    pendingCache.clear();
                    for (int i = 1; i < p.length; i++) {
                        String[] x = p[i].split(",", 5);
                        if (x.length >= 4) {
                            Map<String, Object> req = new HashMap<>();
                            req.put("requestId", Integer.parseInt(x[0]));
                            req.put("senderId", Integer.parseInt(x[1]));
                            req.put("senderUsername", ProtocolHandler.decode(x[2]));
                            req.put("senderDisplayName", ProtocolHandler.decode(x[3]));
                            req.put("time", x.length >= 5 ? ProtocolHandler.decode(x[4]) : "");
                            pendingCache.add(req);
                        }
                    }
                    broadcastSse("PENDING_REQUESTS", Map.of("requests", pendingCache));
                }
                case "FRIEND_SEARCH_RESULT" -> {
                    List<Map<String, Object>> searchResults = new ArrayList<>();
                    for (int i = 1; i < p.length; i++) {
                        String[] x = p[i].split(",", 5);
                        if (x.length >= 3) {
                            Map<String, Object> u = new HashMap<>();
                            u.put("id", Integer.parseInt(x[0]));
                            u.put("username", ProtocolHandler.decode(x[1]));
                            u.put("displayName", ProtocolHandler.decode(x[2]));
                            u.put("isFriend", x.length >= 4 && "FRIEND".equalsIgnoreCase(x[3]));
                            u.put("online", x.length >= 5 && "ONLINE".equalsIgnoreCase(x[4]));
                            searchResults.add(u);
                        }
                    }
                    broadcastSse("FRIEND_SEARCH_RESULT", Map.of("results", searchResults));
                }
                case "INCOMING_FRIEND_REQUEST" -> friendService.getPendingRequests();
                case "FRIEND_ACCEPTED" -> friendService.getFriendList();
                case "ROOM_INVITATION" -> roomService.listRooms();
                case "SYSTEM" -> {
                    String text = ProtocolHandler.decode(p[1]);
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", (int) (System.currentTimeMillis() % 100000));
                    m.put("senderId", -1);
                    m.put("senderName", "Hệ thống");
                    m.put("content", "🔔 " + text);
                    m.put("timestamp", "");
                    broadcastSse("NEW_MESSAGE", Map.of("message", m));
                }
                case "ERROR" -> broadcastSse("ERROR", Map.of("message", ProtocolHandler.decode(p[1])));
            }
        }

        public void close() {
            if (!closed.compareAndSet(false, true)) return;
            for (PrintWriter writer : sseClients) {
                try {
                    writer.close();
                } catch (Exception ignored) {}
            }
            sseClients.clear();
            try {
                socketClient.removeListener(packetListener);
            } catch (Exception ignored) {}
            try {
                socketClient.removeConnectionListener(connectionListener);
            } catch (Exception ignored) {}
            try {
                authService.logout();
            } catch (Exception ignored) {}
            try {
                socketClient.close();
            } catch (Exception ignored) {}
        }
    }

    // ==========================================
    // Session & Cookie Utilities
    // ==========================================

    private String extractSessionId(HttpExchange exchange) {
        String cookieHeader = exchange.getRequestHeaders().getFirst("Cookie");
        if (cookieHeader == null || cookieHeader.isBlank()) return null;
        String[] cookies = cookieHeader.split(";");
        for (String c : cookies) {
            String[] pair = c.trim().split("=", 2);
            if (pair.length == 2 && SESSION_COOKIE_NAME.equalsIgnoreCase(pair[0].trim())) {
                return pair[1].trim();
            }
        }
        return null;
    }

    private void setSessionCookie(HttpExchange exchange, String sessionId, int maxAgeSeconds) {
        StringBuilder sb = new StringBuilder();
        sb.append(SESSION_COOKIE_NAME).append("=").append(sessionId != null ? sessionId : "")
                .append("; Path=/; HttpOnly; SameSite=Lax");
        if (maxAgeSeconds >= 0) {
            sb.append("; Max-Age=").append(maxAgeSeconds);
        }
        if ("https".equalsIgnoreCase(exchange.getRequestURI().getScheme())) {
            sb.append("; Secure");
        }
        exchange.getResponseHeaders().set("Set-Cookie", sb.toString());
    }

    private UserSession requireSession(HttpExchange exchange) throws IOException {
        String sessionId = extractSessionId(exchange);
        if (sessionId == null) {
            sendJson(exchange, 401, Map.of(
                    "error", "UNAUTHORIZED",
                    "message", "Chưa đăng nhập. Vui lòng đăng nhập để tiếp tục."
            ));
            return null;
        }
        UserSession session = sessions.get(sessionId);
        if (session == null || !session.socketClient.isConnected()) {
            if (session != null) {
                sessions.remove(sessionId);
                session.close();
            }
            setSessionCookie(exchange, "", 0);
            sendJson(exchange, 401, Map.of(
                    "error", "SESSION_EXPIRED",
                    "message", "Phiên đăng nhập đã hết hạn hoặc mất kết nối tới ChatServer. Vui lòng đăng nhập lại."
            ));
            return null;
        }
        return session;
    }

    private boolean validateCsrf(HttpExchange exchange) {
        String origin = exchange.getRequestHeaders().getFirst("Origin");
        if (origin != null && !origin.isBlank()) {
            return origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:");
        }
        String referer = exchange.getRequestHeaders().getFirst("Referer");
        if (referer != null && !referer.isBlank()) {
            return referer.startsWith("http://localhost:") || referer.startsWith("http://127.0.0.1:");
        }
        return true;
    }

    private void addCorsHeaders(HttpExchange exchange) {
        String origin = exchange.getRequestHeaders().getFirst("Origin");
        if (origin != null && (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:"))) {
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", origin);
            exchange.getResponseHeaders().set("Access-Control-Allow-Credentials", "true");
        } else if (origin != null && !origin.isBlank()) {
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", origin);
            exchange.getResponseHeaders().set("Access-Control-Allow-Credentials", "true");
        }
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Cookie");
    }

    private void sendJson(HttpExchange exchange, int statusCode, Object data) throws IOException {
        addCorsHeaders(exchange);
        String json = JsonHelper.toJson(data);
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private String readBody(HttpExchange exchange) throws IOException {
        return new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
    }

    // ==========================================
    // HTTP Handlers: Trạng thái & Xác thực
    // ==========================================

    private class StatusHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            boolean online = false;
            try (Socket s = new Socket()) {
                s.connect(new InetSocketAddress(chatServerHost, chatServerPort), 1200);
                online = true;
            } catch (Exception ignored) {}

            sendJson(exchange, 200, Map.of(
                    "serverOnline", online,
                    "host", chatServerHost,
                    "port", chatServerPort
            ));
        }
    }

    private class RegisterHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJson(exchange, 405, Map.of("error", "METHOD_NOT_ALLOWED"));
                return;
            }
            if (!validateCsrf(exchange)) {
                sendJson(exchange, 403, Map.of("error", "FORBIDDEN", "message", "Từ chối yêu cầu do chính sách CSRF/Origin."));
                return;
            }

            Map<String, Object> body;
            try {
                body = JsonHelper.parseObject(readBody(exchange));
            } catch (Exception e) {
                sendJson(exchange, 400, Map.of("success", false, "message", "Dữ liệu JSON không hợp lệ: " + e.getMessage()));
                return;
            }

            String username = (String) body.get("username");
            String password = (String) body.get("password");
            String displayName = (String) body.get("displayName");

            if (username == null || username.isBlank()) {
                sendJson(exchange, 400, Map.of("success", false, "message", "Tên đăng nhập không được để trống."));
                return;
            }
            if (username.contains("|") || username.contains("\n") || username.contains("\r")) {
                sendJson(exchange, 400, Map.of("success", false, "message", "Tên đăng nhập không được chứa ký tự đặc biệt ('|')."));
                return;
            }
            if (password == null || password.isEmpty()) {
                sendJson(exchange, 400, Map.of("success", false, "message", "Mật khẩu không được để trống."));
                return;
            }
            if (password.contains("|") || password.contains("\n") || password.contains("\r")) {
                sendJson(exchange, 400, Map.of("success", false, "message", "Mật khẩu không được chứa ký tự đặc biệt ('|')."));
                return;
            }
            if (displayName != null && (displayName.contains("|") || displayName.contains("\n") || displayName.contains("\r"))) {
                sendJson(exchange, 400, Map.of("success", false, "message", "Tên hiển thị không được chứa ký tự đặc biệt ('|')."));
                return;
            }

            SocketClient tempClient = new SocketClient();
            try {
                tempClient.connect(chatServerHost, chatServerPort);
            } catch (IOException e) {
                tempClient.close();
                sendJson(exchange, 503, Map.of(
                        "success", false,
                        "message", "Không thể kết nối đến ChatServer tại " + chatServerHost + ":" + chatServerPort + ". Vui lòng đảm bảo Server Java đã được bật."
                ));
                return;
            }

            try {
                AuthService tempAuth = new AuthService(tempClient);
                CompletableFuture<AuthResult> future = new CompletableFuture<>();
                tempAuth.register(username, password, displayName, new AuthCallback() {
                    @Override
                    public void onSuccess(AuthResult result) {
                        future.complete(result);
                    }

                    @Override
                    public void onError(String errorMessage) {
                        future.completeExceptionally(new IllegalArgumentException(errorMessage));
                    }

                    @Override
                    public void onTimeout() {
                        future.completeExceptionally(new TimeoutException("Hết thời gian chờ phản hồi từ Server."));
                    }

                    @Override
                    public void onNetworkError() {
                        future.completeExceptionally(new IOException("Mất kết nối với ChatServer trong khi đăng ký."));
                    }
                });

                AuthResult result = future.get(10, TimeUnit.SECONDS);
                sendJson(exchange, 200, Map.of(
                        "success", true,
                        "message", result.message() != null ? result.message() : "Đăng ký thành công!"
                ));
            } catch (TimeoutException e) {
                sendJson(exchange, 504, Map.of("success", false, "message", "Hết thời gian chờ phản hồi từ Server (Timeout)."));
            } catch (ExecutionException e) {
                Throwable cause = e.getCause() != null ? e.getCause() : e;
                String msg = cause.getMessage();
                int status = 400;
                if (msg != null && (msg.contains("tồn tại") || msg.contains("USERNAME_TAKEN"))) {
                    status = 409;
                } else if (cause instanceof IOException) {
                    status = 503;
                }
                sendJson(exchange, status, Map.of("success", false, "message", msg != null ? msg : "Đăng ký thất bại."));
            } catch (Exception e) {
                sendJson(exchange, 500, Map.of("success", false, "message", "Lỗi nội bộ: " + e.getMessage()));
            } finally {
                tempClient.close();
            }
        }
    }

    private class LoginHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJson(exchange, 405, Map.of("error", "METHOD_NOT_ALLOWED"));
                return;
            }
            if (!validateCsrf(exchange)) {
                sendJson(exchange, 403, Map.of("error", "FORBIDDEN", "message", "Từ chối yêu cầu do chính sách CSRF/Origin."));
                return;
            }

            Map<String, Object> body;
            try {
                body = JsonHelper.parseObject(readBody(exchange));
            } catch (Exception e) {
                sendJson(exchange, 400, Map.of("success", false, "message", "Dữ liệu JSON không hợp lệ: " + e.getMessage()));
                return;
            }

            String username = (String) body.get("username");
            String password = (String) body.get("password");

            if (username == null || username.isBlank()) {
                sendJson(exchange, 400, Map.of("success", false, "message", "Vui lòng nhập tên đăng nhập."));
                return;
            }
            if (password == null || password.isEmpty()) {
                sendJson(exchange, 400, Map.of("success", false, "message", "Vui lòng nhập mật khẩu."));
                return;
            }

            // Hủy phiên cũ nếu trình duyệt này đang có session cookie trước đó
            String oldSessionId = extractSessionId(exchange);
            if (oldSessionId != null) {
                UserSession oldSession = sessions.remove(oldSessionId);
                if (oldSession != null) {
                    oldSession.close();
                }
            }

            SocketClient client = new SocketClient();
            try {
                client.connect(chatServerHost, chatServerPort);
            } catch (IOException e) {
                client.close();
                sendJson(exchange, 503, Map.of(
                        "success", false,
                        "message", "Không thể kết nối đến ChatServer tại " + chatServerHost + ":" + chatServerPort + ". Vui lòng đảm bảo Server Java đã được bật."
                ));
                return;
            }

            AuthService authService = new AuthService(client);
            CompletableFuture<AuthResult> future = new CompletableFuture<>();
            authService.login(username, password, new AuthCallback() {
                @Override
                public void onSuccess(AuthResult result) {
                    future.complete(result);
                }

                @Override
                public void onError(String errorMessage) {
                    future.completeExceptionally(new IllegalArgumentException(errorMessage));
                }

                @Override
                public void onTimeout() {
                    future.completeExceptionally(new TimeoutException("Hết thời gian chờ phản hồi từ Server."));
                }

                @Override
                public void onNetworkError() {
                    future.completeExceptionally(new IOException("Mất kết nối với ChatServer trong khi đăng nhập."));
                }
            });

            try {
                AuthResult result = future.get(10, TimeUnit.SECONDS);

                // Đăng nhập thành công -> sinh mã phiên ngẫu nhiên mới (Session Rotation)
                String sessionId = UUID.randomUUID().toString();
                UserSession session = new UserSession(sessionId, result.userId(), result.username(), result.displayName(), client, authService);
                sessions.put(sessionId, session);

                // Ghi cookie phiên an toàn HttpOnly
                setSessionCookie(exchange, sessionId, 86400 * 7);

                // Nạp khởi tạo danh sách phòng và bạn bè cho riêng phiên này
                session.roomService.listRooms();
                session.friendService.getFriendList();
                session.friendService.getPendingRequests();

                sendJson(exchange, 200, Map.of(
                        "success", true,
                        "user", Map.of(
                                "id", session.userId,
                                "username", session.username,
                                "displayName", session.displayName
                        )
                ));
            } catch (TimeoutException e) {
                client.close();
                sendJson(exchange, 504, Map.of("success", false, "message", "Hết thời gian chờ phản hồi từ Server (Timeout)."));
            } catch (ExecutionException e) {
                client.close();
                Throwable cause = e.getCause() != null ? e.getCause() : e;
                int status = (cause instanceof IOException) ? 503 : 401;
                sendJson(exchange, status, Map.of("success", false, "message", cause.getMessage()));
            } catch (Exception e) {
                client.close();
                sendJson(exchange, 500, Map.of("success", false, "message", "Lỗi nội bộ: " + e.getMessage()));
            }
        }
    }

    private class SessionHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            String sessionId = extractSessionId(exchange);
            if (sessionId == null) {
                sendJson(exchange, 200, Map.of("authenticated", false));
                return;
            }

            UserSession session = sessions.get(sessionId);
            if (session == null || !session.socketClient.isConnected()) {
                if (session != null) {
                    sessions.remove(sessionId);
                    session.close();
                }
                setSessionCookie(exchange, "", 0);
                sendJson(exchange, 200, Map.of("authenticated", false));
                return;
            }

            sendJson(exchange, 200, Map.of(
                    "authenticated", true,
                    "user", Map.of(
                            "id", session.userId,
                            "username", session.username,
                            "displayName", session.displayName
                    )
            ));
        }
    }

    private class LogoutHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            String sessionId = extractSessionId(exchange);
            if (sessionId != null) {
                UserSession session = sessions.remove(sessionId);
                if (session != null) {
                    session.close();
                }
            }

            setSessionCookie(exchange, "", 0);
            sendJson(exchange, 200, Map.of("success", true));
        }
    }

    // ==========================================
    // Realtime SSE Handler
    // ==========================================

    private class SseHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            UserSession session = requireSession(exchange);
            if (session == null) {
                return;
            }

            exchange.getResponseHeaders().set("Content-Type", "text/event-stream; charset=UTF-8");
            exchange.getResponseHeaders().set("Cache-Control", "no-cache");
            exchange.getResponseHeaders().set("Connection", "keep-alive");
            exchange.sendResponseHeaders(200, 0);

            PrintWriter writer = new PrintWriter(new OutputStreamWriter(exchange.getResponseBody(), StandardCharsets.UTF_8));
            session.sseClients.add(writer);

            // Gửi sự kiện chào mừng và xác nhận trạng thái kết nối
            writer.print("data: " + JsonHelper.toJson(Map.of(
                    "event", "STATUS",
                    "data", Map.of(
                            "connected", true,
                            "user", Map.of(
                                    "id", session.userId,
                                    "username", session.username,
                                    "displayName", session.displayName
                            )
                    )
            )) + "\n\n");
            writer.flush();

            // Đồng bộ trạng thái mới nhất từ Server về tránh thất lạc sự kiện
            session.roomService.listRooms();
            session.friendService.getFriendList();
            session.friendService.getPendingRequests();
        }
    }

    // ==========================================
    // Nghiệp vụ Chat & Phòng (Yêu cầu Session)
    // ==========================================

    private class StateHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            UserSession session = requireSession(exchange);
            if (session == null) return;

            Map<String, Object> state = new HashMap<>();
            state.put("user", Map.of(
                    "id", session.userId,
                    "username", session.username,
                    "displayName", session.displayName
            ));
            state.put("rooms", session.roomCache);
            state.put("currentRoom", session.currentRoomId != null ? Map.of("id", session.currentRoomId, "name", session.currentRoomName) : null);
            state.put("messages", session.messageCache);
            state.put("members", session.memberCache);
            state.put("friends", session.friendCache);
            state.put("pendingRequests", session.pendingCache);

            sendJson(exchange, 200, state);
        }
    }

    private class JoinRoomHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            UserSession session = requireSession(exchange);
            if (session == null) return;

            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, Object> body = JsonHelper.parseObject(readBody(exchange));
                if (body.containsKey("roomId")) {
                    int rId = ((Number) body.get("roomId")).intValue();
                    session.roomService.joinRoom(rId);
                }
                sendJson(exchange, 200, Map.of("success", true));
            }
        }
    }

    private class CreateRoomHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            UserSession session = requireSession(exchange);
            if (session == null) return;

            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, Object> body = JsonHelper.parseObject(readBody(exchange));
                String name = (String) body.get("name");
                if (name != null && !name.isBlank()) {
                    session.roomService.createRoom(name.trim());
                }
                sendJson(exchange, 200, Map.of("success", true));
            }
        }
    }

    private class LeaveRoomHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            UserSession session = requireSession(exchange);
            if (session == null) return;

            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                session.roomService.leaveRoom();
                session.currentRoomId = null;
                session.currentRoomName = "";
                sendJson(exchange, 200, Map.of("success", true));
            }
        }
    }

    private class SendMessageHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            UserSession session = requireSession(exchange);
            if (session == null) return;

            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, Object> body = JsonHelper.parseObject(readBody(exchange));
                String content = (String) body.get("content");
                if (content != null && !content.isBlank()) {
                    session.chatService.sendMessage(content.trim());
                }
                sendJson(exchange, 200, Map.of("success", true));
            }
        }
    }

    private class SendPrivateMessageHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            UserSession session = requireSession(exchange);
            if (session == null) return;

            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, Object> body = JsonHelper.parseObject(readBody(exchange));
                int targetId = ((Number) body.get("targetId")).intValue();
                String content = (String) body.get("content");
                if (content != null && !content.isBlank()) {
                    session.chatService.sendPrivateMessage(targetId, content.trim());
                }
                sendJson(exchange, 200, Map.of("success", true));
            }
        }
    }

    private class InviteRoomHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            UserSession session = requireSession(exchange);
            if (session == null) return;

            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, Object> body = JsonHelper.parseObject(readBody(exchange));
                int rId = ((Number) body.get("roomId")).intValue();
                int uId = ((Number) body.get("targetUserId")).intValue();
                session.roomService.inviteMember(rId, uId);
                sendJson(exchange, 200, Map.of("success", true));
            }
        }
    }

    private class KickRoomHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            UserSession session = requireSession(exchange);
            if (session == null) return;

            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, Object> body = JsonHelper.parseObject(readBody(exchange));
                int rId = ((Number) body.get("roomId")).intValue();
                int uId = ((Number) body.get("targetUserId")).intValue();
                session.roomService.kickMember(rId, uId);
                sendJson(exchange, 200, Map.of("success", true));
            }
        }
    }

    private class FriendRequestHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            UserSession session = requireSession(exchange);
            if (session == null) return;

            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, Object> body = JsonHelper.parseObject(readBody(exchange));
                int uId = ((Number) body.get("targetUserId")).intValue();
                session.friendService.sendFriendRequest(uId);
                sendJson(exchange, 200, Map.of("success", true));
            }
        }
    }

    private class FriendAcceptHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            UserSession session = requireSession(exchange);
            if (session == null) return;

            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, Object> body = JsonHelper.parseObject(readBody(exchange));
                int reqId = ((Number) body.get("requestId")).intValue();
                session.friendService.acceptFriendRequest(reqId);
                sendJson(exchange, 200, Map.of("success", true));
            }
        }
    }

    private class FriendRejectHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            UserSession session = requireSession(exchange);
            if (session == null) return;

            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, Object> body = JsonHelper.parseObject(readBody(exchange));
                int reqId = ((Number) body.get("requestId")).intValue();
                session.friendService.rejectFriendRequest(reqId);
                sendJson(exchange, 200, Map.of("success", true));
            }
        }
    }

    private class FriendRefreshHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            UserSession session = requireSession(exchange);
            if (session == null) return;

            session.friendService.getFriendList();
            session.friendService.getPendingRequests();
            sendJson(exchange, 200, Map.of("success", true));
        }
    }

    private class FriendSearchHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            UserSession session = requireSession(exchange);
            if (session == null) return;

            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, Object> body = JsonHelper.parseObject(readBody(exchange));
                String query = (String) body.get("query");
                if (query != null && !query.isBlank()) {
                    session.friendService.searchUsers(query.trim());
                }
                sendJson(exchange, 200, Map.of("success", true));
            }
        }
    }

    // ==========================================
    // Phục vụ Static Files & SPA Fallback
    // ==========================================

    private static File resolveFrontendDist() {
        File[] candidates = new File[] {
                new File("frontend/dist"),
                new File("../frontend/dist"),
                new File(System.getProperty("user.dir", "."), "frontend/dist"),
                new File(System.getProperty("user.dir", "."), "../frontend/dist"),
                new File(new File("").getAbsolutePath(), "frontend/dist")
        };
        for (File f : candidates) {
            if (f.exists() && f.isDirectory() && new File(f, "index.html").exists()) {
                return f;
            }
        }
        return new File("frontend/dist");
    }

    private class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            String path = exchange.getRequestURI().getPath();
            if (path == null || path.equals("/") || path.isBlank()) {
                path = "/index.html";
            }

            File baseDir = resolveFrontendDist();
            if (baseDir == null || !baseDir.exists()) {
                String fallback = "<!DOCTYPE html><html lang=\"vi\"><head><meta charset=\"UTF-8\"><title>Discord Mini</title>"
                        + "<style>body{font-family:sans-serif;background:#202225;color:#dcddde;padding:40px;line-height:1.6;}"
                        + "h2{color:#5865F2;}code{background:#2f3136;padding:2px 6px;border-radius:3px;color:#00b0f4;}"
                        + "pre{background:#2f3136;padding:15px;border-radius:6px;color:#3ba55c;}</style></head><body>"
                        + "<h2>Discord Mini - Web Client</h2>"
                        + "<p>Chưa tìm thấy thư mục bản build <code>frontend/dist</code>.</p>"
                        + "<p>Vui lòng mở terminal tại thư mục <code>frontend/</code> và thực thi lệnh:</p>"
                        + "<pre>npm install\nnpm run build</pre>"
                        + "<p>Hoặc khởi động máy chủ phát triển Vite với <code>npm run dev</code> và truy cập qua cổng 5173.</p>"
                        + "</body></html>";
                byte[] b = fallback.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "text/html; charset=UTF-8");
                exchange.sendResponseHeaders(200, b.length);
                try (OutputStream os = exchange.getResponseBody()) { os.write(b); }
                return;
            }

            File target = new File(baseDir, path.replaceFirst("^/", ""));
            // SPA Fallback cho React Router / URL không khớp file vật lý
            if (!target.exists() || target.isDirectory()) {
                target = new File(baseDir, "index.html");
            }

            if (!target.exists()) {
                sendJson(exchange, 404, Map.of("error", "NOT_FOUND"));
                return;
            }

            String name = target.getName().toLowerCase();
            String contentType = "application/octet-stream";
            if (name.endsWith(".html")) contentType = "text/html; charset=UTF-8";
            else if (name.endsWith(".js")) contentType = "application/javascript; charset=UTF-8";
            else if (name.endsWith(".css")) contentType = "text/css; charset=UTF-8";
            else if (name.endsWith(".svg")) contentType = "image/svg+xml";
            else if (name.endsWith(".json")) contentType = "application/json; charset=UTF-8";
            else if (name.endsWith(".png")) contentType = "image/png";
            else if (name.endsWith(".jpg") || name.endsWith(".jpeg")) contentType = "image/jpeg";
            else if (name.endsWith(".ico")) contentType = "image/x-icon";
            else if (name.endsWith(".woff2")) contentType = "font/woff2";
            else if (name.endsWith(".woff")) contentType = "font/woff";
            else if (name.endsWith(".ttf")) contentType = "font/ttf";

            exchange.getResponseHeaders().set("Content-Type", contentType);
            if (name.endsWith(".html")) {
                exchange.getResponseHeaders().set("Cache-Control", "no-cache, no-store, must-revalidate");
            } else {
                exchange.getResponseHeaders().set("Cache-Control", "public, max-age=86400");
            }
            exchange.sendResponseHeaders(200, target.length());
            try (FileInputStream fis = new FileInputStream(target); OutputStream os = exchange.getResponseBody()) {
                fis.transferTo(os);
            }
        }
    }
}
