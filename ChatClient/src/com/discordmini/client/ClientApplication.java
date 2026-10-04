package com.discordmini.client;

import com.discordmini.client.network.SocketClient;
import com.discordmini.client.ui.LoginFrame;

import javax.swing.*;

public class ClientApplication {
    public static final String DEFAULT_HOST = "127.0.0.1";
    public static final int DEFAULT_PORT = 5000;

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            SocketClient client = new SocketClient();
            try {
                client.connect(DEFAULT_HOST, DEFAULT_PORT);
                new LoginFrame(client).setVisible(true);
            } catch (Exception e) {
                JOptionPane.showMessageDialog(null,
                        "Không kết nối được ChatServer tại " + DEFAULT_HOST + ":" + DEFAULT_PORT +
                        "\nHãy chạy ChatServer trước.\n\n" + e.getMessage(),
                        "Connection Error", JOptionPane.ERROR_MESSAGE);
            }
        });
    }
}
