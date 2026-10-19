import React, { useRef, useEffect, useState } from 'react';
import type { MessageItem } from '../../types/chat';
import { RotateCw, Edit3, Trash2, Smile, ChevronDown, Loader2 } from 'lucide-react';
import { formatDateLabel, getDateKey, shouldGroupWithPrevious, formatTime } from './chatShared';
import { extractStickerFromContent, MessageReactionPicker } from './EmojiStickerPicker';
import { extractAttachmentFromContent } from './attachmentUtils';
import { MessageAttachmentView } from './MessageAttachmentView';
import { MessageReactionList } from './MessageReactionList';
import { loadReactionsMap, toggleMessageReaction, type ReactionsMap } from './reactionManager';
import { loadStoredSettings } from '../UserSettingsModal';

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

  const [newMessagesBelow, setNewMessagesBelow] = useState(0);
  const [, setIsNearBottom] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);

  const isNearBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(messages.length);
  const prevFirstMsgIdRef = useRef<number | null>(messages[0]?.id || null);
  const scrollSnapshotRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);

  // Cuộn bám đáy hoặc giữ vị trí khi tin cũ được tải thêm
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const prevLen = prevMessagesLengthRef.current;
    const currentLen = messages.length;
    const prevFirstId = prevFirstMsgIdRef.current;
    const currentFirstId = messages[0]?.id || null;

    prevMessagesLengthRef.current = currentLen;
    prevFirstMsgIdRef.current = currentFirstId;

    // 1. Nếu tải thêm tin nhắn cũ vào đầu (first message id thay đổi)
    if (scrollSnapshotRef.current && currentLen > prevLen && prevFirstId !== currentFirstId) {
      const { scrollHeight: oldHeight, scrollTop: oldTop } = scrollSnapshotRef.current;
      const heightDifference = el.scrollHeight - oldHeight;
      el.scrollTop = oldTop + heightDifference;
      scrollSnapshotRef.current = null;
      setIsLoadingMore(false);
      return;
    }

    if (isLoadingMore && currentLen === prevLen) {
      setIsLoadingMore(false);
      setHasReachedEnd(true);
    }

    // 2. Nếu có tin nhắn mới tới
    if (currentLen > prevLen) {
      const lastMsg = messages[messages.length - 1];
      const isMyMessage = Boolean(lastMsg?.isMe || (currentUserId && Number(lastMsg?.senderId) === Number(currentUserId)));

      if (isMyMessage || isNearBottomRef.current) {
        el.scrollTop = el.scrollHeight;
        setNewMessagesBelow(0);
        setIsNearBottom(true);
        isNearBottomRef.current = true;
      } else {
        const addedCount = currentLen - prevLen;
        setNewMessagesBelow(prev => prev + addedCount);
      }
    }
  }, [messages, currentUserId]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior
      });
      setNewMessagesBelow(0);
      setIsNearBottom(true);
      isNearBottomRef.current = true;
    }
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom <= 120;
    setIsNearBottom(nearBottom);
    isNearBottomRef.current = nearBottom;

    if (nearBottom) {
      setNewMessagesBelow(0);
    }

    // Tự động tải tin nhắn cũ khi cuộn lên gần đầu
    if (el.scrollTop <= 40 && !isLoadingMore && !hasReachedEnd) {
      if (messages.length > 0 && onLoadMore) {
        scrollSnapshotRef.current = {
          scrollHeight: el.scrollHeight,
          scrollTop: el.scrollTop
        };
        setIsLoadingMore(true);
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
        {/* Nút bấm / trạng thái tải thêm tin nhắn cũ */}
        {onLoadMore && messages.length > 0 && !hasReachedEnd && (
          <div className="chat-load-more-row">
            <button
              type="button"
              className="chat-load-more-btn"
              onClick={() => {
                if (scrollRef.current) {
                  scrollSnapshotRef.current = {
                    scrollHeight: scrollRef.current.scrollHeight,
                    scrollTop: scrollRef.current.scrollTop
                  };
                }
                setIsLoadingMore(true);
                onLoadMore(messages[0].id);
              }}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <>
                  <Loader2 size={14} className="spin-animation" />
                  <span>Đang tải tin nhắn cũ hơn...</span>
                </>
              ) : (
                <span>Tải thêm lịch sử tin nhắn</span>
              )}
            </button>
          </div>
        )}

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

          const mySettings = isMe ? loadStoredSettings() : null;
          const avatarImage = isMe ? mySettings?.avatarImage : undefined;
          const avatarChar = isMe
            ? (mySettings?.avatarIcon || (Array.from(authorName.trim())[0]?.toUpperCase() || 'U'))
            : (Array.from(authorName.trim())[0]?.toUpperCase() || 'U');
          const avatarBg = isMe
            ? (mySettings?.avatarColor || 'var(--accent)')
            : undefined;
          const isAvatarEmoji = isMe ? Boolean(mySettings?.avatarIcon) : false;

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
                    <div 
                      className={`user-avatar-circle ${isMe ? 'avatar-me' : ''}`}
                      style={{
                        backgroundColor: avatarBg,
                        fontSize: isAvatarEmoji ? '18px' : undefined
                      }}
                    >
                      {avatarImage ? (
                        <img src={avatarImage} alt="avatar" className="avatar-img-cover" />
                      ) : (
                        avatarChar
                      )}
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

      {/* Nút 'Có tin nhắn mới · Xuống cuối' khi người dùng cuộn lên trên */}
      {newMessagesBelow > 0 && (
        <button
          type="button"
          className="chat-new-messages-bar"
          onClick={() => scrollToBottom('smooth')}
          title="Cuộn nhanh xuống tin nhắn mới nhất"
        >
          <ChevronDown size={16} />
          <span>Có {newMessagesBelow} tin nhắn mới · Xuống cuối</span>
          <span className="bar-badge">{newMessagesBelow}</span>
        </button>
      )}
    </div>
  );
};
