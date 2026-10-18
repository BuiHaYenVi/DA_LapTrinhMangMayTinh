import React from 'react';
import type { Room } from '../types/chat';
import { MessageSquare } from 'lucide-react';

interface AppTitlebarProps {
  currentRoom: Room | null;
  isDirectMessageMode: boolean;
  isTcpConnected: boolean;
  isStreamConnected: boolean;
  pingMs?: number;
  onToggleRoomMenu?: () => void;
}

export const AppTitlebar: React.FC<AppTitlebarProps> = ({
  currentRoom,
  isDirectMessageMode,
  isTcpConnected,
  isStreamConnected,
  pingMs = 24,
  onToggleRoomMenu,
}) => {
  const isReconnecting = isTcpConnected && !isStreamConnected;

  let connectionLabel = 'Đã kết nối, độ trễ ' + pingMs + ' mili giây';
  let connectionText = `${pingMs}ms`;
  let connectionDotClass = 'connected';

  if (!isTcpConnected) {
    connectionLabel = 'Mất kết nối máy chủ chat';
    connectionText = 'Mất kết nối';
    connectionDotClass = 'disconnected';
  } else if (isReconnecting) {
    connectionLabel = 'Đang kết nối lại luồng sự kiện';
    connectionText = 'Đang nối...';
    connectionDotClass = 'reconnecting';
  }

  const hasRoom = !isDirectMessageMode && currentRoom !== null;

  return (
    <header className="app-titlebar">
      {/* 1. Bên trái: Để trống cân đối */}
      <div className="titlebar-left" />

      {/* 2. Ở giữa: Avatar và Tên phòng (hoặc Trang chủ khi chưa chọn phòng) */}
      <div className="titlebar-center">
        {hasRoom ? (
          <div
            className={`titlebar-center-target ${onToggleRoomMenu ? 'clickable' : ''}`}
            onClick={onToggleRoomMenu}
            role={onToggleRoomMenu ? 'button' : undefined}
            tabIndex={onToggleRoomMenu ? 0 : undefined}
            aria-label={`Phòng ${currentRoom.name}`}
            onKeyDown={(e) => {
              if (onToggleRoomMenu && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onToggleRoomMenu();
              }
            }}
          >
            <div
              className="titlebar-room-avatar"
              aria-hidden="true"
            >
              {currentRoom.name ? currentRoom.name.trim().charAt(0).toUpperCase() : 'P'}
            </div>
            <span
              className="titlebar-room-name"
              title={currentRoom.name}
            >
              {currentRoom.name}
            </span>
          </div>
        ) : (
          <div className="titlebar-center-target">
            <div className="titlebar-home-avatar" aria-hidden="true">
              <MessageSquare size={13} color="var(--on-accent)" />
            </div>
            <span
              className="titlebar-room-name"
              title="Trang chủ"
            >
              Huddle
            </span>
          </div>
        )}
      </div>

      {/* 3. Bên phải: Chỉ báo trạng thái kết nối có chức năng thật */}
      <div className="titlebar-right">
        <div
          className="titlebar-connection-status"
          aria-label={connectionLabel}
          title={connectionLabel}
        >
          <span
            className={`status-indicator-dot ${connectionDotClass}`}
            aria-hidden="true"
          />
          <span className="status-ping-text">{connectionText}</span>
        </div>
      </div>
    </header>
  );
};
