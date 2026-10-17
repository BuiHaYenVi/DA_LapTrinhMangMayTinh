export type Locale = 'vi' | 'en';

export interface TranslationDictionary {
  appName: string;
  appSubtitle: string;
  auth: {
    welcomeTitle: string;
    welcomeSubtitle: string;
    loginTab: string;
    registerTab: string;
    usernameLabel: string;
    usernamePlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    displayNameLabel: string;
    displayNamePlaceholder: string;
    loginButton: string;
    registerButton: string;
    demoSectionTitle: string;
    demoSectionHint: string;
    backendStatusLive: string;
    backendStatusMock: string;
  };
  workspace: {
    directMessages: string;
    friends: string;
    textChannels: string;
    voiceChannels: string;
    onlineMembers: string;
    offlineMembers: string;
    searchPlaceholder: string;
    pinnedMessages: string;
    protocolMonitor: string;
    commandPaletteHint: string;
    messagePlaceholder: string;
    replyingTo: string;
    editingMessage: string;
    typingSuffix: string;
  };
  settings: {
    title: string;
    profileTab: string;
    appearanceTab: string;
    networkTab: string;
    shortcutsTab: string;
    themeLabel: string;
    themeLight: string;
    themeDark: string;
    languageLabel: string;
    statusLabel: string;
    customStatusLabel: string;
    customStatusPlaceholder: string;
    saveStatus: string;
    udpSimulationLabel: string;
    udpSimulationDesc: string;
    connectionModeLabel: string;
    logoutButton: string;
    closeButton: string;
  };
  commandPalette: {
    placeholder: string;
    emptyState: string;
    groupNavigation: string;
    groupActions: string;
    groupStatus: string;
    toggleTheme: string;
    toggleMonitor: string;
    openSettings: string;
    openFriends: string;
    probeRtt: string;
  };
}

export const TRANSLATIONS: Record<Locale, TranslationDictionary> = {
  vi: {
    appName: 'Oceanic Protocol',
    appSubtitle: 'Đồ Án Lập Trình Mạng Máy Tính — Đa Giao Thức TCP / UDP / WebSocket / WebRTC',
    auth: {
      welcomeTitle: 'Chào mừng đến với Oceanic Protocol',
      welcomeSubtitle:
        'Không gian giao tiếp thời gian thực tích hợp đồng bộ TCP Socket (:5000), UDP Datagram (:5001), HTTP REST (:8080) và WebSocket (:8081).',
      loginTab: 'Đăng nhập',
      registerTab: 'Đăng ký tài khoản',
      usernameLabel: 'Tên đăng nhập (Username)',
      usernamePlaceholder: 'Nhập tên đăng nhập, vd: yen_vi',
      passwordLabel: 'Mật khẩu',
      passwordPlaceholder: 'Nhập mật khẩu của bạn',
      displayNameLabel: 'Tên hiển thị (Display Name)',
      displayNamePlaceholder: 'Vd: Bùi Hà Yến Vi',
      loginButton: 'Kết nối vào Hệ thống',
      registerButton: 'Khởi tạo Tài khoản & Kết nối',
      demoSectionTitle: 'Đăng nhập nhanh Demo (4 thành viên đồ án)',
      demoSectionHint: 'Chuyển đổi tức thời giữa 4 thành viên nhóm để kiểm thử chat, phân quyền và đo kiểm gói tin TCP/UDP:',
      backendStatusLive: 'Đang kết nối máy chủ Java 21 Multi-Protocol (:8080 / :8081)',
      backendStatusMock: 'Chế độ Mô phỏng Đa giao thức (Tự động kích hoạt khi Backend offline)',
    },
    workspace: {
      directMessages: 'Tin nhắn trực tiếp',
      friends: 'Bạn bè',
      textChannels: 'KÊNH VĂN BẢN (TCP/WS)',
      voiceChannels: 'KÊNH THOẠI & VIDEO (UDP/RTC)',
      onlineMembers: 'TRỰC TUYẾN',
      offlineMembers: 'NGOẠI TUYẾN',
      searchPlaceholder: 'Tìm kiếm tin nhắn...',
      pinnedMessages: 'Tin nhắn đã ghim',
      protocolMonitor: 'Protocol Monitor (TCP/UDP)',
      commandPaletteHint: 'Tìm nhanh (Ctrl+K)',
      messagePlaceholder: 'Nhắn tin tới kênh',
      replyingTo: 'Đang trả lời',
      editingMessage: 'Đang chỉnh sửa tin nhắn',
      typingSuffix: 'đang nhập qua',
    },
    settings: {
      title: 'Cài đặt Hệ thống & Hồ sơ',
      profileTab: 'Hồ sơ & Trạng thái',
      appearanceTab: 'Giao diện & Ngôn ngữ',
      networkTab: 'Giao thức Mạng (TCP/UDP)',
      shortcutsTab: 'Phím tắt bàn phím',
      themeLabel: 'Chế độ Giao diện (Theme)',
      themeLight: 'Sáng (Clean White & Ocean Blue — Mặc định)',
      themeDark: 'Tối (Deep Navy & Luminous Blue)',
      languageLabel: 'Ngôn ngữ hiển thị',
      statusLabel: 'Trạng thái hiện diện (Presence)',
      customStatusLabel: 'Trạng thái tùy chỉnh',
      customStatusPlaceholder: 'Đang kiểm thử gói tin TCP/UDP...',
      saveStatus: 'Cập nhật trạng thái',
      udpSimulationLabel: 'Mô phỏng tường lửa chặn UDP (:5001)',
      udpSimulationDesc: 'Khi bật, các gói tin typing/probe UDP bị chặn sẽ tự động chuyển sang cơ chế UDP_FALLBACK qua WebSocket.',
      connectionModeLabel: 'Chế độ kết nối hiện tại',
      logoutButton: 'Đăng xuất tài khoản',
      closeButton: 'Đóng (Esc)',
    },
    commandPalette: {
      placeholder: 'Nhập tên kênh (#general), thành viên, hoặc lệnh hệ thống...',
      emptyState: 'Không tìm thấy kênh, thành viên hoặc lệnh phù hợp.',
      groupNavigation: 'Chuyển nhanh Kênh & Máy chủ',
      groupActions: 'Tác vụ Hệ thống & Giao thức',
      groupStatus: 'Đổi Trạng thái Hiện diện',
      toggleTheme: 'Chuyển đổi Giao diện Sáng / Tối (Light / Dark Mode)',
      toggleMonitor: 'Bật / Tắt Bảng Giám sát Gói tin (Protocol Monitor TCP/UDP)',
      openSettings: 'Mở Cài đặt Hệ thống & Hồ sơ',
      openFriends: 'Mở danh sách Bạn bè & Tin nhắn riêng (DM)',
      probeRtt: 'Bắn gói đo độ trễ Ping RTT (TCP/WS vs UDP :5001)',
    },
  },
  en: {
    appName: 'Oceanic Protocol',
    appSubtitle: 'Computer Networking Capstone — Multi-Protocol TCP / UDP / WebSocket / WebRTC',
    auth: {
      welcomeTitle: 'Welcome to Oceanic Protocol',
      welcomeSubtitle:
        'Real-time collaboration workspace bridging Java 21 TCP Sockets (:5000), UDP Datagrams (:5001), HTTP REST (:8080), and WebSockets (:8081).',
      loginTab: 'Sign In',
      registerTab: 'Create Account',
      usernameLabel: 'Username',
      usernamePlaceholder: 'Enter username, e.g. yen_vi',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      displayNameLabel: 'Display Name',
      displayNamePlaceholder: 'e.g. Bui Ha Yen Vi',
      loginButton: 'Connect to Workspace',
      registerButton: 'Register & Connect',
      demoSectionTitle: '1-Click Quick Demo Login (4 Capstone Members)',
      demoSectionHint: 'Instantly switch between the 4 project members to test real-time chat, roles, and TCP/UDP telemetry:',
      backendStatusLive: 'Connected to Java 21 Multi-Protocol Server (:8080 / :8081)',
      backendStatusMock: 'Interactive Multi-Protocol Simulation Mode (Active when backend is offline)',
    },
    workspace: {
      directMessages: 'Direct Messages',
      friends: 'Friends',
      textChannels: 'TEXT CHANNELS (TCP/WS)',
      voiceChannels: 'VOICE & VIDEO (UDP/RTC)',
      onlineMembers: 'ONLINE',
      offlineMembers: 'OFFLINE',
      searchPlaceholder: 'Search messages...',
      pinnedMessages: 'Pinned Messages',
      protocolMonitor: 'Protocol Monitor (TCP/UDP)',
      commandPaletteHint: 'Quick Switcher (Ctrl+K)',
      messagePlaceholder: 'Message channel',
      replyingTo: 'Replying to',
      editingMessage: 'Editing message',
      typingSuffix: 'is typing via',
    },
    settings: {
      title: 'Workspace & Profile Settings',
      profileTab: 'Profile & Presence',
      appearanceTab: 'Appearance & Locale',
      networkTab: 'Network Protocols (TCP/UDP)',
      shortcutsTab: 'Keyboard Shortcuts',
      themeLabel: 'Interface Theme',
      themeLight: 'Light Mode (Clean White & Ocean Blue — Default)',
      themeDark: 'Dark Mode (Deep Navy & Luminous Blue)',
      languageLabel: 'Display Language',
      statusLabel: 'Presence Status',
      customStatusLabel: 'Custom Status',
      customStatusPlaceholder: 'Inspecting TCP/UDP packets...',
      saveStatus: 'Update Presence',
      udpSimulationLabel: 'Simulate Firewall Blocking UDP (:5001)',
      udpSimulationDesc: 'When enabled, UDP datagrams fail over to UDP_FALLBACK over WebSocket for resilience testing.',
      connectionModeLabel: 'Active Connection Mode',
      logoutButton: 'Log Out',
      closeButton: 'Close (Esc)',
    },
    commandPalette: {
      placeholder: 'Type a channel (#general), member, or protocol command...',
      emptyState: 'No matching channels, members, or commands found.',
      groupNavigation: 'Jump to Guild & Channel',
      groupActions: 'System & Protocol Actions',
      groupStatus: 'Switch Presence Status',
      toggleTheme: 'Toggle Light / Dark Theme',
      toggleMonitor: 'Toggle Protocol Monitor Drawer (TCP/UDP)',
      openSettings: 'Open Workspace & Profile Settings',
      openFriends: 'Open Friends & Direct Messages (DM)',
      probeRtt: 'Trigger Ping RTT Probe (TCP/WS vs UDP :5001)',
    },
  },
};

export function getTranslation(locale: Locale): TranslationDictionary {
  return TRANSLATIONS[locale] ?? TRANSLATIONS.vi;
}
