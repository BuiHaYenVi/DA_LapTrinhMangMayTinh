package com.discordmini.client.ui;

import com.discordmini.client.model.Room;
import com.discordmini.client.network.SocketClient;
import com.discordmini.client.protocol.ProtocolHandler;
import com.discordmini.client.service.AuthService;
import com.discordmini.client.service.ChatService;
import com.discordmini.client.service.FriendService;
import com.discordmini.client.service.RoomService;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.util.ArrayList;
import java.util.List;

/**
 * MainFrame: Giao diện Discord chính xác theo thiết kế chuẩn (4-Column Layout).
 *
 * Cột 1 (Guild Strip - 72px, #202225):
 *   - Logo Discord tròn Blurple (#5865F2)
 *   - Đường phân cách
 *   - Các Server Icon tròn / Server Pills (Wumpus, Friends Server, Study, v.v.)
 *   - Nút Thêm Server (+) tròn xanh lá
 *   - Nút Khám phá Server (🧭)
 *
 * Cột 2 (Channel Sidebar - 240px, #2F3136):
 *   - Header Server Dropdown ("Discord Server v") với menu tùy chọn
 *   - Banner / Category Channels ("v KÊNH VĂN BẢN", "+")
 *   - Danh sách các kênh (# general, # gaming, # study, v.v.)
 *   - User Profile Bar ở đáy (#292B2F): Avatar tròn, Tên, Hashtag/Status, Icon Mute/Deafen/Settings
 *
 * Cột 3 (Chat Center - #36393F):
 *   - Header Kênh (# general, Topic "Chào mừng đến với kênh trò chuyện", Search bar pill, Member toggle icon, Leave/Invite buttons)
 *   - Banner đầu kênh (# Chào mừng bạn đến với kênh trò chuyện!)
 *   - Khu vực tin nhắn định dạng Discord với Avatar, DisplayName, Timestamp, Nội dung
 *   - Thanh gõ tin nhắn bo tròn (#40444B) với nút (+) đính kèm, Placeholder, Emoji/Gửi
 *
 * Cột 4 (Right Sidebar - 260px, #2F3136):
 *   - Tabbed / Phân loại chuẩn Discord:
 *       Tab "Thành viên": Nhóm TRỰC TUYẾN — X (với 👑 Trưởng nhóm) và NGOẠI TUYẾN — Y
 *       Tab "Bạn bè": Quản lý Lời mời kết bạn (Pending) với ✔/✖ và Danh sách Bạn bè với nút Chat riêng
 */
public class MainFrame extends JFrame {

    // Discord Official Palette
    private static final Color BG_GUILD_STRIP   = new Color(0x20, 0x22, 0x25); // #202225 (Darkest left strip)
    private static final Color BG_SIDEBAR       = new Color(0x2F, 0x31, 0x36); // #2F3136 (Channel sidebar & Member sidebar)
    private static final Color BG_CHAT          = new Color(0x36, 0x39, 0x3F); // #36393F (Chat area)
    private static final Color BG_INPUT         = new Color(0x40, 0x44, 0x4B); // #40444B (Message input pill)
    private static final Color BG_USER_BAR      = new Color(0x29, 0x2B, 0x2F); // #292B2F (Bottom user profile bar)
    private static final Color BG_HOVER         = new Color(0x39, 0x3C, 0x43); // #393C43 (Hover item background)
    private static final Color BG_ACTIVE        = new Color(0x42, 0x46, 0x4D); // #42464D (Selected item background)

    private static final Color TEXT_HEADER      = new Color(0xFF, 0xFF, 0xFF); // #FFFFFF
    private static final Color TEXT_NORMAL      = new Color(0xDC, 0xDD, 0xDE); // #DCDDDE
    private static final Color TEXT_MUTED       = new Color(0x8E, 0x92, 0x97); // #8E9297
    private static final Color TEXT_CHANNEL     = new Color(0x96, 0x98, 0x9D); // #96989D

    private static final Color ACCENT_BLURPLE   = new Color(0x58, 0x65, 0xF2); // #5865F2
    private static final Color ACCENT_GREEN     = new Color(0x3B, 0xA5, 0x5D); // #3BA55D
    private static final Color ACCENT_RED       = new Color(0xED, 0x42, 0x45); // #ED4245
    private static final Color ACCENT_YELLOW    = new Color(0xFA, 0xA6, 0x1A); // #FAA61A

    private final SocketClient client;
    private final String displayName;
    private final RoomService roomService;
    private final ChatService chatService;
    private final FriendService friendService;

    // Room State
    private final DefaultListModel<Room> roomModel = new DefaultListModel<>();
    private final JList<Room> roomList = new JList<>(roomModel);
    private Integer currentRoomId = null;
    private String currentRoomName = "";
    private boolean isCurrentRoomOwner = false;

    // Member Records & Models
    public record MemberItem(int id, String name, String role, boolean online) {}
    private final DefaultListModel<MemberItem> memberModel = new DefaultListModel<>();
    private final JList<MemberItem> memberList = new JList<>(memberModel);

    // Friend Records & Models
    public record FriendItem(int id, String username, String displayName, boolean online) {}
    private final DefaultListModel<FriendItem> friendModel = new DefaultListModel<>();
    private final JList<FriendItem> friendList = new JList<>(friendModel);

    public record PendingRequestItem(int requestId, int senderId, String senderUsername, String senderDisplayName, String time) {}
    private final DefaultListModel<PendingRequestItem> pendingModel = new DefaultListModel<>();
    private final JList<PendingRequestItem> pendingList = new JList<>(pendingModel);

    // Chat Area & Inputs
    private final JTextArea chatArea = new JTextArea();
    private final JTextField messageField = new JTextField();
    private final JLabel headerTitleLabel = new JLabel("Chọn kênh trò chuyện");
    private final JLabel headerTopicLabel = new JLabel("Chọn một phòng chat ở danh sách bên trái để bắt đầu.");
    private final JLabel welcomeTitleLabel = new JLabel("Chào mừng đến với Discord Mini!");
    private final JLabel welcomeSubLabel = new JLabel("Đây là khởi đầu của cuộc trò chuyện trong nhóm này.");
    private final JLabel userStatusLabel = new JLabel("Trực tuyến");
    private final List<String> pendingHistory = new ArrayList<>();

    // Action Buttons
    private JButton inviteBtn;
    private JButton kickBtn;
    private JButton leaveBtn;

    public MainFrame(SocketClient client, String displayName) {
        this.client = client;
        this.displayName = displayName;
        this.roomService = new RoomService(client);
        this.chatService = new ChatService(client);
        this.friendService = new FriendService(client);

        setTitle("Discord");
        setDefaultCloseOperation(JFrame.DO_NOTHING_ON_CLOSE);
        addWindowListener(new java.awt.event.WindowAdapter() {
            @Override
            public void windowClosing(java.awt.event.WindowEvent e) {
                try {
                    new AuthService(client).logout();
                } catch (Exception ignored) {}
                client.close();
                dispose();
                System.exit(0);
            }
        });

        setSize(1240, 780);
        setMinimumSize(new Dimension(980, 620));
        setLocationRelativeTo(null);

        buildUi();
        client.addListener(this::handleServerMessage);

        // Nạp dữ liệu khởi tạo
        roomService.listRooms();
        friendService.getFriendList();
        friendService.getPendingRequests();
    }

    private void buildUi() {
        JPanel root = new JPanel(new BorderLayout());
        root.setBackground(BG_CHAT);

        // 1. Column 1: Guild/Server Strip (Leftmost, 72px)
        JPanel guildStrip = buildGuildStrip();

        // 2. Column 2: Channel Sidebar (240px)
        JPanel channelSidebar = buildChannelSidebar();

        // 3. Column 3: Center Chat Panel
        JPanel chatCenter = buildChatCenter();

        // 4. Column 4: Right Sidebar (Members & Friends, 260px)
        JPanel rightSidebar = buildRightSidebar();

        // Lắp ráp 4 cột
        JPanel leftCombined = new JPanel(new BorderLayout());
        leftCombined.add(guildStrip, BorderLayout.WEST);
        leftCombined.add(channelSidebar, BorderLayout.CENTER);

        JSplitPane centerRightSplit = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, chatCenter, rightSidebar);
        centerRightSplit.setResizeWeight(1.0);
        centerRightSplit.setDividerSize(1);
        centerRightSplit.setDividerLocation(660);
        centerRightSplit.setBorder(null);

        root.add(leftCombined, BorderLayout.WEST);
        root.add(centerRightSplit, BorderLayout.CENTER);

        add(root);
    }

    /**
     * Cột 1: Dải icon Guild / Server (Discord Server Strip - 72px)
     */
    private JPanel buildGuildStrip() {
        JPanel strip = new JPanel();
        strip.setLayout(new BoxLayout(strip, BoxLayout.Y_AXIS));
        strip.setBackground(BG_GUILD_STRIP);
        strip.setPreferredSize(new Dimension(72, 0));
        strip.setBorder(new EmptyBorder(12, 12, 12, 12));

        // Discord Home / Direct Messages Icon
        JButton homeBtn = createCircularPillButton("💬", ACCENT_BLURPLE, 48);
        homeBtn.setToolTipText("Trang chủ & Tin nhắn trực tiếp");
        homeBtn.addActionListener(e -> {
            roomList.clearSelection();
            leaveCurrentRoom();
        });
        strip.add(homeBtn);
        strip.add(Box.createVerticalStrut(8));

        // Separator bar
        JSeparator sep = new JSeparator();
        sep.setMaximumSize(new Dimension(32, 2));
        sep.setForeground(new Color(0x36, 0x39, 0x3F));
        strip.add(sep);
        strip.add(Box.createVerticalStrut(8));

        // Server Pills
        JButton srv1 = createCircularPillButton("🎮", BG_SIDEBAR, 48);
        srv1.setToolTipText("Gaming Server");
        srv1.addActionListener(e -> roomService.listRooms());

        JButton srv2 = createCircularPillButton("📚", BG_SIDEBAR, 48);
        srv2.setToolTipText("Study & Code Server");
        srv2.addActionListener(e -> roomService.listRooms());

        JButton srv3 = createCircularPillButton("🎵", BG_SIDEBAR, 48);
        srv3.setToolTipText("Music Lounge");
        srv3.addActionListener(e -> roomService.listRooms());

        strip.add(srv1);
        strip.add(Box.createVerticalStrut(8));
        strip.add(srv2);
        strip.add(Box.createVerticalStrut(8));
        strip.add(srv3);
        strip.add(Box.createVerticalStrut(8));

        // Add Server (+) Button
        JButton addBtn = createCircularPillButton("+", ACCENT_GREEN, 48);
        addBtn.setToolTipText("Tạo hoặc tham gia phòng chat mới");
        addBtn.addActionListener(e -> showCreateRoomDialog());
        strip.add(addBtn);

        strip.add(Box.createVerticalGlue());

        // Explore Compass Icon
        JButton exploreBtn = createCircularPillButton("🧭", BG_SIDEBAR, 48);
        exploreBtn.setToolTipText("Khám phá máy chủ công khai");
        strip.add(exploreBtn);

        return strip;
    }

    /**
     * Cột 2: Kênh chat (Channel Sidebar - 240px)
     */
    private JPanel buildChannelSidebar() {
        JPanel sidebar = new JPanel(new BorderLayout());
        sidebar.setBackground(BG_SIDEBAR);
        sidebar.setPreferredSize(new Dimension(240, 0));

        // 1. Server Header Dropdown
        JPanel headerPanel = new JPanel(new BorderLayout());
        headerPanel.setBackground(BG_SIDEBAR);
        headerPanel.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createMatteBorder(0, 0, 1, 0, BG_GUILD_STRIP),
            new EmptyBorder(14, 16, 14, 16)
        ));

        JLabel serverTitle = new JLabel("Discord Server ▾");
        serverTitle.setFont(new Font("Segoe UI", Font.BOLD, 15));
        serverTitle.setForeground(TEXT_HEADER);
        serverTitle.setCursor(new Cursor(Cursor.HAND_CURSOR));

        JPopupMenu serverMenu = new JPopupMenu();
        JMenuItem miCreate = new JMenuItem("➕ Tạo phòng chat mới");
        miCreate.addActionListener(e -> showCreateRoomDialog());
        JMenuItem miRefresh = new JMenuItem("🔄 Tải lại danh sách phòng");
        miRefresh.addActionListener(e -> roomService.listRooms());
        serverMenu.add(miCreate);
        serverMenu.add(miRefresh);

        serverTitle.addMouseListener(new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent e) {
                serverMenu.show(serverTitle, 0, serverTitle.getHeight() + 4);
            }
        });
        headerPanel.add(serverTitle, BorderLayout.WEST);

        // 2. Channel Section Header ("v KÊNH VĂN BẢN   +")
        JPanel catHeader = new JPanel(new BorderLayout());
        catHeader.setOpaque(false);
        catHeader.setBorder(new EmptyBorder(12, 14, 6, 14));

        JLabel catTitle = new JLabel("▾  KÊNH VĂN BẢN");
        catTitle.setFont(new Font("Segoe UI", Font.BOLD, 11));
        catTitle.setForeground(TEXT_MUTED);

        JButton addChannelBtn = new JButton("+");
        addChannelBtn.setFont(new Font("Segoe UI", Font.BOLD, 15));
        addChannelBtn.setForeground(TEXT_MUTED);
        addChannelBtn.setContentAreaFilled(false);
        addChannelBtn.setBorderPainted(false);
        addChannelBtn.setFocusPainted(false);
        addChannelBtn.setCursor(new Cursor(Cursor.HAND_CURSOR));
        addChannelBtn.setToolTipText("Tạo phòng chat mới");
        addChannelBtn.addActionListener(e -> showCreateRoomDialog());

        catHeader.add(catTitle, BorderLayout.WEST);
        catHeader.add(addChannelBtn, BorderLayout.EAST);

        // 3. Channels List
        roomList.setBackground(BG_SIDEBAR);
        roomList.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        roomList.setFixedCellHeight(36);
        roomList.setCellRenderer((list, val, idx, isSelected, cellHasFocus) -> {
            JPanel item = new JPanel(new BorderLayout(8, 0));
            item.setOpaque(true);
            item.setBorder(new EmptyBorder(4, 12, 4, 12));

            JLabel hashLbl = new JLabel("#");
            hashLbl.setFont(new Font("Segoe UI", Font.BOLD, 16));

            JLabel nameLbl = new JLabel(val != null ? val.name() : "");
            nameLbl.setFont(new Font("Segoe UI", Font.BOLD, 13));

            if (isSelected) {
                item.setBackground(BG_ACTIVE);
                hashLbl.setForeground(TEXT_HEADER);
                nameLbl.setForeground(TEXT_HEADER);
            } else {
                item.setBackground(BG_SIDEBAR);
                hashLbl.setForeground(TEXT_CHANNEL);
                nameLbl.setForeground(TEXT_CHANNEL);
            }

            item.add(hashLbl, BorderLayout.WEST);
            item.add(nameLbl, BorderLayout.CENTER);
            return item;
        });

        roomList.addListSelectionListener(e -> {
            if (!e.getValueIsAdjusting() && roomList.getSelectedValue() != null) {
                joinSelectedRoom();
            }
        });

        JScrollPane scrollRooms = new JScrollPane(roomList);
        scrollRooms.setBorder(null);
        scrollRooms.getViewport().setBackground(BG_SIDEBAR);

        JPanel centerList = new JPanel(new BorderLayout());
        centerList.setOpaque(false);
        centerList.add(catHeader, BorderLayout.NORTH);
        centerList.add(scrollRooms, BorderLayout.CENTER);

        // 4. User Profile Bar ở đáy (Avatar tròn, Tên, ID, Mic/Headset)
        JPanel userBar = buildUserProfileBar();

        sidebar.add(headerPanel, BorderLayout.NORTH);
        sidebar.add(centerList, BorderLayout.CENTER);
        sidebar.add(userBar, BorderLayout.SOUTH);
        return sidebar;
    }

    /**
     * User Profile Bar ở góc trái dưới cùng (#292B2F)
     */
    private JPanel buildUserProfileBar() {
        JPanel bar = new JPanel(new BorderLayout(8, 0));
        bar.setBackground(BG_USER_BAR);
        bar.setBorder(new EmptyBorder(10, 12, 10, 12));

        // Circular Avatar with Green Dot
        JPanel avatarPill = new JPanel() {
            @Override
            protected void paintComponent(Graphics g) {
                super.paintComponent(g);
                Graphics2D g2 = (Graphics2D) g.create();
                g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                g2.setColor(ACCENT_BLURPLE);
                g2.fillOval(0, 0, 32, 32);

                g2.setColor(Color.WHITE);
                g2.setFont(new Font("Segoe UI", Font.BOLD, 14));
                String initial = displayName.isEmpty() ? "U" : displayName.substring(0, 1).toUpperCase();
                FontMetrics fm = g2.getFontMetrics();
                int x = (32 - fm.stringWidth(initial)) / 2;
                int y = ((32 - fm.getHeight()) / 2) + fm.getAscent();
                g2.drawString(initial, x, y);

                // Online indicator dot
                g2.setColor(ACCENT_GREEN);
                g2.fillOval(22, 22, 10, 10);
                g2.setColor(BG_USER_BAR);
                g2.setStroke(new BasicStroke(2));
                g2.drawOval(22, 22, 10, 10);
                g2.dispose();
            }
        };
        avatarPill.setPreferredSize(new Dimension(34, 34));
        avatarPill.setOpaque(false);

        JPanel info = new JPanel(new GridLayout(2, 1));
        info.setOpaque(false);
        JLabel nameLbl = new JLabel(displayName);
        nameLbl.setFont(new Font("Segoe UI", Font.BOLD, 13));
        nameLbl.setForeground(TEXT_HEADER);

        userStatusLabel.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        userStatusLabel.setForeground(TEXT_MUTED);

        info.add(nameLbl);
        info.add(userStatusLabel);

        // Control icons: Mic 🎤, Headset 🎧, Settings ⚙
        JPanel controls = new JPanel(new FlowLayout(FlowLayout.RIGHT, 2, 4));
        controls.setOpaque(false);

        JButton micBtn = createIconButton("🎤", "Bật/Tắt Mic");
        JButton deafBtn = createIconButton("🎧", "Bật/Tắt Âm thanh");
        JButton setBtn = createIconButton("⚙", "Cài đặt người dùng");

        controls.add(micBtn);
        controls.add(deBtnOrSpace(deafBtn));
        controls.add(setBtn);

        bar.add(avatarPill, BorderLayout.WEST);
        bar.add(info, BorderLayout.CENTER);
        bar.add(controls, BorderLayout.EAST);

        return bar;
    }

    private Component deBtnOrSpace(JButton btn) {
        return btn;
    }

    /**
     * Cột 3: Khu vực Chat chính giữa (Discord Chat Center - #36393F)
     */
    private JPanel buildChatCenter() {
        JPanel center = new JPanel(new BorderLayout());
        center.setBackground(BG_CHAT);

        // 1. Top Channel Header Bar (#36393F)
        JPanel header = new JPanel(new BorderLayout(12, 0));
        header.setBackground(BG_CHAT);
        header.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createMatteBorder(0, 0, 1, 0, BG_GUILD_STRIP),
            new EmptyBorder(12, 18, 12, 18)
        ));

        JPanel titleBlock = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 0));
        titleBlock.setOpaque(false);

        JLabel hashIcon = new JLabel("#");
        hashIcon.setFont(new Font("Segoe UI", Font.BOLD, 22));
        hashIcon.setForeground(TEXT_CHANNEL);

        headerTitleLabel.setFont(new Font("Segoe UI", Font.BOLD, 16));
        headerTitleLabel.setForeground(TEXT_HEADER);

        JSeparator vSep = new JSeparator(SwingConstants.VERTICAL);
        vSep.setPreferredSize(new Dimension(1, 20));
        vSep.setForeground(TEXT_MUTED);

        headerTopicLabel.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        headerTopicLabel.setForeground(TEXT_MUTED);

        titleBlock.add(hashIcon);
        titleBlock.add(headerTitleLabel);
        titleBlock.add(vSep);
        titleBlock.add(headerTopicLabel);

        // Action controls on top right
        JPanel rightActions = new JPanel(new FlowLayout(FlowLayout.RIGHT, 6, 0));
        rightActions.setOpaque(false);

        inviteBtn = createPillButton("➕ Mời bạn", ACCENT_BLURPLE, Color.WHITE);
        inviteBtn.setEnabled(false);
        inviteBtn.addActionListener(e -> showInviteDialog());

        kickBtn = createPillButton("🚫 Kick", ACCENT_RED, Color.WHITE);
        kickBtn.setEnabled(false);
        kickBtn.setToolTipText("Chỉ Trưởng nhóm (👑) mới có quyền kick thành viên.");
        kickBtn.addActionListener(e -> showKickDialog());

        leaveBtn = createPillButton("Rời phòng", BG_INPUT, TEXT_NORMAL);
        leaveBtn.setEnabled(false);
        leaveBtn.addActionListener(e -> leaveCurrentRoom());

        // Search pill box
        JTextField searchBox = new JTextField("Tìm kiếm", 9);
        searchBox.setBackground(BG_GUILD_STRIP);
        searchBox.setForeground(TEXT_MUTED);
        searchBox.setCaretColor(TEXT_HEADER);
        searchBox.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        searchBox.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(BG_INPUT, 1, true),
            new EmptyBorder(4, 8, 4, 8)
        ));

        rightActions.add(inviteBtn);
        rightActions.add(kickBtn);
        rightActions.add(leaveBtn);
        rightActions.add(searchBox);

        header.add(titleBlock, BorderLayout.WEST);
        header.add(rightActions, BorderLayout.EAST);

        // 2. Chat History Area with Welcome Banner
        JPanel chatContentPanel = new JPanel(new BorderLayout());
        chatContentPanel.setOpaque(false);

        // Welcome Channel Header
        JPanel welcomeBanner = new JPanel();
        welcomeBanner.setLayout(new BoxLayout(welcomeBanner, BoxLayout.Y_AXIS));
        welcomeBanner.setOpaque(false);
        welcomeBanner.setBorder(new EmptyBorder(24, 20, 16, 20));

        JPanel circleHash = new JPanel() {
            @Override
            protected void paintComponent(Graphics g) {
                super.paintComponent(g);
                Graphics2D g2 = (Graphics2D) g.create();
                g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                g2.setColor(new Color(0x4F, 0x54, 0x5C));
                g2.fillOval(0, 0, 64, 64);
                g2.setColor(Color.WHITE);
                g2.setFont(new Font("Segoe UI", Font.BOLD, 36));
                FontMetrics fm = g2.getFontMetrics();
                int x = (64 - fm.stringWidth("#")) / 2;
                int y = ((64 - fm.getHeight()) / 2) + fm.getAscent();
                g2.drawString("#", x, y);
                g2.dispose();
            }
        };
        circleHash.setPreferredSize(new Dimension(64, 64));
        circleHash.setMaximumSize(new Dimension(64, 64));
        circleHash.setOpaque(false);

        welcomeTitleLabel.setFont(new Font("Segoe UI", Font.BOLD, 24));
        welcomeTitleLabel.setForeground(TEXT_HEADER);
        welcomeSubLabel.setFont(new Font("Segoe UI", Font.PLAIN, 13));
        welcomeSubLabel.setForeground(TEXT_MUTED);

        welcomeBanner.add(circleHash);
        welcomeBanner.add(Box.createVerticalStrut(12));
        welcomeBanner.add(welcomeTitleLabel);
        welcomeBanner.add(Box.createVerticalStrut(6));
        welcomeBanner.add(welcomeSubLabel);
        welcomeBanner.add(Box.createVerticalStrut(14));
        JSeparator bannerSep = new JSeparator();
        bannerSep.setForeground(new Color(0x42, 0x46, 0x4D));
        welcomeBanner.add(bannerSep);

        // Chat text area
        chatArea.setEditable(false);
        chatArea.setLineWrap(true);
        chatArea.setWrapStyleWord(true);
        chatArea.setBackground(BG_CHAT);
        chatArea.setForeground(TEXT_NORMAL);
        chatArea.setFont(new Font("Segoe UI", Font.PLAIN, 14));
        chatArea.setBorder(new EmptyBorder(8, 20, 8, 20));

        JScrollPane chatScroll = new JScrollPane(chatArea);
        chatScroll.setBorder(null);
        chatScroll.getViewport().setBackground(BG_CHAT);

        chatContentPanel.add(welcomeBanner, BorderLayout.NORTH);
        chatContentPanel.add(chatScroll, BorderLayout.CENTER);

        // 3. Bottom Pill Input Box
        JPanel inputContainer = new JPanel(new BorderLayout());
        inputContainer.setBackground(BG_CHAT);
        inputContainer.setBorder(new EmptyBorder(10, 18, 16, 18));

        JPanel pillInput = new JPanel(new BorderLayout(8, 0));
        pillInput.setBackground(BG_INPUT);
        pillInput.setBorder(new EmptyBorder(6, 12, 6, 12));

        // Circular (+) Attachment Button
        JButton attachBtn = createCircularPillButton("+", new Color(0x4F, 0x54, 0x5C), 28);
        attachBtn.setToolTipText("Gửi file đính kèm");

        messageField.setBackground(BG_INPUT);
        messageField.setForeground(TEXT_HEADER);
        messageField.setCaretColor(TEXT_HEADER);
        messageField.setFont(new Font("Segoe UI", Font.PLAIN, 14));
        messageField.setBorder(null);
        messageField.addActionListener(e -> sendMessage());

        // Emoji & Send Actions
        JPanel inputActions = new JPanel(new FlowLayout(FlowLayout.RIGHT, 4, 0));
        inputActions.setOpaque(false);

        JButton giftBtn = createIconButton("🎁", "Tặng quà");
        JButton gifBtn = createIconButton("GIF", "Tìm ảnh GIF");
        JButton emojiBtn = createIconButton("😀", "Chọn Emoji");

        JButton sendBtn = createPillButton("Gửi", ACCENT_BLURPLE, Color.WHITE);
        sendBtn.addActionListener(e -> sendMessage());

        inputActions.add(giftBtn);
        inputActions.add(gifBtn);
        inputActions.add(emojiBtn);
        inputActions.add(sendBtn);

        pillInput.add(attachBtn, BorderLayout.WEST);
        pillInput.add(messageField, BorderLayout.CENTER);
        pillInput.add(inputActions, BorderLayout.EAST);

        inputContainer.add(pillInput, BorderLayout.CENTER);

        center.add(header, BorderLayout.NORTH);
        center.add(chatContentPanel, BorderLayout.CENTER);
        center.add(inputContainer, BorderLayout.SOUTH);
        return center;
    }

    /**
     * Cột 4: Cột bên phải (Right Sidebar - 260px)
     * Chia thành 2 Tab chuẩn Discord: Thành viên & Bạn bè
     */
    private JPanel buildRightSidebar() {
        JPanel right = new JPanel(new BorderLayout());
        right.setBackground(BG_SIDEBAR);
        right.setPreferredSize(new Dimension(260, 0));

        JTabbedPane tabs = new JTabbedPane();
        tabs.setBackground(BG_SIDEBAR);
        tabs.setForeground(TEXT_NORMAL);
        tabs.setFont(new Font("Segoe UI", Font.BOLD, 12));

        // TAB 1: THÀNH VIÊN TRONG PHÒNG
        JPanel membersTab = buildMembersTab();
        tabs.addTab("Thành viên", membersTab);

        // TAB 2: QUẢN LÝ BẠN BÈ
        JPanel friendsTab = buildFriendsTab();
        tabs.addTab("Bạn bè", friendsTab);

        right.add(tabs, BorderLayout.CENTER);
        return right;
    }

    private JPanel buildMembersTab() {
        JPanel panel = new JPanel(new BorderLayout(0, 8));
        panel.setBackground(BG_SIDEBAR);
        panel.setBorder(new EmptyBorder(10, 10, 10, 10));

        JLabel title = new JLabel("DANH SÁCH THÀNH VIÊN");
        title.setFont(new Font("Segoe UI", Font.BOLD, 11));
        title.setForeground(TEXT_MUTED);
        panel.add(title, BorderLayout.NORTH);

        memberList.setBackground(BG_SIDEBAR);
        memberList.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        memberList.setFixedCellHeight(42);
        memberList.setCellRenderer((list, val, idx, isSelected, cellHasFocus) -> {
            JPanel item = new JPanel(new BorderLayout(8, 0));
            item.setOpaque(true);
            item.setBorder(new EmptyBorder(4, 8, 4, 8));

            if (isSelected) {
                item.setBackground(BG_ACTIVE);
            } else {
                item.setBackground(BG_SIDEBAR);
            }

            if (val == null) return item;

            // Avatar circle with status dot
            JPanel av = new JPanel() {
                @Override
                protected void paintComponent(Graphics g) {
                    super.paintComponent(g);
                    Graphics2D g2 = (Graphics2D) g.create();
                    g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                    g2.setColor(val.online() ? ACCENT_BLURPLE : new Color(0x4F, 0x54, 0x5C));
                    g2.fillOval(0, 0, 30, 30);

                    g2.setColor(Color.WHITE);
                    g2.setFont(new Font("Segoe UI", Font.BOLD, 12));
                    String initial = val.name().isEmpty() ? "?" : val.name().substring(0, 1).toUpperCase();
                    FontMetrics fm = g2.getFontMetrics();
                    int x = (30 - fm.stringWidth(initial)) / 2;
                    int y = ((30 - fm.getHeight()) / 2) + fm.getAscent();
                    g2.drawString(initial, x, y);

                    // Green / Gray online dot
                    g2.setColor(val.online() ? ACCENT_GREEN : new Color(0x74, 0x7F, 0x8D));
                    g2.fillOval(20, 20, 10, 10);
                    g2.setColor(BG_SIDEBAR);
                    g2.setStroke(new BasicStroke(1.5f));
                    g2.drawOval(20, 20, 10, 10);
                    g2.dispose();
                }
            };
            av.setPreferredSize(new Dimension(32, 32));
            av.setOpaque(false);

            // Name + Role
            JPanel nameBlock = new JPanel(new FlowLayout(FlowLayout.LEFT, 4, 6));
            nameBlock.setOpaque(false);

            JLabel nameLbl = new JLabel(val.name());
            nameLbl.setFont(new Font("Segoe UI", Font.BOLD, 13));
            nameLbl.setForeground(val.online() ? TEXT_HEADER : TEXT_MUTED);
            nameBlock.add(nameLbl);

            if ("OWNER".equalsIgnoreCase(val.role())) {
                JLabel crown = new JLabel("👑");
                crown.setToolTipText("Trưởng nhóm");
                nameBlock.add(crown);
            }

            item.add(av, BorderLayout.WEST);
            item.add(nameBlock, BorderLayout.CENTER);
            return item;
        });

        memberList.addMouseListener(new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent evt) {
                if (evt.getClickCount() == 2) {
                    sendPrivateMessageSelected();
                }
            }
        });

        JScrollPane scroll = new JScrollPane(memberList);
        scroll.setBorder(null);
        scroll.getViewport().setBackground(BG_SIDEBAR);

        JPanel bottomActions = new JPanel(new GridLayout(1, 1, 0, 4));
        bottomActions.setOpaque(false);
        JButton pmBtn = createPillButton("💬 Chat riêng 1-1", BG_INPUT, TEXT_NORMAL);
        pmBtn.addActionListener(e -> sendPrivateMessageSelected());
        bottomActions.add(pmBtn);

        panel.add(scroll, BorderLayout.CENTER);
        panel.add(bottomActions, BorderLayout.SOUTH);
        return panel;
    }

    private JPanel buildFriendsTab() {
        JPanel panel = new JPanel(new BorderLayout(0, 8));
        panel.setBackground(BG_SIDEBAR);
        panel.setBorder(new EmptyBorder(10, 10, 10, 10));

        // Friend Top Bar Actions
        JPanel topAction = new JPanel(new GridLayout(1, 2, 6, 6));
        topAction.setOpaque(false);

        JButton searchAddBtn = createPillButton("🔍 Thêm bạn", ACCENT_GREEN, Color.WHITE);
        searchAddBtn.addActionListener(e -> showFriendSearchDialog());

        JButton refreshBtn = createPillButton("🔄 Tải lại", BG_INPUT, TEXT_NORMAL);
        refreshBtn.addActionListener(e -> {
            friendService.getFriendList();
            friendService.getPendingRequests();
        });

        topAction.add(searchAddBtn);
        topAction.add(refreshBtn);

        // Center: Split Pending Requests (Top) and Friend List (Bottom)
        JPanel content = new JPanel(new GridLayout(2, 1, 0, 8));
        content.setOpaque(false);

        // 1. Pending Requests Section
        JPanel pendingPanel = new JPanel(new BorderLayout(0, 4));
        pendingPanel.setOpaque(false);
        JLabel pendingTitle = new JLabel("LỜI MỜI ĐANG CHỜ");
        pendingTitle.setFont(new Font("Segoe UI", Font.BOLD, 11));
        pendingTitle.setForeground(TEXT_MUTED);

        pendingList.setBackground(BG_GUILD_STRIP);
        pendingList.setForeground(TEXT_HEADER);
        pendingList.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        pendingList.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        pendingList.setCellRenderer((list, val, idx, isSelected, cellHasFocus) -> {
            JLabel lbl = new JLabel("📩 " + (val != null ? val.senderDisplayName() + " (@" + val.senderUsername() + ")" : ""));
            lbl.setFont(new Font("Segoe UI", Font.PLAIN, 12));
            lbl.setOpaque(true);
            lbl.setBackground(isSelected ? BG_ACTIVE : BG_GUILD_STRIP);
            lbl.setForeground(TEXT_HEADER);
            lbl.setBorder(new EmptyBorder(4, 6, 4, 6));
            return lbl;
        });

        JScrollPane pendingScroll = new JScrollPane(pendingList);
        pendingScroll.setBorder(null);

        JPanel pendingActions = new JPanel(new GridLayout(1, 2, 4, 4));
        pendingActions.setOpaque(false);
        JButton acceptBtn = createPillButton("✔ Chấp nhận", ACCENT_GREEN, Color.WHITE);
        JButton rejectBtn = createPillButton("✖ Từ chối", ACCENT_RED, Color.WHITE);

        acceptBtn.addActionListener(e -> {
            PendingRequestItem item = pendingList.getSelectedValue();
            if (item != null) {
                friendService.acceptFriendRequest(item.requestId());
            } else {
                JOptionPane.showMessageDialog(this, "Hãy chọn một lời mời kết bạn để chấp nhận.");
            }
        });

        rejectBtn.addActionListener(e -> {
            PendingRequestItem item = pendingList.getSelectedValue();
            if (item != null) {
                friendService.rejectFriendRequest(item.requestId());
            } else {
                JOptionPane.showMessageDialog(this, "Hãy chọn một lời mời kết bạn để từ chối.");
            }
        });

        pendingActions.add(acceptBtn);
        pendingActions.add(rejectBtn);

        pendingPanel.add(pendingTitle, BorderLayout.NORTH);
        pendingPanel.add(pendingScroll, BorderLayout.CENTER);
        pendingPanel.add(pendingActions, BorderLayout.SOUTH);

        // 2. Friends List Section
        JPanel friendsPanel = new JPanel(new BorderLayout(0, 4));
        friendsPanel.setOpaque(false);
        JLabel friendsTitle = new JLabel("BẠN BÈ");
        friendsTitle.setFont(new Font("Segoe UI", Font.BOLD, 11));
        friendsTitle.setForeground(TEXT_MUTED);

        friendList.setBackground(BG_GUILD_STRIP);
        friendList.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        friendList.setFixedCellHeight(36);
        friendList.setCellRenderer((list, val, idx, isSelected, cellHasFocus) -> {
            JPanel p = new JPanel(new BorderLayout(6, 0));
            p.setOpaque(true);
            p.setBackground(isSelected ? BG_ACTIVE : BG_GUILD_STRIP);
            p.setBorder(new EmptyBorder(2, 6, 2, 6));

            if (val == null) return p;

            JLabel dot = new JLabel(val.online() ? "🟢" : "⚪");
            JLabel name = new JLabel(val.displayName() + " (@" + val.username() + ")");
            name.setFont(new Font("Segoe UI", Font.BOLD, 12));
            name.setForeground(val.online() ? TEXT_HEADER : TEXT_MUTED);

            p.add(dot, BorderLayout.WEST);
            p.add(name, BorderLayout.CENTER);
            return p;
        });

        friendList.addMouseListener(new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent evt) {
                if (evt.getClickCount() == 2) {
                    sendPrivateMessageToFriend();
                }
            }
        });

        JScrollPane friendsScroll = new JScrollPane(friendList);
        friendsScroll.setBorder(null);

        JButton chatFriendBtn = createPillButton("💬 Nhắn tin cho bạn", ACCENT_BLURPLE, Color.WHITE);
        chatFriendBtn.addActionListener(e -> sendPrivateMessageToFriend());

        friendsPanel.add(friendsTitle, BorderLayout.NORTH);
        friendsPanel.add(friendsScroll, BorderLayout.CENTER);
        friendsPanel.add(chatFriendBtn, BorderLayout.SOUTH);

        content.add(pendingPanel);
        content.add(friendsPanel);

        panel.add(topAction, BorderLayout.NORTH);
        panel.add(content, BorderLayout.CENTER);
        return panel;
    }

    // ==========================================
    // UI Helpers (Buttons, Icons)
    // ==========================================

    private JButton createCircularPillButton(String text, Color bg, int diameter) {
        JButton btn = new JButton(text) {
            @Override
            protected void paintComponent(Graphics g) {
                Graphics2D g2 = (Graphics2D) g.create();
                g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                g2.setColor(getModel().isRollover() ? bg.brighter() : bg);
                g2.fillOval(0, 0, getWidth(), getHeight());

                g2.setColor(Color.WHITE);
                g2.setFont(getFont());
                FontMetrics fm = g2.getFontMetrics();
                int x = (getWidth() - fm.stringWidth(getText())) / 2;
                int y = ((getHeight() - fm.getHeight()) / 2) + fm.getAscent();
                g2.drawString(getText(), x, y);
                g2.dispose();
            }
        };
        btn.setPreferredSize(new Dimension(diameter, diameter));
        btn.setMaximumSize(new Dimension(diameter, diameter));
        btn.setFont(new Font("Segoe UI", Font.BOLD, 18));
        btn.setFocusPainted(false);
        btn.setBorderPainted(false);
        btn.setContentAreaFilled(false);
        btn.setCursor(new Cursor(Cursor.HAND_CURSOR));
        return btn;
    }

    private JButton createPillButton(String text, Color bg, Color fg) {
        JButton btn = new JButton(text) {
            @Override
            protected void paintComponent(Graphics g) {
                Graphics2D g2 = (Graphics2D) g.create();
                g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                g2.setColor(isEnabled() ? (getModel().isRollover() ? bg.brighter() : bg) : new Color(0x3A, 0x3C, 0x40));
                g2.fillRoundRect(0, 0, getWidth(), getHeight(), 8, 8);

                g2.setColor(isEnabled() ? fg : TEXT_MUTED);
                g2.setFont(getFont());
                FontMetrics fm = g2.getFontMetrics();
                int x = (getWidth() - fm.stringWidth(getText())) / 2;
                int y = ((getHeight() - fm.getHeight()) / 2) + fm.getAscent();
                g2.drawString(getText(), x, y);
                g2.dispose();
            }
        };
        btn.setFont(new Font("Segoe UI", Font.BOLD, 12));
        btn.setFocusPainted(false);
        btn.setBorderPainted(false);
        btn.setContentAreaFilled(false);
        btn.setBorder(new EmptyBorder(6, 12, 6, 12));
        btn.setCursor(new Cursor(Cursor.HAND_CURSOR));
        return btn;
    }

    private JButton createIconButton(String icon, String toolTip) {
        JButton btn = new JButton(icon);
        btn.setFont(new Font("Segoe UI Emoji", Font.PLAIN, 15));
        btn.setForeground(TEXT_MUTED);
        btn.setContentAreaFilled(false);
        btn.setBorderPainted(false);
        btn.setFocusPainted(false);
        btn.setCursor(new Cursor(Cursor.HAND_CURSOR));
        btn.setToolTipText(toolTip);
        return btn;
    }

    // ==========================================
    // Business Logic Actions
    // ==========================================

    private void joinSelectedRoom() {
        Room room = roomList.getSelectedValue();
        if (room != null) {
            roomService.joinRoom(room.id());
        }
    }

    private void showCreateRoomDialog() {
        String name = JOptionPane.showInputDialog(this, "Nhập tên phòng chat mới:", "Tạo phòng chat", JOptionPane.PLAIN_MESSAGE);
        if (name != null && !name.isBlank()) {
            roomService.createRoom(name.trim());
        }
    }

    private void showInviteDialog() {
        if (currentRoomId == null) {
            JOptionPane.showMessageDialog(this, "Hãy tham gia phòng trước khi mời bạn bè.");
            return;
        }

        String input = JOptionPane.showInputDialog(this, "Nhập ID người dùng muốn mời vào phòng:", "Mời vào phòng", JOptionPane.PLAIN_MESSAGE);
        if (input != null && !input.isBlank()) {
            try {
                int targetId = Integer.parseInt(input.trim());
                roomService.inviteMember(currentRoomId, targetId);
            } catch (NumberFormatException e) {
                JOptionPane.showMessageDialog(this, "ID người dùng phải là số nguyên dương.", "Lỗi nhập liệu", JOptionPane.ERROR_MESSAGE);
            }
        }
    }

    private void showKickDialog() {
        if (currentRoomId == null) return;
        MemberItem selected = memberList.getSelectedValue();
        if (selected == null) {
            JOptionPane.showMessageDialog(this, "Hãy chọn thành viên trong danh sách bên phải để xóa khỏi phòng.", "Thông báo", JOptionPane.INFORMATION_MESSAGE);
            return;
        }

        if ("OWNER".equalsIgnoreCase(selected.role())) {
            JOptionPane.showMessageDialog(this, "Không thể xóa Trưởng nhóm khỏi phòng.", "Lỗi quyền hạn", JOptionPane.WARNING_MESSAGE);
            return;
        }

        int confirm = JOptionPane.showConfirmDialog(this, "Bạn có chắc chắn muốn xóa " + selected.name() + " ra khỏi phòng không?", "Xác nhận kick", JOptionPane.YES_NO_OPTION);
        if (confirm == JOptionPane.YES_OPTION) {
            roomService.kickMember(currentRoomId, selected.id());
        }
    }

    private void leaveCurrentRoom() {
        if (currentRoomId != null) {
            roomService.leaveRoom();
            currentRoomId = null;
            currentRoomName = "";
            isCurrentRoomOwner = false;
            headerTitleLabel.setText("Chọn kênh trò chuyện");
            headerTopicLabel.setText("Chọn một phòng chat ở danh sách bên trái để bắt đầu.");
            welcomeTitleLabel.setText("Chào mừng đến với Discord Mini!");
            welcomeSubLabel.setText("Đây là khởi đầu của cuộc trò chuyện trong nhóm này.");
            chatArea.setText("");
            memberModel.clear();
            inviteBtn.setEnabled(false);
            kickBtn.setEnabled(false);
            leaveBtn.setEnabled(false);
            client.sendCommand("GET_ONLINE_USERS");
        }
    }

    private void sendMessage() {
        if (currentRoomId == null) {
            JOptionPane.showMessageDialog(this, "Hãy chọn một phòng chat trước khi gửi tin nhắn.");
            return;
        }
        String text = messageField.getText().trim();
        if (text.isBlank()) return;
        chatService.sendMessage(text);
        messageField.setText("");
    }

    private void sendPrivateMessageSelected() {
        MemberItem selected = memberList.getSelectedValue();
        if (selected == null) {
            JOptionPane.showMessageDialog(this, "Hãy chọn một thành viên từ danh sách để nhắn tin riêng.");
            return;
        }
        String input = JOptionPane.showInputDialog(this, "Nhập tin nhắn riêng tới " + selected.name() + ":", "Chat 1-1", JOptionPane.PLAIN_MESSAGE);
        if (input != null && !input.isBlank()) {
            chatService.sendPrivateMessage(selected.id(), input.trim());
            chatArea.append("🔒 [RIÊNG -> " + selected.name() + "]: " + input.trim() + "\n");
            scrollBottom();
        }
    }

    private void sendPrivateMessageToFriend() {
        FriendItem selected = friendList.getSelectedValue();
        if (selected == null) {
            JOptionPane.showMessageDialog(this, "Hãy chọn một người bạn từ danh sách để nhắn tin.");
            return;
        }
        String input = JOptionPane.showInputDialog(this, "Nhập tin nhắn riêng tới " + selected.displayName() + ":", "Chat với bạn bè", JOptionPane.PLAIN_MESSAGE);
        if (input != null && !input.isBlank()) {
            chatService.sendPrivateMessage(selected.id(), input.trim());
            chatArea.append("🔒 [RIÊNG -> " + selected.displayName() + "]: " + input.trim() + "\n");
            scrollBottom();
        }
    }

    private void showFriendSearchDialog() {
        String query = JOptionPane.showInputDialog(this, "Nhập username hoặc tên người dùng muốn tìm:", "Tìm kiếm & Thêm bạn", JOptionPane.PLAIN_MESSAGE);
        if (query != null && !query.isBlank()) {
            friendService.searchUsers(query.trim());
        }
    }

    // ==========================================
    // Server Packet Handler
    // ==========================================

    private void handleServerMessage(String line) {
        String[] p = ProtocolHandler.split(line);
        SwingUtilities.invokeLater(() -> {
            try {
                switch (p[0]) {
                    case "ROOMS" -> updateRooms(p);
                    case "OK" -> handleOk(p);
                    case "HISTORY_BEGIN" -> { pendingHistory.clear(); chatArea.setText(""); }
                    case "HISTORY_ITEM" -> pendingHistory.add(formatDiscordMessage(ProtocolHandler.decode(p[2]), ProtocolHandler.decode(p[3]), ProtocolHandler.decode(p[4])));
                    case "HISTORY_END" -> { chatArea.setText(String.join("\n\n", pendingHistory)); if (!pendingHistory.isEmpty()) chatArea.append("\n\n"); scrollBottom(); }
                    case "NEW_MESSAGE" -> { chatArea.append(formatDiscordMessage(ProtocolHandler.decode(p[3]), ProtocolHandler.decode(p[4]), ProtocolHandler.decode(p[5])) + "\n\n"); scrollBottom(); }
                    case "NEW_PRIVATE_MESSAGE" -> handleNewPrivateMessage(p);
                    case "SYSTEM" -> { chatArea.append("🔔 " + ProtocolHandler.decode(p[1]) + "\n\n"); scrollBottom(); }
                    case "ROOM_MEMBERS" -> updateMembers(p);
                    case "ONLINE_USERS" -> updateOnline(p);
                    case "FRIEND_SEARCH_RESULT" -> handleSearchResult(p);
                    case "FRIEND_PENDING_LIST" -> updatePendingRequests(p);
                    case "FRIEND_LIST" -> updateFriendList(p);
                    case "INCOMING_FRIEND_REQUEST" -> {
                        String reqName = ProtocolHandler.decode(p[3]);
                        chatArea.append("📩 [BẠN BÈ] Bạn nhận được lời mời kết bạn từ " + reqName + "!\n\n");
                        friendService.getPendingRequests();
                        scrollBottom();
                    }
                    case "FRIEND_ACCEPTED" -> {
                        String fName = ProtocolHandler.decode(p[2]);
                        chatArea.append("🎉 [BẠN BÈ] " + fName + " đã chấp nhận lời mời kết bạn của bạn!\n\n");
                        friendService.getFriendList();
                        scrollBottom();
                    }
                    case "ROOM_INVITATION" -> {
                        String rName = ProtocolHandler.decode(p[2]);
                        String inviter = ProtocolHandler.decode(p[3]);
                        chatArea.append("🚪 [PHÒNG CHAT] " + inviter + " đã mời bạn tham gia phòng #" + rName + "!\n\n");
                        roomService.listRooms();
                        scrollBottom();
                    }
                    case "USER_ONLINE", "USER_OFFLINE" -> {
                        userStatusLabel.setText("Trực tuyến");
                        friendService.getFriendList();
                    }
                    case "ERROR" -> JOptionPane.showMessageDialog(this, ProtocolHandler.decode(p[1]), "Thông báo lỗi", JOptionPane.WARNING_MESSAGE);
                    case "REQUEST_TIMEOUT" -> userStatusLabel.setText("Quá thời gian chờ");
                    case "PROTOCOL_ERROR" -> {
                        userStatusLabel.setText("Lỗi giao thức");
                        JOptionPane.showMessageDialog(this, p.length > 1 ? ProtocolHandler.decode(p[1]) : "Gói tin không hợp lệ.", "Lỗi giao thức", JOptionPane.WARNING_MESSAGE);
                    }
                    case "CLIENT_DISCONNECTED" -> userStatusLabel.setText("Mất kết nối");
                }
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        });
    }

    private void handleNewPrivateMessage(String[] p) {
        if (p.length >= 5) {
            String senderName = ProtocolHandler.decode(p[2]);
            String content = ProtocolHandler.decode(p[3]);
            String time = ProtocolHandler.decode(p[4]);
            chatArea.append("🔒 [" + time + "] " + senderName + " (Tin nhắn riêng): " + content + "\n\n");
            scrollBottom();
        }
    }

    private void updateRooms(String[] p) {
        int selected = currentRoomId == null ? -1 : currentRoomId;
        roomModel.clear();
        for (int i = 1; i < p.length; i++) {
            String[] x = p[i].split(",", 2);
            if (x.length == 2) {
                roomModel.addElement(new Room(Integer.parseInt(x[0]), ProtocolHandler.decode(x[1])));
            }
        }
        if (selected != -1) {
            for (int i = 0; i < roomModel.size(); i++) {
                if (roomModel.get(i).id() == selected) {
                    roomList.setSelectedIndex(i);
                    break;
                }
            }
        }
    }

    private void handleOk(String[] p) {
        if (p.length > 1 && "JOIN_ROOM".equals(p[1])) {
            currentRoomId = Integer.parseInt(p[2]);
            currentRoomName = ProtocolHandler.decode(p[3]);
            headerTitleLabel.setText(currentRoomName);
            headerTopicLabel.setText("ID: " + currentRoomId + " | Chào mừng đến với #" + currentRoomName);
            welcomeTitleLabel.setText("Chào mừng đến với #" + currentRoomName + "!");
            welcomeSubLabel.setText("Đây là điểm bắt đầu của kênh #" + currentRoomName + ".");
            inviteBtn.setEnabled(true);
            leaveBtn.setEnabled(true);
        } else if (p.length > 1 && "ROOM_CREATED".equals(p[1])) {
            roomService.listRooms();
            JOptionPane.showMessageDialog(this, "Tạo phòng chat thành công!", "Thông báo", JOptionPane.INFORMATION_MESSAGE);
        } else if (p.length > 1 && "INVITE_ROOM".equals(p[1])) {
            JOptionPane.showMessageDialog(this, "Đã mời người dùng vào phòng thành công!", "Mời thành công", JOptionPane.INFORMATION_MESSAGE);
        } else if (p.length > 1 && "KICK_ROOM".equals(p[1])) {
            JOptionPane.showMessageDialog(this, "Đã xóa thành viên khỏi phòng.", "Thông báo", JOptionPane.INFORMATION_MESSAGE);
        } else if (p.length > 1 && "FRIEND_REQUEST".equals(p[1])) {
            JOptionPane.showMessageDialog(this, "Đã gửi lời mời kết bạn!", "Thông báo", JOptionPane.INFORMATION_MESSAGE);
        } else if (p.length > 1 && "FRIEND_ACCEPT".equals(p[1])) {
            JOptionPane.showMessageDialog(this, "Đã chấp nhận lời mời kết bạn!", "Thông báo", JOptionPane.INFORMATION_MESSAGE);
            friendService.getPendingRequests();
            friendService.getFriendList();
        } else if (p.length > 1 && "FRIEND_REJECT".equals(p[1])) {
            friendService.getPendingRequests();
        } else if (p.length > 1 && "LEAVE_ROOM".equals(p[1])) {
            leaveCurrentRoom();
        }
    }

    private void updateMembers(String[] p) {
        memberModel.clear();
        isCurrentRoomOwner = false;

        for (int i = 1; i < p.length; i++) {
            String[] x = p[i].split(",", 4);
            if (x.length >= 2) {
                int id = Integer.parseInt(x[0]);
                String name = ProtocolHandler.decode(x[1]);
                String role = (x.length >= 3) ? x[2] : "MEMBER";
                boolean online = (x.length >= 4) && "ONLINE".equalsIgnoreCase(x[3]);

                if ("OWNER".equalsIgnoreCase(role) && name.equalsIgnoreCase(displayName)) {
                    isCurrentRoomOwner = true;
                }

                memberModel.addElement(new MemberItem(id, name, role, online));
            }
        }

        // Kích hoạt nút Kick chỉ khi người dùng hiện tại là Owner của phòng
        kickBtn.setEnabled(isCurrentRoomOwner);
    }

    private void updateOnline(String[] p) {
        if (currentRoomId == null) {
            memberModel.clear();
            for (int i = 1; i < p.length; i++) {
                String[] x = p[i].split(",", 2);
                if (x.length == 2) {
                    memberModel.addElement(new MemberItem(Integer.parseInt(x[0]), ProtocolHandler.decode(x[1]), "MEMBER", true));
                }
            }
        }
    }

    private void updatePendingRequests(String[] p) {
        pendingModel.clear();
        for (int i = 1; i < p.length; i++) {
            String[] x = p[i].split(",", 5);
            if (x.length >= 4) {
                int reqId = Integer.parseInt(x[0]);
                int senderId = Integer.parseInt(x[1]);
                String uName = ProtocolHandler.decode(x[2]);
                String dName = ProtocolHandler.decode(x[3]);
                String time = (x.length >= 5) ? ProtocolHandler.decode(x[4]) : "";
                pendingModel.addElement(new PendingRequestItem(reqId, senderId, uName, dName, time));
            }
        }
    }

    private void updateFriendList(String[] p) {
        friendModel.clear();
        for (int i = 1; i < p.length; i++) {
            String[] x = p[i].split(",", 4);
            if (x.length >= 3) {
                int id = Integer.parseInt(x[0]);
                String uName = ProtocolHandler.decode(x[1]);
                String dName = ProtocolHandler.decode(x[2]);
                boolean online = (x.length >= 4) && "ONLINE".equalsIgnoreCase(x[3]);
                friendModel.addElement(new FriendItem(id, uName, dName, online));
            }
        }
    }

    private void handleSearchResult(String[] p) {
        if (p.length <= 1) {
            JOptionPane.showMessageDialog(this, "Không tìm thấy người dùng nào phù hợp.", "Kết quả tìm kiếm", JOptionPane.INFORMATION_MESSAGE);
            return;
        }

        DefaultListModel<String> resultsModel = new DefaultListModel<>();
        List<Integer> userIds = new ArrayList<>();

        for (int i = 1; i < p.length; i++) {
            String[] x = p[i].split(",", 5);
            if (x.length >= 3) {
                int uid = Integer.parseInt(x[0]);
                String uName = ProtocolHandler.decode(x[1]);
                String dName = ProtocolHandler.decode(x[2]);
                String friendStatus = (x.length >= 4) ? x[3] : "NONE";
                String onlineStatus = (x.length >= 5) ? x[4] : "OFFLINE";

                String isF = "FRIEND".equalsIgnoreCase(friendStatus) ? " [Đã là bạn bè]" : "";
                resultsModel.addElement(dName + " (@" + uName + ") - " + onlineStatus + isF);
                userIds.add(uid);
            }
        }

        JList<String> resultList = new JList<>(resultsModel);
        resultList.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        int opt = JOptionPane.showConfirmDialog(this, new JScrollPane(resultList), "Chọn người dùng để gửi lời mời kết bạn", JOptionPane.OK_CANCEL_OPTION, JOptionPane.PLAIN_MESSAGE);

        if (opt == JOptionPane.OK_OPTION && resultList.getSelectedIndex() >= 0) {
            int selectedUserId = userIds.get(resultList.getSelectedIndex());
            friendService.sendFriendRequest(selectedUserId);
        }
    }

    private String formatDiscordMessage(String sender, String content, String time) {
        return sender + "  (" + time + "):\n" + content;
    }

    private void scrollBottom() {
        chatArea.setCaretPosition(chatArea.getDocument().getLength());
    }

    @Override
    public void dispose() {
        try {
            new AuthService(client).logout();
        } catch (Exception ignored) {}
        client.close();
        super.dispose();
        System.exit(0);
    }
}
