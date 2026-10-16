package com.discordmini.client;

import com.discordmini.client.network.SocketClient;
import com.discordmini.client.ui.LoginFrame;

import javax.swing.*;
import java.util.Objects;
import java.util.concurrent.CountDownLatch;

public class ClientApplication {
    public static final String DEFAULT_HOST = "127.0.0.1";
    public static final int DEFAULT_PORT = 5000;

    public static void main(String[] args) {
        String host = (args != null && args.length > 0 && !args[0].isBlank()) ? args[0] : DEFAULT_HOST;
        int port = DEFAULT_PORT;
        if (args != null && args.length > 1) {
            try {
                port = Integer.parseInt(args[1]);
            } catch (NumberFormatException ignored) {
                port = DEFAULT_PORT;
            }
        }
        CountDownLatch latch = new CountDownLatch(1);
        connectAsync(new SocketClient(), host, port, true, true, latch);
        try {
            latch.await();
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }
    }

    /**
     * Khởi tạo kết nối tới server và mở giao diện đăng nhập nếu kết nối thành công.
     * Thao tác kết nối mạng được chuyển sang luồng nền (Worker Thread) bằng SwingWorker,
     * không làm đơ/chặn Event Dispatch Thread (EDT) của Swing.
     */
    public static SwingWorker<SocketClient, Void> connectAndStart(String host, int port) {
        return connectAsync(new SocketClient(), host, port, true, true, null);
    }

    public static SwingWorker<SocketClient, Void> connectAsync(
            SocketClient client,
            String host,
            int port,
            boolean showLoginFrame,
            boolean showErrorDialog) {
        return connectAsync(client, host, port, showLoginFrame, showErrorDialog, null);
    }

    /**
     * Phương thức kết nối bất đồng bộ cho phép tùy biến hiển thị UI phục vụ cả thực tế lẫn kiểm thử tự động.
     * doInBackground() chạy trên luồng nền (Worker Thread).
     * done() chạy trên Event Dispatch Thread (EDT).
     */
    public static SwingWorker<SocketClient, Void> connectAsync(
            SocketClient client,
            String host,
            int port,
            boolean showLoginFrame,
            boolean showErrorDialog,
            CountDownLatch latch) {
        Objects.requireNonNull(client, "client không được null");
        SwingWorker<SocketClient, Void> worker = new SwingWorker<>() {
            @Override
            protected SocketClient doInBackground() throws Exception {
                // Tác vụ mạng kết nối TCP chạy trên luồng nền (Worker Thread), KHÔNG chặn EDT của Swing
                client.getConnectionManager().setConnecting();
                client.connect(host, port);
                return client;
            }

            @Override
            protected void done() {
                // done() luôn được thực thi trên Event Dispatch Thread (EDT)
                try {
                    SocketClient connectedClient = get();
                    if (showLoginFrame) {
                        new LoginFrame(connectedClient).setVisible(true);
                    }
                } catch (Exception e) {
                    // Giải phóng tài nguyên client nếu kết nối thất bại
                    client.close();
                    if (showErrorDialog) {
                        Throwable cause = e.getCause() != null ? e.getCause() : e;
                        String message = cause.getMessage() != null ? cause.getMessage() : cause.getClass().getSimpleName();
                        JOptionPane.showMessageDialog(null,
                                "Không kết nối được ChatServer tại " + host + ":" + port +
                                "\nHãy chạy ChatServer trước.\n\nChi tiết lỗi: " + message,
                                "Connection Error", JOptionPane.ERROR_MESSAGE);
                    }
                } finally {
                    if (latch != null) {
                        latch.countDown();
                    }
                }
            }
        };
        worker.execute();
        return worker;
    }
}
