import React from 'react';
import type { Friend, User, MessageItem } from '../types/chat';
import { UserPlus, UserMinus, ArrowLeft } from 'lucide-react';
import { ChatMessageList } from './chat/ChatMessageList';
import { ChatComposer } from './chat/ChatComposer';

interface Props {
  targetUser: Friend;
  currentUser: User | null;
  messages: MessageItem[];
  onSendMessage: (targetUserId: number, content: string) => void;
  onEditMessage?: (messageId: number, content: string) => void;
  onDeleteMessage?: (messageId: number) => void;
  onOpenInviteModal: (friend: Friend) => void;
  onBackToFriends: () => void;
  onRemoveFriend?: (friendId: number) => void;
  onLoadMore?: (beforeId: number) => void;
}

export const DirectMessageChat: React.FC<Props> = ({
  targetUser,
  currentUser,
  messages,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onOpenInviteModal,
  onBackToFriends,
  onRemoveFriend,
  onLoadMore
}) => {
  const handleSend = (text: string) => {
    onSendMessage(targetUser.id, text);
  };

  const handleRetry = (msg: MessageItem) => {
    onSendMessage(targetUser.id, msg.content);
  };

  // Khối giới thiệu đầu cuộc trò chuyện gọn gàng theo đúng yêu cầu mục D
  const introComponent = (
    <div className="dm-intro-card">
      <div className="dm-intro-avatar">
        {Array.from(targetUser.displayName.trim())[0]?.toUpperCase() || 'U'}
      </div>
      <h2 className="dm-intro-title">{targetUser.displayName}</h2>
      <p className="dm-intro-handle">@{targetUser.username}</p>
      <p className="dm-intro-desc">
        Đây là phần đầu của lịch sử tin nhắn trực tiếp giữa bạn và <strong>{targetUser.displayName}</strong>.
      </p>

      <div className="dm-intro-actions">
        <button
          type="button"
          className="dm-subtle-btn"
          onClick={() => onOpenInviteModal(targetUser)}
          title="Mời bạn này vào phòng chat"
        >
          <UserPlus size={15} />
          <span>Mời vào phòng chat</span>
        </button>

        {onRemoveFriend && (
          <button
            type="button"
            className="dm-subtle-btn danger"
            onClick={() => onRemoveFriend(targetUser.id)}
            title="Hủy kết bạn với người dùng này"
          >
            <UserMinus size={15} />
            <span>Hủy kết bạn</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="dm-main-column">
      {/* 1. Header: 48px cố định */}
      <header className="dm-header">
        <div className="dm-header-left">
          <button
            type="button"
            className="dm-back-btn"
            onClick={onBackToFriends}
            title="Quay lại danh sách bạn bè"
            aria-label="Quay lại"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="user-avatar-wrap">
            <div className="user-avatar-circle" style={{ width: '34px', height: '34px', fontSize: '14px' }}>
              {Array.from(targetUser.displayName.trim())[0]?.toUpperCase() || 'U'}
            </div>
            <span className={`status-indicator-dot ${targetUser.online ? 'status-online' : 'status-offline'}`} />
          </div>

          <div className="dm-header-meta">
            <div className="dm-header-name">{targetUser.displayName}</div>
            <div className="dm-header-sub">
              <span>@{targetUser.username}</span>
              <span className="dm-sub-divider">•</span>
              <span className={targetUser.online ? 'status-text-online' : 'status-text-offline'}>
                {targetUser.online ? 'Trực tuyến' : 'Ngoại tuyến'}
              </span>
            </div>
          </div>
        </div>

        <div className="dm-header-right">
          <button
            type="button"
            className="dm-header-action-btn"
            title="Mời vào phòng chat"
            onClick={() => onOpenInviteModal(targetUser)}
          >
            <UserPlus size={18} />
            <span className="dm-header-action-text">Mời vào phòng</span>
          </button>
        </div>
      </header>

      {/* 2. Danh sách tin nhắn dùng chung (hỗ trợ Sửa & Xóa tin nhắn riêng tư) */}
      <ChatMessageList
        messages={messages}
        currentUserId={currentUser?.id || 0}
        currentUserName={currentUser?.displayName || 'Tôi'}
        introComponent={introComponent}
        onRetryMessage={handleRetry}
        onEditMessage={onEditMessage}
        onDeleteMessage={onDeleteMessage}
        onLoadMore={onLoadMore}
      />

      {/* 3. Ô nhập tin nhắn luôn bám đáy (có Emoji & Sticker) */}
      <ChatComposer
        placeholder={`Nhắn tin cho @${targetUser.displayName}`}
        onSendMessage={handleSend}
      />
    </div>
  );
};

export default DirectMessageChat;
