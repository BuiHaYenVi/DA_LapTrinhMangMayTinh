import React, { useState } from 'react';
import type { Room, User } from '../types/chat';
import { Hash, Plus, Settings, ChevronDown, LogOut, Copy, Check, Trash2 } from 'lucide-react';
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
  onLogout
}) => {
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [copied, setCopied] = useState(false);

  const openSettings = (room: Room, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRoom(room);
    setNewName(room.name);
    setNewDesc(room.description || '');
    setCopied(false);
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

  return (
    <div className="room-sidebar">
      {/* Server Header Dropdown */}
      <div className="server-header" onClick={onCreateRoom} title="Nhấn để tạo thêm phòng" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Logo size={24} withGlow={false} />
        <span style={{ fontWeight: 700 }}>LTMang Chat</span>
        <ChevronDown size={16} style={{ marginLeft: 'auto' }} />
      </div>

      {/* Channels Section */}
      <div className="room-section">
        <div className="section-title">
          <span>▾ PHÒNG CHAT</span>
          <button className="add-btn" title="Tạo phòng mới" onClick={onCreateRoom}>
            <Plus size={16} />
          </button>
        </div>

        {rooms.map(room => {
          const unread = unreadMap[room.id] || 0;
          const isManager = room.role === 'OWNER' || room.role === 'ADMIN';

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

              {isManager && (
                <button
                  className="icon-btn"
                  title="Quản lý phòng"
                  style={{ padding: 2, marginLeft: 4 }}
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

      {/* User Profile Bar ở đáy */}
      <div className="user-profile-bar">
        <div className="user-avatar-wrap">
          <div className="user-avatar-circle">
            {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="status-dot" />
        </div>

        <div className="user-info">
          <div className="name">{currentUser?.displayName || 'Người dùng'}</div>
          <div className="status">Trực tuyến</div>
        </div>

        <div className="user-actions">
          <button 
            className="icon-btn" 
            title="Cài đặt tài khoản"
            onClick={() => alert(`Tài khoản: ${currentUser?.displayName} (@${currentUser?.username})\nID: ${currentUser?.id}\nTrạng thái: Đang kết nối Socket TCP Server.`)}
          >
            <Settings size={16} />
          </button>
          {onLogout && (
            <button
              className="icon-btn logout-btn"
              title="Đăng xuất khỏi tài khoản"
              style={{ color: 'var(--accent-red)' }}
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
