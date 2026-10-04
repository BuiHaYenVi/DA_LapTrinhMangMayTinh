package com.discordmini.server.protocol;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

public final class ProtocolHandler {
    private ProtocolHandler() {}

    public static String encode(String value) {
        if (value == null) return "";
        return Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    public static String decode(String value) {
        if (value == null || value.isEmpty()) return "";
        return new String(Base64.getDecoder().decode(value), StandardCharsets.UTF_8);
    }

    public static String command(MessageType type, String... fields) {
        StringBuilder sb = new StringBuilder(type.name());
        for (String field : fields) sb.append('|').append(encode(field));
        return sb.toString();
    }

    public static String[] split(String line) {
        return line.split("\\|", -1);
    }
}
