package com.discordmini.server.manager;

import com.discordmini.server.network.ClientHandler;
import com.discordmini.server.model.User;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

public class ClientManager {
    private final Map<Integer, ClientHandler> online = new ConcurrentHashMap<>();

    public void add(User user, ClientHandler client) {
        if (user != null && client != null) {
            online.put(user.getId(), client);
        }
    }

    public void remove(User user) {
        if (user != null) {
            online.remove(user.getId());
        }
    }

    public ClientHandler get(int userId) { return online.get(userId); }

    public boolean isOnline(int userId) { return online.containsKey(userId); }

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
