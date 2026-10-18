import React, { useRef, useEffect, useState } from 'react';
import type { MessageItem } from '../../types/chat';
import { RotateCw, Edit3, Trash2 } from 'lucide-react';
import { formatDateLabel, getDateKey, shouldGroupWithPrevious, formatTime } from './chatShared';
import { parseStickerToken } from './EmojiStickerPicker';

interface Props {
  messages: MessageItem[];
  currentUserId: number;
  currentUserName?: string;
  introComponent?: React.ReactNode;
  onRetryMessage?: (msg: MessageItem) => void;
  onEditMessage?: (messageId: number, content: string) => void;
  onDeleteMessage?: (messageId: number) => void;
  onLoadMore?: (beforeId: number) => void;
}

export const ChatMessageList: React.FC<Props> = ({
  messages,
  currentUserId,
  currentUserName,
  introComponent,
  onRetryMessage,
  onEditMessage,
  onDeleteMessage,
  onLoadMore
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  // Tự cuộn xuống đáy khi có tin nhắn mới (tôn trọng cài đặt autoScroll)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('discord_mini_user_settings_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.autoScroll === false) return;
      }
    } catch {
      // default autoScroll = true
    }
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleScroll = () => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      if (messages.length > 0 && onLoadMore) {
        onLoadMore(messages[0].id);
      }
    }
  };

  const handleSaveEdit = (msgId: number) => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    if (onEditMessage) {
      onEditMessage(msgId, trimmed);
    }
    setEditingId(null);
  };

  return (
    <div 
      className="dm-scroll" 
      ref={scrollRef} 
      onScroll={handleScroll}
      role="log"
      aria-live="polite"
    >
      <div className="dm-scroll-inner">
        {/* Khối giới thiệu đầu cuộc trò chuyện (nếu có) */}
        {introComponent && (
          <div className="dm-intro-wrapper">
            {introComponent}
          </div>
        )}

        {/* Danh sách tin nhắn với gộp tin và phân cách ngày */}
        {messages.map((msg, index) => {
          const isMe = Boolean(msg.isMe || (currentUserId && Number(msg.senderId) === Number(currentUserId)));
          const prevMsg = messages[index - 1];
          const curDateKey = getDateKey(msg.timestamp);
          const prevDateKey = prevMsg ? getDateKey(prevMsg.timestamp) : '';
          const showDateSep = index === 0 || curDateKey !== prevDateKey;
          const isGrouped = !showDateSep && shouldGroupWithPrevious(msg, prevMsg, curDateKey, prevDateKey);

          // Tên tác giả: Nếu là tin của mình thì hiện tên thật thay vì 'Bạn'
          const authorName = isMe 
            ? (currentUserName || msg.senderName || 'Tôi') 
            : (msg.senderName || 'Người dùng');

          const isPending = msg.id < 0 || msg.status === 'sending';
          const isFailed = msg.status === 'failed';
          const canModify = isMe && msg.id > 0 && !isPending;
          const sticker = parseStickerToken(msg.content);

          return (
            <React.Fragment key={msg.id || `${curDateKey}-${index}`}>
              {/* Dòng phân cách ngày */}
              {showDateSep && (
                <div className="date-separator">
                  <span className="date-separator-label">
                    {formatDateLabel(msg.timestamp)}
                  </span>
                </div>
              )}

              {/* Từng mục tin nhắn */}
              <div 
                className={`dm-message-row ${isGrouped ? 'grouped' : ''} ${isMe ? 'mine' : ''} ${isPending ? 'pending' : ''} ${isFailed ? 'failed' : ''}`}
              >
                {!isGrouped ? (
                  <div className="msg-avatar-col">
                    <div className={`user-avatar-circle ${isMe ? 'avatar-me' : ''}`}>
                      {Array.from(authorName.trim())[0]?.toUpperCase() || 'U'}
                    </div>
                  </div>
                ) : (
                  <div className="msg-gutter-spacer" aria-hidden="true" />
                )}

                <div className="msg-content-col">
                  {!isGrouped && (
                    <div className="msg-meta-header">
                      <span className="msg-author-name" style={{ color: isMe ? 'var(--accent)' : 'var(--text-1)' }}>
                        {authorName}
                      </span>
                      <span className="msg-time-label">
                        {formatTime(msg.timestamp) || 'Vừa xong'}
                      </span>
                      {isPending && <span className="msg-sending-indicator">(đang gửi...)</span>}
                    </div>
                  )}

                  {editingId === msg.id ? (
                    <div className="msg-edit-wrap">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(msg.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        maxLength={5000}
                      />
                      <div className="msg-edit-actions">
                        <button type="button" className="btn-cancel" onClick={() => setEditingId(null)}>Hủy (Esc)</button>
                        <button type="button" className="btn-primary" onClick={() => handleSaveEdit(msg.id)}>Lưu (Enter)</button>
                      </div>
                    </div>
                  ) : sticker ? (
                    <div className="msg-sticker-bubble" style={{ background: sticker.bgGradient }}>
                      <span className="msg-sticker-emoji">{sticker.emoji}</span>
                      <span className="msg-sticker-label">{sticker.label}</span>
                    </div>
                  ) : (
                    <div className="msg-text-content">
                      {msg.content}
                      {msg.isEdited && <span className="edited-badge">(đã chỉnh sửa)</span>}
                    </div>
                  )}

                  {isFailed && (
                    <div className="msg-error-row">
                      <span className="msg-error-text">Không thể gửi tin nhắn.</span>
                      {onRetryMessage && (
                        <button
                          type="button"
                          className="msg-retry-btn"
                          onClick={() => onRetryMessage(msg)}
                        >
                          <RotateCw size={12} /> Thử lại
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Thanh công cụ chỉnh sửa / xóa tin nhắn riêng tư */}
                {canModify && (onEditMessage || onDeleteMessage) && (
                  <div className="msg-quick-toolbar">
                    {onEditMessage && !sticker && editingId !== msg.id && (
                      <button
                        type="button"
                        className="quick-action-btn"
                        title="Chỉnh sửa tin nhắn"
                        onClick={() => {
                          setEditingId(msg.id);
                          setEditText(msg.content);
                        }}
                      >
                        <Edit3 size={15} />
                      </button>
                    )}
                    {onDeleteMessage && (
                      <button
                        type="button"
                        className="quick-action-btn danger"
                        title="Xóa tin nhắn"
                        onClick={() => onDeleteMessage(msg.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
