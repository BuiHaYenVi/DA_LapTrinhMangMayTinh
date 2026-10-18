import React, { useRef, useEffect, useState } from 'react';
import type { MessageItem } from '../../types/chat';
import { RotateCw, Edit3, Trash2, Smile } from 'lucide-react';
import { formatDateLabel, getDateKey, shouldGroupWithPrevious, formatTime } from './chatShared';
import { extractStickerFromContent, MessageReactionPicker } from './EmojiStickerPicker';
import { loadStoredSettings } from '../UserSettingsModal';
import { extractAttachmentFromContent } from './attachmentUtils';
import { MessageAttachmentView } from './MessageAttachmentView';
import { MessageReactionList } from './MessageReactionList';
import { loadReactionsMap, toggleMessageReaction, type ReactionsMap } from './reactionManager';

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

const QUICK_REACTIONS = ['👍', '😭', '💯'];

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
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<number | null>(null);
  const [reactionsMap, setReactionsMap] = useState<ReactionsMap>(() => loadReactionsMap());
  const [, setTick] = useState(0);

  // Lắng nghe cập nhật reaction
  useEffect(() => {
    const handleReactionsUpdated = (e: any) => {
      setReactionsMap(e.detail || loadReactionsMap());
    };
    window.addEventListener('message_reactions_updated', handleReactionsUpdated);
    return () => window.removeEventListener('message_reactions_updated', handleReactionsUpdated);
  }, []);

  // Lắng nghe thay đổi cài đặt (định dạng giờ, mật độ...) để re-render ngay
  useEffect(() => {
    const onUpdate = () => setTick(v => v + 1);
    window.addEventListener('user_settings_updated', onUpdate);
    return () => window.removeEventListener('user_settings_updated', onUpdate);
  }, []);

  // Tự cuộn xuống đáy khi có tin nhắn mới (tôn trọng cài đặt autoScroll)
  useEffect(() => {
    const stored = loadStoredSettings();
    if (stored.autoScroll === false) return;
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

  const handleToggleReaction = (msgId: number, emoji: string) => {
    const author = currentUserName || 'Tôi';
    toggleMessageReaction(msgId, emoji, author);
    setReactionsMap(loadReactionsMap());
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
          
          const { text: textAfterAttachment, attachment } = extractAttachmentFromContent(msg.content);
          const { text: cleanText, sticker } = extractStickerFromContent(textAfterAttachment);
          const canModify = isMe && msg.id > 0 && !isPending && !sticker && Boolean(cleanText);
          const msgReactions = reactionsMap[msg.id] || [];

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
                className={`dm-message-row ${isGrouped ? 'grouped' : ''} ${sticker ? 'sticker-row' : ''} ${isMe ? 'mine' : ''} ${isPending ? 'pending' : ''} ${isFailed ? 'failed' : ''}`}
                style={{ position: 'relative' }}
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
                  ) : (
                    <div className="msg-payload-wrap">
                      {cleanText ? (
                        <div className="msg-text-content">
                          {cleanText}
                          {msg.isEdited && <span className="edited-badge">(đã chỉnh sửa)</span>}
                        </div>
                      ) : null}

                      {/* Đính kèm ảnh hoặc tệp tin */}
                      {attachment && (
                        <MessageAttachmentView attachment={attachment} />
                      )}

                      {/* Nhãn dán sticker */}
                      {sticker ? (
                        <div
                          className="discord-sticker-wrapper"
                          title={`${sticker.name} • ${sticker.type === 'animated' ? 'Nhãn dán Động' : 'Nhãn dán Tĩnh'}`}
                        >
                          <img
                            src={sticker.url}
                            alt={sticker.name}
                            className={`discord-sticker-img ${sticker.type === 'animated' ? 'animated' : 'static'}`}
                            loading="lazy"
                          />
                          <div className="discord-sticker-caption">
                            <span>{sticker.name}</span>
                            {sticker.type === 'animated' ? (
                              <span className="sticker-badge-gif">GIF</span>
                            ) : (
                              <span className="sticker-badge-static">TĨNH</span>
                            )}
                          </div>
                        </div>
                      ) : null}

                      {/* Danh sách các biểu cảm emoji đã thả dưới tin nhắn */}
                      <MessageReactionList
                        messageId={msg.id}
                        reactions={msgReactions}
                        currentUserName={currentUserName || 'Tôi'}
                        onToggleReaction={(emoji) => handleToggleReaction(msg.id, emoji)}
                        onOpenPicker={() => setReactionPickerMsgId(msg.id)}
                      />
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

                {/* Popover chọn Reaction Emoji khi người dùng click Thêm biểu cảm */}
                {reactionPickerMsgId === msg.id && (
                  <MessageReactionPicker
                    onSelectEmoji={(emoji) => {
                      handleToggleReaction(msg.id, emoji);
                      setReactionPickerMsgId(null);
                    }}
                    onClose={() => setReactionPickerMsgId(null)}
                  />
                )}

                {/* Thanh công cụ Quick Reaction & Hành động tin nhắn phong cách Discord */}
                {!isPending && msg.id > 0 && (
                  <div className="msg-quick-toolbar">
                    {/* Các biểu cảm nhanh giống Discord: 👍, 😭, 💯 */}
                    <div className="quick-reactions-strip">
                      {QUICK_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="quick-reaction-item-btn"
                          title={`Thả biểu cảm ${emoji}`}
                          onClick={() => handleToggleReaction(msg.id, emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="quick-action-btn"
                        title="Thêm biểu cảm"
                        onClick={() => setReactionPickerMsgId((prev) => (prev === msg.id ? null : msg.id))}
                      >
                        <Smile size={16} />
                      </button>
                    </div>

                    {canModify && onEditMessage && editingId !== msg.id && (
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
                    {canModify && onDeleteMessage && (
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
