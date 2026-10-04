package com.discordmini.server.manager;

import com.discordmini.server.network.ClientHandler;
import com.discordmini.server.model.User;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

public class ClientManager {
    private final Map<Integer, ClientHandler> online = new ConcurrentHashMap<>();

    public void add(User user, ClientHandler client) { online.put(user.getId(), client); }
    public void remove(User user) { if (user != null) online.remove(user.getId()); }
    public ClientHandler get(int userId) { return online.get(userId); }
    public List<ClientHandler> all() { return new ArrayList<>(online.values()); }
    public List<User> onlineUsers() {
        List<User> result = new ArrayList<>();
        for (ClientHandler c : online.values()) if (c.getUser() != null) result.add(c.getUser());
        return result;
    }
}
