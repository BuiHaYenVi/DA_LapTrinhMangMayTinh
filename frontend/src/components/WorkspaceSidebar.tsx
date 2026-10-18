import React from 'react';
import { Plus } from 'lucide-react';
import type { Room } from '../types/chat';
import { Logo } from './Logo';

interface Props {
  rooms: Room[];
  currentRoom: Room | null;
  isDirectMessageMode: boolean;
  onDirectMessageClick: () => void;
  onSelectRoom: (room: Room) => void;
  onCreateRoom: () => void;
}

export const WorkspaceSidebar: React.FC<Props> = ({
  rooms,
  currentRoom,
  isDirectMessageMode,
  onDirectMessageClick,
  onSelectRoom,
  onCreateRoom
}) => {
  return (
    <nav className="workspace-strip" aria-label="Danh sách máy chủ">
      {/* 1. Nút Logo ở đầu: Tin nhắn trực tiếp / Trang chủ */}
      <div className={`workspace-pill-wrap ${isDirectMessageMode ? 'active' : ''}`}>
        <span className="pill-marker" />
        <button
          type="button"
          className={`pill-item ${isDirectMessageMode ? 'active' : ''}`}
          title="Tin nhắn trực tiếp"
          onClick={onDirectMessageClick}
          aria-label="Tin nhắn trực tiếp"
        >
          <Logo size={28} withGlow={false} />
        </button>
      </div>

      <div className="strip-separator" />

      {/* 2. Danh sách các Phòng / Máy chủ (Scrollable không lộ thanh cuộn) */}
      <div className="workspace-rooms-list">
        {rooms.map(room => {
          const isSelected = !isDirectMessageMode && currentRoom?.id === room.id;
          const initial = room.name ? room.name.trim().charAt(0).toUpperCase() : 'P';

          return (
            <div key={room.id} className={`workspace-pill-wrap ${isSelected ? 'active' : ''}`}>
              <span className="pill-marker" />
              <button
                type="button"
                className={`pill-item room-icon-pill ${isSelected ? 'active' : ''}`}
                title={room.name}
                onClick={() => onSelectRoom(room)}
                aria-label={`Phòng ${room.name}`}
              >
                <span className="room-initial-letter">{initial}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* 3. Nút "+" Tạo phòng (Thêm máy chủ) */}
      <div className="workspace-pill-wrap" style={{ marginTop: '4px' }}>
        <span className="pill-marker" />
        <button
          type="button"
          className="pill-item green"
          title="Tạo phòng mới"
          onClick={onCreateRoom}
          aria-label="Tạo phòng mới"
        >
          <Plus size={22} />
        </button>
      </div>
    </nav>
  );
};

export default WorkspaceSidebar;
