package com.discordmini.server.network;

import com.discordmini.server.model.Message;
import com.discordmini.server.model.Room;
import com.discordmini.server.model.User;
import com.discordmini.server.protocol.MessageType;
import com.discordmini.server.protocol.ProtocolHandler;

import java.io.IOException;
import java.net.Socket;
import java.util.List;

public class ClientHandler implements Runnable {
    private final ClientConnection connection;
    private final ChatServer server;
    private volatile boolean running = true;
    private User user;
    private Integer currentRoomId;

    public ClientHandler(Socket socket, ChatServer server) throws IOException {
        this.connection = new ClientConnection(socket);
        this.server = server;
    }

    public User getUser() { return user; }
    public Integer getCurrentRoomId() { return currentRoomId; }

    @Override
    public void run() {
        try {
            connection.send("WELCOME|" + ProtocolHandler.encode("Discord Mini Chat Server"));
            String line;
            while (running && (line = connection.readLine()) != null) {
                handle(line);
            }
        } catch (IOException e) {
            System.out.println("[DISCONNECT] " + (user != null ? user.getUsername() : "unknown"));
        } finally {
            cleanup();
        }
    }

    private void handle(String line) {
        try {
            String[] parts = ProtocolHandler.split(line);
            MessageType type = MessageType.valueOf(parts[0]);
            switch (type) {
                case REGISTER -> handleRegister(parts);
                case LOGIN -> handleLogin(parts);
                case LOGOUT -> { connection.send("OK|LOGOUT"); running = false; }
                case LIST_ROOMS -> sendRooms();
                case CREATE_ROOM -> handleCreateRoom(parts);
                case JOIN_ROOM -> handleJoinRoom(parts);
                case LEAVE_ROOM -> handleLeaveRoom();
                case SEND_MESSAGE -> handleSendMessage(parts);
                case GET_HISTORY -> handleHistory();
                case GET_ONLINE_USERS -> sendOnlineUsers();
                case PING -> connection.send("PONG");
            }
        } catch (Exception e) {
            connection.send("ERROR|" + ProtocolHandler.encode(e.getMessage() == null ? "Unknown error" : e.getMessage()));
        }
    }

    private void handleRegister(String[] parts) throws Exception {
        requireArgs(parts, 4);
        User created = server.getAuthService().register(
                ProtocolHandler.decode(parts[1]), ProtocolHandler.decode(parts[2]), ProtocolHandler.decode(parts[3]));
        if (created == null) sendError("Username đã tồn tại hoặc dữ liệu không hợp lệ.");
        else connection.send("OK|REGISTERED|" + ProtocolHandler.encode("Đăng ký thành công."));
    }

    private void handleLogin(String[] parts) {
        requireArgs(parts, 3);
        if (user != null) { sendError("Bạn đã đăng nhập."); return; }
        User found = server.getAuthService().login(ProtocolHandler.decode(parts[1]), ProtocolHandler.decode(parts[2]));
        if (found == null) { sendError("Sai username hoặc password."); return; }
        if (server.getClientManager().get(found.getId()) != null) { sendError("Tài khoản đang được đăng nhập ở nơi khác."); return; }
        user = found;
        user.setOnline(true);
        server.getClientManager().add(user, this);
        connection.send("OK|LOGIN|" + user.getId() + "|" + ProtocolHandler.encode(user.getDisplayName()));
        broadcastGlobal("USER_ONLINE|" + user.getId() + "|" + ProtocolHandler.encode(user.getDisplayName()));
    }

    private void handleCreateRoom(String[] parts) throws Exception {
        requireLogin();
        requireArgs(parts, 2);
        String name = ProtocolHandler.decode(parts[1]).trim();
        if (name.isBlank()) { sendError("Tên phòng không được rỗng."); return; }
        Room room = server.getRoomService().createRoom(name, user.getId());
        if (room == null) sendError("Tên phòng đã tồn tại.");
        else {
            connection.send("OK|ROOM_CREATED|" + room.getId() + "|" + ProtocolHandler.encode(room.getName()));
            sendRooms();
        }
    }

    private void handleJoinRoom(String[] parts) {
        requireLogin();
        requireArgs(parts, 2);
        int roomId = Integer.parseInt(parts[1]);
        Room room = server.getRoomService().findRoom(roomId);
        if (room == null) { sendError("Không tìm thấy phòng."); return; }
        leaveCurrentRoom(false);
        currentRoomId = roomId;
        server.getRoomService().joinRoom(roomId, user.getId());
        room.getMemberIds().add(user.getId());
        server.getRoomManager().join(room, this);
        connection.send("OK|JOIN_ROOM|" + roomId + "|" + ProtocolHandler.encode(room.getName()));
        handleHistory();
        broadcastRoom("SYSTEM|" + ProtocolHandler.encode(user.getDisplayName() + " đã tham gia phòng."), false);
        sendRoomMembers();
    }

    private void handleLeaveRoom() {
        requireLogin();
        leaveCurrentRoom(true);
    }

    private void handleSendMessage(String[] parts) throws Exception {
        requireLogin();
        if (currentRoomId == null) { sendError("Bạn chưa vào phòng."); return; }
        requireArgs(parts, 2);
        String content = ProtocolHandler.decode(parts[1]).trim();
        if (content.isBlank()) return;
        Message message = server.getChatService().save(currentRoomId, user, content);
        String packet = "NEW_MESSAGE|" + message.getId() + "|" + message.getRoomId() + "|"
                + ProtocolHandler.encode(message.getSender()) + "|"
                + ProtocolHandler.encode(message.getContent()) + "|"
                + ProtocolHandler.encode(message.getTimestamp());
        broadcastRoom(packet, true);
    }

    private void handleHistory() {
        requireLogin();
        if (currentRoomId == null) { sendError("Bạn chưa vào phòng."); return; }
        List<Message> history = server.getChatService().history(currentRoomId);
        connection.send("HISTORY_BEGIN|" + currentRoomId);
        for (Message m : history) {
            connection.send("HISTORY_ITEM|" + m.getId() + "|" + ProtocolHandler.encode(m.getSender()) + "|"
                    + ProtocolHandler.encode(m.getContent()) + "|" + ProtocolHandler.encode(m.getTimestamp()));
        }
        connection.send("HISTORY_END");
    }

    private void sendRooms() {
        StringBuilder sb = new StringBuilder("ROOMS");
        for (Room r : server.getRoomService().listRooms()) {
            sb.append('|').append(r.getId()).append(',').append(ProtocolHandler.encode(r.getName()));
        }
        connection.send(sb.toString());
    }

    private void sendOnlineUsers() {
        StringBuilder sb = new StringBuilder("ONLINE_USERS");
        for (User u : server.getClientManager().onlineUsers()) {
            sb.append('|').append(u.getId()).append(',').append(ProtocolHandler.encode(u.getDisplayName()));
        }
        connection.send(sb.toString());
    }

    private void sendRoomMembers() {
        if (currentRoomId == null) return;
        Room room = server.getRoomService().findRoom(currentRoomId);
        StringBuilder sb = new StringBuilder("ROOM_MEMBERS");
        if (room != null) {
            for (Integer uid : room.getMemberIds()) {
                User member = null;
                var handler = server.getClientManager().get(uid);
                if (handler != null) member = handler.getUser();
                if (member != null) sb.append('|').append(member.getId()).append(',').append(ProtocolHandler.encode(member.getDisplayName()));
            }
        }
        connection.send(sb.toString());
    }

    private void broadcastRoom(String packet, boolean includeSelf) {
        if (currentRoomId == null) return;
        for (ClientHandler c : server.getRoomManager().clientsIn(currentRoomId)) {
            if (includeSelf || c != this) c.connection.send(packet);
        }
    }

    private void broadcastGlobal(String packet) {
        for (ClientHandler c : server.getClientManager().all()) c.connection.send(packet);
    }

    private void leaveCurrentRoom(boolean announce) {
        if (currentRoomId == null) return;
        Room room = server.getRoomService().findRoom(currentRoomId);
        server.getRoomManager().leave(currentRoomId, this);
        if (room != null && user != null) room.getMemberIds().remove(user.getId());
        if (announce && user != null) {
            broadcastRoom("SYSTEM|" + ProtocolHandler.encode(user.getDisplayName() + " đã rời phòng."), false);
        }
        currentRoomId = null;
        if (user != null) sendOnlineUsers();
    }

    private void cleanup() {
        leaveCurrentRoom(false);
        if (user != null) {
            user.setOnline(false);
            server.getClientManager().remove(user);
            broadcastGlobal("USER_OFFLINE|" + user.getId() + "|" + ProtocolHandler.encode(user.getDisplayName()));
        }
        try { connection.close(); } catch (IOException ignored) {}
    }

    private void requireLogin() {
        if (user == null) throw new IllegalStateException("Bạn chưa đăng nhập.");
    }

    private void requireArgs(String[] parts, int count) {
        if (parts.length < count) throw new IllegalArgumentException("Thiếu tham số.");
    }

    private void sendError(String message) { connection.send("ERROR|" + ProtocolHandler.encode(message)); }
}
