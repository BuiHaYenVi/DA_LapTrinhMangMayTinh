package com.discordmini.server.model;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;

public class Room {
    private final int id;
    private final String name;
    private final Set<Integer> memberIds = Collections.synchronizedSet(new LinkedHashSet<>());

    public Room(int id, String name) {
        this.id = id;
        this.name = name;
    }

    public int getId() { return id; }
    public String getName() { return name; }
    public Set<Integer> getMemberIds() { return memberIds; }
}
