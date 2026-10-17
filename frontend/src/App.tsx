import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { User, Room, MessageItem, Friend, PendingFriendRequest } from './types/chat';
import { chatBridge } from './services/chatBridge';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { RoomSidebar } from './components/RoomSidebar';
import { ChatCenter } from './components/ChatCenter';
import { MemberSidebar } from './components/MemberSidebar';
import { LoginView } from './components/LoginView';
import { RegisterView } from './components/RegisterView';
import { Logo } from './components/Logo';
import { CreateServerModal } from './components/CreateServerModal';
import { ConfirmModal } from './components/ConfirmModal';
import './styles/discord.css';

type AuthStatus = 'checking' | 'login' | 'register' | 'authenticated';

export const App: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
  const [prefilledUsername, setPrefilledUsername] = useState<string>('');
  const [prefilledSuccessMsg, setPrefilledSuccessMsg] = useState<string>('');

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const currentRoomRef = useRef<Room | null>(null);

  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [_friends, setFriends] = useState<Friend[]>([]);
  const [_pendingRequests, setPendingRequests] = useState<PendingFriendRequest[]>([]);
  const [isTcpConnected, setIsTcpConnected] = useState<boolean>(true);
  const [isStreamConnected, setIsStreamConnected] = useState<boolean>(true);
  const [unreadMap, setUnreadMap] = useState<Record<number, number>>({});
  const [isCreateServerOpen, setIsCreateServerOpen] = useState<boolean>(false);
  const [isMemberListOpen, setIsMemberListOpen] = useState<boolean>(true);
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
        if (data.rooms) setRooms(data.rooms);
        if (data.currentRoom && !currentRoomRef.current) setCurrentRoom(data.currentRoom);
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
          break;
        case 'ROOMS':
          setRooms(payload.rooms || []);
          break;
        case 'ROOM_JOINED':
          setCurrentRoom(payload.room);
          setMessages([]);
          break;
        case 'ROOM_LEFT':
          setCurrentRoom(null);
          setMessages([]);
          setMembers([]);
          break;
        case 'NEW_MESSAGE':
          if (payload.roomId && currentRoomRef.current && payload.roomId !== currentRoomRef.current.id) {
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
  }, [authStatus]);

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
    setIsTcpConnected(true);
    setIsStreamConnected(true);
    setAuthStatus('authenticated');
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
        setMessages([]);
        setMembers([]);
        setFriends([]);
        setPendingRequests([]);
        setPrefilledSuccessMsg('Bạn đã đăng xuất an toàn.');
        setAuthStatus('login');
      } else if (result.networkError) {
        // Lỗi mạng: Không tự tiện kết luận là đã đăng xuất hay vẫn đăng nhập
        // Gọi getSession() để xác thực lại trạng thái thực tế
        try {
          const session = await chatBridge.getSession();
          if (!session.authenticated) {
            // Thực tế máy chủ đã hủy phiên trước khi mạng gặp sự cố
            setIsLogoutModalOpen(false);
            setCurrentUser(null);
            setPrefilledSuccessMsg('Phiên đăng nhập đã kết thúc.');
            setAuthStatus('login');
          } else {
            // Phiên vẫn còn hiệu lực trên máy chủ -> Giữ nguyên trạng thái và báo lỗi
            setLogoutError('Mất kết nối mạng khi gửi yêu cầu đăng xuất. Phiên làm việc vẫn còn hiệu lực. Vui lòng thử lại.');
            // Đảm bảo SSE vẫn hoạt động để tiếp tục nhận tin
            chatBridge.startEventStream();
          }
        } catch {
          setLogoutError('Mất kết nối mạng. Chưa thể xác nhận trạng thái đăng xuất. Vui lòng kiểm tra lại kết nối.');
        }
      } else {
        setLogoutError(result.message || 'Đăng xuất thất bại do lỗi kết nối đến máy chủ. Vui lòng thử lại.');
      }
    } catch (e: any) {
      setLogoutError('Không thể hoàn tất đăng xuất: ' + (e?.message || 'Lỗi không xác định'));
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleSelectRoom = (room: Room) => {
    if (currentRoomRef.current?.id === room.id) return;
    setUnreadMap((prev) => ({ ...prev, [room.id]: 0 }));
    chatBridge.joinRoom(room.id);
  };

  const handleCreateRoom = () => {
    setIsCreateServerOpen(true);
  };

  const handleModalCreateRoom = (name: string, description?: string) => {
    chatBridge.createRoom(name).then(() => {
      if (description) {
        setTimeout(() => {
          const created = rooms.find(r => r.name === name);
          if (created) {
            chatBridge.setRoomDesc(created.id, description);
          }
        }, 500);
      }
    });
  };

  const handleModalJoinRoom = (input: string) => {
    const clean = input.trim();
    if (!isNaN(Number(clean))) {
      chatBridge.joinRoom(Number(clean));
    } else {
      const found = rooms.find(r => r.inviteCode === clean || r.name.toLowerCase().includes(clean.toLowerCase()));
      if (found) {
        chatBridge.joinRoom(found.id);
      } else {
        alert(`Không tìm thấy phòng phù hợp với "${clean}". Vui lòng kiểm tra lại ID phòng hoặc mã mời.`);
      }
    }
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
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn phòng "${roomName}" không? Toàn bộ lịch sử tin nhắn sẽ bị xóa vĩnh viễn.`,
      confirmText: 'Xóa Phòng',
      cancelText: 'Hủy bỏ',
      isDanger: true,
      onConfirm: () => {
        setActionModal(prev => ({ ...prev, isOpen: false }));
        chatBridge.deleteRoom(roomId);
      }
    });
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
        setMessages([]);
        setMembers([]);
      }
    });
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
          <div className="pulse" style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <Logo size={64} />
          </div>
          <h3 style={{ color: 'var(--text-header)', margin: '16px 0 8px' }}>LTMANG CHAT</h3>
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
      {/* 1. Mất kết nối TCP tới ChatServer (cổng 5000) */}
      {!isTcpConnected && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#da373c',
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
              color: '#da373c',
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

      {/* 2. Mất kết nối luồng sự kiện SSE giữa Trình duyệt và Web Bridge (localhost:8080) */}
      {isTcpConnected && !isStreamConnected && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#f0b232',
          color: '#1e1f22',
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
        onInvite={handleInvite}
        onLeaveRoom={handleLeave}
      />

      {/* CỘT 3: Trung tâm Chat, Tin nhắn & Lịch sử */}
      <ChatCenter
        currentRoom={currentRoom}
        messages={messages}
        members={members}
        currentUserId={currentUser ? currentUser.id : 0}
        currentUserRole={currentUserRole}
        isMemberListOpen={isMemberListOpen}
        onToggleMemberList={() => setIsMemberListOpen(prev => !prev)}
        onSendMessage={handleSendMessage}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onLoadMore={handleLoadMore}
        onInvite={handleInvite}
        onKick={handleKick}
        onLeave={handleLeave}
        isOwner={isOwner}
      />

      {/* CỘT 4: Thành viên phòng (Trực tuyến & Ngoại tuyến - Có thể toggle ẩn/hiện bằng nút Users ở header) */}
      {isMemberListOpen && (
        <MemberSidebar
          members={members}
          currentUserId={currentUser?.id}
          currentUserRole={currentUserRole}
          onDirectMessage={handleDirectMessage}
          onSetMemberRole={handleSetMemberRole}
          onTransferOwner={handleTransferOwner}
          onKickMember={handleKickMember}
        />
      )}

      {/* Modal Tạo Máy Chủ Chuẩn Discord */}
      <CreateServerModal
        isOpen={isCreateServerOpen}
        onClose={() => setIsCreateServerOpen(false)}
        onCreateRoom={handleModalCreateRoom}
        onJoinRoom={handleModalJoinRoom}
        currentUserName={currentUser?.displayName || currentUser?.username}
      />

      {/* Modal Xác nhận Thao tác chung (Rời phòng, Xóa tin nhắn, Xóa phòng, Kick, Đổi quyền) */}
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

      {/* Modal Xác nhận Đăng xuất phong cách Discord */}
      <ConfirmModal
        isOpen={isLogoutModalOpen}
        title="Đăng Xuất"
        message="Bạn có chắc chắn muốn đăng xuất khỏi Discord Mini không?"
        confirmText="Đăng Xuất"
        cancelText="Hủy bỏ"
        isDanger={true}
        isLoading={isLoggingOut}
        errorMessage={logoutError}
        onConfirm={handleConfirmLogout}
        onCancel={() => {
          setIsLogoutModalOpen(false);
          setLogoutError('');
        }}
      />
    </div>
  );
};

export default App;
