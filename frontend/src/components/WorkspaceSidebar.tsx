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

const ROOM_PALETTE = [
  '#5865F2', // Blurple
  '#3BA55C', // Green
  '#FAA81A', // Yellow/Gold
  '#ED4245', // Red
  '#EB459E', // Pink
  '#00A8FC', // Sky Blue
  '#57F287', // Lime
  '#E67E22', // Orange
];

export function getInitial(name: string): string {
  if (!name || !name.trim()) return '?';
  const trimmed = name.trim();
  const segments = Array.from(trimmed);
  return segments[0] || '?';
}

export function getRoomColor(roomId: number): string {
  const num = Math.abs(Number(roomId) || 0);
  return ROOM_PALETTE[num % ROOM_PALETTE.length];
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
          const initial = getInitial(room.name);
          const roomBg = getRoomColor(room.id);

          return (
            <div key={room.id} className={`workspace-pill-wrap ${isSelected ? 'active' : ''}`}>
              <span className="pill-marker" />
              <button
                type="button"
                className={`pill-item room-icon-pill ${isSelected ? 'active' : ''}`}
                title={room.name}
                onClick={() => onSelectRoom(room)}
                aria-label={`Phòng ${room.name}`}
                style={{
                  backgroundColor: isSelected ? 'var(--accent)' : roomBg,
                  color: '#ffffff'
                }}
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
