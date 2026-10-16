package com.discordmini.server;

import com.discordmini.server.network.ChatServer;

public class ServerApplication {
    public static void main(String[] args) {
        String envPort = System.getenv("DISCORD_SERVER_PORT");
        int port = ChatServer.PORT;

        if (args.length > 0 && args[0] != null && !args[0].isBlank()) {
            try {
                port = Integer.parseInt(args[0].trim());
            } catch (NumberFormatException e) {
                System.err.println("[CONFIG WARNING] Port không hợp lệ: '" + args[0] + "'. Sử dụng mặc định " + ChatServer.PORT);
            }
        } else if (envPort != null && !envPort.isBlank()) {
            try {
                port = Integer.parseInt(envPort.trim());
            } catch (NumberFormatException e) {
                System.err.println("[CONFIG WARNING] Biến môi trường DISCORD_SERVER_PORT không hợp lệ: '" + envPort + "'. Sử dụng mặc định " + ChatServer.PORT);
            }
        }

        try {
            new ChatServer(port).start();
        } catch (Exception e) {
            System.err.println("Không thể khởi động server: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
