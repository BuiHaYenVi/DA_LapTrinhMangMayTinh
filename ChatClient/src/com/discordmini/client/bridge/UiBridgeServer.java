package com.discordmini.client.bridge;

import com.discordmini.client.model.Room;
import com.discordmini.client.network.SocketClient;
import com.discordmini.client.protocol.ProtocolHandler;
import com.discordmini.client.service.AuthService;
import com.discordmini.client.service.ChatService;
import com.discordmini.client.service.FriendService;
import com.discordmini.client.service.RoomService;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * UiBridgeServer: Cầu nối (Bridge) giữa giao diện React/TypeScript và tầng mạng Java TCP Client.
 *
 * Mọi request từ React UI (Login, Join room, Send message, Add friend...) đều được chuyển thẳng
 * thành lệnh gọi qua SocketClient / RoomService / ChatService / FriendService.
 *
 * Dữ liệu realtime từ Chatserver (TCP Socket) trả về được Bridge đẩy trực tiếp tới React qua Server-Sent Events (SSE).
 */
public class UiBridgeServer {
    private final int port;
    private final SocketClient socketClient;
    private final RoomService roomService;
    private final ChatService chatService;
    private final FriendService friendService;
    private final AuthService authService;

    private HttpServer server;
    private final List<PrintWriter> sseClients = new CopyOnWriteArrayList<>();

    // Cached state
    private String currentDisplayName = "Người dùng";
    private int currentUserId = 1;
    private Integer currentRoomId = null;
    private String currentRoomName = "";
    private final List<Map<String, Object>> roomCache = new ArrayList<>();
    private final List<Map<String, Object>> messageCache = new ArrayList<>();
    private final List<Map<String, Object>> memberCache = new ArrayList<>();
    private final List<Map<String, Object>> friendCache = new ArrayList<>();
    private final List<Map<String, Object>> pendingCache = new ArrayList<>();

    private int actualPort;

    public UiBridgeServer(int port, SocketClient socketClient, int userId, String displayName) {
        this.port = port;
        this.actualPort = port;
        this.socketClient = socketClient;
        this.currentUserId = userId;
        this.currentDisplayName = displayName;
        this.roomService = new RoomService(socketClient);
        this.chatService = new ChatService(socketClient);
        this.friendService = new FriendService(socketClient);
        this.authService = new AuthService(socketClient);
    }

    public int getPort() {
        return actualPort;
    }

    public void start() throws IOException {
        IOException lastEx = null;
        for (int p = port; p < port + 20; p++) {
            try {
                server = HttpServer.create(new InetSocketAddress(p), 0);
                actualPort = p;
                break;
            } catch (IOException ex) {
                lastEx = ex;
            }
        }
        if (server == null) {
            throw (lastEx != null) ? lastEx : new IOException("Không thể mở cổng HTTP server.");
        }

        // SSE Realtime Stream
        server.createContext("/api/events", new SseHandler());

        // State & Action Endpoints
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

        // Static files handler serving built React bundle if available
        server.createContext("/", new StaticFileHandler());

        server.setExecutor(java.util.concurrent.Executors.newCachedThreadPool());
        server.start();

        // Đăng ký nhận gói tin từ Java TCP Server qua SocketClient mà không ghi đè listener khác
        socketClient.addListener(this::handleServerPacket);

        // Nạp danh sách khởi tạo
        roomService.listRooms();
        friendService.getFriendList();
        friendService.getPendingRequests();
    }

    public void stop() {
        if (server != null) {
            server.stop(0);
        }
    }

    /**
     * Nhận gói tin thô từ Java TCP ServerSocket -> parse -> phát sự kiện SSE tới React UI
     */
    private void handleServerPacket(String line) {
        String[] p = ProtocolHandler.split(line);
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
                // p[1]=id, p[2]=sender, p[3]=content, p[4]=timestamp
                int msgId = Integer.parseInt(p[1]);
                String sender = ProtocolHandler.decode(p[2]);
                String content = ProtocolHandler.decode(p[3]);
                String time = ProtocolHandler.decode(p[4]);
                Map<String, Object> m = new HashMap<>();
                m.put("id", msgId);
                m.put("senderId", sender.equalsIgnoreCase(currentDisplayName) ? currentUserId : 0);
                m.put("senderName", sender);
                m.put("content", content);
                m.put("timestamp", time);
                messageCache.add(m);
            }
            case "HISTORY_END" -> broadcastSse("HISTORY", Map.of("messages", messageCache));
            case "NEW_MESSAGE" -> {
                // p[1]=id, p[2]=roomId, p[3]=sender, p[4]=content, p[5]=timestamp
                int msgId = Integer.parseInt(p[1]);
                String sender = ProtocolHandler.decode(p[3]);
                String content = ProtocolHandler.decode(p[4]);
                String time = ProtocolHandler.decode(p[5]);
                Map<String, Object> m = new HashMap<>();
                m.put("id", msgId);
                m.put("senderId", sender.equalsIgnoreCase(currentDisplayName) ? currentUserId : 0);
                m.put("senderName", sender);
                m.put("content", content);
                m.put("timestamp", time);
                messageCache.add(m);
                broadcastSse("NEW_MESSAGE", Map.of("message", m));
            }
            case "NEW_PRIVATE_MESSAGE" -> {
                // p[1]=senderId, p[2]=senderName, p[3]=content, p[4]=timestamp
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

    private void broadcastSse(String event, Map<String, Object> data) {
        String json = toJson(Map.of("event", event, "data", data));
        for (PrintWriter writer : sseClients) {
            try {
                writer.print("data: " + json + "\n\n");
                writer.flush();
            } catch (Exception e) {
                sseClients.remove(writer);
            }
        }
    }

    private class SseHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            exchange.getResponseHeaders().set("Content-Type", "text/event-stream; charset=UTF-8");
            exchange.getResponseHeaders().set("Cache-Control", "no-cache");
            exchange.getResponseHeaders().set("Connection", "keep-alive");
            exchange.sendResponseHeaders(200, 0);

            PrintWriter writer = new PrintWriter(new OutputStreamWriter(exchange.getResponseBody(), StandardCharsets.UTF_8));
            sseClients.add(writer);

            // Send initial ping
            writer.print("data: {\"event\":\"STATUS\",\"data\":{\"connected\":true}}\n\n");
            writer.flush();
        }
    }

    private class StateHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            Map<String, Object> state = new HashMap<>();
            state.put("user", Map.of("id", currentUserId, "username", currentDisplayName, "displayName", currentDisplayName));
            state.put("rooms", roomCache);
            state.put("currentRoom", currentRoomId != null ? Map.of("id", currentRoomId, "name", currentRoomName) : null);
            state.put("messages", messageCache);
            state.put("members", memberCache);
            state.put("friends", friendCache);
            state.put("pendingRequests", pendingCache);

            sendJson(exchange, toJson(state));
        }
    }

    private class JoinRoomHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, Object> body = parseJson(readBody(exchange));
                if (body.containsKey("roomId")) {
                    int rId = ((Number) body.get("roomId")).intValue();
                    roomService.joinRoom(rId);
                }
                sendJson(exchange, "{\"success\":true}");
            }
        }
    }

    private class CreateRoomHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, Object> body = parseJson(readBody(exchange));
                String name = (String) body.get("name");
                if (name != null && !name.isBlank()) {
                    roomService.createRoom(name.trim());
                }
                sendJson(exchange, "{\"success\":true}");
            }
        }
    }

    private class LeaveRoomHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                roomService.leaveRoom();
                currentRoomId = null;
                currentRoomName = "";
                sendJson(exchange, "{\"success\":true}");
            }
        }
    }

    private class SendMessageHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, Object> body = parseJson(readBody(exchange));
                String content = (String) body.get("content");
                if (content != null && !content.isBlank()) {
                    chatService.sendMessage(content.trim());
                }
                sendJson(exchange, "{\"success\":true}");
            }
        }
    }

    private class SendPrivateMessageHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, Object> body = parseJson(readBody(exchange));
                int targetId = ((Number) body.get("targetId")).intValue();
                String content = (String) body.get("content");
                if (content != null && !content.isBlank()) {
                    chatService.sendPrivateMessage(targetId, content.trim());
                }
                sendJson(exchange, "{\"success\":true}");
            }
        }
    }

    private class InviteRoomHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, Object> body = parseJson(readBody(exchange));
                int rId = ((Number) body.get("roomId")).intValue();
                int uId = ((Number) body.get("targetUserId")).intValue();
                roomService.inviteMember(rId, uId);
                sendJson(exchange, "{\"success\":true}");
            }
        }
    }

    private class KickRoomHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, Object> body = parseJson(readBody(exchange));
                int rId = ((Number) body.get("roomId")).intValue();
                int uId = ((Number) body.get("targetUserId")).intValue();
                roomService.kickMember(rId, uId);
                sendJson(exchange, "{\"success\":true}");
            }
        }
    }

    private class FriendRequestHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, Object> body = parseJson(readBody(exchange));
                int uId = ((Number) body.get("targetUserId")).intValue();
                friendService.sendFriendRequest(uId);
                sendJson(exchange, "{\"success\":true}");
            }
        }
    }

    private class FriendAcceptHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, Object> body = parseJson(readBody(exchange));
                int reqId = ((Number) body.get("requestId")).intValue();
                friendService.acceptFriendRequest(reqId);
                sendJson(exchange, "{\"success\":true}");
            }
        }
    }

    private class FriendRejectHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, Object> body = parseJson(readBody(exchange));
                int reqId = ((Number) body.get("requestId")).intValue();
                friendService.rejectFriendRequest(reqId);
                sendJson(exchange, "{\"success\":true}");
            }
        }
    }

    private class FriendRefreshHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("POST".equalsIgnoreCase(exchange.getRequestMethod()) || "GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                friendService.getFriendList();
                friendService.getPendingRequests();
                sendJson(exchange, "{\"success\":true}");
            }
        }
    }

    private class FriendSearchHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, Object> body = parseJson(readBody(exchange));
                String query = (String) body.get("query");
                if (query != null) {
                    friendService.searchUsers(query);
                }
                sendJson(exchange, "{\"success\":true}");
            }
        }
    }

    private class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            String path = exchange.getRequestURI().getPath();
            if (path == null || path.equals("/") || path.isBlank()) {
                path = "/index.html";
            }

            File baseDir = new File("frontend/dist");
            File target = new File(baseDir, path.replaceFirst("^/", ""));
            if (!target.exists() || target.isDirectory()) {
                target = new File(baseDir, "index.html");
            }

            if (!target.exists()) {
                String fallback = "<html><body><h2>Discord Mini - React Client</h2><p>Vui lòng build frontend với 'npm run build' trong frontend/.</p></body></html>";
                byte[] b = fallback.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "text/html; charset=UTF-8");
                exchange.sendResponseHeaders(200, b.length);
                try (OutputStream os = exchange.getResponseBody()) { os.write(b); }
                return;
            }

            String contentType = "text/plain";
            if (target.getName().endsWith(".html")) contentType = "text/html; charset=UTF-8";
            else if (target.getName().endsWith(".js")) contentType = "application/javascript";
            else if (target.getName().endsWith(".css")) contentType = "text/css";
            else if (target.getName().endsWith(".svg")) contentType = "image/svg+xml";

            exchange.getResponseHeaders().set("Content-Type", contentType);
            exchange.sendResponseHeaders(200, target.length());
            try (FileInputStream fis = new FileInputStream(target); OutputStream os = exchange.getResponseBody()) {
                fis.transferTo(os);
            }
        }
    }

    private void addCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
    }

    private void sendJson(HttpExchange exchange, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(200, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private String readBody(HttpExchange exchange) throws IOException {
        return new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
    }

    private String toJson(Object obj) {
        if (obj == null) return "null";
        if (obj instanceof String) return "\"" + escapeJson((String) obj) + "\"";
        if (obj instanceof Number || obj instanceof Boolean) return obj.toString();
        if (obj instanceof Map<?, ?> map) {
            StringBuilder sb = new StringBuilder("{");
            boolean first = true;
            for (Map.Entry<?, ?> e : map.entrySet()) {
                if (!first) sb.append(",");
                sb.append("\"").append(escapeJson(e.getKey().toString())).append("\":").append(toJson(e.getValue()));
                first = false;
            }
            sb.append("}");
            return sb.toString();
        }
        if (obj instanceof Collection<?> coll) {
            StringBuilder sb = new StringBuilder("[");
            boolean first = true;
            for (Object item : coll) {
                if (!first) sb.append(",");
                sb.append(toJson(item));
                first = false;
            }
            sb.append("]");
            return sb.toString();
        }
        return "\"" + escapeJson(obj.toString()) + "\"";
    }

    private String escapeJson(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }

    private Map<String, Object> parseJson(String json) {
        Map<String, Object> map = new HashMap<>();
        if (json == null || json.isBlank()) return map;
        String trimmed = json.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            trimmed = trimmed.substring(1, trimmed.length() - 1).trim();
            String[] pairs = trimmed.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");
            for (String pair : pairs) {
                String[] kv = pair.split(":", 2);
                if (kv.length == 2) {
                    String key = kv[0].trim().replace("\"", "");
                    String val = kv[1].trim();
                    if (val.startsWith("\"") && val.endsWith("\"")) {
                        map.put(key, val.substring(1, val.length() - 1));
                    } else if (val.equalsIgnoreCase("true") || val.equalsIgnoreCase("false")) {
                        map.put(key, Boolean.parseBoolean(val));
                    } else {
                        try {
                            map.put(key, Integer.parseInt(val));
                        } catch (NumberFormatException e) {
                            map.put(key, val);
                        }
                    }
                }
            }
        }
        return map;
    }
}
