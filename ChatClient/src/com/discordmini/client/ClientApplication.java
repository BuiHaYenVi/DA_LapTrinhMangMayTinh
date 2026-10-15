package com.discordmini.client;

import com.discordmini.client.network.SocketClient;
import com.discordmini.client.ui.LoginFrame;

import javax.swing.*;

public class ClientApplication {
    public static final String DEFAULT_HOST = "127.0.0.1";
    public static final int DEFAULT_PORT = 5000;

    public static void main(String[] args) {
        // Thực hiện kết nối mạng trên background thread, không chặn Swing Event Dispatch Thread (EDT)
        new Thread(() -> {
            SocketClient client = new SocketClient();
            try {
                client.connect(DEFAULT_HOST, DEFAULT_PORT);
                SwingUtilities.invokeLater(() -> new LoginFrame(client).setVisible(true));
            } catch (Exception e) {
                SwingUtilities.invokeLater(() -> JOptionPane.showMessageDialog(null,
                        "Không kết nối được ChatServer tại " + DEFAULT_HOST + ":" + DEFAULT_PORT +
                        "\nHãy kiểm tra ChatServer đã được khởi động chưa.\n\nChi tiết: " + e.getMessage(),
                        "Lỗi kết nối", JOptionPane.ERROR_MESSAGE));
            }
        }, "Client-InitThread").start();
    }
}
