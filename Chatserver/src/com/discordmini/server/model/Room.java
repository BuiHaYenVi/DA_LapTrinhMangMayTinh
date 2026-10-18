package com.discordmini.server.model;

import java.sql.Timestamp;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;

public class Room {
    private int id;
    private String name;
    private int createdBy;
    private Timestamp createdAt;
    private String description = "";
    private String inviteCode = "";
    private String userRole = "MEMBER";
    private boolean isPrivate = false;
    private final Set<Integer> memberIds = Collections.synchronizedSet(new LinkedHashSet<>());

    public Room(int id, String name) {
        this(id, name, 0, null);
    }

    public Room(int id, String name, int createdBy, Timestamp createdAt) {
        this.id = id;
        this.name = name;
        this.createdBy = createdBy;
        this.createdAt = createdAt;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public int getCreatedBy() { return createdBy; }
    public void setCreatedBy(int createdBy) { this.createdBy = createdBy; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }

    public String getDescription() { return description != null ? description : ""; }
    public void setDescription(String description) { this.description = description; }

    public String getInviteCode() { return inviteCode != null ? inviteCode : ""; }
    public void setInviteCode(String inviteCode) { this.inviteCode = inviteCode; }

    public String getUserRole() { return userRole != null ? userRole : "MEMBER"; }
    public void setUserRole(String userRole) { this.userRole = userRole != null ? userRole : "MEMBER"; }

    public boolean isPrivate() { return isPrivate; }
    public void setPrivate(boolean isPrivate) { this.isPrivate = isPrivate; }

    public Set<Integer> getMemberIds() { return memberIds; }

    @Override
    public String toString() {
        return "Room{id=" + id + ", name='" + name + "', createdBy=" + createdBy + "}";
    }
}
