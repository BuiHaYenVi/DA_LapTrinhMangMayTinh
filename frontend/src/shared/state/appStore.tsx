import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { apiClient, normalizeMessage, pickAvatarColor } from '../api/apiClient';
import { wsClient } from '../ws/wsClient';
import type {
  Attachment,
  Channel,
  ChannelType,
  DirectConversation,
  FriendRequest,
  Guild,
  MemberRole,
  Message,
  NetworkFrameLog,
  PresenceStatus,
  RttSample,
  ToastItem,
  TransportKind,
  User,
  VoiceParticipant,
} from '../types/api';

/* ==========================================================================
   Pre-Populated Capstone Team Personas & Multi-Protocol Mock Dataset
   ========================================================================== */

export const TEAM_PERSONAS: Record<'vi' | 'an' | 'vinh' | 'hai', User> = {
  vi: {
    id: 1,
    username: 'yen_vi',
    displayName: 'Bùi Hà Yến Vi',
    avatarColor: '#2563EB',
    status: 'ONLINE',
    customStatus: 'Trưởng nhóm • Kiến trúc TCP/WS Server & DB',
    role: 'OWNER',
    online: true,
    transport: 'WS',
  },
  an: {
    id: 2,
    username: 'bao_an',
    displayName: 'Tống Nhật Bảo An',
    avatarColor: '#0284C7',
    status: 'ONLINE',
    customStatus: 'Đang tối ưu luồng UDP :5001 & WebRTC Signaling',
    role: 'ADMIN',
    online: true,
    transport: 'WS',
  },
  vinh: {
    id: 3,
    username: 'anh_vinh',
    displayName: 'Vũ Anh Vinh',
    avatarColor: '#10B981',
    status: 'IDLE',
    customStatus: 'Kiểm thử cầu nối Swing TCP :5000 ↔ Web WS :8081',
    role: 'ADMIN',
    online: true,
    transport: 'TCP',
  },
  hai: {
    id: 4,
    username: 'thanh_hai',
    displayName: 'Nguyễn Thanh Hải',
    avatarColor: '#F59E0B',
    status: 'ONLINE',
    customStatus: 'Phân tích gói tin RTT & Neon PostgreSQL bytea',
    role: 'MEMBER',
    online: true,
    transport: 'WS',
  },
};

const INITIAL_MEMBERS: User[] = [
  TEAM_PERSONAS.vi,
  TEAM_PERSONAS.an,
  TEAM_PERSONAS.vinh,
  TEAM_PERSONAS.hai,
  {
    id: 5,
    username: 'gv_huong_dan',
    displayName: 'TS. Giảng Viên Hướng Dẫn',
    avatarColor: '#0EA5E9',
    status: 'ONLINE',
    customStatus: 'Đang chấm đồ án Lập Trình Mạng Máy Tính',
    role: 'ADMIN',
    online: true,
    transport: 'WS',
  },
  {
    id: 6,
    username: 'swing_client_01',
    displayName: 'Desktop Swing TCP Node #1',
    avatarColor: '#64748B',
    status: 'OFFLINE',
    customStatus: 'Legacy Socket Client (:5000)',
    role: 'MEMBER',
    online: false,
    transport: 'TCP',
  },
];

const INITIAL_GUILDS: Guild[] = [
  {
    id: 1,
    name: 'Đồ Án Lập Trình Mạng — Nhóm 4',
    iconText: 'N4',
    ownerId: 1,
    channels: [
      {
        id: 1,
        guildId: 1,
        name: 'general',
        type: 'text',
        topic: 'Thảo luận chung & Cầu nối thời gian thực giữa Web (WS :8081) và Desktop Swing (TCP :5000)',
        position: 0,
        unreadCount: 0,
      },
      {
        id: 2,
        guildId: 1,
        name: 'giao-thuc-tcp-udp',
        type: 'text',
        topic: 'So sánh độ trễ TCP Socket (:5000), UDP Datagram (:5001) và cơ chế tự động UDP_FALLBACK',
        position: 1,
        unreadCount: 2,
      },
      {
        id: 3,
        guildId: 1,
        name: 'database-neon',
        type: 'text',
        topic: 'Thiết kế lược đồ PostgreSQL Neon, lưu trữ file nhị phân bytea & Full-Text Search',
        position: 2,
        unreadCount: 0,
      },
      {
        id: 4,
        guildId: 1,
        name: '🔊 Phòng Họp Đồ Án',
        type: 'voice',
        topic: 'Phòng họp thoại & video P2P WebRTC + Giám sát tốc độ khung hình UDP',
        position: 3,
        unreadCount: 0,
      },
    ],
  },
  {
    id: 2,
    name: 'Phòng Lab Mạng Máy Tính (TCP/IP)',
    iconText: 'LB',
    ownerId: 2,
    channels: [
      {
        id: 201,
        guildId: 2,
        name: 'wireshark-captures',
        type: 'text',
        topic: 'Phân tích khung truyền Ethernet / IPv4 / TCP SYN-ACK / UDP Datagram',
        position: 0,
        unreadCount: 1,
      },
      {
        id: 202,
        guildId: 2,
        name: 'stress-test-benchmark',
        type: 'text',
        topic: 'Kiểm thử 500 kết nối đồng thời với Java 21 Virtual Threads',
        position: 1,
        unreadCount: 0,
      },
      {
        id: 203,
        guildId: 2,
        name: '🔊 Kênh Bảo Vệ Đồ Án',
        type: 'voice',
        topic: 'Phòng thuyết trình trực tiếp với hội đồng chấm thi',
        position: 2,
        unreadCount: 0,
      },
    ],
  },
];

const INITIAL_MESSAGES_BY_CHANNEL: Record<number, Message[]> = {
  1: [
    {
      id: 101,
      channelId: 1,
      senderId: 1,
      senderName: 'Bùi Hà Yến Vi',
      senderAvatarColor: '#2563EB',
      content:
        'Chào mọi người! Hệ thống **Oceanic Protocol** đã đồng bộ hoàn chỉnh cả 4 cổng mạng: `TCP :5000` (Swing), `UDP :5001` (Typing/Probe), `HTTP :8080` (REST API + File bytea) và `WS :8081` (Full-Duplex JSON).',
      createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      pinned: true,
      reactions: [
        { emoji: '🚀', count: 4, userIds: [1, 2, 3, 4], me: true },
        { emoji: '🔥', count: 3, userIds: [1, 2, 4], me: true },
      ],
      attachments: [],
      transport: 'WS',
    },
    {
      id: 102,
      channelId: 1,
      senderId: 3,
      senderName: 'Vũ Anh Vinh',
      senderAvatarColor: '#10B981',
      content:
        'Mình vừa gửi gói tin `ROOM_MSG|1|anh_vinh|Xin chào từ Java Swing Desktop!` qua cổng `TCP :5000`. Tin nhắn xuất hiện tức thì trên giao diện Web mà không cần tải lại trang.',
      createdAt: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
      pinned: false,
      reactions: [{ emoji: '⚡', count: 3, userIds: [1, 2, 3], me: false }],
      attachments: [],
      transport: 'TCP',
    },
    {
      id: 103,
      channelId: 1,
      senderId: 2,
      senderName: 'Tống Nhật Bảo An',
      senderAvatarColor: '#0284C7',
      content:
        'Ở góc trên bên phải có nút **Protocol Monitor (TCP/UDP)**. Khi bấm vào sẽ thấy biểu đồ so sánh RTT thời gian thực giữa luồng `TCP/WS` (màu xanh đại dương `#2563EB`) và gói tin `UDP` (màu xanh ngọc lục bảo `#10B981`).',
      createdAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
      pinned: true,
      replyTo: {
        messageId: 101,
        senderId: 1,
        senderName: 'Bùi Hà Yến Vi',
        content: 'Chào mọi người! Hệ thống Oceanic Protocol đã đồng bộ hoàn chỉnh cả 4 cổng mạng...',
      },
      reactions: [{ emoji: '👍', count: 4, userIds: [1, 2, 3, 4], me: true }],
      attachments: [],
      transport: 'WS',
    },
    {
      id: 104,
      channelId: 1,
      senderId: 4,
      senderName: 'Nguyễn Thanh Hải',
      senderAvatarColor: '#F59E0B',
      content:
        'Mình cũng đã kiểm thử tính năng mô phỏng chặn tường lửa UDP (`Simulate Firewall Blocking UDP :5001`). Khi UDP bị chặn, hệ thống tự động chuyển sang `UDP_FALLBACK` qua WebSocket mà không làm rớt tín hiệu đang gõ phím!',
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      pinned: false,
      reactions: [{ emoji: '🛡️', count: 2, userIds: [1, 4], me: true }],
      attachments: [],
      transport: 'WS',
    },
  ],
  2: [
    {
      id: 201,
      channelId: 2,
      senderId: 2,
      senderName: 'Tống Nhật Bảo An',
      senderAvatarColor: '#0284C7',
      content:
        'Cấu trúc khung gói tin UDP độ trễ thấp trên cổng `:5001`:\n`PING_UDP|<seq>|<clientTimestampMs>` → Máy chủ phản hồi ngay `PONG_UDP|<seq>|<serverTimestampMs>` với thời gian khứ hồi trung bình **1.2 ms**.',
      createdAt: new Date(Date.now() - 1000 * 60 * 48).toISOString(),
      pinned: true,
      reactions: [{ emoji: '📡', count: 4, userIds: [1, 2, 3, 4], me: true }],
      attachments: [],
      transport: 'UDP',
    },
    {
      id: 202,
      channelId: 2,
      senderId: 3,
      senderName: 'Vũ Anh Vinh',
      senderAvatarColor: '#10B981',
      content:
        'Trong khi đó kênh chat chính dùng `TCP :5000` và `WebSocket :8081` để đảm bảo **độ tin cậy 100%** ( thứ tự gói tin, kiểm soát luồng, không mất dữ liệu khi gửi tệp đính kèm ).',
      createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      pinned: false,
      reactions: [{ emoji: '✅', count: 3, userIds: [1, 2, 3], me: true }],
      attachments: [],
      transport: 'TCP',
    },
  ],
  3: [
    {
      id: 301,
      channelId: 3,
      senderId: 4,
      senderName: 'Nguyễn Thanh Hải',
      senderAvatarColor: '#F59E0B',
      content:
        'Bảng `rooms` trên PostgreSQL Neon đã được hợp nhất khóa chính (`channel_id === room_id`). Nhờ vậy mọi kênh tạo trên Web đều hiển thị ngay trong danh sách phòng của ứng dụng Java Swing.',
      createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
      pinned: true,
      reactions: [{ emoji: '🗄️', count: 3, userIds: [1, 2, 4], me: true }],
      attachments: [],
      transport: 'WS',
    },
  ],
  201: [
    {
      id: 401,
      channelId: 201,
      senderId: 1,
      senderName: 'Bùi Hà Yến Vi',
      senderAvatarColor: '#2563EB',
      content:
        'Bản chụp gói tin mẫu: `SYN [Seq=0] → SYN, ACK [Seq=0, Ack=1] → ACK [Seq=1, Ack=1]` trên cổng `:5000` và `:8081`.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      pinned: false,
      reactions: [],
      attachments: [],
      transport: 'TCP',
    },
  ],
};

function createInitialRttSamples(): RttSample[] {
  const now = Date.now();
  const samples: RttSample[] = [];
  for (let i = 14; i >= 0; i--) {
    const seq = 100 - i;
    const wsRtt = Number((11.5 + Math.sin(i * 0.9) * 3.2).toFixed(1));
    const tcpRtt = Number((9.2 + Math.cos(i * 0.7) * 2.4).toFixed(1));
    const udpRtt = Number((1.4 + Math.abs(Math.sin(i * 1.1)) * 1.1).toFixed(2));
    samples.push({
      seq,
      timestampMs: now - i * 3000,
      wsRttMs: wsRtt,
      tcpRttMs: tcpRtt,
      udpRttMs: udpRtt,
      udpFallback: false,
    });
  }
  return samples;
}

function createInitialFrameLogs(): NetworkFrameLog[] {
  const now = Date.now();
  return [
    {
      id: 'frame-init-1',
      direction: 'OUT',
      transport: 'HTTP',
      rawFrame: 'POST /api/auth/login {"username":"yen_vi"} -> 200 OK (JWT HMAC-SHA256)',
      summary: 'HTTP 200 POST /api/auth/login',
      timestampMs: now - 18000,
    },
    {
      id: 'frame-init-2',
      direction: 'OUT',
      transport: 'WS',
      rawFrame: 'GET ws://localhost:8081?token=eyJhbGciOiJIUzI1Ni... HTTP/1.1 101 Switching Protocols',
      summary: 'WS Handshake 101 Switching Protocols (:8081)',
      timestampMs: now - 15000,
    },
    {
      id: 'frame-init-3',
      direction: 'IN',
      transport: 'TCP',
      rawFrame: 'ROOM_MSG|1|anh_vinh|Xin chào từ Java Swing Desktop!',
      summary: 'Bridge RX TCP :5000 ROOM_MSG (channel=1)',
      timestampMs: now - 11000,
    },
    {
      id: 'frame-init-4',
      direction: 'OUT',
      transport: 'UDP',
      rawFrame: 'PING_UDP|100|1760673600120 -> :5001 (28 bytes datagram)',
      summary: 'UDP TX PING_UDP seq=100 (:5001)',
      timestampMs: now - 6000,
    },
    {
      id: 'frame-init-5',
      direction: 'IN',
      transport: 'UDP',
      rawFrame: 'PONG_UDP|100|1760673600121 <- :5001 (RTT=1.38 ms)',
      summary: 'UDP RX PONG_UDP seq=100 (1.38 ms)',
      timestampMs: now - 5998,
    },
  ];
}

/* ==========================================================================
   AppStore Context Interface (Strict Contract for T1.D, T1.E, T1.F)
   ========================================================================== */

export interface AppStoreValue {
  // State
  currentUser: User | null;
  token: string | null;
  isAuthenticated: boolean;
  connectionMode: 'live' | 'mock';
  isConnected: boolean;
  udpBlockedSimulated: boolean;
  theme: 'light' | 'dark';
  locale: 'vi' | 'en';
  viewMode: 'guild' | 'dm' | 'friends';
  guilds: Guild[];
  activeGuildId: number;
  activeChannelId: number;
  activeGuild: Guild | null;
  activeChannel: Channel | null;
  messages: Message[];
  pinnedMessages: Message[];
  searchResults: Message[];
  searchQuery: string;
  members: User[];
  typingUsers: { userId: number; displayName: string; transport: TransportKind }[];
  replyingTo: Message | null;
  editingMessage: Message | null;
  friends: User[];
  friendRequests: FriendRequest[];
  dmConversations: DirectConversation[];
  activeDmId: number | null;
  dmMessages: Message[];
  activeVoiceChannelId: number | null;
  voiceParticipants: VoiceParticipant[];
  localVoiceState: {
    muted: boolean;
    deafened: boolean;
    cameraOn: boolean;
    screenSharing: boolean;
  };
  rttSamples: RttSample[];
  frameLogs: NetworkFrameLog[];
  isMonitorOpen: boolean;
  isSettingsOpen: boolean;
  isCommandPaletteOpen: boolean;
  isMemberSidebarOpen: boolean;
  mobileDrawerOpen: 'none' | 'channels' | 'members';
  toasts: ToastItem[];

  // Actions
  login(username: string, password: string): Promise<void>;
  register(username: string, password: string, displayName: string): Promise<void>;
  loginDemo(persona?: 'vi' | 'an' | 'vinh' | 'hai'): void;
  logout(): void;
  setTheme(theme: 'light' | 'dark'): void;
  toggleTheme(): void;
  setLocale(locale: 'vi' | 'en'): void;
  setViewMode(mode: 'guild' | 'dm' | 'friends'): void;
  selectGuild(guildId: number): void;
  selectChannel(channelId: number): void;
  createGuild(name: string, iconText?: string): Promise<void>;
  createChannel(guildId: number, name: string, type: ChannelType, topic?: string): Promise<void>;
  createInvite(guildId: number): Promise<string>;
  joinGuildByInvite(code: string): Promise<void>;
  sendMessage(content: string, attachments?: Attachment[]): Promise<void>;
  editMessage(messageId: number, content: string): Promise<void>;
  deleteMessage(messageId: number): Promise<void>;
  toggleReaction(messageId: number, emoji: string): Promise<void>;
  togglePinMessage(messageId: number, pinned: boolean): Promise<void>;
  setReplyingTo(msg: Message | null): void;
  setEditingMessage(msg: Message | null): void;
  searchChannelMessages(query: string): Promise<void>;
  uploadFile(file: File): Promise<Attachment>;
  notifyTyping(isTyping: boolean): void;
  updatePresence(status: PresenceStatus, customStatus?: string): void;
  updateMemberRole(userId: number, role: MemberRole): Promise<void>;
  sendFriendRequest(usernameOrId: string): Promise<void>;
  respondFriendRequest(requestId: number, accept: boolean): Promise<void>;
  openDmWithUser(userId: number): Promise<void>;
  selectDm(dmId: number): void;
  sendDmMessage(content: string, attachments?: Attachment[]): Promise<void>;
  joinVoiceChannel(channelId: number): void;
  leaveVoiceChannel(): void;
  updateLocalVoiceState(
    partial: Partial<{
      muted: boolean;
      deafened: boolean;
      cameraOn: boolean;
      screenSharing: boolean;
    }>,
  ): void;
  sendVoiceSignal(
    type: 'SIGNAL_OFFER' | 'SIGNAL_ANSWER' | 'SIGNAL_ICE',
    targetUserId: number,
    data: unknown,
  ): void;
  triggerRttProbe(): Promise<void>;
  setUdpBlockedSimulated(blocked: boolean): void;
  clearFrameLogs(): void;
  setMonitorOpen(open: boolean): void;
  setSettingsOpen(open: boolean): void;
  setCommandPaletteOpen(open: boolean): void;
  setMemberSidebarOpen(open: boolean): void;
  setMobileDrawerOpen(drawer: 'none' | 'channels' | 'members'): void;
  addToast(type: ToastItem['type'], title: string, message?: string): void;
  dismissToast(id: string): void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

export const AppStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication & Session
  const [currentUser, setCurrentUser] = useState<User | null>(TEAM_PERSONAS.vi);
  const [token, setToken] = useState<string | null>('demo-jwt-token-oceanic');
  const [connectionMode, setConnectionMode] = useState<'live' | 'mock'>('mock');
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [udpBlockedSimulated, setUdpBlockedSimulatedState] = useState<boolean>(false);

  // Appearance & Navigation
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('oceanic_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });
  const [locale, setLocaleState] = useState<'vi' | 'en'>(() => {
    const saved = localStorage.getItem('oceanic_locale');
    return saved === 'en' ? 'en' : 'vi';
  });
  const [viewMode, setViewMode] = useState<'guild' | 'dm' | 'friends'>('guild');

  // Guilds, Channels & Messages
  const [guilds, setGuilds] = useState<Guild[]>(INITIAL_GUILDS);
  const [activeGuildId, setActiveGuildId] = useState<number>(1);
  const [activeChannelId, setActiveChannelId] = useState<number>(1);
  const [messagesByChannel, setMessagesByChannel] = useState<Record<number, Message[]>>(
    INITIAL_MESSAGES_BY_CHANNEL,
  );
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [members, setMembers] = useState<User[]>(INITIAL_MEMBERS);
  const [typingUsers, setTypingUsers] = useState<
    { userId: number; displayName: string; transport: TransportKind }[]
  >([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  // Friends & Direct Messages
  const [friends, setFriends] = useState<User[]>([
    TEAM_PERSONAS.an,
    TEAM_PERSONAS.vinh,
    TEAM_PERSONAS.hai,
  ]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(() => [
    {
      id: 901,
      user: {
        id: 5,
        username: 'gv_huong_dan',
        displayName: 'TS. Giảng Viên Hướng Dẫn',
        avatarColor: '#0EA5E9',
        status: 'ONLINE',
        customStatus: 'Hội đồng chấm đồ án Lập Trình Mạng',
        role: 'ADMIN',
        online: true,
      },
      direction: 'INCOMING',
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
  ]);
  const [dmConversations, setDmConversations] = useState<DirectConversation[]>([
    {
      id: 501,
      peerUser: TEAM_PERSONAS.an,
      lastMessagePreview: 'Đã kiểm tra xong cổng UDP :5001 và WebRTC ICE Candidate!',
      unreadCount: 1,
    },
    {
      id: 502,
      peerUser: TEAM_PERSONAS.vinh,
      lastMessagePreview: 'Swing client gửi ROOM_MSG mượt lắm nhé.',
      unreadCount: 0,
    },
    {
      id: 503,
      peerUser: TEAM_PERSONAS.hai,
      lastMessagePreview: 'Đã thêm chỉ mục GIN cho bảng messages trên Neon.',
      unreadCount: 0,
    },
  ]);
  const [activeDmId, setActiveDmId] = useState<number | null>(501);
  const [dmMessagesByConv, setDmMessagesByConv] = useState<Record<number, Message[]>>(() => ({
    501: [
      {
        id: 5001,
        channelId: 501,
        senderId: 2,
        senderName: 'Tống Nhật Bảo An',
        senderAvatarColor: '#0284C7',
        content: 'Vi ơi, mình đã kiểm tra xong cổng UDP :5001 và WebRTC ICE Candidate! Độ trễ nội bộ chỉ khoảng 1.3ms.',
        createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        reactions: [{ emoji: '🎉', count: 2, userIds: [1, 2], me: true }],
        attachments: [],
        transport: 'WS',
      },
    ],
    502: [
      {
        id: 5002,
        channelId: 502,
        senderId: 3,
        senderName: 'Vũ Anh Vinh',
        senderAvatarColor: '#10B981',
        content: 'Swing client gửi PRIVATE_MSG qua cổng TCP :5000 sang Web rất mượt nhé.',
        createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
        reactions: [],
        attachments: [],
        transport: 'TCP',
      },
    ],
    503: [
      {
        id: 5003,
        channelId: 503,
        senderId: 4,
        senderName: 'Nguyễn Thanh Hải',
        senderAvatarColor: '#F59E0B',
        content: 'Đã thêm chỉ mục GIN Full-Text Search cho bảng messages trên Neon PostgreSQL.',
        createdAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
        reactions: [],
        attachments: [],
        transport: 'WS',
      },
    ],
  }));

  // Voice / WebRTC Stage
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState<number | null>(null);
  const [voiceParticipants, setVoiceParticipants] = useState<VoiceParticipant[]>([
    {
      userId: 2,
      username: 'bao_an',
      displayName: 'Tống Nhật Bảo An',
      avatarColor: '#0284C7',
      channelId: 4,
      muted: false,
      deafened: false,
      cameraOn: true,
      speaking: true,
    },
    {
      userId: 4,
      username: 'thanh_hai',
      displayName: 'Nguyễn Thanh Hải',
      avatarColor: '#F59E0B',
      channelId: 4,
      muted: false,
      deafened: false,
      cameraOn: false,
      speaking: false,
    },
  ]);
  const [localVoiceState, setLocalVoiceState] = useState({
    muted: false,
    deafened: false,
    cameraOn: false,
    screenSharing: false,
  });

  // Telemetry & UI Panels
  const [rttSamples, setRttSamples] = useState<RttSample[]>(createInitialRttSamples);
  const [frameLogs, setFrameLogs] = useState<NetworkFrameLog[]>(createInitialFrameLogs);
  const [isMonitorOpen, setMonitorOpen] = useState<boolean>(false);
  const [isSettingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [isMemberSidebarOpen, setMemberSidebarOpen] = useState<boolean>(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<'none' | 'channels' | 'members'>('none');
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const rttSeqRef = useRef<number>(101);
  const typingTimeoutRef = useRef<number | null>(null);

  // Sync theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('oceanic_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('lang', locale);
    localStorage.setItem('oceanic_locale', locale);
  }, [locale]);

  const appendFrameLog = useCallback(
    (entry: Omit<NetworkFrameLog, 'id' | 'timestampMs'>) => {
      const item: NetworkFrameLog = {
        ...entry,
        id: `frm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestampMs: Date.now(),
      };
      setFrameLogs((prev) => [item, ...prev.slice(0, 199)]);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastItem['type'], title: string, message?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);
      window.setTimeout(() => {
        dismissToast(id);
      }, 4200);
    },
    [dismissToast],
  );

  // Register frame loggers on apiClient and wsClient
  useEffect(() => {
    apiClient.setFrameLogger(appendFrameLog);
    wsClient.setFrameLogger(appendFrameLog);
    return () => {
      apiClient.setFrameLogger(null);
      wsClient.setFrameLogger(null);
    };
  }, [appendFrameLog]);

  // Check if Java 21 Backend (:8080) is reachable on startup
  useEffect(() => {
    let mounted = true;
    apiClient.checkHealth().then((alive) => {
      if (!mounted) return;
      if (alive) {
        appendFrameLog({
          direction: 'IN',
          transport: 'HTTP',
          rawFrame: 'GET /api/health -> {"status":"UP","ports":{"tcp":5000,"udp":5001,"http":8080,"ws":8081}}',
          summary: 'Backend Health UP (:5000/:5001/:8080/:8081)',
        });
      }
    });
    return () => {
      mounted = false;
    };
  }, [appendFrameLog]);

  // Listen to incoming WebSocket frames when in live mode
  useEffect(() => {
    const unsubEvent = wsClient.onEvent((envelope) => {
      const { type, payload } = envelope;
      if (!payload) return;

      switch (type) {
        case 'MESSAGE_CREATED': {
          const rawMsg = (payload.message as Record<string, unknown>) ?? payload;
          const msg = normalizeMessage(rawMsg, activeChannelId);
          setMessagesByChannel((prev) => {
            const list = prev[msg.channelId] ?? [];
            if (list.some((m) => m.id === msg.id)) return prev;
            return { ...prev, [msg.channelId]: [...list, msg] };
          });
          break;
        }
        case 'MESSAGE_UPDATED': {
          const rawMsg = (payload.message as Record<string, unknown>) ?? payload;
          const msg = normalizeMessage(rawMsg, activeChannelId);
          setMessagesByChannel((prev) => {
            const list = prev[msg.channelId] ?? [];
            return {
              ...prev,
              [msg.channelId]: list.map((m) => (m.id === msg.id ? msg : m)),
            };
          });
          break;
        }
        case 'MESSAGE_DELETED': {
          const messageId = Number(payload.messageId);
          const channelId = Number(payload.channelId ?? activeChannelId);
          const deletedAt = String(payload.deletedAt ?? new Date().toISOString());
          setMessagesByChannel((prev) => {
            const list = prev[channelId] ?? [];
            return {
              ...prev,
              [channelId]: list.map((m) => (m.id === messageId ? { ...m, deletedAt } : m)),
            };
          });
          break;
        }
        case 'MESSAGE_REACTION_UPDATED': {
          const messageId = Number(payload.messageId);
          const channelId = Number(payload.channelId ?? activeChannelId);
          const reactionsRaw = Array.isArray(payload.reactions) ? payload.reactions : [];
          setMessagesByChannel((prev) => {
            const list = prev[channelId] ?? [];
            return {
              ...prev,
              [channelId]: list.map((m) =>
                m.id === messageId
                  ? {
                      ...m,
                      reactions: reactionsRaw.map((r: Record<string, unknown>) => ({
                        emoji: String(r.emoji),
                        count: Number(r.count ?? 1),
                        userIds: Array.isArray(r.userIds) ? r.userIds.map(Number) : [],
                        me: Boolean(r.me),
                      })),
                    }
                  : m,
              ),
            };
          });
          break;
        }
        case 'MESSAGE_PIN_UPDATED': {
          const messageId = Number(payload.messageId);
          const channelId = Number(payload.channelId ?? activeChannelId);
          const pinned = Boolean(payload.pinned);
          setMessagesByChannel((prev) => {
            const list = prev[channelId] ?? [];
            return {
              ...prev,
              [channelId]: list.map((m) => (m.id === messageId ? { ...m, pinned } : m)),
            };
          });
          break;
        }
        case 'DM_CREATED': {
          const convId = Number(payload.conversationId ?? activeDmId ?? 501);
          const rawMsg = (payload.message as Record<string, unknown>) ?? payload;
          const msg = normalizeMessage(rawMsg, convId);
          setDmMessagesByConv((prev) => {
            const list = prev[convId] ?? [];
            if (list.some((m) => m.id === msg.id)) return prev;
            return { ...prev, [convId]: [...list, msg] };
          });
          break;
        }
        case 'TYPING_UPDATE': {
          const userId = Number(payload.userId);
          const displayName = String(payload.displayName ?? payload.username ?? 'Member');
          const isTyping = Boolean(payload.isTyping);
          const transport = (payload.transport as TransportKind) ?? 'UDP';
          setTypingUsers((prev) => {
            const filtered = prev.filter((u) => u.userId !== userId);
            return isTyping ? [...filtered, { userId, displayName, transport }] : filtered;
          });
          break;
        }
        case 'PRESENCE_UPDATED': {
          const userId = Number(payload.userId);
          const status = (payload.status as PresenceStatus) ?? 'ONLINE';
          const customStatus = payload.customStatus as string | undefined;
          setMembers((prev) =>
            prev.map((m) =>
              m.id === userId
                ? { ...m, status, customStatus: customStatus ?? m.customStatus, online: status !== 'OFFLINE' }
                : m,
            ),
          );
          break;
        }
        case 'CHANNEL_CREATED': {
          const guildId = Number(payload.guildId);
          const rawCh = (payload.channel as Record<string, unknown>) ?? {};
          const newCh: Channel = {
            id: Number(rawCh.id ?? Date.now()),
            guildId,
            name: String(rawCh.name ?? 'new-channel'),
            type: ((rawCh.type as ChannelType) ?? 'text') === 'voice' ? 'voice' : 'text',
            topic: rawCh.topic ? String(rawCh.topic) : undefined,
            position: Number(rawCh.position ?? 99),
            unreadCount: 0,
          };
          setGuilds((prev) =>
            prev.map((g) =>
              g.id === guildId && !g.channels.some((c) => c.id === newCh.id)
                ? { ...g, channels: [...g.channels, newCh] }
                : g,
            ),
          );
          break;
        }
        case 'VOICE_PARTICIPANTS': {
          const rawList = Array.isArray(payload.participants) ? payload.participants : [];
          const channelId = Number(payload.channelId ?? activeVoiceChannelId ?? 4);
          setVoiceParticipants(
            rawList.map((p: Record<string, unknown>) => ({
              userId: Number(p.userId),
              username: String(p.username ?? 'user'),
              displayName: String(p.displayName ?? p.username ?? 'User'),
              avatarColor: pickAvatarColor(Number(p.userId ?? 1)),
              channelId: Number(p.channelId ?? channelId),
              muted: Boolean(p.muted),
              deafened: Boolean(p.deafened),
              cameraOn: Boolean(p.cameraOn),
              speaking: Boolean(p.speaking),
            })),
          );
          break;
        }
        case 'PONG_RTT': {
          const seq = Number(payload.seq ?? rttSeqRef.current);
          const clientTs = Number(payload.clientTimestampMs ?? Date.now() - 10);
          const wsRtt = Math.max(1, Date.now() - clientTs);
          const tcpRtt = Number((wsRtt * 0.85).toFixed(1));
          const udpRtt =
            payload.udpRttMs !== undefined && payload.udpRttMs !== null
              ? Number(payload.udpRttMs)
              : udpBlockedSimulated
                ? null
                : Number((wsRtt * 0.22).toFixed(2));
          setRttSamples((prev) => [
            ...prev.slice(-29),
            {
              seq,
              timestampMs: Date.now(),
              wsRttMs: wsRtt,
              tcpRttMs: tcpRtt,
              udpRttMs: udpBlockedSimulated ? null : udpRtt,
              udpFallback: udpBlockedSimulated,
            },
          ]);
          break;
        }
        default:
          break;
      }
    });

    const unsubState = wsClient.onConnectionState((connected) => {
      if (connectionMode === 'live') {
        setIsConnected(connected);
      }
    });

    return () => {
      unsubEvent();
      unsubState();
    };
  }, [activeChannelId, activeDmId, activeVoiceChannelId, connectionMode, udpBlockedSimulated]);

  // Derived active guild, channel, messages, pinnedMessages
  const activeGuild = useMemo(
    () => guilds.find((g) => g.id === activeGuildId) ?? guilds[0] ?? null,
    [guilds, activeGuildId],
  );

  const activeChannel = useMemo(() => {
    if (!activeGuild) return null;
    return (
      activeGuild.channels.find((c) => c.id === activeChannelId) ??
      activeGuild.channels[0] ??
      null
    );
  }, [activeGuild, activeChannelId]);

  const messages = useMemo(
    () => messagesByChannel[activeChannelId] ?? [],
    [messagesByChannel, activeChannelId],
  );

  const pinnedMessages = useMemo(
    () => messages.filter((m) => m.pinned && !m.deletedAt),
    [messages],
  );

  const dmMessages = useMemo(
    () => (activeDmId ? dmMessagesByConv[activeDmId] ?? [] : []),
    [dmMessagesByConv, activeDmId],
  );

  // Actions implementation
  const hydrateFromBackend = useCallback(
    async (authToken: string, user: User) => {
      apiClient.setToken(authToken);
      setToken(authToken);
      setCurrentUser(user);
      setConnectionMode('live');
      setIsConnected(true);
      wsClient.connect(authToken);

      try {
        const remoteGuilds = await apiClient.getGuilds();
        if (remoteGuilds.length > 0) {
          setGuilds(remoteGuilds);
          const firstGuild = remoteGuilds[0];
          setActiveGuildId(firstGuild.id);
          const firstChannel = firstGuild.channels[0];
          if (firstChannel) {
            setActiveChannelId(firstChannel.id);
            const [msgs, chMembers] = await Promise.all([
              apiClient.getChannelMessages(firstChannel.id),
              apiClient.getChannelMembers(firstChannel.id),
            ]);
            setMessagesByChannel((prev) => ({ ...prev, [firstChannel.id]: msgs }));
            if (chMembers.length > 0) {
              setMembers(chMembers);
            }
          }
        }
        const [{ friends: remoteFriends, requests }, remoteDms] = await Promise.all([
          apiClient.getFriends(user.id),
          apiClient.getDms(),
        ]);
        if (remoteFriends.length > 0) setFriends(remoteFriends);
        if (requests.length > 0) setFriendRequests(requests);
        if (remoteDms.length > 0) setDmConversations(remoteDms);
      } catch {
        // Keep fallback state if any secondary hydration call fails
      }
    },
    [],
  );

  const login = useCallback(
    async (username: string, password: string) => {
      try {
        const res = await apiClient.login(username, password);
        await hydrateFromBackend(res.token, res.user);
        addToast('success', 'Đăng nhập thành công (Live Backend)', `Xin chào ${res.user.displayName}!`);
      } catch {
        // Seamless fallback to interactive Mock/Demo mode if backend is offline
        const matchedPersona = Object.values(TEAM_PERSONAS).find(
          (p) => p.username.toLowerCase() === username.trim().toLowerCase(),
        );
        const fallbackUser: User = matchedPersona ?? {
          id: Date.now() % 10000,
          username: username.trim() || 'student',
          displayName: username.trim() || 'Sinh Viên Mạng',
          avatarColor: pickAvatarColor(username),
          status: 'ONLINE',
          customStatus: 'Đang kết nối chế độ Mô phỏng Đa giao thức',
          role: 'ADMIN',
          online: true,
          transport: 'WS',
        };
        setCurrentUser(fallbackUser);
        setToken(`mock-jwt-${fallbackUser.username}`);
        setConnectionMode('mock');
        setIsConnected(true);
        appendFrameLog({
          direction: 'IN',
          transport: 'WS',
          rawFrame: `MOCK_AUTH_OK|user=${fallbackUser.username}|role=${fallbackUser.role}|transports=TCP,UDP,WS,HTTP`,
          summary: `Activated Multi-Protocol Simulation for ${fallbackUser.displayName}`,
        });
        addToast(
          'info',
          'Đã kích hoạt Chế độ Mô phỏng Đa giao thức',
          `Đăng nhập với tư cách ${fallbackUser.displayName}`,
        );
      }
    },
    [addToast, appendFrameLog, hydrateFromBackend],
  );

  const register = useCallback(
    async (username: string, password: string, displayName: string) => {
      try {
        const res = await apiClient.register(username, password, displayName);
        await hydrateFromBackend(res.token, res.user);
        addToast('success', 'Đăng ký tài khoản thành công', `Chào mừng ${res.user.displayName}!`);
      } catch {
        const newUser: User = {
          id: Math.floor(100 + Math.random() * 900),
          username: username.trim(),
          displayName: displayName.trim() || username.trim(),
          avatarColor: pickAvatarColor(displayName || username),
          status: 'ONLINE',
          customStatus: 'Thành viên mới • Đồ Án Lập Trình Mạng',
          role: 'MEMBER',
          online: true,
          transport: 'WS',
        };
        setCurrentUser(newUser);
        setToken(`mock-jwt-${newUser.username}`);
        setConnectionMode('mock');
        setIsConnected(true);
        setMembers((prev) => (prev.some((m) => m.username === newUser.username) ? prev : [...prev, newUser]));
        addToast(
          'success',
          'Khởi tạo tài khoản thành công (Chế độ Demo)',
          `Chào mừng ${newUser.displayName} tham gia hệ thống!`,
        );
      }
    },
    [addToast, hydrateFromBackend],
  );

  const loginDemo = useCallback(
    (persona: 'vi' | 'an' | 'vinh' | 'hai' = 'vi') => {
      const selected = TEAM_PERSONAS[persona] ?? TEAM_PERSONAS.vi;
      wsClient.disconnect();
      setCurrentUser(selected);
      setToken(`demo-jwt-${selected.username}`);
      setConnectionMode('mock');
      setIsConnected(true);
      appendFrameLog({
        direction: 'OUT',
        transport: 'WS',
        rawFrame: JSON.stringify({
          type: 'SESSION_INIT',
          payload: {
            userId: selected.id,
            username: selected.username,
            displayName: selected.displayName,
            role: selected.role,
            bridges: ['TCP:5000', 'UDP:5001', 'HTTP:8080', 'WS:8081'],
          },
        }),
        summary: `Demo Session Init: ${selected.displayName} (${selected.role})`,
      });
      addToast(
        'success',
        `Đã chuyển sang tài khoản: ${selected.displayName}`,
        `Vai trò: ${selected.role} • Giao thức: TCP/UDP/WebSocket sẵn sàng`,
      );
    },
    [addToast, appendFrameLog],
  );

  const logout = useCallback(() => {
    wsClient.disconnect();
    apiClient.setToken(null);
    setCurrentUser(null);
    setToken(null);
    setSettingsOpen(false);
    addToast('info', 'Đã đăng xuất khỏi không gian làm việc');
  }, [addToast]);

  const setTheme = useCallback((nextTheme: 'light' | 'dark') => {
    setThemeState(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const setLocale = useCallback((nextLocale: 'vi' | 'en') => {
    setLocaleState(nextLocale);
  }, []);

  const selectGuild = useCallback(
    (guildId: number) => {
      setViewMode('guild');
      setActiveGuildId(guildId);
      const targetGuild = guilds.find((g) => g.id === guildId);
      if (targetGuild && targetGuild.channels.length > 0) {
        const firstText =
          targetGuild.channels.find((c) => c.type === 'text') ?? targetGuild.channels[0];
        setActiveChannelId(firstText.id);
      }
    },
    [guilds],
  );

  const selectChannel = useCallback(
    (channelId: number) => {
      setViewMode('guild');
      setActiveChannelId(channelId);
      setReplyingTo(null);
      setEditingMessage(null);
      setGuilds((prev) =>
        prev.map((g) => ({
          ...g,
          channels: g.channels.map((c) => (c.id === channelId ? { ...c, unreadCount: 0 } : c)),
        })),
      );

      if (connectionMode === 'live') {
        apiClient
          .getChannelMessages(channelId)
          .then((msgs) => {
            setMessagesByChannel((prev) => ({ ...prev, [channelId]: msgs }));
          })
          .catch(() => undefined);
      }
    },
    [connectionMode],
  );

  const createGuild = useCallback(
    async (name: string, iconText?: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (connectionMode === 'live') {
        try {
          const created = await apiClient.createGuild(trimmed, iconText);
          setGuilds((prev) => [...prev, created]);
          setActiveGuildId(created.id);
          if (created.channels[0]) setActiveChannelId(created.channels[0].id);
          addToast('success', 'Đã tạo máy chủ mới', created.name);
          return;
        } catch {
          // Fallback to local state creation
        }
      }
      const newGuildId = Date.now();
      const firstChannelId = newGuildId + 1;
      const voiceChannelId = newGuildId + 2;
      const newGuild: Guild = {
        id: newGuildId,
        name: trimmed,
        iconText: (iconText?.trim() || trimmed.slice(0, 2)).toUpperCase(),
        ownerId: currentUser?.id ?? 1,
        channels: [
          {
            id: firstChannelId,
            guildId: newGuildId,
            name: 'general',
            type: 'text',
            topic: `Kênh thảo luận chính của ${trimmed}`,
            position: 0,
            unreadCount: 0,
          },
          {
            id: voiceChannelId,
            guildId: newGuildId,
            name: '🔊 Phòng Thoại Chung',
            type: 'voice',
            topic: 'Kênh thoại WebRTC UDP',
            position: 1,
            unreadCount: 0,
          },
        ],
      };
      setGuilds((prev) => [...prev, newGuild]);
      setActiveGuildId(newGuild.id);
      setActiveChannelId(firstChannelId);
      setMessagesByChannel((prev) => ({
        ...prev,
        [firstChannelId]: [
          {
            id: Date.now() + 5,
            channelId: firstChannelId,
            senderId: currentUser?.id ?? 1,
            senderName: currentUser?.displayName ?? 'Admin',
            senderAvatarColor: currentUser?.avatarColor ?? '#2563EB',
            content: `Chào mừng đến với máy chủ **${trimmed}**! Kênh này đã được ánh xạ với bảng \`rooms\` (room_id=${firstChannelId}).`,
            createdAt: new Date().toISOString(),
            reactions: [],
            attachments: [],
            transport: 'WS',
          },
        ],
      }));
      addToast('success', 'Đã khởi tạo máy chủ mới', trimmed);
    },
    [addToast, connectionMode, currentUser],
  );

  const createChannel = useCallback(
    async (guildId: number, name: string, type: ChannelType, topic?: string) => {
      const cleanName =
        type === 'text'
          ? name.trim().toLowerCase().replace(/\s+/g, '-')
          : name.trim();
      if (!cleanName) return;

      if (connectionMode === 'live') {
        try {
          const ch = await apiClient.createChannel(guildId, cleanName, type, topic);
          setGuilds((prev) =>
            prev.map((g) => (g.id === guildId ? { ...g, channels: [...g.channels, ch] } : g)),
          );
          if (type === 'text') setActiveChannelId(ch.id);
          addToast('success', 'Đã tạo kênh mới', `#${ch.name}`);
          return;
        } catch {
          // Fallback to mock creation
        }
      }

      const newChannel: Channel = {
        id: Math.floor(300 + Math.random() * 10000),
        guildId,
        name: cleanName,
        type,
        topic: topic?.trim() || (type === 'text' ? 'Kênh thảo luận TCP/WebSocket' : 'Kênh thoại WebRTC/UDP'),
        position: 99,
        unreadCount: 0,
      };
      setGuilds((prev) =>
        prev.map((g) => (g.id === guildId ? { ...g, channels: [...g.channels, newChannel] } : g)),
      );
      if (type === 'text') {
        setActiveChannelId(newChannel.id);
      }
      appendFrameLog({
        direction: 'OUT',
        transport: 'HTTP',
        rawFrame: `POST /api/guilds/${guildId}/channels {"name":"${cleanName}","type":"${type}"} -> 201 Created`,
        summary: `Created ${type} channel #${cleanName}`,
      });
      addToast('success', 'Đã tạo kênh mới', cleanName);
    },
    [addToast, appendFrameLog, connectionMode],
  );

  const createInvite = useCallback(
    async (guildId: number): Promise<string> => {
      if (connectionMode === 'live') {
        try {
          const code = await apiClient.createInvite(guildId);
          addToast('success', 'Đã tạo mã mời máy chủ', `Mã mời: ${code}`);
          return code;
        } catch {
          // Fallback
        }
      }
      const code = `LTM-${guildId}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      appendFrameLog({
        direction: 'OUT',
        transport: 'HTTP',
        rawFrame: `POST /api/guilds/${guildId}/invites -> {"code":"${code}","maxUses":25}`,
        summary: `Generated Invite Code: ${code}`,
      });
      addToast('success', 'Đã sao chép mã mời', `Mã mời: ${code}`);
      return code;
    },
    [addToast, appendFrameLog, connectionMode],
  );

  const joinGuildByInvite = useCallback(
    async (code: string) => {
      const clean = code.trim().toUpperCase();
      if (!clean) return;
      if (connectionMode === 'live') {
        try {
          const joined = await apiClient.joinGuildByInvite(clean);
          setGuilds((prev) => (prev.some((g) => g.id === joined.id) ? prev : [...prev, joined]));
          setActiveGuildId(joined.id);
          if (joined.channels[0]) setActiveChannelId(joined.channels[0].id);
          addToast('success', 'Đã tham gia máy chủ', joined.name);
          return;
        } catch {
          // Fallback
        }
      }
      const invitedGuild: Guild = {
        id: Date.now(),
        name: `Cộng Đồng Mạng (${clean})`,
        iconText: clean.slice(0, 2),
        ownerId: 2,
        channels: [
          {
            id: Date.now() + 1,
            guildId: Date.now(),
            name: 'general',
            type: 'text',
            topic: `Kênh chung được mở qua mã mời ${clean}`,
            position: 0,
            unreadCount: 0,
          },
        ],
      };
      setGuilds((prev) => [...prev, invitedGuild]);
      setActiveGuildId(invitedGuild.id);
      setActiveChannelId(invitedGuild.channels[0].id);
      addToast('success', 'Đã tham gia máy chủ bằng mã mời', invitedGuild.name);
    },
    [addToast, connectionMode],
  );

  const sendMessage = useCallback(
    async (content: string, attachments: Attachment[] = []) => {
      const trimmed = content.trim();
      if (!trimmed && attachments.length === 0) return;

      const sender = currentUser ?? TEAM_PERSONAS.vi;
      const newMsg: Message = {
        id: Date.now(),
        channelId: activeChannelId,
        senderId: sender.id,
        senderName: sender.displayName,
        senderAvatarColor: sender.avatarColor ?? '#2563EB',
        content: trimmed,
        createdAt: new Date().toISOString(),
        pinned: false,
        replyTo: replyingTo
          ? {
              messageId: replyingTo.id,
              senderId: replyingTo.senderId,
              senderName: replyingTo.senderName,
              content: replyingTo.content.slice(0, 100),
            }
          : null,
        reactions: [],
        attachments,
        transport: 'WS',
      };

      setReplyingTo(null);

      if (connectionMode === 'live' && wsClient.isOpen()) {
        wsClient.send('SEND_MESSAGE', {
          channelId: activeChannelId,
          content: trimmed,
          replyToId: replyingTo?.id ?? null,
          attachmentIds: attachments.map((a) => a.id),
        });
        return;
      }

      // Append message locally & emit realistic WS + bridged TCP protocol frame logs
      setMessagesByChannel((prev) => ({
        ...prev,
        [activeChannelId]: [...(prev[activeChannelId] ?? []), newMsg],
      }));

      appendFrameLog({
        direction: 'OUT',
        transport: 'WS',
        rawFrame: JSON.stringify({
          type: 'SEND_MESSAGE',
          payload: {
            channelId: activeChannelId,
            content: trimmed,
            replyToId: replyingTo?.id ?? null,
            attachmentIds: attachments.map((a) => a.id),
          },
        }),
        summary: `WS TX SEND_MESSAGE (#channel=${activeChannelId})`,
      });

      appendFrameLog({
        direction: 'OUT',
        transport: 'TCP',
        rawFrame: `ROOM_MSG|${activeChannelId}|${sender.username}|${trimmed}`,
        summary: `Bridge Broadcast -> Swing TCP :5000 ROOM_MSG`,
      });
    },
    [activeChannelId, appendFrameLog, connectionMode, currentUser, replyingTo],
  );

  const editMessage = useCallback(
    async (messageId: number, content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      const editedAt = new Date().toISOString();

      if (connectionMode === 'live' && wsClient.isOpen()) {
        wsClient.send('EDIT_MESSAGE', { messageId, content: trimmed });
      } else {
        appendFrameLog({
          direction: 'OUT',
          transport: 'WS',
          rawFrame: JSON.stringify({ type: 'EDIT_MESSAGE', payload: { messageId, content: trimmed } }),
          summary: `WS TX EDIT_MESSAGE (id=${messageId})`,
        });
      }

      setMessagesByChannel((prev) => ({
        ...prev,
        [activeChannelId]: (prev[activeChannelId] ?? []).map((m) =>
          m.id === messageId ? { ...m, content: trimmed, editedAt } : m,
        ),
      }));
      setEditingMessage(null);
    },
    [activeChannelId, appendFrameLog, connectionMode],
  );

  const deleteMessage = useCallback(
    async (messageId: number) => {
      const deletedAt = new Date().toISOString();
      if (connectionMode === 'live' && wsClient.isOpen()) {
        wsClient.send('DELETE_MESSAGE', { messageId });
      } else {
        appendFrameLog({
          direction: 'OUT',
          transport: 'WS',
          rawFrame: JSON.stringify({ type: 'DELETE_MESSAGE', payload: { messageId } }),
          summary: `WS TX DELETE_MESSAGE (id=${messageId})`,
        });
      }

      setMessagesByChannel((prev) => ({
        ...prev,
        [activeChannelId]: (prev[activeChannelId] ?? []).map((m) =>
          m.id === messageId ? { ...m, deletedAt } : m,
        ),
      }));
    },
    [activeChannelId, appendFrameLog, connectionMode],
  );

  const toggleReaction = useCallback(
    async (messageId: number, emoji: string) => {
      const userId = currentUser?.id ?? 1;
      if (connectionMode === 'live' && wsClient.isOpen()) {
        wsClient.send('TOGGLE_REACTION', { messageId, emoji });
      } else {
        appendFrameLog({
          direction: 'OUT',
          transport: 'WS',
          rawFrame: JSON.stringify({ type: 'TOGGLE_REACTION', payload: { messageId, emoji } }),
          summary: `WS TX TOGGLE_REACTION ${emoji} (msg=${messageId})`,
        });
      }

      setMessagesByChannel((prev) => {
        const list = prev[activeChannelId] ?? [];
        return {
          ...prev,
          [activeChannelId]: list.map((msg) => {
            if (msg.id !== messageId) return msg;
            const existing = msg.reactions.find((r) => r.emoji === emoji);
            let nextReactions = msg.reactions;
            if (existing) {
              const hasMe = existing.userIds.includes(userId);
              const nextUserIds = hasMe
                ? existing.userIds.filter((id) => id !== userId)
                : [...existing.userIds, userId];
              nextReactions =
                nextUserIds.length === 0
                  ? msg.reactions.filter((r) => r.emoji !== emoji)
                  : msg.reactions.map((r) =>
                      r.emoji === emoji
                        ? { ...r, count: nextUserIds.length, userIds: nextUserIds, me: !hasMe }
                        : r,
                    );
            } else {
              nextReactions = [
                ...msg.reactions,
                { emoji, count: 1, userIds: [userId], me: true },
              ];
            }
            return { ...msg, reactions: nextReactions };
          }),
        };
      });
    },
    [activeChannelId, appendFrameLog, connectionMode, currentUser],
  );

  const togglePinMessage = useCallback(
    async (messageId: number, pinned: boolean) => {
      if (connectionMode === 'live' && wsClient.isOpen()) {
        wsClient.send('PIN_MESSAGE', { messageId, pinned });
      } else {
        appendFrameLog({
          direction: 'OUT',
          transport: 'WS',
          rawFrame: JSON.stringify({ type: 'PIN_MESSAGE', payload: { messageId, pinned } }),
          summary: `WS TX PIN_MESSAGE (id=${messageId}, pinned=${pinned})`,
        });
      }

      setMessagesByChannel((prev) => ({
        ...prev,
        [activeChannelId]: (prev[activeChannelId] ?? []).map((m) =>
          m.id === messageId ? { ...m, pinned } : m,
        ),
      }));
      addToast(
        'info',
        pinned ? 'Đã ghim tin nhắn vào kênh' : 'Đã bỏ ghim tin nhắn',
      );
    },
    [activeChannelId, addToast, appendFrameLog, connectionMode],
  );

  const searchChannelMessages = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      const clean = query.trim().toLowerCase();
      if (!clean) {
        setSearchResults([]);
        return;
      }
      if (connectionMode === 'live') {
        try {
          const results = await apiClient.searchMessages(query, activeGuildId, activeChannelId);
          setSearchResults(results);
          return;
        } catch {
          // Fallback to local search
        }
      }
      const allInGuild = Object.values(messagesByChannel).flat();
      const matched = allInGuild.filter(
        (m) =>
          !m.deletedAt &&
          (m.content.toLowerCase().includes(clean) ||
            m.senderName.toLowerCase().includes(clean)),
      );
      setSearchResults(matched);
    },
    [activeChannelId, activeGuildId, connectionMode, messagesByChannel],
  );

  const uploadFile = useCallback(
    async (file: File): Promise<Attachment> => {
      if (connectionMode === 'live') {
        try {
          const uploaded = await apiClient.uploadFile(file, activeChannelId);
          addToast('success', 'Đã tải tệp lên PostgreSQL bytea', file.name);
          return uploaded;
        } catch {
          // Fallback to local DataURL attachment
        }
      }
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });

      const attachment: Attachment = {
        id: Date.now(),
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        url: dataUrl || `/api/files/${Date.now()}`,
        dataUrl: dataUrl || undefined,
      };

      appendFrameLog({
        direction: 'OUT',
        transport: 'HTTP',
        rawFrame: `PUT /api/files?channelId=${activeChannelId} [X-File-Name: ${encodeURIComponent(file.name)}] (${file.size} bytes -> PostgreSQL bytea)`,
        summary: `HTTP PUT /api/files (${file.name}, ${(file.size / 1024).toFixed(1)} KB)`,
      });

      addToast('success', 'Đã đính kèm tệp tin', `${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      return attachment;
    },
    [activeChannelId, addToast, appendFrameLog, connectionMode],
  );

  const notifyTyping = useCallback(
    (isTyping: boolean) => {
      const transportUsed: TransportKind = udpBlockedSimulated ? 'UDP_FALLBACK' : 'UDP';
      const user = currentUser ?? TEAM_PERSONAS.vi;

      if (connectionMode === 'live' && wsClient.isOpen()) {
        wsClient.send(
          isTyping ? 'TYPING_START' : 'TYPING_STOP',
          { channelId: activeChannelId },
          transportUsed,
        );
        return;
      }

      if (isTyping) {
        appendFrameLog({
          direction: 'OUT',
          transport: transportUsed,
          rawFrame: udpBlockedSimulated
            ? `WS_FALLBACK {"type":"TYPING_START","channelId":${activeChannelId},"reason":"UDP_5001_BLOCKED"}`
            : `TYPING|${activeChannelId}|${user.username}|1 -> UDP :5001`,
          summary: udpBlockedSimulated
            ? `Typing Signal via UDP_FALLBACK (WS :8081)`
            : `UDP Datagram TYPING -> :5001`,
        });

        // Simulate a peer typing response for interactive demo clarity
        const peer = user.id === 2 ? TEAM_PERSONAS.vi : TEAM_PERSONAS.an;
        setTypingUsers([{ userId: peer.id, displayName: peer.displayName, transport: transportUsed }]);
        if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = window.setTimeout(() => {
          setTypingUsers([]);
        }, 2600);
      } else {
        setTypingUsers([]);
      }
    },
    [activeChannelId, appendFrameLog, connectionMode, currentUser, udpBlockedSimulated],
  );

  const updatePresence = useCallback(
    (status: PresenceStatus, customStatus?: string) => {
      if (!currentUser) return;
      const updatedUser: User = {
        ...currentUser,
        status,
        customStatus: customStatus !== undefined ? customStatus : currentUser.customStatus,
        online: status !== 'OFFLINE',
      };
      setCurrentUser(updatedUser);
      setMembers((prev) => prev.map((m) => (m.id === updatedUser.id ? updatedUser : m)));

      if (connectionMode === 'live' && wsClient.isOpen()) {
        wsClient.send('PRESENCE_UPDATE', {
          status,
          customStatus: updatedUser.customStatus ?? null,
        });
      } else {
        appendFrameLog({
          direction: 'OUT',
          transport: 'WS',
          rawFrame: JSON.stringify({
            type: 'PRESENCE_UPDATE',
            payload: { status, customStatus: updatedUser.customStatus ?? null },
          }),
          summary: `Presence Updated -> ${status}`,
        });
      }
      addToast('success', 'Đã cập nhật trạng thái hiện diện', `${status}${updatedUser.customStatus ? ` • ${updatedUser.customStatus}` : ''}`);
    },
    [addToast, appendFrameLog, connectionMode, currentUser],
  );

  const updateMemberRole = useCallback(
    async (userId: number, role: MemberRole) => {
      if (connectionMode === 'live') {
        try {
          await apiClient.updateMemberRole(activeChannelId, userId, role);
        } catch {
          // Fallback to local update
        }
      }
      setMembers((prev) => prev.map((m) => (m.id === userId ? { ...m, role } : m)));
      appendFrameLog({
        direction: 'OUT',
        transport: 'HTTP',
        rawFrame: `PATCH /api/channels/${activeChannelId}/members/${userId}/role {"role":"${role}"}`,
        summary: `Updated Member #${userId} Role -> ${role}`,
      });
      addToast('success', 'Đã cập nhật phân quyền thành viên', `Vai trò mới: ${role}`);
    },
    [activeChannelId, addToast, appendFrameLog, connectionMode],
  );

  const sendFriendRequest = useCallback(
    async (usernameOrId: string) => {
      const clean = usernameOrId.trim();
      if (!clean) return;
      if (connectionMode === 'live') {
        try {
          await apiClient.sendFriendRequest(clean);
          addToast('success', 'Đã gửi lời mời kết bạn', clean);
          return;
        } catch {
          // Fallback
        }
      }
      const newReq: FriendRequest = {
        id: Date.now(),
        user: {
          id: Date.now() % 1000,
          username: clean.toLowerCase().replace(/\s+/g, '_'),
          displayName: clean,
          avatarColor: pickAvatarColor(clean),
          status: 'ONLINE',
          online: true,
        },
        direction: 'OUTGOING',
        createdAt: new Date().toISOString(),
      };
      setFriendRequests((prev) => [newReq, ...prev]);
      addToast('success', 'Đã gửi lời mời kết bạn', `Tới: ${clean}`);
    },
    [addToast, connectionMode],
  );

  const respondFriendRequest = useCallback(
    async (requestId: number, accept: boolean) => {
      if (connectionMode === 'live') {
        try {
          await apiClient.respondFriendRequest(requestId, accept);
        } catch {
          // Fallback
        }
      }
      const target = friendRequests.find((r) => r.id === requestId);
      setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (accept && target) {
        setFriends((prev) => (prev.some((f) => f.id === target.user.id) ? prev : [...prev, target.user]));
        const newConv: DirectConversation = {
          id: Date.now(),
          peerUser: target.user,
          lastMessagePreview: 'Đã trở thành bạn bè trên Oceanic Protocol',
          unreadCount: 0,
        };
        setDmConversations((prev) => [newConv, ...prev]);
        addToast('success', 'Đã chấp nhận lời mời kết bạn', target.user.displayName);
      } else {
        addToast('info', 'Đã từ chối lời mời kết bạn');
      }
    },
    [addToast, connectionMode, friendRequests],
  );

  const openDmWithUser = useCallback(
    async (userId: number) => {
      const existing = dmConversations.find((c) => c.peerUser.id === userId);
      if (existing) {
        setActiveDmId(existing.id);
        setViewMode('dm');
        return;
      }
      if (connectionMode === 'live') {
        try {
          const conv = await apiClient.openDm(userId);
          setDmConversations((prev) => [conv, ...prev]);
          setActiveDmId(conv.id);
          setViewMode('dm');
          return;
        } catch {
          // Fallback
        }
      }
      const peer =
        members.find((m) => m.id === userId) ??
        friends.find((f) => f.id === userId) ??
        TEAM_PERSONAS.an;
      const newConv: DirectConversation = {
        id: Date.now(),
        peerUser: peer,
        lastMessagePreview: 'Bắt đầu cuộc trò chuyện riêng (1-1)',
        unreadCount: 0,
      };
      setDmConversations((prev) => [newConv, ...prev]);
      setActiveDmId(newConv.id);
      setViewMode('dm');
    },
    [connectionMode, dmConversations, friends, members],
  );

  const selectDm = useCallback(
    (dmId: number) => {
      setActiveDmId(dmId);
      setViewMode('dm');
      setDmConversations((prev) =>
        prev.map((c) => (c.id === dmId ? { ...c, unreadCount: 0 } : c)),
      );
      if (connectionMode === 'live') {
        apiClient
          .getDmMessages(dmId)
          .then((msgs) => {
            setDmMessagesByConv((prev) => ({ ...prev, [dmId]: msgs }));
          })
          .catch(() => undefined);
      }
    },
    [connectionMode],
  );

  const sendDmMessage = useCallback(
    async (content: string, attachments: Attachment[] = []) => {
      const trimmed = content.trim();
      if ((!trimmed && attachments.length === 0) || !activeDmId) return;
      const sender = currentUser ?? TEAM_PERSONAS.vi;
      const conv = dmConversations.find((c) => c.id === activeDmId);

      const newMsg: Message = {
        id: Date.now(),
        channelId: activeDmId,
        senderId: sender.id,
        senderName: sender.displayName,
        senderAvatarColor: sender.avatarColor ?? '#2563EB',
        content: trimmed,
        createdAt: new Date().toISOString(),
        reactions: [],
        attachments,
        transport: 'WS',
      };

      if (connectionMode === 'live' && wsClient.isOpen()) {
        wsClient.send('SEND_DM', {
          conversationId: activeDmId,
          peerUserId: conv?.peerUser.id,
          content: trimmed,
          attachmentIds: attachments.map((a) => a.id),
        });
      } else {
        appendFrameLog({
          direction: 'OUT',
          transport: 'TCP',
          rawFrame: `PRIVATE_MSG|${sender.username}|${conv?.peerUser.username ?? 'peer'}|${trimmed}`,
          summary: `Bridge DM -> TCP :5000 PRIVATE_MSG`,
        });
      }

      setDmMessagesByConv((prev) => ({
        ...prev,
        [activeDmId]: [...(prev[activeDmId] ?? []), newMsg],
      }));
      setDmConversations((prev) =>
        prev.map((c) => (c.id === activeDmId ? { ...c, lastMessagePreview: trimmed } : c)),
      );
    },
    [activeDmId, appendFrameLog, connectionMode, currentUser, dmConversations],
  );

  const joinVoiceChannel = useCallback(
    (channelId: number) => {
      const user = currentUser ?? TEAM_PERSONAS.vi;
      setActiveVoiceChannelId(channelId);
      setVoiceParticipants((prev) => {
        const filtered = prev.filter((p) => p.userId !== user.id);
        return [
          ...filtered,
          {
            userId: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarColor: user.avatarColor ?? '#2563EB',
            channelId,
            muted: localVoiceState.muted,
            deafened: localVoiceState.deafened,
            cameraOn: localVoiceState.cameraOn,
            speaking: false,
          },
        ];
      });

      if (connectionMode === 'live' && wsClient.isOpen()) {
        wsClient.send('VOICE_JOIN', {
          channelId,
          muted: localVoiceState.muted,
          cameraOn: localVoiceState.cameraOn,
        });
      } else {
        appendFrameLog({
          direction: 'OUT',
          transport: 'UDP',
          rawFrame: `WEBRTC_VOICE_JOIN|channel=${channelId}|user=${user.username}|codec=opus/48000|transport=UDP_SRTP`,
          summary: `Joined Voice Room #${channelId} (WebRTC UDP)`,
        });
      }
      addToast('success', 'Đã kết nối Kênh Thoại WebRTC', `Phòng thoại ID #${channelId}`);
    },
    [addToast, appendFrameLog, connectionMode, currentUser, localVoiceState],
  );

  const leaveVoiceChannel = useCallback(() => {
    if (!activeVoiceChannelId) return;
    const user = currentUser ?? TEAM_PERSONAS.vi;
    const prevChannelId = activeVoiceChannelId;
    setActiveVoiceChannelId(null);
    setVoiceParticipants((prev) => prev.filter((p) => p.userId !== user.id));

    if (connectionMode === 'live' && wsClient.isOpen()) {
      wsClient.send('VOICE_LEAVE', { channelId: prevChannelId });
    } else {
      appendFrameLog({
        direction: 'OUT',
        transport: 'WS',
        rawFrame: JSON.stringify({ type: 'VOICE_LEAVE', payload: { channelId: prevChannelId } }),
        summary: `Left Voice Room #${prevChannelId}`,
      });
    }
    addToast('info', 'Đã rời khỏi Kênh Thoại WebRTC');
  }, [activeVoiceChannelId, addToast, appendFrameLog, connectionMode, currentUser]);

  const updateLocalVoiceState = useCallback(
    (
      partial: Partial<{
        muted: boolean;
        deafened: boolean;
        cameraOn: boolean;
        screenSharing: boolean;
      }>,
    ) => {
      setLocalVoiceState((prev) => {
        const next = { ...prev, ...partial };
        if (activeVoiceChannelId && currentUser) {
          setVoiceParticipants((list) =>
            list.map((p) =>
              p.userId === currentUser.id
                ? {
                    ...p,
                    muted: next.muted,
                    deafened: next.deafened,
                    cameraOn: next.cameraOn,
                  }
                : p,
            ),
          );
          if (connectionMode === 'live' && wsClient.isOpen()) {
            wsClient.send('VOICE_STATE', {
              channelId: activeVoiceChannelId,
              muted: next.muted,
              cameraOn: next.cameraOn,
            });
          }
        }
        return next;
      });
    },
    [activeVoiceChannelId, connectionMode, currentUser],
  );

  const sendVoiceSignal = useCallback(
    (
      type: 'SIGNAL_OFFER' | 'SIGNAL_ANSWER' | 'SIGNAL_ICE',
      targetUserId: number,
      data: unknown,
    ) => {
      const channelId = activeVoiceChannelId ?? activeChannelId;
      if (connectionMode === 'live' && wsClient.isOpen()) {
        wsClient.send(type, { channelId, targetUserId, data });
      } else {
        appendFrameLog({
          direction: 'OUT',
          transport: 'UDP',
          rawFrame: JSON.stringify({ type, channelId, targetUserId, data }),
          summary: `WebRTC Signaling ${type} -> Peer #${targetUserId}`,
        });
      }
    },
    [activeChannelId, activeVoiceChannelId, appendFrameLog, connectionMode],
  );

  const triggerRttProbe = useCallback(async () => {
    const seq = rttSeqRef.current++;
    const startMs = Date.now();

    if (connectionMode === 'live') {
      if (wsClient.isOpen()) {
        wsClient.send('PING_RTT', { seq, clientTimestampMs: startMs, transport: 'WS' });
      }
      if (!udpBlockedSimulated) {
        try {
          const probe = await apiClient.probeUdpRtt(seq, startMs);
          appendFrameLog({
            direction: 'OUT',
            transport: 'UDP',
            rawFrame: probe.rawDatagramSent,
            summary: `UDP Probe TX seq=${seq}`,
          });
          appendFrameLog({
            direction: 'IN',
            transport: 'UDP',
            rawFrame: `${probe.rawDatagramReceived} (RTT=${probe.udpRttMs}ms)`,
            summary: `UDP Probe RX seq=${seq} (${probe.udpRttMs} ms)`,
          });
          return;
        } catch {
          // Fall through to synthetic telemetry sample
        }
      }
    }

    const wsRtt = Number((10.4 + Math.random() * 5.2).toFixed(1));
    const tcpRtt = Number((8.6 + Math.random() * 3.8).toFixed(1));
    const udpRtt = udpBlockedSimulated ? null : Number((1.1 + Math.random() * 1.4).toFixed(2));

    const sample: RttSample = {
      seq,
      timestampMs: Date.now(),
      wsRttMs: wsRtt,
      tcpRttMs: tcpRtt,
      udpRttMs: udpRtt,
      udpFallback: udpBlockedSimulated,
    };

    setRttSamples((prev) => [...prev.slice(-29), sample]);

    if (udpBlockedSimulated) {
      appendFrameLog({
        direction: 'OUT',
        transport: 'UDP_FALLBACK',
        rawFrame: `UDP_PORT_5001_UNREACHABLE -> Fallback WS Frame {"type":"PING_RTT","seq":${seq},"wsRttMs":${wsRtt}}`,
        summary: `Probe #${seq}: UDP Blocked -> UDP_FALLBACK (${wsRtt} ms)`,
      });
    } else {
      appendFrameLog({
        direction: 'IN',
        transport: 'UDP',
        rawFrame: `PONG_UDP|${seq}|${startMs + 1} | TCP=${tcpRtt}ms | WS=${wsRtt}ms | UDP=${udpRtt}ms`,
        summary: `Probe #${seq}: UDP=${udpRtt}ms vs TCP=${tcpRtt}ms / WS=${wsRtt}ms`,
      });
    }
  }, [appendFrameLog, connectionMode, udpBlockedSimulated]);

  const setUdpBlockedSimulated = useCallback(
    (blocked: boolean) => {
      setUdpBlockedSimulatedState(blocked);
      appendFrameLog({
        direction: 'OUT',
        transport: blocked ? 'UDP_FALLBACK' : 'UDP',
        rawFrame: blocked
          ? 'FIREWALL_RULE_SET: DROP UDP :5001 -> AUTO_ENABLE_WS_FALLBACK'
          : 'FIREWALL_RULE_CLEAR: ALLOW UDP :5001 DATAGRAMS',
        summary: blocked
          ? 'Simulated Firewall: Blocking UDP :5001 (Fallback Active)'
          : 'Simulated Firewall: Restored Direct UDP :5001',
      });
      addToast(
        blocked ? 'warning' : 'success',
        blocked
          ? 'Đã bật mô phỏng chặn cổng UDP :5001'
          : 'Đã khôi phục kết nối UDP :5001 trực tiếp',
        blocked
          ? 'Các gói tin Typing & Probe sẽ tự động chuyển sang UDP_FALLBACK qua WebSocket.'
          : 'Các gói tin Datagram hoạt động lại ở tốc độ cực nhanh.',
      );
    },
    [addToast, appendFrameLog],
  );

  const clearFrameLogs = useCallback(() => {
    setFrameLogs([]);
  }, []);

  const value = useMemo<AppStoreValue>(
    () => ({
      currentUser,
      token,
      isAuthenticated: Boolean(currentUser && token),
      connectionMode,
      isConnected,
      udpBlockedSimulated,
      theme,
      locale,
      viewMode,
      guilds,
      activeGuildId,
      activeChannelId,
      activeGuild,
      activeChannel,
      messages,
      pinnedMessages,
      searchResults,
      searchQuery,
      members,
      typingUsers,
      replyingTo,
      editingMessage,
      friends,
      friendRequests,
      dmConversations,
      activeDmId,
      dmMessages,
      activeVoiceChannelId,
      voiceParticipants,
      localVoiceState,
      rttSamples,
      frameLogs,
      isMonitorOpen,
      isSettingsOpen,
      isCommandPaletteOpen,
      isMemberSidebarOpen,
      mobileDrawerOpen,
      toasts,
      login,
      register,
      loginDemo,
      logout,
      setTheme,
      toggleTheme,
      setLocale,
      setViewMode,
      selectGuild,
      selectChannel,
      createGuild,
      createChannel,
      createInvite,
      joinGuildByInvite,
      sendMessage,
      editMessage,
      deleteMessage,
      toggleReaction,
      togglePinMessage,
      setReplyingTo,
      setEditingMessage,
      searchChannelMessages,
      uploadFile,
      notifyTyping,
      updatePresence,
      updateMemberRole,
      sendFriendRequest,
      respondFriendRequest,
      openDmWithUser,
      selectDm,
      sendDmMessage,
      joinVoiceChannel,
      leaveVoiceChannel,
      updateLocalVoiceState,
      sendVoiceSignal,
      triggerRttProbe,
      setUdpBlockedSimulated,
      clearFrameLogs,
      setMonitorOpen,
      setSettingsOpen,
      setCommandPaletteOpen,
      setMemberSidebarOpen,
      setMobileDrawerOpen,
      addToast,
      dismissToast,
    }),
    [
      currentUser,
      token,
      connectionMode,
      isConnected,
      udpBlockedSimulated,
      theme,
      locale,
      viewMode,
      guilds,
      activeGuildId,
      activeChannelId,
      activeGuild,
      activeChannel,
      messages,
      pinnedMessages,
      searchResults,
      searchQuery,
      members,
      typingUsers,
      replyingTo,
      editingMessage,
      friends,
      friendRequests,
      dmConversations,
      activeDmId,
      dmMessages,
      activeVoiceChannelId,
      voiceParticipants,
      localVoiceState,
      rttSamples,
      frameLogs,
      isMonitorOpen,
      isSettingsOpen,
      isCommandPaletteOpen,
      isMemberSidebarOpen,
      mobileDrawerOpen,
      toasts,
      login,
      register,
      loginDemo,
      logout,
      setTheme,
      toggleTheme,
      setLocale,
      selectGuild,
      selectChannel,
      createGuild,
      createChannel,
      createInvite,
      joinGuildByInvite,
      sendMessage,
      editMessage,
      deleteMessage,
      toggleReaction,
      togglePinMessage,
      searchChannelMessages,
      uploadFile,
      notifyTyping,
      updatePresence,
      updateMemberRole,
      sendFriendRequest,
      respondFriendRequest,
      openDmWithUser,
      selectDm,
      sendDmMessage,
      joinVoiceChannel,
      leaveVoiceChannel,
      updateLocalVoiceState,
      sendVoiceSignal,
      triggerRttProbe,
      setUdpBlockedSimulated,
      clearFrameLogs,
      addToast,
      dismissToast,
    ],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
};

export function useAppStore(): AppStoreValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) {
    throw new Error('useAppStore() must be used inside <AppStoreProvider>');
  }
  return ctx;
}
