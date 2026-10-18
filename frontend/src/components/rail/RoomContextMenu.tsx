import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { Room } from '../../types/chat';
import { 
  CheckCheck, UserPlus, BellOff, Bell, 
  Settings, Hash, LogOut 
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
  onLeaveRoom
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  // Chỉ hiện Cài đặt phòng và Tạo kênh cho chủ phòng hoặc vai trò ADMIN
  const isManager = isOwner || currentUserRole === 'OWNER' || currentUserRole === 'ADMIN' || room.role === 'OWNER' || room.role === 'ADMIN';

  // Định vị trí tránh tràn màn hình (Width 220px)
  const adjustedStyle = useMemo(() => {
    const menuWidth = 220;
    const menuHeight = isManager ? 270 : 180;
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

  // Danh sách các mục menu theo đúng yêu cầu
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

    return items;
  }, [
    room, unreadCount, isMuted, isManager,
    onMarkAsRead, onInvite, onToggleMute, onOpenSettings, onCreateChannel, onLeaveRoom, onClose
  ]);

  // Xử lý phím: Esc đóng, ArrowUp / ArrowDown chuyển item, Enter chọn
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => {
          const next = prev + 1 >= menuItems.length ? 0 : prev + 1;
          return next;
        });
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => {
          const next = prev - 1 < 0 ? menuItems.length - 1 : prev - 1;
          return next;
        });
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

  // Đóng khi nhấp ra ngoài
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [onClose]);

  return (
    <div 
      className="rail-context-menu" 
      ref={menuRef} 
      style={adjustedStyle}
      role="menu"
      tabIndex={-1}
    >
      <div className="context-menu-header">
        <span className="context-menu-title">{room.name}</span>
      </div>

      <div className="context-menu-divider" />

      {/* Nhóm 1: Thao tác thông thường */}
      <button
        type="button"
        className={`context-menu-item ${menuItems[0]?.disabled ? 'disabled' : ''} ${activeIndex === 0 ? 'active' : ''}`}
        disabled={menuItems[0]?.disabled}
        onClick={menuItems[0]?.onClick}
      >
        <span className="context-item-icon">{menuItems[0]?.icon}</span>
        <span>{menuItems[0]?.label}</span>
      </button>

      <button
        type="button"
        className={`context-menu-item ${activeIndex === 1 ? 'active' : ''}`}
        onClick={menuItems[1]?.onClick}
      >
        <span className="context-item-icon">{menuItems[1]?.icon}</span>
        <span>{menuItems[1]?.label}</span>
      </button>

      <button
        type="button"
        className={`context-menu-item ${activeIndex === 2 ? 'active' : ''}`}
        onClick={menuItems[2]?.onClick}
      >
        <span className="context-item-icon">{menuItems[2]?.icon}</span>
        <span>{menuItems[2]?.label}</span>
      </button>

      {/* Nhóm 2: Quyền quản trị (nếu có) */}
      {isManager && (
        <>
          <div className="context-menu-divider" />
          {menuItems.find(i => i.id === 'settings') && (
            <button
              type="button"
              className={`context-menu-item ${activeIndex === menuItems.findIndex(i => i.id === 'settings') ? 'active' : ''}`}
              onClick={menuItems.find(i => i.id === 'settings')?.onClick}
            >
              <span className="context-item-icon"><Settings size={16} /></span>
              <span>Cài đặt phòng</span>
            </button>
          )}
          {menuItems.find(i => i.id === 'create_channel') && (
            <button
              type="button"
              className={`context-menu-item ${activeIndex === menuItems.findIndex(i => i.id === 'create_channel') ? 'active' : ''}`}
              onClick={menuItems.find(i => i.id === 'create_channel')?.onClick}
            >
              <span className="context-item-icon"><Hash size={16} /></span>
              <span>Tạo kênh</span>
            </button>
          )}
        </>
      )}

      {/* Nhóm 3: Rời phòng */}
      <div className="context-menu-divider" />
      <button
        type="button"
        className={`context-menu-item danger ${activeIndex === menuItems.length - 1 ? 'active' : ''}`}
        onClick={menuItems[menuItems.length - 1]?.onClick}
      >
        <span className="context-item-icon"><LogOut size={16} /></span>
        <span>Rời phòng</span>
      </button>
    </div>
  );
};
