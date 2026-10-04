package com.discordmini.client.ui;

import com.discordmini.client.model.Room;
import com.discordmini.client.network.SocketClient;
import com.discordmini.client.protocol.ProtocolHandler;
import com.discordmini.client.service.AuthService;
import com.discordmini.client.service.ChatService;
import com.discordmini.client.service.RoomService;

import javax.swing.*;
import java.awt.*;
import java.util.ArrayList;
import java.util.List;

public class MainFrame extends JFrame {
    private final SocketClient client;
    private final String displayName;
    private final DefaultListModel<Room> roomModel = new DefaultListModel<>();
    private final JList<Room> roomList = new JList<>(roomModel);
    private final DefaultListModel<String> memberModel = new DefaultListModel<>();
    private final JTextArea chatArea = new JTextArea();
    private final JTextField messageField = new JTextField();
    private final JLabel roomTitle = new JLabel("Chưa chọn phòng");
    private final JLabel status = new JLabel("Online");
    private final List<String> pendingHistory = new ArrayList<>();
    private Integer currentRoom;

    public MainFrame(SocketClient client, String displayName) {
        this.client = client;
        this.displayName = displayName;
        setTitle("Discord Mini - " + displayName);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(1050, 700);
        setLocationRelativeTo(null);
        buildUi();
        client.setListener(this::handleServerMessage);
        new RoomService(client).listRooms();
        client.sendCommand("GET_ONLINE_USERS");
    }

    private void buildUi() {
        roomList.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        chatArea.setEditable(false);
        chatArea.setLineWrap(true);
        chatArea.setWrapStyleWord(true);

        JPanel left = new JPanel(new BorderLayout(5,5));
        left.setPreferredSize(new Dimension(200, 0));
        JLabel rooms = new JLabel("  PHÒNG CHAT"); rooms.setFont(new Font("Segoe UI", Font.BOLD, 15));
        left.add(rooms, BorderLayout.NORTH);
        left.add(new JScrollPane(roomList), BorderLayout.CENTER);
        JPanel roomButtons = new JPanel(new GridLayout(2,1,4,4));
        JButton create = new JButton("+ Tạo phòng");
        JButton leave = new JButton("Rời phòng");
        roomButtons.add(create); roomButtons.add(leave);
        left.add(roomButtons, BorderLayout.SOUTH);

        JPanel center = new JPanel(new BorderLayout(5,5));
        roomTitle.setFont(new Font("Segoe UI", Font.BOLD, 17));
        center.add(roomTitle, BorderLayout.NORTH);
        center.add(new JScrollPane(chatArea), BorderLayout.CENTER);
        JPanel send = new JPanel(new BorderLayout(5,5));
        JButton sendButton = new JButton("Gửi");
        send.add(messageField, BorderLayout.CENTER); send.add(sendButton, BorderLayout.EAST);
        center.add(send, BorderLayout.SOUTH);

        JPanel right = new JPanel(new BorderLayout(5,5));
        right.setPreferredSize(new Dimension(190,0));
        JLabel members = new JLabel("  THÀNH VIÊN ONLINE"); members.setFont(new Font("Segoe UI", Font.BOLD, 15));
        right.add(members, BorderLayout.NORTH);
        right.add(new JScrollPane(new JList<>(memberModel)), BorderLayout.CENTER);
        right.add(status, BorderLayout.SOUTH);

        JSplitPane split1 = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, left, center); split1.setDividerLocation(200);
        JSplitPane split2 = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, split1, right); split2.setDividerLocation(820);
        add(split2);

        roomList.addListSelectionListener(e -> { if (!e.getValueIsAdjusting() && roomList.getSelectedValue() != null) joinSelectedRoom(); });
        create.addActionListener(e -> createRoom());
        leave.addActionListener(e -> { new RoomService(client).leaveRoom(); currentRoom = null; roomTitle.setText("Chưa chọn phòng"); });
        sendButton.addActionListener(e -> sendMessage());
        messageField.addActionListener(e -> sendMessage());
    }

    private void joinSelectedRoom() {
        Room room = roomList.getSelectedValue();
        new RoomService(client).joinRoom(room.id());
    }

    private void createRoom() {
        String name = JOptionPane.showInputDialog(this, "Tên phòng mới:");
        if (name != null && !name.isBlank()) new RoomService(client).createRoom(name.trim());
    }

    private void sendMessage() {
        if (currentRoom == null) { JOptionPane.showMessageDialog(this, "Hãy chọn một phòng."); return; }
        String text = messageField.getText().trim();
        if (text.isBlank()) return;
        new ChatService(client).sendMessage(text);
        messageField.setText("");
    }

    private void handleServerMessage(String line) {
        String[] p = ProtocolHandler.split(line);
        SwingUtilities.invokeLater(() -> {
            try {
                switch (p[0]) {
                    case "ROOMS" -> updateRooms(p);
                    case "OK" -> handleOk(p);
                    case "HISTORY_BEGIN" -> { pendingHistory.clear(); chatArea.setText(""); }
                    case "HISTORY_ITEM" -> pendingHistory.add(formatMessage(ProtocolHandler.decode(p[2]), ProtocolHandler.decode(p[3]), ProtocolHandler.decode(p[4])));
                    case "HISTORY_END" -> { chatArea.setText(String.join("\n", pendingHistory)); if (!pendingHistory.isEmpty()) chatArea.append("\n"); scrollBottom(); }
                    case "NEW_MESSAGE" -> { chatArea.append(formatMessage(ProtocolHandler.decode(p[3]), ProtocolHandler.decode(p[4]), ProtocolHandler.decode(p[5])) + "\n"); scrollBottom(); }
                    case "SYSTEM" -> { chatArea.append("[HỆ THỐNG] " + ProtocolHandler.decode(p[1]) + "\n"); scrollBottom(); }
                    case "ROOM_MEMBERS" -> updateMembers(p);
                    case "ONLINE_USERS" -> updateOnline(p);
                    case "USER_ONLINE", "USER_OFFLINE" -> status.setText("Online - cập nhật thành viên");
                    case "ERROR" -> JOptionPane.showMessageDialog(this, ProtocolHandler.decode(p[1]), "Thông báo", JOptionPane.WARNING_MESSAGE);
                    case "CLIENT_DISCONNECTED" -> status.setText("Mất kết nối Server");
                }
            } catch (Exception ex) { ex.printStackTrace(); }
        });
    }

    private void updateRooms(String[] p) {
        int selected = currentRoom == null ? -1 : currentRoom;
        roomModel.clear();
        for (int i = 1; i < p.length; i++) {
            String[] x = p[i].split(",", 2);
            if (x.length == 2) roomModel.addElement(new Room(Integer.parseInt(x[0]), ProtocolHandler.decode(x[1])));
        }
        if (selected != -1) for (int i=0;i<roomModel.size();i++) if (roomModel.get(i).id()==selected) roomList.setSelectedIndex(i);
    }

    private void handleOk(String[] p) {
        if (p.length > 1 && "JOIN_ROOM".equals(p[1])) {
            currentRoom = Integer.parseInt(p[2]);
            roomTitle.setText("# " + ProtocolHandler.decode(p[3]));
        } else if (p.length > 1 && "ROOM_CREATED".equals(p[1])) {
            new RoomService(client).listRooms();
        }
    }

    private void updateMembers(String[] p) {
        memberModel.clear();
        for (int i=1;i<p.length;i++) { String[] x=p[i].split(",",2); if(x.length==2) memberModel.addElement("🟢 " + ProtocolHandler.decode(x[1])); }
    }

    private void updateOnline(String[] p) {
        memberModel.clear();
        for (int i=1;i<p.length;i++) { String[] x=p[i].split(",",2); if(x.length==2) memberModel.addElement("🟢 " + ProtocolHandler.decode(x[1])); }
    }

    private String formatMessage(String sender, String content, String time) { return "["+time+"] "+sender+": "+content; }
    private void scrollBottom() { chatArea.setCaretPosition(chatArea.getDocument().getLength()); }

    @Override public void dispose() {
        try { new AuthService(client).logout(); } catch (Exception ignored) {}
        client.close();
        super.dispose();
        System.exit(0);
    }
}
