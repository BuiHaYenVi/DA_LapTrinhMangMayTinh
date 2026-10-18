import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { Room } from '../../types/chat';
import { 
  CheckCheck, UserPlus, BellOff, Bell, 
  Settings, Hash, LogOut, Trash2
} from 'lucide-react';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}

interface Props {
  room: Room;
  position: ContextMenuPosition;
  unreadCount: number;
  isMuted: boolean;
  currentUserRole?: string;
  isOwner: boolean;
  onClose: () => void;
  onMarkAsRead: (roomId: number) => void;
  onInvite: (room: Room) => void;
  onToggleMute: (roomId: number) => void;
  onOpenSettings?: (room: Room) => void;
  onCreateChannel?: (room: Room) => void;
  onLeaveRoom: (room: Room) => void;
  onDeleteRoom?: (room: Room) => void;
}

export const RoomContextMenu: React.FC<Props> = ({
  room,
  position,
  unreadCount,
  isMuted,
  currentUserRole,
  isOwner,
  onClose,
  onMarkAsRead,
  onInvite,
  onToggleMute,
  onOpenSettings,
  onCreateChannel,
  onLeaveRoom,
  onDeleteRoom
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const isRoomOwner = Boolean(isOwner || room.role === 'OWNER');
  const isManager = Boolean(isRoomOwner || room.role === 'ADMIN' || currentUserRole === 'ADMIN');

  const adjustedStyle = useMemo(() => {
    const menuWidth = 220;
    const menuHeight = isManager ? 290 : 190;
    const margin = 12;

    let x = position.x;
    let y = position.y;

    if (x + menuWidth > window.innerWidth - margin) {
      x = window.innerWidth - menuWidth - margin;
    }
    if (x < margin) x = margin;

    if (y + menuHeight > window.innerHeight - margin) {
      y = window.innerHeight - menuHeight - margin;
    }
    if (y < margin) y = margin;

    return {
      top: `${y}px`,
      left: `${x}px`,
    };
  }, [position, isManager]);

  const menuItems = useMemo<MenuItem[]>(() => {
    const items: MenuItem[] = [
      {
        id: 'mark_read',
        label: 'Đánh dấu đã đọc',
        icon: <CheckCheck size={16} />,
        disabled: unreadCount <= 0,
        onClick: () => {
          onMarkAsRead(room.id);
          onClose();
        }
      },
      {
        id: 'invite',
        label: 'Mời vào phòng',
        icon: <UserPlus size={16} />,
        onClick: () => {
          onInvite(room);
          onClose();
        }
      },
      {
        id: 'mute',
        label: isMuted ? 'Bật thông báo phòng' : 'Tắt âm phòng',
        icon: isMuted ? <Bell size={16} /> : <BellOff size={16} />,
        onClick: () => {
          onToggleMute(room.id);
          onClose();
        }
      }
    ];

    if (isManager) {
      if (onOpenSettings) {
        items.push({
          id: 'settings',
          label: 'Cài đặt phòng',
          icon: <Settings size={16} />,
          onClick: () => {
            onOpenSettings(room);
            onClose();
          }
        });
      }
      if (onCreateChannel) {
        items.push({
          id: 'create_channel',
          label: 'Tạo kênh',
          icon: <Hash size={16} />,
          onClick: () => {
            onCreateChannel(room);
            onClose();
          }
        });
      }
    }

    if (isRoomOwner && onDeleteRoom) {
      items.push({
        id: 'delete_room',
        label: 'Xóa phòng',
        icon: <Trash2 size={16} />,
        danger: true,
        onClick: () => {
          onDeleteRoom(room);
          onClose();
        }
      });
    } else {
      items.push({
        id: 'leave',
        label: 'Rời phòng',
        icon: <LogOut size={16} />,
        danger: true,
        onClick: () => {
          onLeaveRoom(room);
          onClose();
        }
      });
    }

    return items;
  }, [
    room, unreadCount, isMuted, isManager, isRoomOwner,
    onMarkAsRead, onInvite, onToggleMute, onOpenSettings, onCreateChannel, onLeaveRoom, onDeleteRoom, onClose
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1 >= menuItems.length ? 0 : prev + 1));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 < 0 ? menuItems.length - 1 : prev - 1));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < menuItems.length) {
          const current = menuItems[activeIndex];
          if (!current.disabled) {
            current.onClick();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, menuItems, onClose]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleScrollOrResize = () => {
      onClose();
    };

    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="rail-context-menu"
      style={adjustedStyle}
      role="menu"
      tabIndex={-1}
      aria-label={`Tùy chọn phòng ${room.name}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="context-menu-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span className="context-menu-title" title={room.name}>{room.name}</span>
        <span className={`context-menu-role-tag ${isRoomOwner ? 'owner' : (currentUserRole === 'ADMIN' ? 'admin' : 'member')}`}>
          {isRoomOwner ? '👑 Chủ phòng' : (currentUserRole === 'ADMIN' ? '🛡️ Phó nhóm' : '👤 Thành viên')}
        </span>
      </div>

      <div className="context-menu-divider" />

      {menuItems.map((item, idx) => {
        const showDividerBefore = item.id === 'settings' || item.id === 'leave' || item.id === 'delete_room';
        return (
          <React.Fragment key={item.id}>
            {showDividerBefore && <div className="context-menu-divider" />}
            <button
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={`context-menu-item ${item.disabled ? 'disabled' : ''} ${item.danger ? 'danger' : ''} ${activeIndex === idx ? 'active' : ''}`}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={item.onClick}
            >
              <span className="context-item-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};
