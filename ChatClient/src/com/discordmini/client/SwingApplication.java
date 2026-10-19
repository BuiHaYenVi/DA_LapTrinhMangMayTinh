package com.discordmini.client;

import com.discordmini.client.network.SocketClient;
import com.discordmini.client.ui.LoginFrame;

import javax.swing.*;

/**
 * SwingApplication: Điểm khởi chạy CHUYÊN BIỆT cho Giao diện Desktop Java Swing.
 * - Mở trực tiếp cửa sổ Java Swing (LoginFrame/MainFrame).
 * - Hoàn toàn không khởi động máy chủ web hay tự động mở trình duyệt.
 * - Luôn mở cửa sổ đăng nhập ngay cả khi ChatServer chưa bật, cho phép bấm "Kết nối lại".
 */
public class SwingApplication {
    public static final String DEFAULT_HOST = "127.0.0.1";
    public static final int DEFAULT_PORT = 5000;

    public static void main(String[] args) {
        // Thiết lập giao diện theo chuẩn hệ điều hành (Windows Native Look & Feel)
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (Exception ignored) {}

        String host = DEFAULT_HOST;
        int port = DEFAULT_PORT;

        if (args != null && args.length > 0 && !args[0].isBlank()) {
            host = args[0];
        }
        if (args != null && args.length > 1 && !args[1].isBlank()) {
            try {
                port = Integer.parseInt(args[1]);
            } catch (NumberFormatException ignored) {}
        }

        final String targetHost = host;
        final int targetPort = port;

        // Khởi tạo SocketClient
        final SocketClient client = new SocketClient();

        // Luôn mở cửa sổ LoginFrame trên Swing EDT ngay lập tức
        SwingUtilities.invokeLater(() -> {
            LoginFrame frame = new LoginFrame(client);
            frame.setVisible(true);

            // Thử kết nối tới ChatServer trên luồng nền
            new Thread(() -> {
                try {
                    client.getConnectionManager().setConnecting();
                    client.connect(targetHost, targetPort);
                    SwingUtilities.invokeLater(() -> {
                        frame.getStatusLabel().setText("Đã kết nối máy chủ. Sẵn sàng đăng nhập.");
                    });
                } catch (Exception e) {
                    SwingUtilities.invokeLater(() -> {
                        frame.getStatusLabel().setText("Chưa kết nối máy chủ (" + targetHost + ":" + targetPort + "). Bấm 'Kết nối lại'.");
                    });
                }
            }, "SwingStartupConnectThread").start();
        });
    }
}
