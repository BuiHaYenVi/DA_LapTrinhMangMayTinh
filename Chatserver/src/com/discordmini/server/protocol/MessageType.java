package com.discordmini.server.protocol;

public enum MessageType {
    REGISTER,
    LOGIN,
    LOGOUT,
    LIST_ROOMS,
    CREATE_ROOM,
    JOIN_ROOM,
    LEAVE_ROOM,
    SEND_MESSAGE,
    SEND_PRIVATE_MESSAGE,
    GET_HISTORY,
    GET_ONLINE_USERS,
    PING,
    // Feature A: Group Chat Management
    INVITE_ROOM,
    KICK_ROOM,
    // Feature B: Friend Management
    FRIEND_SEARCH,
    FRIEND_REQUEST,
    FRIEND_PENDING_LIST,
    FRIEND_ACCEPT,
    FRIEND_REJECT,
    FRIEND_LIST
}
