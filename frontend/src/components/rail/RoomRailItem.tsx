import React, { useRef } from 'react';
import type { Room } from '../../types/chat';
import { RailTooltip } from './RailTooltip';
import type { ContextMenuPosition } from './RoomContextMenu';

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
 * - An toàn với emoji và ký tự Unicode đa byte qua Array.from.
 */
export function getRoomAcronym(name?: string): string {
  if (!name || !name.trim()) return '?';
  const trimmed = name.trim();
  const chars = Array.from(trimmed);
  const firstChar = chars[0];

  // Kiểm tra nếu ký tự đầu là emoji / Extended_Pictographic
  if (/\p{Extended_Pictographic}/u.test(firstChar)) {
    return firstChar;
  }

  // Tách từ theo khoảng trắng
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
  const hasUnread = unreadCount > 0 && !isMuted;
  const acronym = getRoomAcronym(room.name);

  // Xử lý mở context menu bằng chuột phải
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(room, { x: e.clientX, y: e.clientY });
  };

  // Hỗ trợ mở menu bằng bàn phím: phím Menu (ContextMenu) hoặc Shift+F10
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
      {/* Vạch chỉ báo mép trái (Pill Marker): 0px / 8px unread / 20px hover / 40px active */}
      <span className="rail-pill-marker" aria-hidden="true" />

      <RailTooltip text={room.name}>
        <button
          ref={buttonRef}
          type="button"
          className={`rail-btn room-rail-btn ${isSelected ? 'active' : ''}`}
          onClick={() => onSelect(room)}
          onContextMenu={handleContextMenu}
          onKeyDown={handleKeyDown}
          aria-label={`Phòng ${room.name}`}
          aria-current={isSelected ? 'true' : undefined}
        >
          <span className="room-acronym">{acronym}</span>

          {/* Huy hiệu tin chưa đọc (chỉ hiện khi có tin và phòng không bị tắt âm) */}
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
