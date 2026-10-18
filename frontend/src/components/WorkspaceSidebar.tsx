import React from 'react';
import type { Room } from '../types/chat';
import { RoomRail } from './rail/RoomRail';

export { getRoomAcronym } from './rail/RoomRailItem';

interface Props {
  rooms: Room[];
  currentRoom: Room | null;
  isDirectMessageMode: boolean;
  unreadMap?: Record<number, number>;
  mutedRooms?: Set<number>;
  currentUserRole?: string;
  isOwner?: boolean;
  onDirectMessageClick: () => void;
  onSelectRoom: (room: Room) => void;
  onCreateRoom: () => void;
  onMarkAsRead?: (roomId: number) => void;
  onToggleMute?: (roomId: number) => void;
  onInvite?: (room: Room) => void;
  onOpenSettings?: (room: Room) => void;
  onCreateChannel?: (room: Room) => void;
  onLeaveRoom?: (room: Room) => void;
}

/**
 * WorkspaceSidebar đóng vai trò tương thích ngược và chuyển tiếp sang RoomRail chuẩn mới.
 * Toàn bộ hàm tạo màu theo hash (ROOM_PALETTE, getRoomColor) đã được gỡ bỏ hoàn toàn.
 */
export const WorkspaceSidebar: React.FC<Props> = ({
  rooms,
  currentRoom,
  isDirectMessageMode,
  unreadMap = {},
  mutedRooms = new Set(),
  currentUserRole,
  isOwner = false,
  onDirectMessageClick,
  onSelectRoom,
  onCreateRoom,
  onMarkAsRead = () => {},
  onToggleMute = () => {},
  onInvite = () => {},
  onOpenSettings,
  onCreateChannel,
  onLeaveRoom = () => {}
}) => {
  return (
    <RoomRail
      rooms={rooms}
      currentRoom={currentRoom}
      isDirectMessageMode={isDirectMessageMode}
      unreadMap={unreadMap}
      mutedRooms={mutedRooms}
      currentUserRole={currentUserRole}
      isOwner={isOwner}
      onDirectMessageClick={onDirectMessageClick}
      onSelectRoom={onSelectRoom}
      onCreateRoom={onCreateRoom}
      onMarkAsRead={onMarkAsRead}
      onToggleMute={onToggleMute}
      onInvite={onInvite}
      onOpenSettings={onOpenSettings}
      onCreateChannel={onCreateChannel}
      onLeaveRoom={onLeaveRoom}
    />
  );
};

export default WorkspaceSidebar;
