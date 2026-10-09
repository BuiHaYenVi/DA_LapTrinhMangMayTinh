package com.discordmini.server.model;

import java.sql.Timestamp;

public class User {
    private int id;
    private String username;
    private String password;
    private String displayName;
    private String status; // "ONLINE" or "OFFLINE"
    private Timestamp createdAt;

    public User(int id, String username, String password, String displayName) {
        this(id, username, password, displayName, "OFFLINE", null);
    }

    public User(int id, String username, String password, String displayName, String status, Timestamp createdAt) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.displayName = displayName;
        this.status = status != null ? status : "OFFLINE";
        this.createdAt = createdAt;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isOnline() { return "ONLINE".equalsIgnoreCase(this.status); }
    public void setOnline(boolean online) { this.status = online ? "ONLINE" : "OFFLINE"; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }

    @Override
    public String toString() {
        return "User{id=" + id + ", username='" + username + "', displayName='" + displayName + "', status='" + status + "'}";
    }
}
