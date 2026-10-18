import React, { useState, useRef, useEffect } from 'react';
import type { Friend, User, MessageItem } from '../types/chat';
import { 
  Send, UserPlus, ArrowLeft, PlusCircle, Smile 
} from 'lucide-react';

interface Props {
  targetUser: Friend;
  currentUser: User | null;
  messages: MessageItem[];
  onSendMessage: (targetUserId: number, content: string) => void;
  onOpenInviteModal: (friend: Friend) => void;
  onBackToFriends: () => void;
}

export const DirectMessageChat: React.FC<Props> = ({
  targetUser,
  currentUser: _currentUser,
  messages,
  onSendMessage,
  onOpenInviteModal,
  onBackToFriends
}) => {
  const [inputText, setInputText] = useState('');
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Focus ô nhập khi mở cuộc trò chuyện
  useEffect(() => {
    inputRef.current?.focus();
    setInputText('');
  }, [targetUser.id]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(targetUser.id, inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-center-container dm-chat-container">
      {/* 1. Header Bar của DM Chat */}
      <div className="chat-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="dm-back-btn"
            title="Quay lại danh sách bạn bè"
            aria-label="Quay lại danh sách bạn bè"
            onClick={onBackToFriends}
          >
            <ArrowLeft size={18} />
          </button>

          <div className="user-avatar-wrap">
            <div className="user-avatar-circle">
              {targetUser.displayName ? targetUser.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className={`status-dot ${targetUser.online ? '' : 'offline'}`} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="channel-title" style={{ fontSize: '15px', fontWeight: 700 }}>
              {targetUser.displayName}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
              @{targetUser.username} • {targetUser.online ? 'Đang hoạt động' : 'Ngoại tuyến'}
            </span>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="header-icon-btn"
            title={`Mời ${targetUser.displayName} vào phòng chat`}
            aria-label={`Mời ${targetUser.displayName} vào phòng chat`}
            onClick={() => onOpenInviteModal(targetUser)}
          >
            <UserPlus size={18} />
          </button>
        </div>
      </div>

      {/* 2. Messages List */}
      <div className="chat-messages-scroll" ref={chatMessagesRef}>
        {/* Banner mở đầu cuộc trò chuyện */}
        <div className="dm-welcome-banner">
          <div className="dm-welcome-avatar">
            {targetUser.displayName ? targetUser.displayName.charAt(0).toUpperCase() : 'U'}
          </div>
          <h2 className="dm-welcome-name">{targetUser.displayName}</h2>
          <div className="dm-welcome-username">@{targetUser.username}</div>
          <p className="dm-welcome-desc">
            Đây là phần đầu của lịch sử tin nhắn trực tiếp giữa bạn và <strong>{targetUser.displayName}</strong>.
          </p>
          <button
            type="button"
            className="btn-accent"
            style={{ marginTop: '12px', padding: '7px 16px', fontSize: '13px' }}
            onClick={() => onOpenInviteModal(targetUser)}
          >
            <UserPlus size={15} style={{ marginRight: '6px' }} />
            Mời vào phòng chat
          </button>
        </div>

        <div className="date-separator">
          <span className="date-separator-label">Tin nhắn riêng</span>
        </div>

        {/* Danh sách tin nhắn */}
        {messages.map((msg, index) => {
          const isMe = msg.isMe;
          const prevMsg = messages[index - 1];
          const isSameSender = prevMsg && prevMsg.senderId === msg.senderId;

          return (
            <div 
              key={msg.id || index} 
              className={`message-item dm-message-item ${isSameSender ? 'grouped' : ''} ${isMe ? 'mine' : ''}`}
            >
              {!isSameSender && (
                <div className="user-avatar-wrap">
                  <div className={`user-avatar-circle ${isMe ? 'avatar-me' : ''}`}>
                    {msg.senderName ? msg.senderName.charAt(0).toUpperCase() : 'U'}
                  </div>
                </div>
              )}

              <div className="msg-content-wrapper">
                {!isSameSender && (
                  <div className="msg-header">
                    <span className="msg-author" style={{ color: isMe ? 'var(--accent)' : 'var(--text-1)' }}>
                      {isMe ? 'Bạn' : msg.senderName}
                    </span>
                    <span className="msg-timestamp">
                      {msg.timestamp || 'Vừa xong'}
                    </span>
                  </div>
                )}
                <div className="msg-body">
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Bottom Input Box */}
      <div className="chat-input-container">
        <div className="chat-input-pill">
          <button 
            type="button" 
            className="input-attach-btn" 
            title="Đính kèm tệp"
            aria-label="Đính kèm tệp"
          >
            <PlusCircle size={22} />
          </button>

          <input
            ref={inputRef}
            placeholder={`Gửi tin nhắn riêng tới @${targetUser.displayName}`}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <button 
            type="button" 
            className="input-emoji-btn" 
            title="Biểu cảm"
            aria-label="Biểu cảm"
          >
            <Smile size={22} />
          </button>

          <button 
            type="button"
            className="chat-send-btn" 
            title="Gửi tin nhắn riêng (Enter)"
            onClick={handleSend}
            disabled={!inputText.trim()}
            aria-label="Gửi tin nhắn riêng"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
