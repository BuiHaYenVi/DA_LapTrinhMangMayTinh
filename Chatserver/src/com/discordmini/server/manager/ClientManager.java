package com.discordmini.server.manager;

import com.discordmini.server.network.ClientHandler;
import com.discordmini.server.model.User;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

public class ClientManager {
    private final Map<Integer, ClientHandler> online = new ConcurrentHashMap<>();
    private final Map<String, ClientHandler> onlineByUsername = new ConcurrentHashMap<>();

    private static String normalize(String username) {
        return username == null ? "" : username.trim().toLowerCase();
    }

    /**
     * Thao tác nguyên tử thêm người dùng online nếu chưa có phiên nào khác.
     * @return true nếu đăng nhập phiên đầu tiên thành công, false nếu tài khoản đã online.
     */
    public boolean tryAdd(User user, ClientHandler client) {
        if (user == null || client == null) return false;
        boolean added = online.putIfAbsent(user.getId(), client) == null;
        if (added) {
            String norm = normalize(user.getUsername());
            if (!norm.isEmpty()) {
                onlineByUsername.put(norm, client);
            }
        }
        return added;
    }

    public void add(User user, ClientHandler client) {
        if (user != null && client != null) {
            online.put(user.getId(), client);
            String norm = normalize(user.getUsername());
            if (!norm.isEmpty()) {
                onlineByUsername.put(norm, client);
            }
        }
    }

    /**
     * Thao tác nguyên tử dọn dẹp session: Chỉ xóa nếu handler hiện tại chính là handler đã đăng nhập.
     * Ngăn ngừa race condition làm xóa nhầm phiên đăng nhập mới của tài khoản.
     */
    public boolean remove(User user, ClientHandler client) {
        if (user != null && client != null) {
            boolean removed = online.remove(user.getId(), client);
            if (removed) {
                String norm = normalize(user.getUsername());
                onlineByUsername.remove(norm, client);
            }
            return removed;
        }
        return false;
    }

    public void remove(User user) {
        if (user != null) {
            online.remove(user.getId());
            String norm = normalize(user.getUsername());
            onlineByUsername.remove(norm);
        }
    }

    public ClientHandler get(int userId) { return online.get(userId); }

    public ClientHandler getByUsername(String username) {
        if (username == null) return null;
        return onlineByUsername.get(normalize(username));
    }

    public ClientHandler findClient(int userId, String username) {
        if (username != null && !username.isBlank()) {
            ClientHandler c = getByUsername(username);
            if (c != null) return c;
        }
        return get(userId);
    }

    public boolean isOnline(int userId) { return online.containsKey(userId); }

    public boolean isOnlineByUsername(String username) {
        return username != null && onlineByUsername.containsKey(normalize(username));
    }

    public int getOnlineCount() { return online.size(); }

    public List<ClientHandler> all() { return new ArrayList<>(online.values()); }

    public List<User> onlineUsers() {
        List<User> result = new ArrayList<>();
        for (ClientHandler c : online.values()) {
            if (c.getUser() != null) result.add(c.getUser());
        }
        return result;
    }

    /**
     * Gửi gói tin cho 1 user cụ thể theo ID
     */
    public boolean sendToUser(int targetUserId, String packet) {
        ClientHandler target = online.get(targetUserId);
        if (target != null) {
            target.sendPacket(packet);
            return true;
        }
        return false;
    }

    /**
     * Broadcast gói tin tới tất cả client đang kết nối
     */
    public void broadcastGlobal(String packet) {
        for (ClientHandler c : online.values()) {
            c.sendPacket(packet);
        }
    }

    /**
     * Broadcast gói tin ngoại trừ 1 user cụ thể
     */
    public void broadcastExcept(int excludedUserId, String packet) {
        for (Map.Entry<Integer, ClientHandler> entry : online.entrySet()) {
            if (entry.getKey() != excludedUserId) {
                entry.getValue().sendPacket(packet);
            }
        }
    }
}
