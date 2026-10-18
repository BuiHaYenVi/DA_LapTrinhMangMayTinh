import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { User, Room, Channel, MessageItem, Friend, PendingFriendRequest, SearchUserResult } from './types/chat';
import { chatBridge } from './services/chatBridge';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { RoomSidebar } from './components/RoomSidebar';
import { ChatCenter } from './components/ChatCenter';
import { MemberSidebar } from './components/MemberSidebar';
import { FriendsView, type FriendsTab } from './components/FriendsView';
import { DirectMessageChat } from './components/DirectMessageChat';
import { InviteFriendModal } from './components/InviteFriendModal';
import { LoginView } from './components/LoginView';
import { RegisterView } from './components/RegisterView';
import { Logo } from './components/Logo';
import { CreateRoomModal } from './components/CreateServerModal';
import { CreateChannelModal } from './components/CreateChannelModal';
import { ConfirmModal } from './components/ConfirmModal';
import { AppTitlebar } from './components/AppTitlebar';
import { UserSettingsModal } from './components/UserSettingsModal';
import { Toast } from './components/Toast';
import { useRoomUnread } from './components/rail/useRoomUnread';
import './styles/discord.css';
import './styles/rail.css';

type AuthStatus = 'checking' | 'login' | 'register' | 'authenticated';

export const App: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
  const [prefilledUsername, setPrefilledUsername] = useState<string>('');
  const [prefilledSuccessMsg, setPrefilledSuccessMsg] = useState<string>('');

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Quản lý Phòng (Rooms)
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const currentRoomRef = useRef<Room | null>(null);

  // Quản lý Kênh (Channels) của phòng hiện tại
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const currentChannelRef = useRef<Channel | null>(null);

  // Chế độ Tin nhắn trực tiếp (khi bấm logo ở đầu WorkspaceSidebar)
  const [isDirectMessageMode, setIsDirectMessageMode] = useState<boolean>(false);
  const isDirectMessageModeRef = useRef<boolean>(false);

  // Quản lý Tin nhắn trực tiếp 1-1 (Direct Messages)
  const [currentDirectUser, setCurrentDirectUser] = useState<Friend | null>(null);
  const currentDirectUserRef = useRef<Friend | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingFriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [directMessagesMap, setDirectMessagesMap] = useState<Record<number, MessageItem[]>>({});
  const [directUnreadMap, setDirectUnreadMap] = useState<Record<number, number>>({});
  const [friendsTab, setFriendsTab] = useState<FriendsTab>('online');

  // Modal Mời bạn bè vào phòng
  const [selectedFriendForInvite, setSelectedFriendForInvite] = useState<Friend | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);
  const [invitedRoomIds, setInvitedRoomIds] = useState<number[]>([]);

  // Trạng thái đang tải tin nhắn kênh (Loading state chống race condition)
  const [isLoadingChannelMessages, setIsLoadingChannelMessages] = useState<boolean>(false);

  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  useEffect(() => {
    currentChannelRef.current = currentChannel;
  }, [currentChannel]);

  useEffect(() => {
    isDirectMessageModeRef.current = isDirectMessageMode;
  }, [isDirectMessageMode]);

  useEffect(() => {
    currentDirectUserRef.current = currentDirectUser;
  }, [currentDirectUser]);

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [isTcpConnected, setIsTcpConnected] = useState<boolean>(true);
  const [isStreamConnected, setIsStreamConnected] = useState<boolean>(true);
  const [pingMs, setPingMs] = useState<number>(24);
  const [isServerMenuOpen, setIsServerMenuOpen] = useState<boolean>(false);
  const {
    unreadMap: roomUnreadMap,
    mutedRooms,
    toggleMuteRoom,
    incrementUnread: incrementRoomUnread,
    clearUnread: clearRoomUnread
  } = useRoomUnread();

  // Đo độ trễ ping ms thực tế định kỳ tới Web Bridge
  useEffect(() => {
    let isMounted = true;
    const measurePing = async () => {
      if (!isTcpConnected) return;
      try {
        const start = performance.now();
        await chatBridge.getStatus();
        const latency = Math.max(1, Math.round(performance.now() - start));
        if (isMounted) setPingMs(latency);
      } catch {
        // bỏ qua khi có gián đoạn tạm thời
      }
    };
    measurePing();
    const interval = window.setInterval(measurePing, 15000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [isTcpConnected]);
  
  // Quản lý Chế độ Giao diện Sáng / Tối (Theme Mode)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('ltmang_theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('ltmang_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Modals
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState<boolean>(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState<boolean>(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState<boolean>(false);
  const [isMemberListOpen, setIsMemberListOpen] = useState<boolean>(true);
  
  const [toastMessage, setToastMessage] = useState<string>('');
  const toastTimerRef = useRef<number | null>(null);
  const pendingCreateRoomRef = useRef<boolean>(false);
  const pendingCreateChannelRef = useRef<boolean>(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage('');
    }, 3000);
  }, []);

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [logoutError, setLogoutError] = useState<string>('');
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // 1. Kiểm tra phiên đăng nhập từ cookie khi nạp ứng dụng
  useEffect(() => {
    let isMounted = true;
    chatBridge.getSession()
      .then((session) => {
        if (!isMounted) return;
        if (session.authenticated && session.user) {
          setCurrentUser(session.user);
          setAuthStatus('authenticated');
        } else {
          setAuthStatus('login');
        }
      })
      .catch(() => {
        if (isMounted) setAuthStatus('login');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Tải dữ liệu ban đầu và khởi động luồng sự kiện SSE CHỈ KHI đã xác thực
  useEffect(() => {
    if (authStatus !== 'authenticated') {
      return;
    }

    // Khởi động luồng SSE
    chatBridge.startEventStream();

    // Nạp dữ liệu ban đầu
    chatBridge.getInitialState().then((data) => {
      if (data) {
        if (data.user) setCurrentUser(data.user);
        if (data.rooms) {
          setRooms(data.rooms);
          // Nếu có danh sách phòng và chưa chọn phòng nào -> tự động chọn phòng đầu tiên
          if (data.rooms.length > 0 && !currentRoomRef.current && !data.currentRoom) {
            handleSelectRoom(data.rooms[0]);
          }
        }
        if (data.currentRoom && !currentRoomRef.current) {
          setCurrentRoom(data.currentRoom);
          currentRoomRef.current = data.currentRoom;
        }
        if (data.channels) {
          setChannels(data.channels);
        }
        if (data.currentChannel) {
          setCurrentChannel(data.currentChannel);
          currentChannelRef.current = data.currentChannel;
        }
        if (data.messages) setMessages(data.messages);
        if (data.members) setMembers(data.members);
        if (data.friends) setFriends(data.friends);
        if (data.pendingRequests) setPendingRequests(data.pendingRequests);
      }
    }).catch((err) => {
      console.warn('[App] Lỗi nạp trạng thái ban đầu:', err);
    });

    // Lắng nghe các sự kiện Realtime từ Java Socket Client
    const unsubscribe = chatBridge.subscribe((event, payload) => {
      switch (event) {
        case 'STATUS':
          setIsTcpConnected(payload.connected === true);
          break;
        case 'STREAM_STATUS':
          setIsStreamConnected(payload.streamConnected === true);
          if (payload.streamConnected === true) {
            chatBridge.refreshFriends().catch(() => {});
            if (currentDirectUserRef.current) {
              chatBridge.getDirectHistory(currentDirectUserRef.current.id, 50).catch(() => {});
            }
          }
          break;
        case 'ROOMS': {
          const updatedRooms: Room[] = payload.rooms || [];
          setRooms(updatedRooms);
          setCurrentRoom((prev) => {
            if (!prev) return prev;
            const matched = updatedRooms.find((r) => r.id === prev.id);
            return matched ? { ...prev, ...matched } : prev;
          });
          break;
        }
        case 'ROOM_JOINED': {
          const newRoom: Room = payload.room;
          setCurrentRoom((prev) => {
            if (prev && prev.id === newRoom?.id) {
              return { ...prev, ...newRoom };
            }
            return newRoom;
          });
          currentRoomRef.current = newRoom;

          if (payload.channel) {
            setCurrentChannel(payload.channel);
            currentChannelRef.current = payload.channel;
          } else {
            setCurrentChannel(null);
            currentChannelRef.current = null;
          }

          setMessages([]);
          setIsLoadingChannelMessages(true);

          // Tải danh sách kênh của phòng vừa tham gia
          if (newRoom?.id) {
            chatBridge.getChannels(newRoom.id).then(chList => {
              if (currentRoomRef.current?.id === newRoom.id) {
                setChannels(chList);
                // Nếu chưa có currentChannel mà danh sách có kênh -> chọn kênh đầu tiên
                if (!currentChannelRef.current && chList.length > 0) {
                  handleSelectChannel(chList[0]);
                }
              }
            }).catch(e => console.warn('Lỗi lấy danh sách kênh:', e));
          }
          break;
        }
        case 'CHANNELS': {
          if (currentRoomRef.current?.id === payload.roomId) {
            const chList: Channel[] = payload.channels || [];
            setChannels(chList);
            // Nếu chưa có channel đang chọn hoặc channel không còn tồn tại -> chọn kênh đầu
            if (!currentChannelRef.current || !chList.some(c => c.id === currentChannelRef.current?.id)) {
              if (chList.length > 0) {
                handleSelectChannel(chList[0]);
              }
            }
          }
          break;
        }
        case 'CHANNEL_JOINED': {
          if (currentRoomRef.current?.id === payload.roomId) {
            setCurrentChannel(payload.channel);
            currentChannelRef.current = payload.channel;
            setIsLoadingChannelMessages(false);
          }
          break;
        }
        case 'CHANNEL_CREATED': {
          if (currentRoomRef.current?.id === payload.roomId) {
            // Nạp lại danh sách kênh
            chatBridge.getChannels(payload.roomId).then(chList => {
              if (currentRoomRef.current?.id === payload.roomId) {
                setChannels(chList);
              }
            });
            showToast(`Đã tạo kênh '#${payload.channel?.name}'`);
          }
          break;
        }
        case 'CHANNEL_RENAMED': {
          if (currentRoomRef.current?.id === payload.roomId) {
            setChannels((prev) =>
              prev.map((c) => (c.id === payload.channelId ? { ...c, name: payload.name } : c))
            );
            setCurrentChannel((prev) =>
              prev && prev.id === payload.channelId ? { ...prev, name: payload.name } : prev
            );
            showToast(`Kênh đã đổi tên thành '#${payload.name}'`);
          }
          break;
        }
        case 'CHANNEL_DELETED': {
          if (currentRoomRef.current?.id === payload.roomId) {
            setChannels((prev) => prev.filter((c) => c.id !== payload.channelId));
            if (currentChannelRef.current?.id === payload.channelId) {
              showToast('Kênh bạn đang xem đã bị xóa.');
              chatBridge.getChannels(payload.roomId).then((chList) => {
                if (currentRoomRef.current?.id === payload.roomId) {
                  setChannels(chList);
                  const fallback = chList.find((c) => c.id === payload.fallbackChannelId) || chList[0];
                  if (fallback) {
                    handleSelectChannel(fallback);
                  } else {
                    setCurrentChannel(null);
                    currentChannelRef.current = null;
                    setMessages([]);
                  }
                }
              }).catch(() => {});
            }
          }
          break;
        }
        case 'ROOM_LEFT':
          setCurrentRoom(null);
          currentRoomRef.current = null;
          setChannels([]);
          setCurrentChannel(null);
          currentChannelRef.current = null;
          setMessages([]);
          setMembers([]);
          break;
        case 'NEW_MESSAGE': {
          const targetChannelId = payload.channelId || payload.message?.channelId;
          const targetRoomId = payload.roomId || payload.message?.roomId;

          // Nếu tin nhắn thuộc phòng khác hoặc đang ở chế độ tin nhắn riêng -> tăng unread
          if (targetRoomId && (isDirectMessageModeRef.current || !currentRoomRef.current || targetRoomId !== currentRoomRef.current.id)) {
            incrementRoomUnread(targetRoomId);
            break;
          }

          // Kiểm tra cách ly tin nhắn: chỉ hiển thị nếu thuộc kênh đang chọn
          if (currentChannelRef.current && targetChannelId && targetChannelId !== currentChannelRef.current.id) {
            // Tin nhắn của kênh khác trong cùng phòng -> không hiển thị ở màn hình kênh này
            break;
          }

          setMessages((prev) => {
            if (payload.message && payload.message.id) {
              if (prev.some((m) => m.id === payload.message.id)) {
                return prev;
              }
            }
            return [...prev, payload.message];
          });
          break;
        }
        case 'MESSAGE_EDITED':
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.messageId
                ? { ...m, content: payload.content, isEdited: true }
                : m
            )
          );
          break;
        case 'MESSAGE_DELETED':
          setMessages((prev) => prev.filter((m) => m.id !== payload.messageId));
          break;
        case 'HISTORY':
          setMessages(payload.messages || []);
          setIsLoadingChannelMessages(false);
          break;
        case 'HISTORY_PAGE':
          if (payload.messages && payload.messages.length > 0) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const older = payload.messages.filter((m: any) => !existingIds.has(m.id));
              return [...older, ...prev];
            });
          }
          break;
        case 'ROOM_RENAMED':
          setRooms((prev) =>
            prev.map((r) => (r.id === payload.roomId ? { ...r, name: payload.name } : r))
          );
          setCurrentRoom((prev) =>
            prev && prev.id === payload.roomId ? { ...prev, name: payload.name } : prev
          );
          break;
        case 'ROOM_DELETED':
          setRooms((prev) => prev.filter((r) => r.id !== payload.roomId));
          if (currentRoomRef.current?.id === payload.roomId) {
            setCurrentRoom(null);
            currentRoomRef.current = null;
            setChannels([]);
            setCurrentChannel(null);
            currentChannelRef.current = null;
            setMessages([]);
            setMembers([]);
          }
          break;
        case 'ROOM_DESC_UPDATED':
          setRooms((prev) =>
            prev.map((r) =>
              r.id === payload.roomId ? { ...r, description: payload.description } : r
            )
          );
          setCurrentRoom((prev) =>
            prev && prev.id === payload.roomId
              ? { ...prev, description: payload.description }
              : prev
          );
          break;
        case 'MEMBERS':
          setMembers(payload.members || []);
          break;
        case 'FRIENDS':
          setFriends(payload.friends || []);
          break;
        case 'PENDING_REQUESTS':
          setPendingRequests(payload.requests || []);
          break;
        case 'FRIEND_SEARCH_RESULT':
          setSearchResults(payload.results || []);
          break;
        case 'DM_SENT': {
          const targetUserId = payload.targetUserId || payload.message?.targetId;
          const msg = payload.message;
          if (targetUserId && msg) {
            const sentAt = String(payload.sentAt || payload.timestamp || msg.sentAt || msg.timestamp || Date.now());
            const realMsg: MessageItem = {
              ...msg,
              id: Number(msg.id),
              timestamp: sentAt,
              isMe: true,
              isDirect: true
            };
            setDirectMessagesMap((prev) => {
              const currentList = prev[targetUserId] || [];
              let replaced = false;
              const nextList = currentList.map((m) => {
                if (m.id < 0 && m.content === realMsg.content && !replaced) {
                  replaced = true;
                  return realMsg;
                }
                return m;
              });
              if (!replaced && !nextList.some((m) => m.id === realMsg.id)) {
                nextList.push(realMsg);
              }
              return {
                ...prev,
                [targetUserId]: nextList
              };
            });
          }
          break;
        }
        case 'DM_RECEIVED':
        case 'NEW_PRIVATE_MESSAGE':
        case 'PRIVATE_MESSAGE': {
          const msg = payload.message;
          const sId = Number(payload.senderId || msg?.senderId);
          const sUsername = String(payload.from || payload.senderUsername || msg?.senderUsername || '').toLowerCase();
          const sName = String(payload.senderDisplayName || payload.senderName || msg?.senderName || sUsername || 'Bạn bè');
          const content = String(payload.content || msg?.content || '');
          const sentAt = String(payload.sentAt || payload.timestamp || msg?.sentAt || msg?.timestamp || Date.now());
          const msgId = Number(payload.id || msg?.id || Date.now());

          const dmItem: MessageItem = {
            id: msgId,
            senderId: sId,
            senderName: sName,
            content: content,
            timestamp: sentAt,
            isMe: false,
            isDirect: true
          };

          if (sId) {
            // 1. Tự động thêm/cập nhật danh sách bạn bè / hội thoại DM nếu chưa có
            setFriends((prevFriends) => {
              const idx = prevFriends.findIndex((f) => f.id === sId);
              if (idx < 0) {
                return [
                  ...prevFriends,
                  {
                    id: sId,
                    username: sUsername || sName,
                    displayName: sName,
                    online: true
                  }
                ];
              }
              const updated = [...prevFriends];
              updated[idx] = {
                ...updated[idx],
                displayName: updated[idx].displayName || sName,
                username: updated[idx].username || sUsername,
                online: true
              };
              return updated;
            });

            // 2. Thêm vào khung chat, chống trùng tin bằng id
            setDirectMessagesMap((prev) => {
              const currentList = prev[sId] || [];
              if (currentList.some((m) => m.id === dmItem.id && dmItem.id > 0)) {
                return prev;
              }
              return {
                ...prev,
                [sId]: [...currentList, dmItem]
              };
            });

            // 3. Nếu không xem cuộc trò chuyện này thì tăng huy hiệu chưa đọc
            const isViewingThisDM = isDirectMessageModeRef.current && currentDirectUserRef.current?.id === sId;
            if (!isViewingThisDM) {
              setDirectUnreadMap((prev) => ({
                ...prev,
                [sId]: (prev[sId] || 0) + 1
              }));
              showToast(`💬 Tin nhắn riêng từ ${sName}: ${content}`);
            }
          }
          break;
        }
        case 'DM_HISTORY': {
          const targetUserId = Number(payload.targetUserId);
          const historyMsgs: MessageItem[] = (payload.messages || []).map((m: any) => ({
            id: Number(m.id),
            senderId: Number(m.senderId),
            senderName: String(m.senderName || ''),
            content: String(m.content || ''),
            timestamp: String(m.sentAt || m.timestamp || ''),
            isMe: currentUser ? Number(m.senderId) === currentUser.id : Boolean(m.isMine),
            isDirect: true
          }));

          if (targetUserId) {
            setDirectMessagesMap((prev) => {
              const existing = prev[targetUserId] || [];
              const map = new Map<number, MessageItem>();
              for (const m of historyMsgs) {
                map.set(m.id, m);
              }
              for (const m of existing) {
                if (!map.has(m.id)) {
                  map.set(m.id, m);
                }
              }
              const sorted = Array.from(map.values()).sort((a, b) => a.id - b.id);
              return {
                ...prev,
                [targetUserId]: sorted
              };
            });
          }
          break;
        }
        case 'FRIEND_REQUEST_RECEIVED': {
          const req = payload.request;
          showToast(`🔔 Bạn nhận được lời mời kết bạn từ ${req?.senderDisplayName || 'ai đó'}!`);
          chatBridge.refreshFriends().catch(() => {});
          break;
        }
        case 'FRIEND_REQUEST_ACCEPTED': {
          const acceptedName = payload.acceptedDisplayName || 'Bạn bè';
          showToast(`🎉 ${acceptedName} đã chấp nhận lời mời kết bạn!`);
          chatBridge.refreshFriends().catch(() => {});
          break;
        }
        case 'FRIEND_REQUEST_DECLINED': {
          showToast('Lời mời kết bạn đã bị từ chối.');
          chatBridge.refreshFriends().catch(() => {});
          break;
        }
        case 'FRIEND_REMOVED': {
          const friendId = payload.friendId;
          if (friendId) {
            setFriends((prev) => prev.filter((f) => f.id !== friendId));
            if (currentDirectUserRef.current?.id === friendId) {
              setCurrentDirectUser(null);
              currentDirectUserRef.current = null;
            }
          }
          chatBridge.refreshFriends().catch(() => {});
          break;
        }
        case 'INCOMING_FRIEND_REQUEST':
          showToast('🔔 Bạn nhận được một lời mời kết bạn mới!');
          chatBridge.refreshFriends().catch(() => {});
          break;
        case 'FRIEND_ACCEPTED':
          showToast('🎉 Lời mời kết bạn đã được chấp nhận!');
          chatBridge.refreshFriends().catch(() => {});
          break;
        case 'ROOM_INVITATION':
          showToast('📨 Bạn vừa được mời vào một phòng mới!');
          chatBridge.getInitialState().then((data) => {
            if (data?.rooms) setRooms(data.rooms);
          }).catch(() => {});
          break;
        case 'USER_ONLINE':
        case 'USER_OFFLINE': {
          const uId = Number(payload.userId);
          const isOnline = event === 'USER_ONLINE' ? true : Boolean(payload.online);
          if (uId > 0) {
            setMembers((prev) =>
              prev.map((m) => (m.id === uId ? { ...m, online: isOnline } : m))
            );
            setFriends((prev) =>
              prev.map((f) => (f.id === uId ? { ...f, online: isOnline } : f))
            );
            setCurrentDirectUser((prev) =>
              prev && prev.id === uId ? { ...prev, online: isOnline } : prev
            );
          }
          break;
        }
        case 'UNAUTHORIZED':
          handleSessionExpired();
          break;
        case 'ERROR':
          if (!pendingCreateRoomRef.current && !pendingCreateChannelRef.current) {
            const errorMsg = payload.message || '';
            // Bỏ qua lỗi 'Bạn đang ở trong phòng này', không hiện bất kỳ thông báo nào khi chuyển phòng
            if (errorMsg.includes('Bạn đang ở trong phòng này') || errorMsg.includes('ở trong phòng này')) {
              return;
            }
            showToast(errorMsg || 'Đã xảy ra lỗi.');
          }
          break;
      }
    });

    return () => {
      unsubscribe();
      chatBridge.stopEventStream();
    };
  }, [authStatus, showToast]);

  const handleSessionExpired = useCallback(() => {
    chatBridge.stopEventStream();
    setCurrentUser(null);
    setRooms([]);
    setCurrentRoom(null);
    currentRoomRef.current = null;
    setChannels([]);
    setCurrentChannel(null);
    currentChannelRef.current = null;
    setMessages([]);
    setMembers([]);
    setFriends([]);
    setPendingRequests([]);
    setCurrentDirectUser(null);
    currentDirectUserRef.current = null;
    setDirectMessagesMap({});
    setDirectUnreadMap({});
    setSearchResults([]);
    setSelectedFriendForInvite(null);
    setIsInviteModalOpen(false);
    setPrefilledSuccessMsg('Phiên đăng nhập đã hết hạn hoặc kết nối đã ngắt. Vui lòng đăng nhập lại.');
    setAuthStatus('login');
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setPrefilledSuccessMsg('');
    setIsTcpConnected(true);
    setIsStreamConnected(true);
    setAuthStatus('authenticated');
    chatBridge.refreshFriends().catch(() => {});
  };

  const handleRegisterSuccess = (username: string, message: string) => {
    setPrefilledUsername(username);
    setPrefilledSuccessMsg(message);
    setAuthStatus('login');
  };

  const handleLogout = () => {
    setLogoutError('');
    setIsLogoutModalOpen(true);
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError('');
    try {
      const result = await chatBridge.logout();
      if (result.success) {
        setIsLogoutModalOpen(false);
        setCurrentUser(null);
        setRooms([]);
        setCurrentRoom(null);
        currentRoomRef.current = null;
        setChannels([]);
        setCurrentChannel(null);
        currentChannelRef.current = null;
        setMessages([]);
        setMembers([]);
        setFriends([]);
        setPendingRequests([]);
        setPrefilledSuccessMsg('Bạn đã đăng xuất an toàn.');
        setAuthStatus('login');
      } else if (result.networkError) {
        try {
          const session = await chatBridge.getSession();
          if (!session.authenticated) {
            setIsLogoutModalOpen(false);
            setCurrentUser(null);
            setPrefilledSuccessMsg('Phiên đăng nhập đã kết thúc.');
            setAuthStatus('login');
          } else {
            setLogoutError('Mất kết nối mạng khi gửi yêu cầu đăng xuất. Phiên làm việc vẫn còn hiệu lực. Vui lòng thử lại.');
            chatBridge.startEventStream();
          }
        } catch {
          setLogoutError('Mất kết nối mạng. Chưa thể xác nhận trạng thái đăng xuất. Vui lòng kiểm tra lại kết nối.');
        }
      } else {
        setLogoutError(result.message || 'Đăng xuất thất bại do lỗi kết nối. Vui lòng thử lại.');
      }
    } catch (e: any) {
      setLogoutError('Không thể hoàn tất đăng xuất: ' + (e?.message || 'Lỗi không xác định'));
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Chọn phòng ở Cột 1 (WorkspaceSidebar)
  const handleSelectRoom = (room: Room) => {
    if (!room) return;
    const currentId = currentRoom?.id ?? currentRoomRef.current?.id;
    // Bấm lại đúng phòng đang mở thì không làm gì và không hiện gì
    if (!isDirectMessageMode && currentId !== undefined && Number(currentId) === Number(room.id)) {
      return;
    }
    setIsDirectMessageMode(false);
    clearRoomUnread(room.id);
    setCurrentRoom(room);
    currentRoomRef.current = room;
    setChannels([]);
    setCurrentChannel(null);
    currentChannelRef.current = null;
    setMessages([]);
    setIsLoadingChannelMessages(true);
    chatBridge.joinRoom(room.id);
  };

  // Chọn kênh ở Cột 2 (RoomSidebar)
  const handleSelectChannel = (channel: Channel) => {
    if (currentChannelRef.current?.id === channel.id) return;
    if (!currentRoomRef.current) return;

    setCurrentChannel(channel);
    currentChannelRef.current = channel;
    setMessages([]);
    setIsLoadingChannelMessages(true);
    chatBridge.joinChannel(currentRoomRef.current.id, channel.id);
  };

  // Bấm vào Logo ở đầu Cột 1: chuyển sang chế độ Tin nhắn trực tiếp
  const handleDirectMessageClick = () => {
    setIsDirectMessageMode(true);
    setCurrentRoom(null);
    currentRoomRef.current = null;
    setChannels([]);
    setCurrentChannel(null);
    currentChannelRef.current = null;
    setMessages([]);
    setCurrentDirectUser(null);
    chatBridge.refreshFriends().catch(() => {});
  };

  // Chọn người bạn để chat 1-1
  const handleSelectDirectUser = (friend: Friend | null) => {
    setCurrentDirectUser(friend);
    currentDirectUserRef.current = friend;
    if (friend) {
      setDirectUnreadMap((prev) => ({ ...prev, [friend.id]: 0 }));
      chatBridge.getDirectHistory(friend.id, 50).catch(() => {});
    }
  };

  // Gửi tin nhắn riêng 1-1
  const handleSendPrivateMessage = async (targetUserId: number, content: string) => {
    if (!currentUser) return;
    try {
      const tempId = -Date.now();
      const myMessage: MessageItem = {
        id: tempId,
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        content,
        timestamp: String(Date.now()),
        isMe: true,
        isDirect: true
      };
      setDirectMessagesMap((prev) => ({
        ...prev,
        [targetUserId]: [...(prev[targetUserId] || []), myMessage]
      }));
      await chatBridge.sendPrivateMessage(targetUserId, content);
    } catch (e: any) {
      showToast('Không thể gửi tin nhắn riêng: ' + (e?.message || 'Lỗi mạng'));
    }
  };

  // Tìm kiếm bạn bè / người dùng
  const handleSearchUsers = (query: string) => {
    chatBridge.searchFriends(query).catch((e: any) => {
      showToast('Lỗi tìm kiếm: ' + (e?.message || 'Lỗi mạng'));
    });
  };

  // Gửi yêu cầu kết bạn
  const handleSendFriendRequest = (targetUserId: number) => {
    chatBridge.sendFriendRequest(targetUserId).then(() => {
      showToast('Đã gửi lời mời kết bạn thành công!');
    }).catch((e: any) => {
      showToast('Không thể gửi lời mời: ' + (e?.message || 'Lỗi'));
    });
  };

  // Chấp nhận lời mời kết bạn
  const handleAcceptFriendRequest = (requestId: number) => {
    chatBridge.acceptFriendRequest(requestId).then(() => {
      showToast('Đã chấp nhận lời mời kết bạn!');
      chatBridge.refreshFriends().catch(() => {});
    }).catch((e: any) => {
      showToast('Không thể chấp nhận: ' + (e?.message || 'Lỗi'));
    });
  };

  // Từ chối lời mời kết bạn
  const handleRejectFriendRequest = (requestId: number) => {
    chatBridge.rejectFriendRequest(requestId).then(() => {
      showToast('Đã từ chối lời mời kết bạn.');
      chatBridge.refreshFriends().catch(() => {});
    }).catch((e: any) => {
      showToast('Không thể từ chối: ' + (e?.message || 'Lỗi'));
    });
  };

  // Mở modal mời bạn bè vào phòng
  const handleOpenInviteModal = (friend: Friend) => {
    setSelectedFriendForInvite(friend);
    setIsInviteModalOpen(true);
  };

  // Xác nhận mời bạn bè vào 1 phòng
  const handleInviteFriendToRoom = (roomId: number, friendId: number) => {
    const room = rooms.find(r => r.id === roomId);
    chatBridge.inviteMember(roomId, friendId).then(() => {
      setInvitedRoomIds(prev => [...prev, roomId]);
      showToast(`Đã gửi lời mời vào phòng "${room?.name || `#${roomId}`}"!`);
    }).catch((e: any) => {
      showToast('Không thể mời vào phòng: ' + (e?.message || 'Lỗi'));
    });
  };

  // Khi bấm vào thành viên trong MemberSidebar -> chuyển sang chat riêng 1-1
  const handleMemberDirectMessage = (userId: number, name: string) => {
    const matchedFriend = friends.find(f => f.id === userId);
    const directUser: Friend = matchedFriend || {
      id: userId,
      username: name,
      displayName: name,
      online: true
    };
    setCurrentDirectUser(directUser);
    setIsDirectMessageMode(true);
    setCurrentRoom(null);
    currentRoomRef.current = null;
    setChannels([]);
    setCurrentChannel(null);
    currentChannelRef.current = null;
    setMessages([]);
    setDirectUnreadMap(prev => ({ ...prev, [userId]: 0 }));
  };

  const handleOpenCreateRoom = () => {
    setIsCreateRoomOpen(true);
  };

  const handleOpenCreateChannel = () => {
    if (!currentRoom) {
      showToast('Vui lòng chọn một phòng trước khi tạo kênh.');
      return;
    }
    setIsCreateChannelOpen(true);
  };

  // Tạo Phòng mới (kèm kênh "chung" mặc định do Server tự động tạo)
  const handleModalCreateRoom = async (
    name: string,
    description?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmedName = name.trim();
    const trimmedDesc = (description || '').trim();

    if (!trimmedName) {
      return { success: false, error: 'Vui lòng nhập tên phòng chat.' };
    }
    if (trimmedName.length > 50) {
      return { success: false, error: 'Tên phòng không được vượt quá 50 ký tự.' };
    }
    if (trimmedDesc.length > 120) {
      return { success: false, error: 'Mô tả phòng không được vượt quá 120 ký tự.' };
    }
    if (rooms.some((r) => r.name.trim().toLowerCase() === trimmedName.toLowerCase())) {
      return { success: false, error: 'Tên phòng đã tồn tại. Vui lòng chọn tên khác.' };
    }
    if (!isTcpConnected) {
      return { success: false, error: 'Mất kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.' };
    }

    pendingCreateRoomRef.current = true;

    try {
      const res = await chatBridge.createRoom(trimmedName);
      const createdRoomId = res.roomId || 0;
      if (trimmedDesc && createdRoomId > 0) {
        await chatBridge.setRoomDesc(createdRoomId, trimmedDesc).catch(() => {});
      }

      const nextRoom: Room = {
        id: createdRoomId,
        name: trimmedName,
        description: trimmedDesc,
        role: 'OWNER'
      };

      setIsDirectMessageMode(false);
      setCurrentRoom(nextRoom);
      currentRoomRef.current = nextRoom;

      if (createdRoomId > 0) {
        clearRoomUnread(createdRoomId);
        chatBridge.joinRoom(createdRoomId);
      }

      showToast(`Đã tạo phòng '${trimmedName}'`);
      pendingCreateRoomRef.current = false;
      return { success: true };
    } catch (err: any) {
      pendingCreateRoomRef.current = false;
      return {
        success: false,
        error: err?.message || 'Không thể tạo phòng chat. Vui lòng thử lại.'
      };
    }
  };

  // Tạo Kênh chat mới trong phòng đang chọn
  const handleModalCreateChannel = async (
    roomId: number,
    channelName: string
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmedName = channelName.trim();

    if (!trimmedName) {
      return { success: false, error: 'Vui lòng nhập tên kênh chat.' };
    }
    if (trimmedName.length > 50) {
      return { success: false, error: 'Tên kênh không được vượt quá 50 ký tự.' };
    }
    if (channels.some(c => c.name.trim().toLowerCase() === trimmedName.toLowerCase())) {
      return { success: false, error: `Kênh "#${trimmedName}" đã tồn tại trong phòng này.` };
    }

    pendingCreateChannelRef.current = true;

    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      let settled = false;
      const cleanup = () => {
        settled = true;
        pendingCreateChannelRef.current = false;
        window.clearTimeout(timer);
        unsubscribe();
      };

      const timer = window.setTimeout(() => {
        if (!settled) {
          cleanup();
          resolve({
            success: false,
            error: 'Không nhận được phản hồi tạo kênh từ Server (Timeout).'
          });
        }
      }, 8000);

      const unsubscribe = chatBridge.subscribe((event, payload) => {
        if (settled) return;

        if (event === 'ERROR') {
          cleanup();
          resolve({
            success: false,
            error: payload?.message || 'Không thể tạo kênh chat.'
          });
          return;
        }

        if (event === 'CHANNEL_CREATED' && payload.roomId === roomId) {
          cleanup();
          const newCh: Channel = payload.channel;
          // Tự động chuyển vào kênh mới tạo
          if (newCh) {
            handleSelectChannel(newCh);
          }
          resolve({ success: true });
        }
      });

      chatBridge.createChannel(roomId, trimmedName).catch((err: any) => {
        if (!settled) {
          cleanup();
          resolve({
            success: false,
            error: 'Lỗi mạng: ' + (err?.message || 'Không thể tạo kênh.')
          });
        }
      });
    });
  };

  const handleRenameRoom = (roomId: number, name: string) => {
    chatBridge.renameRoom(roomId, name);
  };

  const handleDeleteRoom = (roomId: number) => {
    const room = rooms.find(r => r.id === roomId);
    const roomName = room ? room.name : `phòng #${roomId}`;
    setActionModal({
      isOpen: true,
      title: 'Xóa Phòng Chat',
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn phòng "${roomName}" không? Toàn bộ các kênh và lịch sử tin nhắn trong phòng sẽ bị xóa vĩnh viễn.`,
      confirmText: 'Xóa Phòng',
      cancelText: 'Hủy bỏ',
      isDanger: true,
      onConfirm: () => {
        setActionModal(prev => ({ ...prev, isOpen: false }));
        chatBridge.deleteRoom(roomId);
      }
    });
  };

  const handleRenameChannel = (channelId: number, name: string) => {
    if (!currentRoom) return;
    chatBridge.renameChannel(currentRoom.id, channelId, name)
      .catch((err) => {
        showToast(err?.message || 'Không thể đổi tên kênh.');
      });
  };

  const handleDeleteChannel = (channelId: number) => {
    if (!currentRoom) return;
    const ch = channels.find(c => c.id === channelId);
    const chName = ch ? ch.name : `#${channelId}`;
    setActionModal({
      isOpen: true,
      title: 'Xóa Kênh Chat',
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn kênh "#${chName}" không? Toàn bộ lịch sử tin nhắn trong kênh này sẽ bị xóa vĩnh viễn.`,
      confirmText: 'Xóa Kênh',
      cancelText: 'Hủy bỏ',
      isDanger: true,
      onConfirm: () => {
        setActionModal(prev => ({ ...prev, isOpen: false }));
        chatBridge.deleteChannel(currentRoom.id, channelId)
          .catch((err) => {
            showToast(err?.message || 'Không thể xóa kênh.');
          });
      }
    });
  };

  const handleSetRoomDesc = (roomId: number, description: string) => {
    chatBridge.setRoomDesc(roomId, description);
  };

  const handleSendMessage = (text: string) => {
    chatBridge.sendMessage(text, currentChannelRef.current?.id);
  };

  const handleEditMessage = (messageId: number, content: string) => {
    chatBridge.editMessage(messageId, content);
  };

  const handleDeleteMessage = (messageId: number) => {
    setActionModal({
      isOpen: true,
      title: 'Xóa Tin Nhắn',
      message: 'Bạn có chắc chắn muốn xóa tin nhắn này không? Hành động này không thể hoàn tác.',
      confirmText: 'Xóa',
      cancelText: 'Hủy bỏ',
      isDanger: true,
      onConfirm: () => {
        setActionModal(prev => ({ ...prev, isOpen: false }));
        chatBridge.deleteMessage(messageId);
      }
    });
  };

  const handleLoadMore = (beforeId: number) => {
    if (currentRoom) {
      chatBridge.loadMoreHistory(currentRoom.id, beforeId);
    }
  };

  const handleSetMemberRole = (userId: number, role: string) => {
    if (!currentRoom) return;
    const target = members.find(m => m.id === userId);
    const targetName = target ? target.displayName : `User #${userId}`;
    const roleText = role === 'ADMIN' ? 'bổ nhiệm làm Quản trị viên (ADMIN)' : 'hạ xuống Thành viên (MEMBER)';
    setActionModal({
      isOpen: true,
      title: 'Thay Đổi Vai Trò',
      message: `Bạn có chắc chắn muốn ${roleText} cho "${targetName}" không?`,
      confirmText: 'Xác Nhận',
      cancelText: 'Hủy bỏ',
      isDanger: false,
      onConfirm: () => {
        setActionModal(prev => ({ ...prev, isOpen: false }));
        chatBridge.setMemberRole(currentRoom.id, userId, role);
      }
    });
  };

  const handleTransferOwner = (userId: number) => {
    if (!currentRoom) return;
    const target = members.find(m => m.id === userId);
    const targetName = target ? target.displayName : `User #${userId}`;
    setActionModal({
      isOpen: true,
      title: 'Chuyển Quyền Trưởng Nhóm',
      message: `CẢNH BÁO: Bạn có chắc chắn muốn chuyển giao toàn quyền Chủ phòng cho "${targetName}"? Bạn sẽ trở thành Quản trị viên.`,
      confirmText: 'Chuyển Quyền',
      cancelText: 'Hủy bỏ',
      isDanger: true,
      onConfirm: () => {
        setActionModal(prev => ({ ...prev, isOpen: false }));
        chatBridge.transferOwner(currentRoom.id, userId);
      }
    });
  };

  const handleInvite = () => {
    if (!currentRoom) return;
    const input = prompt('Nhập ID người dùng muốn mời vào phòng:');
    if (input && !isNaN(Number(input))) {
      chatBridge.inviteMember(currentRoom.id, Number(input));
    }
  };

  const handleKick = () => {
    if (!currentRoom) return;
    const input = prompt('Nhập ID người dùng muốn kick khỏi phòng:');
    if (input && !isNaN(Number(input))) {
      const targetId = Number(input);
      handleKickMember(targetId);
    }
  };

  const handleKickMember = (userId: number) => {
    if (!currentRoom) return;
    const target = members.find(m => m.id === userId);
    const targetName = target ? target.displayName : `User #${userId}`;
    setActionModal({
      isOpen: true,
      title: 'Đuổi Thành Viên',
      message: `Bạn có chắc chắn muốn kick "${targetName}" khỏi phòng "${currentRoom.name}" không?`,
      confirmText: 'Kick',
      cancelText: 'Hủy bỏ',
      isDanger: true,
      onConfirm: () => {
        setActionModal(prev => ({ ...prev, isOpen: false }));
        chatBridge.kickMember(currentRoom.id, userId);
      }
    });
  };

  const handleLeave = () => {
    if (!currentRoom) return;

    const isOwner = currentRoom.role === 'OWNER' || rooms.find(r => r.id === currentRoom.id)?.role === 'OWNER';
    if (isOwner) {
      setActionModal({
        isOpen: true,
        title: 'Không Thể Rời Phòng',
        message: `Bạn đang là Trưởng nhóm (Chủ phòng) của "${currentRoom.name}". Bạn không thể rời phòng khi chưa chuyển quyền Trưởng nhóm cho thành viên khác. Vui lòng chuyển quyền hoặc chọn "Xóa phòng" nếu muốn giải tán phòng.`,
        confirmText: 'Đã Hiểu',
        cancelText: '',
        isDanger: false,
        onConfirm: () => {
          setActionModal(prev => ({ ...prev, isOpen: false }));
        }
      });
      return;
    }

    setActionModal({
      isOpen: true,
      title: 'Rời Khỏi Phòng',
      message: `Bạn có chắc chắn muốn rời khỏi phòng "${currentRoom.name}" không?`,
      confirmText: 'Rời Phòng',
      cancelText: 'Hủy bỏ',
      isDanger: true,
      onConfirm: () => {
        setActionModal(prev => ({ ...prev, isOpen: false }));
        chatBridge.leaveRoom();
        setCurrentRoom(null);
        currentRoomRef.current = null;
        setChannels([]);
        setCurrentChannel(null);
        currentChannelRef.current = null;
        setMessages([]);
        setMembers([]);
      }
    });
  };

  // Màn hình 1: Đang kiểm tra phiên (Loading Splash)
  if (authStatus === 'checking') {
    return (
      <div className="auth-wrapper">
        <div className="auth-card auth-loading-card">
          <div className="pulse" style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <Logo size={64} />
          </div>
          <h3 style={{ color: 'var(--text-header)', margin: '16px 0 8px' }}>HUDDLE</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Đang kiểm tra phiên đăng nhập...</p>
        </div>
      </div>
    );
  }

  // Màn hình 2: Đăng nhập
  if (authStatus === 'login') {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        onSwitchToRegister={() => setAuthStatus('register')}
        prefilledUsername={prefilledUsername}
        prefilledSuccessMsg={prefilledSuccessMsg}
      />
    );
  }

  // Màn hình 3: Đăng ký
  if (authStatus === 'register') {
    return (
      <RegisterView
        onRegisterSuccess={handleRegisterSuccess}
        onSwitchToLogin={() => setAuthStatus('login')}
      />
    );
  }

  const currentMember = members.find(m => m.id === currentUser?.id);
  const currentUserRole = currentMember?.role || (currentRoom as any)?.role || 'MEMBER';
  const isOwner = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  // Màn hình 4: Giao diện Chat chính thức (Đã xác thực)
  return (
    <div className="app-container" style={{ position: 'relative' }}>
      {/* 1. THANH PHÒNG (APP TITLEBAR) - Chạy suốt chiều ngang trên cùng, cao 36px */}
      <AppTitlebar
        currentRoom={currentRoom}
        isDirectMessageMode={isDirectMessageMode}
        isTcpConnected={isTcpConnected}
        isStreamConnected={isStreamConnected}
        pingMs={pingMs}
        onToggleRoomMenu={currentRoom && !isDirectMessageMode ? () => setIsServerMenuOpen(prev => !prev) : undefined}
      />

      {/* 2. Mất kết nối TCP tới ChatServer (cổng 5000) */}
      {!isTcpConnected && (
        <div style={{
          position: 'absolute',
          top: '36px',
          left: 0,
          right: 0,
          backgroundColor: 'var(--accent-red)',
          color: '#ffffff',
          padding: '6px 16px',
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          zIndex: 9999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}>
          <span>⚠️ Mất kết nối TCP tới ChatServer (cổng 5000). Phiên làm việc đã bị gián đoạn.</span>
          <button
            type="button"
            onClick={() => handleSessionExpired()}
            style={{
              backgroundColor: '#ffffff',
              color: 'var(--accent-red)',
              border: 'none',
              borderRadius: '3px',
              padding: '2px 8px',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Đăng nhập lại
          </button>
        </div>
      )}

      {/* 3. Mất kết nối luồng sự kiện SSE giữa Trình duyệt và Web Bridge (localhost:8080) */}
      {isTcpConnected && !isStreamConnected && (
        <div style={{
          position: 'absolute',
          top: '36px',
          left: 0,
          right: 0,
          backgroundColor: 'var(--accent-yellow)',
          color: '#12201F',
          padding: '6px 16px',
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          zIndex: 9999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}>
          <span>⚠️ Mất kết nối luồng sự kiện tới dịch vụ Web cầu nối. Trình duyệt đang tự động kết nối lại...</span>
        </div>
      )}

      {/* 4. VÙNG ỨNG DỤNG BÊN DƯỚI (Hàng 2 của CSS Grid, 1fr) */}
      <main className="app-main-layout">
        {/* CỘT 1: Thanh biểu tượng ngoài cùng bên trái (Logo = DM, các Icon phòng, nút "+" tạo phòng) */}
        <WorkspaceSidebar
          rooms={rooms}
          currentRoom={currentRoom}
          isDirectMessageMode={isDirectMessageMode}
          unreadMap={roomUnreadMap}
          mutedRooms={mutedRooms}
          currentUserRole={currentUserRole}
          isOwner={isOwner}
          onDirectMessageClick={handleDirectMessageClick}
          onSelectRoom={handleSelectRoom}
          onCreateRoom={handleOpenCreateRoom}
          onMarkAsRead={clearRoomUnread}
          onToggleMute={toggleMuteRoom}
          onInvite={handleInvite}
          onOpenSettings={() => setIsServerMenuOpen(true)}
          onCreateChannel={handleOpenCreateChannel}
          onLeaveRoom={handleLeave}
        />

        {/* CỘT 2: Tiêu đề là tên phòng đang chọn hoặc Tin nhắn trực tiếp */}
        <RoomSidebar
          currentRoom={currentRoom}
          channels={channels}
          currentChannel={currentChannel}
          currentUser={currentUser}
          isDirectMessageMode={isDirectMessageMode}
          friends={friends}
          pendingCount={pendingRequests.length}
          currentDirectUser={currentDirectUser}
          onSelectDirectUser={handleSelectDirectUser}
          directUnreadMap={directUnreadMap}
          directMessagesMap={directMessagesMap}
          onOpenAddFriend={() => {
            setCurrentDirectUser(null);
            setFriendsTab('add_friend');
          }}
          onSelectChannel={handleSelectChannel}
          onCreateChannel={handleOpenCreateChannel}
          onRenameRoom={handleRenameRoom}
          onDeleteRoom={handleDeleteRoom}
          onSetRoomDesc={handleSetRoomDesc}
          onRenameChannel={handleRenameChannel}
          onDeleteChannel={handleDeleteChannel}
          onLogout={handleLogout}
          onOpenSettings={() => setIsUserSettingsOpen(true)}
          onInvite={handleInvite}
          onLeaveRoom={handleLeave}
          isServerMenuOpen={isServerMenuOpen}
          onToggleServerMenu={() => setIsServerMenuOpen(prev => !prev)}
          onCloseServerMenu={() => setIsServerMenuOpen(false)}
        />

        {/* CỘT 3: Trung tâm Chat, Tiêu đề kênh, Tin nhắn hoặc Bạn bè / Khung chat riêng 1-1 */}
        {isDirectMessageMode ? (
          currentDirectUser ? (
            <DirectMessageChat
              targetUser={currentDirectUser}
              currentUser={currentUser}
              messages={directMessagesMap[currentDirectUser.id] || []}
              onSendMessage={handleSendPrivateMessage}
              onOpenInviteModal={handleOpenInviteModal}
              onBackToFriends={() => setCurrentDirectUser(null)}
              onRemoveFriend={(friendId) => {
                const friend = friends.find(f => f.id === friendId);
                setActionModal({
                  isOpen: true,
                  title: 'Hủy kết bạn',
                  message: `Bạn có chắc chắn muốn hủy kết bạn với "${friend?.displayName || 'người này'}" không?`,
                  confirmText: 'Hủy kết bạn',
                  cancelText: 'Giữ lại',
                  isDanger: true,
                  onConfirm: () => {
                    chatBridge.removeFriend(friendId).then(() => {
                      showToast('Đã hủy kết bạn thành công.');
                      setCurrentDirectUser(null);
                      chatBridge.refreshFriends().catch(() => {});
                    }).catch((err: any) => {
                      showToast('Không thể hủy kết bạn: ' + (err?.message || 'Lỗi'));
                    });
                    setActionModal(prev => ({ ...prev, isOpen: false }));
                  }
                });
              }}
            />
          ) : (
            <FriendsView
              friends={friends}
              pendingRequests={pendingRequests}
              searchResults={searchResults}
              currentUserId={currentUser ? currentUser.id : 0}
              initialTab={friendsTab}
              onSelectDirectUser={handleSelectDirectUser}
              onOpenInviteModal={handleOpenInviteModal}
              onAcceptRequest={handleAcceptFriendRequest}
              onRejectRequest={handleRejectFriendRequest}
              onSearchUsers={handleSearchUsers}
              onSendFriendRequest={handleSendFriendRequest}
            />
          )
        ) : (
          <ChatCenter
            currentRoom={currentRoom}
            currentChannel={currentChannel}
            isDirectMessageMode={isDirectMessageMode}
            isLoading={isLoadingChannelMessages}
            messages={messages}
            currentUserId={currentUser ? currentUser.id : 0}
            currentUserRole={currentUserRole}
            isMemberListOpen={isMemberListOpen}
            onToggleMemberList={() => setIsMemberListOpen(prev => !prev)}
            onSendMessage={handleSendMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onLoadMore={handleLoadMore}
            onInvite={handleInvite}
            onLeave={handleLeave}
            onKick={handleKick}
            isOwner={isOwner}
          />
        )}

        {/* CỘT 4: Thành viên phòng */}
        {!isDirectMessageMode && isMemberListOpen && (
          <MemberSidebar
            members={members}
            currentUserId={currentUser?.id}
            currentUserRole={currentUserRole}
            onDirectMessage={handleMemberDirectMessage}
            onSetMemberRole={handleSetMemberRole}
            onTransferOwner={handleTransferOwner}
            onKickMember={handleKickMember}
          />
        )}
      </main>

      {/* Hộp thoại Mời bạn bè vào phòng */}
      <InviteFriendModal
        isOpen={isInviteModalOpen}
        onClose={() => {
          setIsInviteModalOpen(false);
          setSelectedFriendForInvite(null);
        }}
        friend={selectedFriendForInvite}
        rooms={rooms}
        onInvite={handleInviteFriendToRoom}
        invitedRoomIds={invitedRoomIds}
      />

      {/* Hộp thoại 1: Tạo phòng chat (Nút "+" Cột 1) */}
      <CreateRoomModal
        isOpen={isCreateRoomOpen}
        onClose={() => setIsCreateRoomOpen(false)}
        onCreateRoom={handleModalCreateRoom}
        existingRooms={rooms}
      />

      {/* Hộp thoại 2: Tạo kênh chat (Nút "+" Cột 2 cạnh "KÊNH CHAT") */}
      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
        room={currentRoom}
        existingChannels={channels}
        onCreateChannel={handleModalCreateChannel}
      />

      {/* Modal Xác Nhận Hành Động Chung */}
      <ConfirmModal
        isOpen={actionModal.isOpen}
        title={actionModal.title}
        message={actionModal.message}
        confirmText={actionModal.confirmText}
        cancelText={actionModal.cancelText}
        isDanger={actionModal.isDanger}
        onConfirm={actionModal.onConfirm}
        onCancel={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Modal Đăng Xuất An Toàn */}
      <ConfirmModal
        isOpen={isLogoutModalOpen}
        title="Đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất khỏi tài khoản của mình trên thiết bị này?"
        confirmText="Đăng xuất"
        cancelText="Hủy"
        isDanger={true}
        isLoading={isLoggingOut}
        errorMessage={logoutError}
        onConfirm={handleConfirmLogout}
        onCancel={() => {
          if (!isLoggingOut) {
            setIsLogoutModalOpen(false);
            setLogoutError('');
          }
        }}
      />

      {/* Modal Cài đặt Người dùng (Theme Sáng/Tối, Hồ sơ, Đăng xuất) */}
      <UserSettingsModal
        isOpen={isUserSettingsOpen}
        onClose={() => setIsUserSettingsOpen(false)}
        currentUser={currentUser}
        currentUserRole={currentUserRole}
        theme={theme}
        onThemeChange={setTheme}
        onLogout={() => {
          setIsUserSettingsOpen(false);
          handleLogout();
        }}
        onProfileUpdated={(newDisplayName) => {
          setCurrentUser(prev => prev ? { ...prev, displayName: newDisplayName } : null);
          setMembers(prev => prev.map(m => (m.id === currentUser?.id || m.username === currentUser?.username) ? { ...m, displayName: newDisplayName } : m));
          showToast(`Đã cập nhật tên hiển thị: ${newDisplayName}`);
        }}
      />

      {/* Toast thông báo nhanh nổi giữa màn hình phía dưới */}
      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
    </div>
  );
};

export default App;
