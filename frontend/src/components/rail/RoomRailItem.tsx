import React, { useRef } from 'react';
import type { Room } from '../../types/chat';
import { RailTooltip } from './RailTooltip';
import type { ContextMenuPosition } from './RoomContextMenu';
import { chatBridge } from '../../services/chatBridge';

export const ROOM_CUSTOM_STORAGE_KEY = 'discord_mini_room_custom_v1';

export interface RoomCustomStyle {
  icon?: string;
  image?: string; // URL hoặc data URI ảnh biểu tượng máy chủ
  color?: string;
  bannerColor?: string;
  chatBackground?: string; // Tùy chỉnh màu nền riêng cho khu vực tin nhắn của phòng
}

export const ROOM_ICON_PRESETS = ['', '🚀', '🎮', '💻', '📚', '🎵', '🔥', '💎', '🌟', '☕', '🏆', '🎨'];
export const ROOM_COLOR_PRESETS = [
  '',
  '#2DD4BF',
  '#23A55A',
  '#EB459E',
  '#F59E0B',
  '#ED4245',
  '#8B5CF6',
  '#0EA5E9'
];

export const ROOM_BANNER_PRESETS = [
  '#1e1f22', // Đen khói (Discord Default)
  '#eb459f', // Hồng neon
  '#f23f43', // Đỏ rực
  '#f57b20', // Cam lửa
  '#fee75c', // Vàng hoàng kim
  '#9b59b6', // Tím thạch anh
  '#00a8fc', // Xanh lam
  '#57f287', // Xanh lục
  '#4e5058'  // Xám than chì
];

export function getRoomCustomStyle(roomId?: number, roomName?: string): RoomCustomStyle {
  try {
    const raw = localStorage.getItem(ROOM_CUSTOM_STORAGE_KEY);
    if (!raw) return {};
    const map = JSON.parse(raw) as Record<string, RoomCustomStyle>;
    if (roomId && map[`id_${roomId}`]) return map[`id_${roomId}`];
    if (roomName && map[`name_${roomName.trim().toLowerCase()}`]) {
      return map[`name_${roomName.trim().toLowerCase()}`];
    }
  } catch {
    // ignore
  }
  return {};
}

export function saveRoomCustomStyle(roomId: number | undefined, roomName: string, style: RoomCustomStyle): void {
  try {
    const raw = localStorage.getItem(ROOM_CUSTOM_STORAGE_KEY);
    const map: Record<string, RoomCustomStyle> = raw ? JSON.parse(raw) : {};
    if (roomId && roomId > 0) {
      map[`id_${roomId}`] = style;
    }
    if (roomName && roomName.trim()) {
      map[`name_${roomName.trim().toLowerCase()}`] = style;
    }
    localStorage.setItem(ROOM_CUSTOM_STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('room_custom_updated'));
  } catch {
    // ignore
  }
}

interface Props {
  room: Room;
  isSelected: boolean;
  unreadCount: number;
  isMuted: boolean;
  onSelect: (room: Room) => void;
  onContextMenu: (room: Room, position: ContextMenuPosition) => void;
}

/**
 * Trích xuất ký tự hiển thị trong nút phòng:
 * - Tối đa 2 ký tự đầu của 2 từ đầu tiên (viết hoa). Ví dụ: "Học tập" -> "HT", "Phòng chat" -> "PC"
 * - Nếu tên bắt đầu bằng emoji thì CHỈ hiện emoji đó.
 */
export function getRoomAcronym(name?: string): string {
  if (!name || !name.trim()) return '?';
  const trimmed = name.trim();
  const chars = Array.from(trimmed);
  const firstChar = chars[0];

  if (/\p{Extended_Pictographic}/u.test(firstChar)) {
    return firstChar;
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const c1 = Array.from(words[0])[0]?.toUpperCase() || '';
    const c2 = Array.from(words[1])[0]?.toUpperCase() || '';
    return `${c1}${c2}`;
  }

  if (words.length === 1) {
    const letters = Array.from(words[0]);
    return letters[0]?.toUpperCase() || '?';
  }

  return '?';
}

export const RoomRailItem: React.FC<Props> = ({
  room,
  isSelected,
  unreadCount,
  isMuted,
  onSelect,
  onContextMenu
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [, setCustomTick] = React.useState(0);

  React.useEffect(() => {
    const handleUpdate = () => setCustomTick(t => t + 1);
    window.addEventListener('room_custom_updated', handleUpdate);

    // Lắng nghe cập nhật ảnh avatar phòng từ server SSE theo thời gian thực
    const unsubscribeAvatar = chatBridge.subscribe((event: string, data: any) => {
      if (event !== 'ROOM_AVATAR_UPDATED') return;
      if (data && data.roomId === room.id) {
        const curStyle = getRoomCustomStyle(room.id, room.name);
        saveRoomCustomStyle(room.id, room.name, {
          ...curStyle,
          image: data.avatarUrl ? data.avatarUrl : undefined
        });
        setCustomTick(t => t + 1);
      }
    });

    return () => {
      window.removeEventListener('room_custom_updated', handleUpdate);
      unsubscribeAvatar();
    };
  }, [room.id, room.name]);

  const hasUnread = unreadCount > 0 && !isMuted;
  const customStyle = getRoomCustomStyle(room.id, room.name);
  const acronym = customStyle.icon || getRoomAcronym(room.name);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(room, { x: e.clientX, y: e.clientY });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
      e.preventDefault();
      e.stopPropagation();
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        onContextMenu(room, { x: rect.right + 8, y: rect.top });
      }
    }
  };

  return (
    <div className={`rail-item-wrapper ${isSelected ? 'active' : ''} ${hasUnread ? 'has-unread' : ''}`}>
      <span className="rail-pill-marker" aria-hidden="true" />

      <RailTooltip text={room.name}>
        <button
          ref={buttonRef}
          type="button"
          className={`rail-btn room-rail-btn ${isSelected ? 'active' : ''}`}
          style={customStyle.color ? { backgroundColor: customStyle.color, color: '#ffffff' } : undefined}
          onClick={(e) => {
            (e.currentTarget as HTMLElement).blur();
            onSelect(room);
          }}
          onContextMenu={handleContextMenu}
          onKeyDown={handleKeyDown}
          aria-label={`Phòng ${room.name}`}
          aria-current={isSelected ? 'true' : undefined}
        >
          {customStyle.image ? (
            <img
              src={customStyle.image}
              alt={room.name}
              className="room-rail-avatar-img"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 'inherit',
                display: 'block'
              }}
            />
          ) : (
            <span className="room-acronym" style={customStyle.icon ? { fontSize: '20px' } : undefined}>
              {acronym}
            </span>
          )}

          {hasUnread && (
            <span className="rail-unread-badge" aria-label={`${unreadCount} tin chưa đọc`}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </RailTooltip>
    </div>
  );
};
