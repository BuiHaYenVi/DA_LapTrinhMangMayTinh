package com.discordmini.client.ui;

import com.discordmini.client.model.Room;
import com.discordmini.client.network.ReconnectListener;
import com.discordmini.client.network.ReconnectManager;
import com.discordmini.client.network.SocketClient;
import com.discordmini.client.protocol.ProtocolHandler;
import com.discordmini.client.service.AuthService;
import com.discordmini.client.service.ChatService;
import com.discordmini.client.service.RoomService;

import javax.swing.*;
import java.awt.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Cửa sổ chính của ứng dụng Discord Mini.
 *
 * Tiêu chí AN-08:
 * - Module hóa giao diện sử dụng các panel thực tế: RoomPanel (trái), ChatPanel (giữa), UserPanel (phải).
 * - Không còn panel rỗng hay code inline trùng lặp.
 * - Tích hợp chặt chẽ ChatService và RoomService.
 * - Mọi cập nhật Swing đều chạy an toàn trên EDT.
 */
public class MainFrame extends JFrame {
    private final SocketClient client;
    private final String displayName;

    private final ChatService chatService;
    private final RoomService roomService;
    private final AuthService authService;
    private final ReconnectManager reconnectManager;

    private final RoomPanel roomPanel;
    private final ChatPanel chatPanel;
    private final UserPanel userPanel;
    private final NetworkStatusPanel networkStatusPanel;

    public MainFrame(SocketClient client, String displayName) {
        this(client, displayName, null, null);
    }

    public MainFrame(SocketClient client, String displayName, String username, String password) {
        this.client = client;
        this.displayName = displayName != null ? displayName : "Bạn";

        this.authService = new AuthService(client);
        this.chatService = new ChatService(client, this.displayName);
        this.roomService = new RoomService(client, chatService);

        this.reconnectManager = new ReconnectManager(client, authService, roomService);
        if (username != null && password != null) {
            this.reconnectManager.setCredentials(client.getServerHost(), client.getServerPort(), username, password);
        }

        this.roomPanel = new RoomPanel(roomService);
        this.chatPanel = new ChatPanel(client, chatService, roomService, this.displayName);
        this.userPanel = new UserPanel(client, chatService);
        this.networkStatusPanel = new NetworkStatusPanel(client);
        this.networkStatusPanel.setReconnectManager(reconnectManager);

        initReconnectEvents();

        setTitle("Discord Mini - " + this.displayName);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        addWindowListener(new java.awt.event.WindowAdapter() {
            @Override
            public void windowClosing(java.awt.event.WindowEvent e) {
                dispose();
                System.exit(0);
            }
        });
        setSize(1080, 720);
        setMinimumSize(new Dimension(850, 500));
        setLocationRelativeTo(null);

        buildUi();

        // Đăng ký nhận frame mạng bổ sung từ Server
        client.addMessageListener(this::handleServerMessage);

        // Khởi tạo tải dữ liệu ban đầu
        roomService.listRooms();
        client.sendCommand("GET_ONLINE_USERS");
    }

    private void initReconnectEvents() {
        reconnectManager.addListener(new ReconnectListener() {
            @Override
            public void onReconnectAttempt(int attempt, int maxAttempts, long delayMs) {}

            @Override
            public void onReconnectSucceeded() {
                SwingUtilities.invokeLater(() -> {
                    client.sendCommand("LIST_ROOMS");
                    client.sendCommand("GET_ONLINE_USERS");
                    chatPanel.updateSendState();
                });
            }

            @Override
            public void onReconnectFailed(String reason) {
                SwingUtilities.invokeLater(() -> {
                    if (isShowing()) {
                        int choice = JOptionPane.showOptionDialog(
                                MainFrame.this,
                                reason + "\nBạn có muốn thử kết nối lại ngay bây giờ không?",
                                "Mất kết nối máy chủ",
                                JOptionPane.YES_NO_OPTION,
                                JOptionPane.WARNING_MESSAGE,
                                null,
                                new Object[]{"Thử lại ngay", "Đóng"},
                                "Thử lại ngay"
                        );
                        if (choice == 0) { // 0 tương ứng với "Thử lại ngay"
                            reconnectManager.retryManually();
                        }
                    }
                });
            }

            @Override
            public void onReconnectCancelled() {}
        });
    }

    public ReconnectManager getReconnectManager() {
        return reconnectManager;
    }

    public String getDisplayName() {
        return displayName;
    }

    public RoomPanel getRoomPanel() {
        return roomPanel;
    }

    public ChatPanel getChatPanel() {
        return chatPanel;
    }

    public UserPanel getUserPanel() {
        return userPanel;
    }

    public NetworkStatusPanel getNetworkStatusPanel() {
        return networkStatusPanel;
    }

    private void buildUi() {
        JSplitPane splitLeftCenter = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, roomPanel, chatPanel);
        splitLeftCenter.setDividerLocation(220);
        splitLeftCenter.setContinuousLayout(true);

        JSplitPane splitMain = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, splitLeftCenter, userPanel);
        splitMain.setDividerLocation(840);
        splitMain.setContinuousLayout(true);
        splitMain.setResizeWeight(1.0); // Ưu tiên mở rộng khung chat ở giữa khi resize

        JPanel rootPanel = new JPanel(new BorderLayout());
        rootPanel.add(splitMain, BorderLayout.CENTER);
        rootPanel.add(networkStatusPanel, BorderLayout.SOUTH);

        setContentPane(rootPanel);
    }

    private void handleServerMessage(String line) {
        try {
            String[] p = ProtocolHandler.split(line);
            if (p.length == 0) return;

            SwingUtilities.invokeLater(() -> {
                switch (p[0]) {
                    case "ROOM_MEMBERS", "ONLINE_USERS" -> updateMemberList(p);
                    case "USER_ONLINE", "USER_OFFLINE" -> {
                        userPanel.setConnectionStatusText("🟢 Online (Cập nhật)", new Color(46, 125, 50));
                        client.sendCommand("GET_ONLINE_USERS");
                    }
                    case "ERROR" -> {
                        if (p.length > 1) {
                            String err = ProtocolHandler.decode(p[1]);
                            if (!err.toLowerCase().contains("phòng") && !err.toLowerCase().contains("room")) {
                                JOptionPane.showMessageDialog(this, err, "Thông báo lỗi", JOptionPane.WARNING_MESSAGE);
                            }
                        }
                    }
                    case "REQUEST_TIMEOUT" -> {
                        String req = (p.length > 2) ? p[2] : "Yêu cầu";
                        userPanel.setConnectionStatusText("Quá giờ chờ: " + req, new Color(230, 81, 0));
                    }
                    case "PROTOCOL_ERROR" -> {
                        String msg = (p.length > 1) ? ProtocolHandler.decode(p[1]) : "Lỗi giao thức.";
                        JOptionPane.showMessageDialog(this, msg, "Lỗi giao thức", JOptionPane.ERROR_MESSAGE);
                    }
                    case "CLIENT_DISCONNECTED" -> {
                        userPanel.setConnectionStatusText("🔴 Mất kết nối Server", new Color(198, 40, 40));
                        chatPanel.updateSendState();
                    }
                }
            });
        } catch (Exception ex) {
            System.err.println("[MainFrame] Lỗi xử lý gói tin: " + ex.getMessage());
        }
    }

    private void updateMemberList(String[] p) {
        List<UserPanel.MemberItem> list = new ArrayList<>();
        for (int i = 1; i < p.length; i++) {
            String item = p[i];
            int commaIdx = item.indexOf(',');
            if (commaIdx > 0) {
                try {
                    int id = Integer.parseInt(item.substring(0, commaIdx));
                    String name = ProtocolHandler.decode(item.substring(commaIdx + 1));
                    list.add(new UserPanel.MemberItem(id, name));
                } catch (Exception ignored) {}
            }
        }
        userPanel.updateMembers(list);
    }

    @Override
    public void dispose() {
        if (reconnectManager != null) {
            reconnectManager.shutdown();
        }
        if (networkStatusPanel != null) {
            networkStatusPanel.cleanup();
        }
        try {
            authService.logout();
        } catch (Exception ignored) {}
        client.close();
        super.dispose();
    }
}
