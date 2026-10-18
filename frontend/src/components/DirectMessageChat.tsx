import React, { useState, useRef, useEffect } from 'react';
import type { Friend, User, MessageItem } from '../types/chat';
import { 
  Send, UserPlus, ArrowLeft, PlusCircle, Smile, RotateCw 
} from 'lucide-react';

interface Props {
  targetUser: Friend;
  currentUser: User | null;
  messages: MessageItem[];
  onSendMessage: (targetUserId: number, content: string) => void;
  onOpenInviteModal: (friend: Friend) => void;
  onBackToFriends: () => void;
}

// 1. Phân tích chuỗi ngày giờ thành Date
function parseMessageDate(timestamp?: string): Date | null {
  if (!timestamp) return null;
  if (timestamp.includes('-')) {
    const d = new Date(timestamp.replace(' ', 'T'));
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

// 2. Nhãn phân cách theo ngày (Hôm nay, Hôm qua, DD/MM/YYYY)
function getDateSeparatorLabel(timestamp?: string): string {
  const d = parseMessageDate(timestamp);
  if (!d) return 'Hôm nay';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const targetDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (targetDay.getTime() === today.getTime()) {
    return 'Hôm nay';
  }
  if (targetDay.getTime() === yesterday.getTime()) {
    return 'Hôm qua';
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// 3. Khóa ngày để so sánh giữa 2 tin nhắn
function getDateKey(timestamp?: string): string {
  const d = parseMessageDate(timestamp);
  if (d) {
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }
  return 'today';
}

// 4. Gom tin nhắn liên tiếp của cùng người gửi trong vòng 5 phút
function shouldGroupWithPrevious(
  current: MessageItem,
  previous: MessageItem | undefined,
  curDateKey: string,
  prevDateKey: string
): boolean {
  if (!previous) return false;
  if (current.senderId !== previous.senderId) return false;
  if (curDateKey !== prevDateKey) return false;

  const tCur = parseMessageDate(current.timestamp);
  const tPrev = parseMessageDate(previous.timestamp);
  if (tCur && tPrev) {
    const diffMs = Math.abs(tCur.getTime() - tPrev.getTime());
    return diffMs <= 5 * 60 * 1000;
  }
  if (current.timestamp && previous.timestamp && current.timestamp.length === 5 && previous.timestamp.length === 5) {
    const [h1, m1] = current.timestamp.split(':').map(Number);
    const [h2, m2] = previous.timestamp.split(':').map(Number);
    if (!isNaN(h1) && !isNaN(m1) && !isNaN(h2) && !isNaN(m2)) {
      const diffMinutes = Math.abs((h1 * 60 + m1) - (h2 * 60 + m2));
      return diffMinutes <= 5;
    }
  }
  return false;
}

export const DirectMessageChat: React.FC<Props> = ({
  targetUser,
  currentUser,
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
      <div className="chat-header-bar dm-header-bar">
        <div className="dm-header-left">
          {/* Mũi tên quay lại (ẩn trên màn hình rộng qua CSS) */}
          <button
            type="button"
            className="dm-back-btn"
            title="Quay lại danh sách bạn bè"
            aria-label="Quay lại danh sách bạn bè"
            onClick={onBackToFriends}
          >
            <ArrowLeft size={18} />
          </button>

          <div className="user-avatar-wrap" style={{ position: 'relative' }}>
            <div className="user-avatar-circle" style={{ width: '36px', height: '36px', fontSize: '14px' }}>
              {targetUser.displayName ? Array.from(targetUser.displayName.trim())[0]?.toUpperCase() : 'U'}
            </div>
            <div className={`status-dot ${targetUser.online ? '' : 'offline'}`} />
          </div>

          <div className="dm-header-meta">
            <span className="dm-header-name">
              {targetUser.displayName}
            </span>
            <span className="dm-header-sub">
              @{targetUser.username} • {targetUser.online ? 'Trực tuyến' : 'Ngoại tuyến'}
            </span>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="header-icon-btn dm-invite-header-btn"
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
        {/* Khối giới thiệu đầu cuộc trò chuyện gọn gàng */}
        <div className="dm-welcome-banner">
          <div className="dm-welcome-avatar">
            {targetUser.displayName ? Array.from(targetUser.displayName.trim())[0]?.toUpperCase() : 'U'}
          </div>
          <h2 className="dm-welcome-name">{targetUser.displayName}</h2>
          <div className="dm-welcome-username">@{targetUser.username}</div>
          <p className="dm-welcome-desc">
            Đây là phần đầu của lịch sử tin nhắn trực tiếp giữa bạn và <strong>{targetUser.displayName}</strong>.
          </p>
          <button
            type="button"
            className="dm-invite-subtle-btn"
            onClick={() => onOpenInviteModal(targetUser)}
            title={`Mời ${targetUser.displayName} vào một phòng chat`}
          >
            <UserPlus size={15} />
            <span>Mời vào phòng chat</span>
          </button>
        </div>

        {/* Danh sách tin nhắn có phân cách ngày và gộp tin liên tiếp */}
        {messages.map((msg, index) => {
          const isMe = Boolean(msg.isMe || (currentUser && msg.senderId === currentUser.id));
          const prevMsg = messages[index - 1];
          const curDateKey = getDateKey(msg.timestamp);
          const prevDateKey = prevMsg ? getDateKey(prevMsg.timestamp) : '';
          const showDateSep = index === 0 || curDateKey !== prevDateKey;
          const isGrouped = !showDateSep && shouldGroupWithPrevious(msg, prevMsg, curDateKey, prevDateKey);

          // Tên hiển thị: Tin của mình thì hiện tên thật thay vì 'Bạn'
          const authorName = isMe 
            ? (currentUser?.displayName || msg.senderName || 'Tôi')
            : (msg.senderName || targetUser.displayName);

          // Trạng thái gửi
          const isPending = msg.id < 0 || msg.status === 'sending';
          const isFailed = msg.status === 'failed';

          return (
            <React.Fragment key={msg.id || index}>
              {showDateSep && (
                <div className="date-separator">
                  <span className="date-separator-label">
                    {getDateSeparatorLabel(msg.timestamp)}
                  </span>
                </div>
              )}

              <div 
                className={`message-item dm-message-item ${isGrouped ? 'grouped' : ''} ${isMe ? 'mine' : ''} ${isPending ? 'pending' : ''} ${isFailed ? 'failed' : ''}`}
              >
                {!isGrouped ? (
                  <div className="user-avatar-wrap">
                    <div className={`user-avatar-circle ${isMe ? 'avatar-me' : ''}`} style={{ width: '36px', height: '36px', fontSize: '14px' }}>
                      {Array.from(authorName.trim())[0]?.toUpperCase() || 'U'}
                    </div>
                  </div>
                ) : (
                  <div className="msg-gutter-spacer" />
                )}

                <div className="msg-content-wrapper">
                  {!isGrouped && (
                    <div className="msg-header">
                      <span className="msg-author" style={{ color: isMe ? 'var(--accent)' : 'var(--text-1)' }}>
                        {authorName}
                      </span>
                      <span className="msg-timestamp">
                        {msg.timestamp || 'Vừa xong'}
                      </span>
                      {isPending && <span className="msg-sending-tag">(đang gửi...)</span>}
                    </div>
                  )}

                  <div className="msg-body">
                    {msg.content}
                    {msg.isEdited && <span className="edited-badge">(đã chỉnh sửa)</span>}
                  </div>

                  {isFailed && (
                    <div className="msg-error-row">
                      <span className="msg-error-text">Không thể gửi tin nhắn.</span>
                      <button
                        type="button"
                        className="msg-retry-btn"
                        onClick={() => onSendMessage(targetUser.id, msg.content)}
                      >
                        <RotateCw size={12} /> Thử lại
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* 3. Bottom Input Box bám đáy và rộng hết cột */}
      <div className="chat-input-container dm-input-container">
        <div className="chat-input-pill dm-input-pill">
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

export default DirectMessageChat;
