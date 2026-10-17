import React, { useEffect, useState, useCallback } from 'react';
import type { User, Room, MessageItem, Friend, PendingFriendRequest } from './types/chat';
import { chatBridge } from './services/chatBridge';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { RoomSidebar } from './components/RoomSidebar';
import { ChatCenter } from './components/ChatCenter';
import { MemberSidebar } from './components/MemberSidebar';
import { LoginView } from './components/LoginView';
import { RegisterView } from './components/RegisterView';
import './styles/discord.css';

type AuthStatus = 'checking' | 'login' | 'register' | 'authenticated';

export const App: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
  const [prefilledUsername, setPrefilledUsername] = useState<string>('');
  const [prefilledSuccessMsg, setPrefilledSuccessMsg] = useState<string>('');

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [_friends, setFriends] = useState<Friend[]>([]);
  const [_pendingRequests, setPendingRequests] = useState<PendingFriendRequest[]>([]);
  const [_isConnected, setIsConnected] = useState<boolean>(true);
  const [unreadMap, setUnreadMap] = useState<Record<number, number>>({});

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
        if (data.rooms) setRooms(data.rooms);
        if (data.currentRoom) setCurrentRoom(data.currentRoom);
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
          setIsConnected(payload.connected);
          break;
        case 'ROOMS':
          setRooms(payload.rooms || []);
          break;
        case 'ROOM_JOINED':
          setCurrentRoom(payload.room);
          setMessages([]);
          break;
        case 'NEW_MESSAGE':
          if (payload.roomId && currentRoom && payload.roomId !== currentRoom.id) {
            setUnreadMap((prev) => ({
              ...prev,
              [payload.roomId]: (prev[payload.roomId] || 0) + 1
            }));
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
          setCurrentRoom((prev) => (prev && prev.id === payload.roomId ? null : prev));
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
          if (payload.results && payload.results.length > 0) {
            const first = payload.results[0];
            if (confirm(`Tìm thấy người dùng "${first.displayName}" (@${first.username}). Bạn có muốn gửi lời mời kết bạn không?`)) {
              chatBridge.sendFriendRequest(first.id);
            }
          } else {
            alert('Không tìm thấy người dùng phù hợp.');
          }
          break;
        case 'UNAUTHORIZED':
          handleSessionExpired();
          break;
        case 'ERROR':
          alert(payload.message || 'Đã xảy ra lỗi.');
          break;
      }
    });

    return () => {
      unsubscribe();
      chatBridge.stopEventStream();
    };
  }, [authStatus, currentRoom]);

  const handleSessionExpired = useCallback(() => {
    chatBridge.stopEventStream();
    setCurrentUser(null);
    setRooms([]);
    setCurrentRoom(null);
    setMessages([]);
    setMembers([]);
    setFriends([]);
    setPendingRequests([]);
    setPrefilledSuccessMsg('Phiên đăng nhập đã hết hạn hoặc máy chủ đã khởi động lại. Vui lòng đăng nhập lại.');
    setAuthStatus('login');
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setPrefilledSuccessMsg('');
    setAuthStatus('authenticated');
  };

  const handleRegisterSuccess = (username: string, message: string) => {
    setPrefilledUsername(username);
    setPrefilledSuccessMsg(message);
    setAuthStatus('login');
  };

  const handleLogout = async () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi Discord Mini?')) {
      await chatBridge.logout();
      setCurrentUser(null);
      setRooms([]);
      setCurrentRoom(null);
      setMessages([]);
      setMembers([]);
      setFriends([]);
      setPendingRequests([]);
      setPrefilledSuccessMsg('Bạn đã đăng xuất an toàn.');
      setAuthStatus('login');
    }
  };

  const handleSelectRoom = (room: Room) => {
    setUnreadMap((prev) => ({ ...prev, [room.id]: 0 }));
    chatBridge.joinRoom(room.id);
  };

  const handleCreateRoom = () => {
    const name = prompt('Nhập tên phòng chat mới:');
    if (name && name.trim()) {
      chatBridge.createRoom(name.trim());
    }
  };

  const handleRenameRoom = (roomId: number, name: string) => {
    chatBridge.renameRoom(roomId, name);
  };

  const handleDeleteRoom = (roomId: number) => {
    chatBridge.deleteRoom(roomId);
  };

  const handleSetRoomDesc = (roomId: number, description: string) => {
    chatBridge.setRoomDesc(roomId, description);
  };

  const handleSendMessage = (text: string) => {
    chatBridge.sendMessage(text);
  };

  const handleEditMessage = (messageId: number, content: string) => {
    chatBridge.editMessage(messageId, content);
  };

  const handleDeleteMessage = (messageId: number) => {
    chatBridge.deleteMessage(messageId);
  };

  const handleLoadMore = (beforeId: number) => {
    if (currentRoom) {
      chatBridge.loadMoreHistory(currentRoom.id, beforeId);
    }
  };

  const handleSetMemberRole = (userId: number, role: string) => {
    if (currentRoom) {
      chatBridge.setMemberRole(currentRoom.id, userId, role);
    }
  };

  const handleTransferOwner = (userId: number) => {
    if (currentRoom) {
      chatBridge.transferOwner(currentRoom.id, userId);
    }
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
      const targetMember = members.find(m => m.id === targetId);
      const targetName = targetMember ? targetMember.displayName : `ID ${targetId}`;
      if (window.confirm(`Bạn có chắc chắn muốn kick "${targetName}" khỏi phòng "${currentRoom.name}" không?`)) {
        chatBridge.kickMember(currentRoom.id, targetId);
      }
    }
  };

  const handleKickMember = (userId: number) => {
    if (!currentRoom) return;
    chatBridge.kickMember(currentRoom.id, userId);
  };

  const handleLeave = () => {
    if (window.confirm(`Bạn có chắc chắn muốn rời khỏi phòng "${currentRoom?.name || ''}" không?`)) {
      chatBridge.leaveRoom();
      setCurrentRoom(null);
      setMessages([]);
      setMembers([]);
    }
  };

  const handleDirectMessage = (userId: number, name: string) => {
    const text = prompt(`Nhập tin nhắn riêng tới ${name}:`);
    if (text && text.trim()) {
      chatBridge.sendPrivateMessage(userId, text.trim());
    }
  };

  // Màn hình 1: Đang kiểm tra phiên (Loading Splash)
  if (authStatus === 'checking') {
    return (
      <div className="auth-wrapper">
        <div className="auth-card auth-loading-card">
          <div className="auth-logo-badge pulse">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
          </div>
          <h3 style={{ color: 'var(--text-header)', margin: '16px 0 8px' }}>DISCORD MINI</h3>
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
    <div className="app-container">
      {/* CỘT 1: Workspace / Guild Strip */}
      <WorkspaceSidebar
        onDirectMessage={() => alert('Chức năng tin nhắn trực tiếp đang ở chế độ xem nhanh.')}
        onOpenExplore={() => alert('Khám phá máy chủ cộng đồng Discord Mini.')}
        onAddServer={handleCreateRoom}
      />

      {/* CỘT 2: Room Channels & User Bar */}
      <RoomSidebar
        rooms={rooms}
        currentRoom={currentRoom}
        currentUser={currentUser}
        unreadMap={unreadMap}
        onSelectRoom={handleSelectRoom}
        onCreateRoom={handleCreateRoom}
        onRenameRoom={handleRenameRoom}
        onDeleteRoom={handleDeleteRoom}
        onSetRoomDesc={handleSetRoomDesc}
        onLogout={handleLogout}
      />

      {/* CỘT 3: Trung tâm Chat, Tin nhắn & Lịch sử */}
      <ChatCenter
        currentRoom={currentRoom}
        messages={messages}
        members={members}
        currentUserId={currentUser ? currentUser.id : 0}
        currentUserRole={currentUserRole}
        onSendMessage={handleSendMessage}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onLoadMore={handleLoadMore}
        onInvite={handleInvite}
        onKick={handleKick}
        onLeave={handleLeave}
        isOwner={isOwner}
      />

      {/* CỘT 4: Thành viên phòng (Trực tuyến & Ngoại tuyến) */}
      <MemberSidebar
        members={members}
        currentUserId={currentUser?.id}
        currentUserRole={currentUserRole}
        onDirectMessage={handleDirectMessage}
        onSetMemberRole={handleSetMemberRole}
        onTransferOwner={handleTransferOwner}
        onKickMember={handleKickMember}
      />
    </div>
  );
};

export default App;
