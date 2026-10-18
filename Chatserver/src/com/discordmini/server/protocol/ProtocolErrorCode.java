package com.discordmini.server.protocol;

/** Stable machine-readable error codes returned by the server. */
public enum ProtocolErrorCode {
    AUTH_FAILED,
    AUTH_REQUIRED,
    ALREADY_AUTHENTICATED,
    ALREADY_ONLINE,
    USERNAME_TAKEN,
    INVALID_ROOM_NAME,
    ROOM_NAME_TAKEN,
    ROOM_NOT_FOUND,
    NOT_IN_ROOM,
    INVALID_RECIPIENT,
    USER_OFFLINE,
    BAD_REQUEST,
    DATABASE_ERROR,
    INVALID_STATE,
    INTERNAL_ERROR,
    PERMISSION_DENIED,
    USER_NOT_FOUND
}
