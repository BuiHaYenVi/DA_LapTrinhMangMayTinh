package com.discordmini.client.ui;

import com.discordmini.client.network.ConnectionManager;
import com.discordmini.client.network.ConnectionState;
import com.discordmini.client.network.SocketClient;
import com.discordmini.client.service.ChatService;

import javax.swing.*;
import java.awt.*;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.util.List;

/**
 * Panel hiển thị danh sách người dùng online và trạng thái mạng (cột bên phải).
 *
 * Tiêu chí AN-08:
 * - Hiển thị người dùng online chính xác theo dữ liệu Server.
 * - Hỗ trợ nhắn tin riêng 1-1 qua dialog và ChatService.
 * - Hiển thị trạng thái kết nối mạng trực quan.
 */
public class UserPanel extends JPanel {
    private final SocketClient client;
    private final ChatService chatService;

    private final DefaultListModel<MemberItem> memberModel = new DefaultListModel<>();
    private final JList<MemberItem> memberList = new JList<>(memberModel);
    private final JButton btnPrivateChat = new JButton("💬 Chat 1-1");
    private final JLabel statusLabel = new JLabel("🟢 Trực tuyến", SwingConstants.CENTER);

    public record MemberItem(int id, String name) {
        @Override
        public String toString() {
            return "🟢 " + name;
        }
    }

    public UserPanel(SocketClient client, ChatService chatService) {
        this.client = client;
        this.chatService = chatService;

        setLayout(new BorderLayout(5, 5));
        setPreferredSize(new Dimension(210, 0));
        setBorder(BorderFactory.createEmptyBorder(5, 5, 5, 5));

        buildUi();
        listenConnectionState();
    }

    private void buildUi() {
        JLabel title = new JLabel("  THÀNH VIÊN ONLINE", SwingConstants.LEFT);
        title.setFont(new Font("Segoe UI", Font.BOLD, 13));
        title.setForeground(new Color(33, 33, 33));
        title.setBorder(BorderFactory.createEmptyBorder(5, 0, 5, 0));
        add(title, BorderLayout.NORTH);

        memberList.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        memberList.setFont(new Font("Segoe UI", Font.PLAIN, 13));
        add(new JScrollPane(memberList), BorderLayout.CENTER);

        JPanel bottomPanel = new JPanel(new BorderLayout(4, 4));
        btnPrivateChat.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        bottomPanel.add(btnPrivateChat, BorderLayout.NORTH);

        statusLabel.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        statusLabel.setForeground(new Color(46, 125, 50));
        bottomPanel.add(statusLabel, BorderLayout.SOUTH);
        add(bottomPanel, BorderLayout.SOUTH);

        btnPrivateChat.addActionListener(e -> onSendPrivateMessage());
        memberList.addMouseListener(new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent evt) {
                if (evt.getClickCount() == 2) {
                    onSendPrivateMessage();
                }
            }
        });
    }

    private void listenConnectionState() {
        if (client != null && client.getConnectionManager() != null) {
            client.getConnectionManager().addStateChangeListener((oldState, newState, reason) -> {
                SwingUtilities.invokeLater(() -> {
                    if (newState == ConnectionState.DISCONNECTED) {
                        statusLabel.setText("🔴 Mất kết nối Server");
                        statusLabel.setForeground(new Color(198, 40, 40));
                    } else if (newState == ConnectionState.AUTHENTICATED || newState == ConnectionState.CONNECTED) {
                        statusLabel.setText("🟢 Trực tuyến");
                        statusLabel.setForeground(new Color(46, 125, 50));
                    } else if (newState == ConnectionState.RECONNECTING) {
                        statusLabel.setText("🟡 Đang kết nối lại...");
                        statusLabel.setForeground(new Color(230, 81, 0));
                    }
                });
            });
        }
    }

    public void updateMembers(List<MemberItem> members) {
        SwingUtilities.invokeLater(() -> {
            memberModel.clear();
            if (members != null) {
                for (MemberItem m : members) {
                    memberModel.addElement(m);
                }
            }
        });
    }

    public void setConnectionStatusText(String text, Color color) {
        SwingUtilities.invokeLater(() -> {
            statusLabel.setText(text);
            if (color != null) {
                statusLabel.setForeground(color);
            }
        });
    }

    private void onSendPrivateMessage() {
        MemberItem selected = memberList.getSelectedValue();
        if (selected == null) {
            JOptionPane.showMessageDialog(this, "Vui lòng chọn một người dùng từ danh sách để nhắn tin riêng 1-1.",
                    "Thông báo", JOptionPane.INFORMATION_MESSAGE);
            return;
        }

        String input = JOptionPane.showInputDialog(this,
                "Nhập tin nhắn riêng gửi tới " + selected.name() + ":",
                "Nhắn tin riêng 1-1", JOptionPane.PLAIN_MESSAGE);

        if (input != null && !input.isBlank() && chatService != null) {
            chatService.sendPrivateMessage(selected.id(), input.trim());
        }
    }

    public JList<MemberItem> getMemberList() {
        return memberList;
    }

    public DefaultListModel<MemberItem> getMemberModel() {
        return memberModel;
    }
}
