package com.discordmini.client.service;

import com.discordmini.client.network.SocketClient;

public class AuthService {
    private final SocketClient client;
    public AuthService(SocketClient client) { this.client = client; }
    public void login(String username, String password) { client.sendCommand("LOGIN", username, password); }
    public void register(String username, String password, String displayName) { client.sendCommand("REGISTER", username, password, displayName); }
    public void logout() { client.sendCommand("LOGOUT"); }
}
