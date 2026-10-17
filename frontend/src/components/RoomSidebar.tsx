import React, { useState, useRef, useEffect } from 'react';
import type { Room, User } from '../types/chat';
import { 
  Hash, Plus, Settings, ChevronDown, ChevronUp, LogOut, Copy, Check, Trash2, 
  Sparkles, UserPlus, FolderPlus, Calendar, LayoutGrid, Bell, Shield, Edit2, 
  Mic, MicOff, Headphones
} from 'lucide-react';
import { Logo } from './Logo';

interface Props {
  rooms: Room[];
  currentRoom: Room | null;
  currentUser: User | null;
  unreadMap?: Record<number, number>;
  onSelectRoom: (room: Room) => void;
  onCreateRoom: () => void;
  onRenameRoom?: (roomId: number, name: string) => void;
  onDeleteRoom?: (roomId: number) => void;
  onSetRoomDesc?: (roomId: number, description: string) => void;
  onLogout?: () => void;
  onInvite?: () => void;
  onLeaveRoom?: () => void;
}

export const RoomSidebar: React.FC<Props> = ({
  rooms,
  currentRoom,
  currentUser,
  unreadMap = {},
  onSelectRoom,
  onCreateRoom,
  onRenameRoom,
  onDeleteRoom,
  onSetRoomDesc,
  onLogout,
  onInvite,
  onLeaveRoom
}) => {
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [copied, setCopied] = useState(false);

  // Trạng thái Server Menu Dropdown
  const [isServerMenuOpen, setIsServerMenuOpen] = useState(false);
  const serverMenuRef = useRef<HTMLDivElement>(null);

  // Trạng thái Voice Controls (Mic & Tai nghe)
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

  // Đóng Server Menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (serverMenuRef.current && !serverMenuRef.current.contains(event.target as Node)) {
        setIsServerMenuOpen(false);
      }
    };
    if (isServerMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isServerMenuOpen]);

  const toggleMic = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMicMuted(prev => !prev);
  };

  const toggleDeafen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeafened(prev => {
      const next = !prev;
      if (next) setIsMicMuted(true); // Deafen thì tự tắt Mic
      return next;
    });
  };

  const openSettings = (room: Room, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRoom(room);
    setNewName(room.name);
    setNewDesc(room.description || '');
    setCopied(false);
    setIsServerMenuOpen(false);
  };

  const handleSaveSettings = () => {
    if (!editingRoom) return;
    if (newName.trim() && newName.trim() !== editingRoom.name && onRenameRoom) {
      onRenameRoom(editingRoom.id, newName.trim());
    }
    if (newDesc.trim() !== (editingRoom.description || '') && onSetRoomDesc) {
      onSetRoomDesc(editingRoom.id, newDesc.trim());
    }
    setEditingRoom(null);
  };

  const handleDelete = () => {
    if (!editingRoom) return;
    if (confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn phòng "${editingRoom.name}" không? Toàn bộ tin nhắn sẽ bị xóa.`)) {
      if (onDeleteRoom) {
        onDeleteRoom(editingRoom.id);
      }
      setEditingRoom(null);
    }
  };

  const handleCopyInvite = () => {
    if (!editingRoom) return;
    const inviteText = `discord-mini://join/${editingRoom.id}`;
    navigator.clipboard.writeText(inviteText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const serverTitle = currentRoom ? currentRoom.name : 'LTMang Chat';
  const isManager = currentRoom?.role === 'OWNER' || currentRoom?.role === 'ADMIN';

  return (
    <div className="room-sidebar">
      {/* 1. Server Header Dropdown (Chuẩn Discord thật) */}
      <div 
        ref={serverMenuRef}
        className={`server-header ${isServerMenuOpen ? 'open' : ''}`} 
        onClick={() => setIsServerMenuOpen(!isServerMenuOpen)}
        title="Menu tùy chọn máy chủ"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          <Logo size={22} withGlow={false} />
          <span className="server-title-text">
            {serverTitle}
          </span>
        </div>
        {isServerMenuOpen ? (
          <ChevronUp size={18} className="server-chevron" />
        ) : (
          <ChevronDown size={18} className="server-chevron" />
        )}

        {/* Dropdown Menu Popup nổi lên trên danh sách phòng */}
        {isServerMenuOpen && (
          <div className="server-dropdown-menu" onClick={e => e.stopPropagation()}>
            <div 
              className="dropdown-item boost" 
              onClick={() => {
                setIsServerMenuOpen(false);
                alert(`✨ Máy chủ "${serverTitle}" hiện đang ở Level 1! Cần thêm 2 Boost để mở khóa 1080p 60fps & 50 slots emoji.`);
              }}
            >
              <span>Nâng Cấp Máy Chủ</span>
              <Sparkles size={16} color="#ff73fa" />
            </div>

            <div 
              className="dropdown-item blurple" 
              onClick={() => {
                setIsServerMenuOpen(false);
                if (onInvite) onInvite();
                else if (currentRoom) {
                  navigator.clipboard.writeText(`discord-mini://join/${currentRoom.id}`);
                  alert(`Đã sao chép liên kết mời vào phòng #${currentRoom.name}!`);
                }
              }}
            >
              <span>Mời Vào Máy Chủ</span>
              <UserPlus size={16} color="var(--accent-blurple)" />
            </div>

            {isManager && currentRoom && (
              <div 
                className="dropdown-item" 
                onClick={(e) => openSettings(currentRoom, e)}
              >
                <span>Cài đặt máy chủ</span>
                <Settings size={16} />
              </div>
            )}

            <div 
              className="dropdown-item" 
              onClick={() => {
                setIsServerMenuOpen(false);
                onCreateRoom();
              }}
            >
              <span>Tạo kênh</span>
              <Plus size={16} />
            </div>

            <div 
              className="dropdown-item" 
              onClick={() => {
                setIsServerMenuOpen(false);
                alert('Tạo danh mục mới: Tính năng nhóm các kênh chat theo chủ đề.');
              }}
            >
              <span>Tạo Danh Mục</span>
              <FolderPlus size={16} />
            </div>

            <div 
              className="dropdown-item" 
              onClick={() => {
                setIsServerMenuOpen(false);
                alert('Tạo sự kiện: Lên lịch cuộc họp hoặc buổi chơi game cùng các thành viên.');
              }}
            >
              <span>Tạo Sự kiện</span>
              <Calendar size={16} />
            </div>

            <div 
              className="dropdown-item" 
              onClick={() => {
                setIsServerMenuOpen(false);
                alert('Thư mục App: Khám phá các bot tự động, bot nhạc và minigame cho máy chủ.');
              }}
            >
              <span>Thư Mục App</span>
              <LayoutGrid size={16} />
            </div>

            <div className="dropdown-divider" />

            <div 
              className="dropdown-item" 
              onClick={() => {
                setIsServerMenuOpen(false);
                alert('Cài đặt thông báo: Đang nhận thông báo @tất_cả_tin_nhắn.');
              }}
            >
              <span>Cài đặt thông báo</span>
              <Bell size={16} />
            </div>

            <div 
              className="dropdown-item" 
              onClick={() => {
                setIsServerMenuOpen(false);
                alert('Cài đặt bảo mật: Mức độ kiểm duyệt 2FA và lọc nội dung độc hại tự động.');
              }}
            >
              <span>Cài Đặt Bảo Mật</span>
              <Shield size={16} />
            </div>

            <div className="dropdown-divider" />

            <div 
              className="dropdown-item" 
              onClick={() => {
                setIsServerMenuOpen(false);
                alert(`Chỉnh sửa biệt danh trong máy chủ: ${currentUser?.displayName}`);
              }}
            >
              <span>Chỉnh Sửa Hồ Sơ Theo Máy Chủ</span>
              <Edit2 size={16} />
            </div>

            {currentRoom && onLeaveRoom && (
              <div 
                className="dropdown-item danger" 
                onClick={() => {
                  setIsServerMenuOpen(false);
                  onLeaveRoom();
                }}
              >
                <span>Rời Khỏi Máy Chủ</span>
                <LogOut size={16} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Channels Section */}
      <div className="room-section">
        <div className="section-title">
          <span>▾ KÊNH CHAT</span>
          <button className="add-btn" title="Tạo kênh mới" onClick={onCreateRoom}>
            <Plus size={16} />
          </button>
        </div>

        {rooms.map(room => {
          const unread = unreadMap[room.id] || 0;
          const isCurrentRoomManager = room.role === 'OWNER' || room.role === 'ADMIN';

          return (
            <div
              key={room.id}
              className={`channel-item ${currentRoom?.id === room.id ? 'active' : ''}`}
              onClick={() => onSelectRoom(room)}
            >
              <Hash size={18} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {room.name}
              </span>

              {unread > 0 && currentRoom?.id !== room.id && (
                <span className="unread-badge">{unread > 99 ? '99+' : unread}</span>
              )}

              {isCurrentRoomManager && (
                <button
                  className="icon-btn channel-settings-btn"
                  title="Quản lý kênh"
                  onClick={(e) => openSettings(room, e)}
                >
                  <Settings size={14} />
                </button>
              )}
            </div>
          );
        })}

        {rooms.length === 0 && (
          <div style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Chưa có phòng chat nào.
          </div>
        )}
      </div>

      {/* 3. User Profile Bar ở đáy (Chuẩn Discord: Avatar, Tên, Trạng thái, Mic, Tai nghe, Cài đặt) */}
      <div className="user-profile-bar">
        <div className="user-avatar-wrap">
          <div className="user-avatar-circle">
            {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="status-dot" title="Trực tuyến" />
        </div>

        <div className="user-info">
          <div className="name" title={currentUser?.displayName || 'Người dùng'}>
            {currentUser?.displayName || 'Người dùng'}
          </div>
          <div className="status">Trực tuyến</div>
        </div>

        <div className="user-actions">
          {/* Nút Micro */}
          <button 
            className={`user-control-btn ${isMicMuted ? 'muted' : ''}`}
            title={isMicMuted ? 'Bật Mic' : 'Tắt tiếng Mic'}
            onClick={toggleMic}
          >
            {isMicMuted ? <MicOff size={18} color="var(--accent-red)" /> : <Mic size={18} />}
          </button>

          {/* Nút Tai nghe (Deafen) */}
          <button 
            className={`user-control-btn ${isDeafened ? 'muted' : ''}`}
            title={isDeafened ? 'Bật âm thanh' : 'Tắt toàn bộ âm thanh'}
            onClick={toggleDeafen}
          >
            {isDeafened ? <Headphones size={18} color="var(--accent-red)" /> : <Headphones size={18} />}
          </button>

          {/* Nút Cài đặt */}
          <button 
            className="user-control-btn" 
            title="Cài đặt người dùng"
            onClick={() => alert(`Cài đặt tài khoản:\n• Tên hiển thị: ${currentUser?.displayName}\n• Tên đăng nhập: @${currentUser?.username}\n• ID người dùng: #${currentUser?.id}\n• Trạng thái: Trực tuyến (Đã xác thực Socket TCP)`)}
          >
            <Settings size={18} />
          </button>

          {onLogout && (
            <button
              className="user-control-btn logout"
              title="Đăng xuất khỏi tài khoản"
              onClick={onLogout}
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Modal Quản lý Phòng chat */}
      {editingRoom && (
        <div className="modal-backdrop" onClick={() => setEditingRoom(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Cài đặt kênh #{editingRoom.name}</div>

            <div className="modal-field">
              <label>Tên phòng</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nhập tên phòng mới..."
              />
            </div>

            <div className="modal-field">
              <label>Mô tả phòng</label>
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Nhập mô tả chủ đề của phòng chat..."
                rows={3}
              />
            </div>

            <div className="modal-field">
              <label>Mã mời / Đường dẫn tham gia</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  readOnly
                  value={`discord-mini://join/${editingRoom.id}`}
                  style={{ flex: 1, color: 'var(--text-muted)' }}
                />
                <button
                  type="button"
                  className="header-btn blurple"
                  onClick={handleCopyInvite}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <button
                type="button"
                className="header-btn red"
                onClick={handleDelete}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Trash2 size={14} />
                <span>Xóa phòng</span>
              </button>

              <div className="modal-footer" style={{ margin: 0 }}>
                <button className="btn-cancel" onClick={() => setEditingRoom(null)}>Hủy</button>
                <button className="btn-primary" onClick={handleSaveSettings}>Lưu thay đổi</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
