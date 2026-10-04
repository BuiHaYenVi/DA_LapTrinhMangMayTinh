package com.discordmini.client.ui;

import com.discordmini.client.network.SocketClient;
import com.discordmini.client.protocol.ProtocolHandler;
import com.discordmini.client.service.AuthService;

import javax.swing.*;
import java.awt.*;

public class LoginFrame extends JFrame {
    private final SocketClient client;
    private final JTextField usernameField = new JTextField();
    private final JPasswordField passwordField = new JPasswordField();
    private final JLabel status = new JLabel(" ");

    public LoginFrame(SocketClient client) {
        this.client = client;
        setTitle("Discord Mini - Đăng nhập");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(430, 300);
        setLocationRelativeTo(null);
        setResizable(false);
        buildUi();
    }

    private void buildUi() {
        JPanel root = new JPanel(new BorderLayout(10, 10));
        root.setBorder(BorderFactory.createEmptyBorder(20, 20, 20, 20));
        JLabel title = new JLabel("DISCORD MINI", SwingConstants.CENTER);
        title.setFont(new Font("Segoe UI", Font.BOLD, 24));
        root.add(title, BorderLayout.NORTH);

        JPanel form = new JPanel(new GridLayout(3, 2, 8, 8));
        form.add(new JLabel("Username:")); form.add(usernameField);
        form.add(new JLabel("Password:")); form.add(passwordField);
        JButton login = new JButton("Đăng nhập");
        JButton register = new JButton("Đăng ký");
        form.add(login); form.add(register);
        root.add(form, BorderLayout.CENTER);
        status.setHorizontalAlignment(SwingConstants.CENTER);
        root.add(status, BorderLayout.SOUTH);
        setContentPane(root);

        login.addActionListener(e -> doLogin());
        register.addActionListener(e -> new RegisterFrame(client, this).setVisible(true));
        passwordField.addActionListener(e -> doLogin());
        activateListener();
    }

    private void doLogin() {
        String username = usernameField.getText().trim();
        String password = new String(passwordField.getPassword());
        if (username.isBlank() || password.isBlank()) { status.setText("Vui lòng nhập đủ thông tin."); return; }
        status.setText("Đang đăng nhập...");
        new AuthService(client).login(username, password);
    }

    void activateListener() { client.setListener(this::handleServerMessage); }

    private void handleServerMessage(String line) {
        if (line.equals("CLIENT_DISCONNECTED")) {
            SwingUtilities.invokeLater(() -> status.setText("Mất kết nối Server."));
            return;
        }
        String[] p = ProtocolHandler.split(line);
        SwingUtilities.invokeLater(() -> {
            try {
                if ("OK".equals(p[0]) && p.length > 1 && "LOGIN".equals(p[1])) {
                    String name = ProtocolHandler.decode(p[3]);
                    dispose();
                    new MainFrame(client, name).setVisible(true);
                } else if ("ERROR".equals(p[0])) {
                    status.setText(ProtocolHandler.decode(p[1]));
                }
            } catch (Exception ex) { status.setText("Phản hồi không hợp lệ."); }
        });
    }
}
