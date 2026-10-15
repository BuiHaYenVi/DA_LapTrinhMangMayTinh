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
    PING
}
