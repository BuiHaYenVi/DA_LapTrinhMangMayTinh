import React, { useEffect, useState } from 'react';
import type { User, Room, MessageItem, Friend, PendingFriendRequest } from './types/chat';
import { chatBridge } from './services/chatBridge';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { RoomSidebar } from './components/RoomSidebar';
import { ChatCenter } from './components/ChatCenter';
import { MemberSidebar } from './components/MemberSidebar';
import './styles/discord.css';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingFriendRequest[]>([]);
  const [_isConnected, setIsConnected] = useState<boolean>(true);

  // Subscribe Bridge Realtime Events from Java TCP Socket
  useEffect(() => {
    // 1. Initial State Load
    chatBridge.getInitialState().then(data => {
      if (data) {
        if (data.user) setCurrentUser(data.user);
        if (data.rooms) setRooms(data.rooms);
        if (data.currentRoom) setCurrentRoom(data.currentRoom);
        if (data.messages) setMessages(data.messages);
        if (data.members) setMembers(data.members);
        if (data.friends) setFriends(data.friends);
        if (data.pendingRequests) setPendingRequests(data.pendingRequests);
      }
    }).catch(err => {
      console.warn("Bridge connecting...", err);
    });

    // 2. Realtime SSE Events
    const unsubscribe = chatBridge.subscribe((event, payload) => {
      switch (event) {
        case 'STATUS':
          setIsConnected(payload.connected);
          break;
        case 'ROOMS':
          setRooms(payload.rooms);
          break;
        case 'ROOM_JOINED':
          setCurrentRoom(payload.room);
          setMessages([]);
          break;
        case 'NEW_MESSAGE':
          setMessages(prev => {
            if (payload.message && payload.message.id) {
              if (prev.some(m => m.id === payload.message.id)) {
                return prev;
              }
            }
            return [...prev, payload.message];
          });
          break;
        case 'HISTORY':
          setMessages(payload.messages || []);
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
        case 'ERROR':
          alert(payload.message || 'Đã xảy ra lỗi.');
          break;
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSelectRoom = (room: Room) => {
    chatBridge.joinRoom(room.id);
  };

  const handleCreateRoom = () => {
    const name = prompt('Nhập tên phòng chat mới:');
    if (name && name.trim()) {
      chatBridge.createRoom(name.trim());
    }
  };

  const handleSendMessage = (text: string) => {
    chatBridge.sendMessage(text);
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
    const input = prompt('Nhập ID người dùng muốn xóa (kick) khỏi phòng:');
    if (input && !isNaN(Number(input))) {
      chatBridge.kickMember(currentRoom.id, Number(input));
    }
  };

  const handleLeave = () => {
    if (confirm('Bạn có chắc chắn muốn rời phòng?')) {
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

  const handleAddFriend = () => {
    const input = prompt('Nhập Tên tài khoản (username) hoặc ID người dùng muốn kết bạn:');
    if (!input || !input.trim()) return;

    const trimmed = input.trim();
    if (!isNaN(Number(trimmed))) {
      chatBridge.sendFriendRequest(Number(trimmed));
    } else {
      // Tìm kiếm user theo username trước
      chatBridge.searchFriends(trimmed);
      alert(`Đang tìm kiếm người dùng "${trimmed}". Nếu người dùng tồn tại, yêu cầu sẽ được gửi!`);
    }
  };

  const isOwner = Boolean(
    members.find(m => m.id === currentUser?.id && m.role === 'OWNER')
  );

  return (
    <div className="app-container">
      {/* Cột 1: Dải Server/Guild */}
      <WorkspaceSidebar 
        onDirectMessage={() => setCurrentRoom(null)}
        onOpenExplore={() => alert("Khám phá máy chủ công khai")}
        onAddServer={handleCreateRoom}
      />

      {/* Cột 2: Kênh chat (#) */}
      <RoomSidebar 
        rooms={rooms}
        currentRoom={currentRoom}
        currentUser={currentUser}
        onSelectRoom={handleSelectRoom}
        onCreateRoom={handleCreateRoom}
      />

      {/* Cột 3: Trung tâm Chat */}
      <ChatCenter 
        currentRoom={currentRoom}
        messages={messages}
        currentUserId={currentUser?.id || 0}
        onSendMessage={handleSendMessage}
        onInvite={handleInvite}
        onLeave={handleLeave}
        onKick={handleKick}
        isOwner={isOwner}
      />

      {/* Cột 4: Thành viên & Bạn bè */}
      <MemberSidebar 
        members={members}
        friends={friends}
        pendingRequests={pendingRequests}
        onDirectMessage={handleDirectMessage}
        onAcceptFriend={reqId => chatBridge.acceptFriendRequest(reqId)}
        onRejectFriend={reqId => chatBridge.rejectFriendRequest(reqId)}
        onAddFriend={handleAddFriend}
        onRefreshFriends={() => chatBridge.refreshFriends()}
      />
    </div>
  );
};

export default App;
