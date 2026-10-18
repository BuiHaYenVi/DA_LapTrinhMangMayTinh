import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import type { Room } from '../../types/chat';
import { Logo } from '../Logo';
import { RoomRailItem } from './RoomRailItem';
import { RailTooltip } from './RailTooltip';
import { RoomContextMenu, type ContextMenuPosition } from './RoomContextMenu';

interface Props {
  rooms: Room[];
  currentRoom: Room | null;
  isDirectMessageMode: boolean;
  unreadMap: Record<number, number>;
  mutedRooms: Set<number>;
  currentUserRole?: string;
  isOwner?: boolean;
  onDirectMessageClick: () => void;
  onSelectRoom: (room: Room) => void;
  onCreateRoom: () => void;
  onMarkAsRead: (roomId: number) => void;
  onToggleMute: (roomId: number) => void;
  onInvite: (room: Room) => void;
  onOpenSettings?: (room: Room) => void;
  onCreateChannel?: (room: Room) => void;
  onLeaveRoom: (room: Room) => void;
  onDeleteRoom?: (room: Room) => void;
}

export const RoomRail: React.FC<Props> = ({
  rooms,
  currentRoom,
  isDirectMessageMode,
  unreadMap,
  mutedRooms,
  currentUserRole,
  isOwner = false,
  onDirectMessageClick,
  onSelectRoom,
  onCreateRoom,
  onMarkAsRead,
  onToggleMute,
  onInvite,
  onOpenSettings,
  onCreateChannel,
  onLeaveRoom,
  onDeleteRoom
}) => {
  const [contextMenuState, setContextMenuState] = useState<{
    room: Room;
    position: ContextMenuPosition;
  } | null>(null);
  const [, setCustomStyleTick] = useState(0);

  useEffect(() => {
    const handleCustomUpdate = () => setCustomStyleTick(t => t + 1);
    window.addEventListener('room_custom_updated', handleCustomUpdate);
    return () => window.removeEventListener('room_custom_updated', handleCustomUpdate);
  }, []);

  const handleContextMenu = (room: Room, position: ContextMenuPosition) => {
    setContextMenuState({ room, position });
  };

  const handleCloseContextMenu = () => {
    setContextMenuState(null);
  };

  return (
    <nav className="room-rail-container" aria-label="Thanh máy chủ">
      {/* 1. Nút Trang chủ / Tin nhắn trực tiếp */}
      <div className={`rail-item-wrapper ${isDirectMessageMode ? 'active' : ''}`}>
        <span className="rail-pill-marker" aria-hidden="true" />
        <RailTooltip text="Tin nhắn trực tiếp">
          <button
            type="button"
            className={`rail-btn home-rail-btn ${isDirectMessageMode ? 'active' : ''}`}
            onClick={(e) => {
              (e.currentTarget as HTMLElement).blur();
              onDirectMessageClick();
            }}
            aria-label="Tin nhắn trực tiếp"
            aria-current={isDirectMessageMode ? 'true' : undefined}
          >
            <Logo size={28} withGlow={false} />
          </button>
        </RailTooltip>
      </div>

      {/* 2. Đường kẻ phân cách 32px */}
      <div className="rail-separator" aria-hidden="true" />

      {/* 3. Danh sách phòng (Tự cuộn dọc, ẩn thanh cuộn) */}
      <div className="rail-rooms-scroll">
        {rooms.map((room) => {
          const isSelected = !isDirectMessageMode && currentRoom?.id === room.id;
          const unreadCount = unreadMap[room.id] || 0;
          const isMuted = mutedRooms.has(room.id);

          return (
            <RoomRailItem
              key={room.id}
              room={room}
              isSelected={isSelected}
              unreadCount={unreadCount}
              isMuted={isMuted}
              onSelect={onSelectRoom}
              onContextMenu={handleContextMenu}
            />
          );
        })}
      </div>

      {/* 4. Nút "+" Tạo/tham gia phòng */}
      <div className="rail-item-wrapper rail-action-wrapper">
        <span className="rail-pill-marker" aria-hidden="true" />
        <RailTooltip text="Tạo phòng mới">
          <button
            type="button"
            className="rail-btn add-room-rail-btn"
            onClick={(e) => {
              (e.currentTarget as HTMLElement).blur();
              onCreateRoom();
            }}
            aria-label="Tạo phòng mới"
          >
            <Plus size={22} />
          </button>
        </RailTooltip>
      </div>

      {/* 5. Menu chuột phải trên biểu tượng phòng */}
      {contextMenuState && (
        <RoomContextMenu
          room={contextMenuState.room}
          position={contextMenuState.position}
          unreadCount={unreadMap[contextMenuState.room.id] || 0}
          isMuted={mutedRooms.has(contextMenuState.room.id)}
          currentUserRole={currentRoom?.id === contextMenuState.room.id ? currentUserRole : contextMenuState.room.role}
          isOwner={(currentRoom?.id === contextMenuState.room.id && isOwner) || contextMenuState.room.role === 'OWNER'}
          onClose={handleCloseContextMenu}
          onMarkAsRead={onMarkAsRead}
          onInvite={onInvite}
          onToggleMute={onToggleMute}
          onOpenSettings={onOpenSettings}
          onCreateChannel={onCreateChannel}
          onLeaveRoom={onLeaveRoom}
          onDeleteRoom={onDeleteRoom}
        />
      )}
    </nav>
  );
};
