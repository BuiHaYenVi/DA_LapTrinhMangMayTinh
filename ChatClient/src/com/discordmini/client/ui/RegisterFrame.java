package com.discordmini.client.ui;

import com.discordmini.client.network.SocketClient;
import com.discordmini.client.protocol.ProtocolHandler;
import com.discordmini.client.service.AuthService;

import javax.swing.*;
import java.awt.*;

public class RegisterFrame extends JFrame {
    private final SocketClient client;
    private final LoginFrame parent;
    private final JTextField username = new JTextField();
    private final JTextField display = new JTextField();
    private final JPasswordField password = new JPasswordField();
    private final JLabel status = new JLabel(" ");

    public RegisterFrame(SocketClient client, LoginFrame parent) {
        this.client = client;
        this.parent = parent;
        setTitle("Discord Mini - Đăng ký");
        setSize(430, 300);
        setLocationRelativeTo(null);
        buildUi();
    }

    private void buildUi() {
        JPanel root = new JPanel(new BorderLayout(10,10));
        root.setBorder(BorderFactory.createEmptyBorder(20,20,20,20));
        JPanel form = new JPanel(new GridLayout(4,2,8,8));
        form.add(new JLabel("Username:")); form.add(username);
        form.add(new JLabel("Display name:")); form.add(display);
        form.add(new JLabel("Password:")); form.add(password);
        JButton btn = new JButton("Tạo tài khoản");
        JButton cancel = new JButton("Đóng");
        form.add(btn); form.add(cancel);
        root.add(form, BorderLayout.CENTER);
        status.setHorizontalAlignment(SwingConstants.CENTER);
        root.add(status, BorderLayout.SOUTH);
        setContentPane(root);
        btn.addActionListener(e -> register());
        cancel.addActionListener(e -> closeAndRestore());
    }

    private void closeAndRestore() { parent.activateListener(); dispose(); }

    private void register() {
        String u = username.getText().trim(), d = display.getText().trim(), p = new String(password.getPassword());
        if (u.isBlank() || p.isBlank()) { status.setText("Username và password bắt buộc."); return; }
        client.setListener(line -> {
            String[] parts = ProtocolHandler.split(line);
            if (parts.length >= 3 && "OK".equals(parts[0]) && "REGISTERED".equals(parts[1]))
                SwingUtilities.invokeLater(() -> { JOptionPane.showMessageDialog(this, ProtocolHandler.decode(parts[2])); closeAndRestore(); });
            else if ("ERROR".equals(parts[0])) SwingUtilities.invokeLater(() -> status.setText(ProtocolHandler.decode(parts[1])));
        });
        new AuthService(client).register(u, p, d);
    }
}
