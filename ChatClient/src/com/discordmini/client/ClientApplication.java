package com.discordmini.client;

import com.discordmini.client.network.SocketClient;
import com.discordmini.client.ui.LoginFrame;

import javax.swing.*;

public class ClientApplication {
    public static final String DEFAULT_HOST = "127.0.0.1";
    public static final int DEFAULT_PORT = 5000;

    public static void main(String[] args) {
        // Thứ tự ưu tiên cấu hình:
        // 1. Tham số dòng lệnh (args[0] = host, args[1] = port)
        // 2. Biến môi trường DISCORD_SERVER_HOST, DISCORD_SERVER_PORT
        // 3. Giá trị mặc định (127.0.0.1 : 5000)
        String envHost = System.getenv("DISCORD_SERVER_HOST");
        String envPort = System.getenv("DISCORD_SERVER_PORT");

        String host = (args.length > 0 && args[0] != null && !args[0].isBlank())
                ? args[0].trim()
                : (envHost != null && !envHost.isBlank() ? envHost.trim() : DEFAULT_HOST);

        int port = DEFAULT_PORT;
        if (args.length > 1 && args[1] != null && !args[1].isBlank()) {
            try {
                port = Integer.parseInt(args[1].trim());
            } catch (NumberFormatException e) {
                System.err.println("[CONFIG WARNING] Tham số port không hợp lệ: '" + args[1] + "'. Sử dụng mặc định " + DEFAULT_PORT);
            }
        } else if (envPort != null && !envPort.isBlank()) {
            try {
                port = Integer.parseInt(envPort.trim());
            } catch (NumberFormatException e) {
                System.err.println("[CONFIG WARNING] Biến môi trường DISCORD_SERVER_PORT không hợp lệ: '" + envPort + "'. Sử dụng mặc định " + DEFAULT_PORT);
            }
        }

        final String targetHost = host;
        final int targetPort = port;

        System.out.println("==================================================");
        System.out.println(" Discord Mini Client");
        System.out.println(" Kết nối tới TCP Server: " + targetHost + ":" + targetPort);
        System.out.println(" (Có thể tùy chỉnh qua biến $env:DISCORD_SERVER_HOST)");
        System.out.println("==================================================");

        // Thực hiện kết nối mạng trên background thread, không chặn Swing Event Dispatch Thread (EDT)
        new Thread(() -> {
            SocketClient client = new SocketClient();
            try {
                client.connect(targetHost, targetPort);
                SwingUtilities.invokeLater(() -> new LoginFrame(client).setVisible(true));
            } catch (Exception e) {
                SwingUtilities.invokeLater(() -> JOptionPane.showMessageDialog(null,
                        "Không kết nối được ChatServer tại " + targetHost + ":" + targetPort +
                        "\n\nHãy kiểm tra:" +
                        "\n1. ChatServer đã được khởi động chưa?" +
                        "\n2. Nếu chạy qua Tailscale, đảm bảo cả 2 máy cùng bật Tailscale và ping được IP máy Server." +
                        "\n3. Đảm bảo Windows Firewall trên máy Server đã mở cổng " + targetPort + "." +
                        "\n\nChi tiết lỗi: " + e.getMessage(),
                        "Lỗi kết nối Server (" + targetHost + ":" + targetPort + ")", JOptionPane.ERROR_MESSAGE));
            }
        }, "Client-InitThread").start();
    }
}
