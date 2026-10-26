import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { Friend } from '../types/chat';
import { 
  MessageSquare, User, UserPlus, X, Copy, 
  UserMinus, CheckCheck 
} from 'lucide-react';

export interface FriendContextMenuPosition {
  x: number;
  y: number;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  dividerBefore?: boolean;
  onClick: () => void;
}

interface Props {
  friend: Friend;
  position: FriendContextMenuPosition;
  isDirectSidebar?: boolean;
  onClose: () => void;
  onSelectDirectUser?: (friend: Friend) => void;
  onOpenProfile?: (friend: Friend) => void;
  onOpenInviteModal?: (friend: Friend) => void;
  onCloseConversation?: (friend: Friend) => void;
  onRemoveFriend: (friend: Friend) => void;
  onShowToast?: (msg: string) => void;
}

export const FriendContextMenu: React.FC<Props> = ({
  friend,
  position,
  isDirectSidebar = false,
  onClose,
  onSelectDirectUser,
  onOpenProfile,
  onOpenInviteModal,
  onCloseConversation,
  onRemoveFriend,
  onShowToast
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [copied, setCopied] = useState<boolean>(false);

  // Tính toán tọa độ menu tự động lùi vào trong viewport nếu chạm mép màn hình
  const adjustedStyle = useMemo(() => {
    const menuWidth = 220;
    const menuHeight = isDirectSidebar ? 250 : 210;
    const margin = 10;

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
  }, [position, isDirectSidebar]);

  // Đóng menu khi click ra ngoài hoặc bấm phím ESC
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Danh sách các hành động trong context menu phong cách Discord
  const menuItems = useMemo<MenuItem[]>(() => {
    const items: MenuItem[] = [
      {
        id: 'message',
        label: 'Nhắn tin',
        icon: <MessageSquare size={16} />,
        onClick: () => {
          if (onSelectDirectUser) onSelectDirectUser(friend);
          onClose();
        }
      },
      {
        id: 'profile',
        label: 'Hồ sơ',
        icon: <User size={16} />,
        onClick: () => {
          if (onOpenProfile) onOpenProfile(friend);
          onClose();
        }
      },
      {
        id: 'invite_to_server',
        label: 'Mời vào máy chủ',
        icon: <UserPlus size={16} />,
        onClick: () => {
          if (onOpenInviteModal) onOpenInviteModal(friend);
          onClose();
        }
      }
    ];

    if (isDirectSidebar && onCloseConversation) {
      items.push({
        id: 'close_dm',
        label: 'Đóng trò chuyện',
        icon: <X size={16} />,
        dividerBefore: true,
        onClick: () => {
          onCloseConversation(friend);
          onClose();
        }
      });
    }

    items.push({
      id: 'copy_username',
      label: copied ? 'Đã sao chép!' : 'Sao chép tên người dùng',
      icon: copied ? <CheckCheck size={16} color="var(--accent)" /> : <Copy size={16} />,
      dividerBefore: !isDirectSidebar,
      onClick: () => {
        navigator.clipboard.writeText(friend.username);
        setCopied(true);
        if (onShowToast) onShowToast(`Đã sao chép @${friend.username}`);
        setTimeout(() => {
          onClose();
        }, 250);
      }
    });

    items.push({
      id: 'remove_friend',
      label: 'Xóa Bạn',
      icon: <UserMinus size={16} />,
      danger: true,
      dividerBefore: true,
      onClick: () => {
        onRemoveFriend(friend);
        onClose();
      }
    });

    return items;
  }, [
    friend,
    isDirectSidebar,
    onSelectDirectUser,
    onOpenProfile,
    onOpenInviteModal,
    onCloseConversation,
    onRemoveFriend,
    onShowToast,
    onClose,
    copied
  ]);

  return (
    <div
      ref={menuRef}
      className="friend-context-menu rail-context-menu"
      style={adjustedStyle}
      role="menu"
      aria-label={`Tùy chọn cho bạn bè ${friend.displayName || friend.username}`}
      onClick={e => e.stopPropagation()}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Header nhỏ hiển thị tên bạn bè */}
      <div className="context-menu-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span className="context-menu-title" title={friend.displayName || friend.username}>
          {friend.displayName || friend.username}
        </span>
        <span className={`status-pill ${friend.online ? 'online' : 'offline'}`} style={{ fontSize: '11px', color: 'var(--text-3)' }}>
          {friend.online ? 'Trực tuyến' : 'Ngoại tuyến'}
        </span>
      </div>

      <div className="context-menu-divider" />

      {/* Danh sách các tùy chọn */}
      <div className="context-menu-list">
        {menuItems.map((item, idx) => (
          <React.Fragment key={item.id}>
            {item.dividerBefore && <div className="context-menu-divider" />}
            <button
              type="button"
              role="menuitem"
              className={`context-menu-item ${item.danger ? 'danger' : ''} ${activeIndex === idx ? 'active' : ''}`}
              onClick={item.onClick}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseLeave={() => setActiveIndex(-1)}
            >
              <span className="context-item-icon">{item.icon}</span>
              <span className="context-item-label">{item.label}</span>
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default FriendContextMenu;
