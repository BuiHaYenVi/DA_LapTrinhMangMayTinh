import React from 'react';
import type { Room, User } from '../types/chat';
import { Hash, Plus, Mic, Headphones, Settings, ChevronDown, LogOut } from 'lucide-react';

interface Props {
  rooms: Room[];
  currentRoom: Room | null;
  currentUser: User | null;
  onSelectRoom: (room: Room) => void;
  onCreateRoom: () => void;
  onLogout?: () => void;
}

export const RoomSidebar: React.FC<Props> = ({
  rooms,
  currentRoom,
  currentUser,
  onSelectRoom,
  onCreateRoom,
  onLogout
}) => {
  const [isMuted, setIsMuted] = React.useState(false);
  const [isDeafened, setIsDeafened] = React.useState(false);

  return (
    <div className="room-sidebar">
      {/* Server Header Dropdown */}
      <div className="server-header" onClick={onCreateRoom} title="Nhấn để tạo thêm phòng" style={{ cursor: 'pointer' }}>
        <span>LTMang ▾</span>
        <ChevronDown size={18} />
      </div>

      {/* Channels Section */}
      <div className="room-section">
        <div className="section-title">
          <span>▾ PHÒNG CHAT</span>
          <button className="add-btn" title="Tạo phòng mới" onClick={onCreateRoom}>
            <Plus size={16} />
          </button>
        </div>

        {rooms.map(room => (
          <div
            key={room.id}
            className={`channel-item ${currentRoom?.id === room.id ? 'active' : ''}`}
            onClick={() => onSelectRoom(room)}
          >
            <Hash size={18} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {room.name}
            </span>
          </div>
        ))}

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
            title={isMuted ? "Bật Mic" : "Tắt Mic"}
            style={{ color: isMuted ? 'var(--accent-red)' : 'inherit' }}
            onClick={() => setIsMuted(!isMuted)}
          >
            <Mic size={16} />
          </button>
          <button 
            className="icon-btn" 
            title={isDeafened ? "Bật Âm thanh" : "Tắt Âm thanh"}
            style={{ color: isDeafened ? 'var(--accent-red)' : 'inherit' }}
            onClick={() => setIsDeafened(!isDeafened)}
          >
            <Headphones size={16} />
          </button>
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
    </div>
  );
};
