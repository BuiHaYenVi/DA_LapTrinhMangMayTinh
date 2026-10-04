package com.discordmini.server.model;

public class User {
    private int id;
    private String username;
    private String password;
    private String displayName;
    private boolean online;

    public User(int id, String username, String password, String displayName) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.displayName = displayName;
        this.online = false;
    }

    public int getId() { return id; }
    public String getUsername() { return username; }
    public String getPassword() { return password; }
    public String getDisplayName() { return displayName; }
    public boolean isOnline() { return online; }
    public void setOnline(boolean online) { this.online = online; }
}
