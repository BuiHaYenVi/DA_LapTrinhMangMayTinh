import React, { useState, useRef, useEffect } from 'react';
import type { Room, Channel, MessageItem } from '../types/chat';
import { 
  Hash, Search, UserPlus, Send, Edit3, Trash2,
  Users, ArrowRight, Loader2, MessageSquare, PlusCircle, Smile, Bell, BellOff, Pin, X
} from 'lucide-react';
import { Logo } from './Logo';
import { EmojiStickerPicker, QuickAttachMenu, parseStickerToken } from './chat/EmojiStickerPicker';

interface Props {
  currentRoom: Room | null;
  currentChannel: Channel | null;
  isDirectMessageMode?: boolean;
  isLoading?: boolean;
  messages: MessageItem[];
  currentUserId: number;
  currentUserRole?: string;
  isMemberListOpen?: boolean;
  onToggleMemberList?: () => void;
  onSendMessage: (text: string) => void;
  onEditMessage?: (messageId: number, content: string) => void;
  onDeleteMessage?: (messageId: number) => void;
  onLoadMore?: (beforeId: number) => void;
  onInvite: () => void;
  onLeave: () => void;
  onKick: () => void;
  isOwner: boolean;
  isRoomMuted?: boolean;
  onToggleRoomMute?: () => void;
}

// 1. Định dạng giờ tin nhắn theo 24h hoặc 12h từ cài đặt người dùng
function formatMessageTime(rawTime: string): { short: string; full: string } {
  if (!rawTime) return { short: 'Vừa xong', full: '' };
  const normalized = rawTime.includes('T') ? rawTime : rawTime.replace(' ', 'T');
  const d = new Date(normalized);

  let use12h = false;
  try {
    const raw = localStorage.getItem('discord_mini_user_settings_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.timeFormat === '12h') use12h = true;
    }
  } catch {
    // default 24h
  }

  if (isNaN(d.getTime())) {
    const match = rawTime.match(/(\d{2}):(\d{2})/);
    if (match && use12h) {
      const h24 = parseInt(match[1], 10);
      const suffix = h24 >= 12 ? 'PM' : 'AM';
      const h12 = h24 % 12 || 12;
      return { short: `${h12}:${match[2]} ${suffix}`, full: rawTime };
    }
    return { short: match ? `${match[1]}:${match[2]}` : rawTime, full: rawTime };
  }

  const h24 = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  if (use12h) {
    const suffix = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 || 12;
    return {
      short: `${h12}:${minutes} ${suffix}`,
      full: `${h12}:${minutes}:${seconds} ${suffix} ngày ${day}/${month}/${year}`
    };
  }

  const hours = String(h24).padStart(2, '0');
  return {
    short: `${hours}:${minutes}`,
    full: `${hours}:${minutes}:${seconds} ngày ${day}/${month}/${year}`
  };
}

// 2. Lấy khóa ngày YYYY-MM-DD để xác định thời điểm đổi ngày
function getDateKey(rawTime: string): string {
  if (!rawTime) return '';
  const normalized = rawTime.includes('T') ? rawTime : rawTime.replace(' ', 'T');
  const d = new Date(normalized);
  if (isNaN(d.getTime())) {
    const m = rawTime.match(/^\d{4}-\d{2}-\d{2}/);
    return m ? m[0] : '';
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 3. Hiển thị nhãn ngăn cách ngày: Hôm nay / Hôm qua / 28 tháng 6, 2026
function formatDateLabel(dateKey: string): string {
  if (!dateKey) return '';
  const parts = dateKey.split('-').map(Number);
  if (parts.length < 3) return dateKey;
  const [y, m, d] = parts;
  const msgDate = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (msgDate.getTime() === today.getTime()) {
    return 'Hôm nay';
  }
  if (msgDate.getTime() === yesterday.getTime()) {
    return 'Hôm qua';
  }
  return `${d} tháng ${m}, ${y}`;
}

// 4. Trích xuất tên người dùng từ tin nhắn hệ thống tham gia
function extractJoinedUser(content: string): string {
  const m1 = content.match(/🔔\s*(.+?)\s*đã tham gia/i);
  if (m1) return m1[1].trim();
  const m2 = content.match(/^(.+?)\s*vừa mới xuất hiện/i);
  if (m2) return m2[1].trim();
  return '';
}

// 5. Gom tin nhắn liên tiếp của cùng người trong vòng 5 phút
function shouldGroupWithPrevious(
  current: MessageItem,
  previous: MessageItem | undefined,
  curDateKey: string,
  prevDateKey: string
): boolean {
  if (!previous) return false;
  if (current.senderId !== previous.senderId) return false;
  if (current.senderId === -1 || previous.senderId === -1) return false;
  if (curDateKey !== prevDateKey) return false;

  const tCur = new Date(current.timestamp?.replace(' ', 'T') || '').getTime();
  const tPrev = new Date(previous.timestamp?.replace(' ', 'T') || '').getTime();
  if (!isNaN(tCur) && !isNaN(tPrev)) {
    const diffMs = Math.abs(tCur - tPrev);
    return diffMs <= 5 * 60 * 1000;
  }
  return false;
}

const PINNED_STORAGE_KEY = 'discord_mini_pinned_messages_v1';

export const ChatCenter: React.FC<Props> = ({
  currentRoom,
  currentChannel,
  isDirectMessageMode = false,
  isLoading = false,
  messages,
  currentUserId,
  currentUserRole,
  isMemberListOpen = true,
  onToggleMemberList,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onLoadMore,
  onInvite,
  isOwner,
  isRoomMuted = false,
  onToggleRoomMute
}) => {
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showPinnedPopover, setShowPinnedPopover] = useState(false);
  const [pinnedIdsByChannel, setPinnedIdsByChannel] = useState<Record<string, number[]>>(() => {
    try {
      const raw = localStorage.getItem(PINNED_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const mainInputRef = useRef<HTMLInputElement>(null);

  const channelPinKey = `${currentRoom?.id || 0}_${currentChannel?.id || 0}`;
  const currentPinnedIds = pinnedIdsByChannel[channelPinKey] || [];
  const pinnedMessages = messages.filter(m => currentPinnedIds.includes(m.id));

  const togglePinMessage = (msgId: number) => {
    setPinnedIdsByChannel(prev => {
      const existing = prev[channelPinKey] || [];
      const nextList = existing.includes(msgId)
        ? existing.filter(id => id !== msgId)
        : [...existing, msgId];
      const updated = { ...prev, [channelPinKey]: nextList };
      try {
        localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Xóa ô nhập tin khi đổi kênh hoặc đổi phòng để tránh gửi nhầm
  useEffect(() => {
    setInputText('');
    setEditingId(null);
    setSearchTerm('');
    setShowEmojiPicker(false);
    setShowAttachMenu(false);
    setShowPinnedPopover(false);
  }, [currentRoom?.id, currentChannel?.id, isDirectMessageMode]);

  const displayedMessages = searchTerm.trim()
    ? messages.filter(m =>
        m.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.senderName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : messages;

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      try {
        const raw = localStorage.getItem('discord_mini_user_settings_v2');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.enterToSend === false && !e.ctrlKey) {
            return;
          }
        }
      } catch {
        // default enterToSend = true
      }
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveEdit = (msgId: number) => {
    if (!editText.trim()) return;
    if (onEditMessage) {
      onEditMessage(msgId, editText.trim());
    }
    setEditingId(null);
  };

  const handleDelete = (msgId: number) => {
    if (onDeleteMessage) {
      onDeleteMessage(msgId);
    }
  };

  const handleScroll = () => {
    if (chatMessagesRef.current && chatMessagesRef.current.scrollTop === 0) {
      if (messages.length > 0 && onLoadMore) {
        onLoadMore(messages[0].id);
      }
    }
  };

  // Cuộn xuống tin mới nhất (tôn trọng cài đặt autoScroll)
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
    if (chatMessagesRef.current && !isLoading) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages.length, isLoading]);

  // 1. MÀN HÌNH CHẾ ĐỘ TIN NHẮN TRỰC TIẾP
  if (isDirectMessageMode) {
    return (
      <div className="chat-center">
        <div className="chat-header">
          <div className="chat-header-left">
            <Users size={24} className="channel-hash-icon" color="var(--accent)" />
            <div className="chat-header-title">Bạn bè & Tin nhắn trực tiếp</div>
          </div>
        </div>

        <div className="chat-messages-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="chat-empty-state" style={{ maxWidth: '480px' }}>
            <div className="empty-state-logo-wrap">
              <MessageSquare size={56} color="var(--accent)" />
            </div>
            <h2 className="empty-state-title">Khu vực Tin nhắn trực tiếp</h2>
            <p className="empty-state-desc">
              Hãy chọn một người bạn ở danh sách bên trái để bắt đầu trò chuyện 1–1.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-center" style={{ position: 'relative' }}>
      {/* 1. Header Bar: Tiêu đề kênh chat (# tên-kênh) và các công cụ kênh */}
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="chat-header-channel-wrap" title={currentChannel ? `Kênh #${currentChannel.name}` : ''}>
            <Hash size={22} className="channel-hash-icon" />
            <div className="chat-header-title">
              {currentChannel ? currentChannel.name : 'Chọn kênh'}
            </div>
          </div>

          {currentRoom?.description && (
            <>
              <div className="chat-header-separator subtle" />
              <div className="chat-header-desc" title={`Mô tả: ${currentRoom.description}`}>
                {currentRoom.description}
              </div>
            </>
          )}
        </div>

        <div className="chat-header-right" style={{ position: 'relative' }}>
          {/* Nút bật/tắt thông báo phòng */}
          <button
            type="button"
            className={`header-icon-btn ${isRoomMuted ? 'muted' : ''}`}
            title={isRoomMuted ? 'Đang tắt thông báo phòng (Bấm để bật)' : 'Tắt thông báo phòng này'}
            aria-label="Thông báo"
            onClick={onToggleRoomMute}
          >
            {isRoomMuted ? <BellOff size={20} style={{ color: 'var(--danger)' }} /> : <Bell size={20} />}
          </button>

          {/* Nút tin nhắn đã ghim */}
          <button
            type="button"
            className={`header-icon-btn ${showPinnedPopover ? 'active' : ''}`}
            title={`Tin nhắn đã ghim (${pinnedMessages.length})`}
            aria-label="Tin nhắn đã ghim"
            onClick={() => setShowPinnedPopover(v => !v)}
            style={{ position: 'relative' }}
          >
            <Pin size={20} />
            {pinnedMessages.length > 0 && (
              <span className="pinned-count-dot">{pinnedMessages.length}</span>
            )}
          </button>

          {/* Popover Tin nhắn đã ghim */}
          {showPinnedPopover && (
            <div className="pinned-messages-popover" onClick={e => e.stopPropagation()}>
              <div className="pinned-popover-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                  <Pin size={16} />
                  <span>Tin nhắn đã ghim ({pinnedMessages.length})</span>
                </div>
                <button type="button" className="emoji-sticker-close" onClick={() => setShowPinnedPopover(false)}>
                  <X size={16} />
                </button>
              </div>
              <div className="pinned-popover-body">
                {pinnedMessages.length === 0 ? (
                  <div className="pinned-empty">
                    Chưa có tin nhắn nào được ghim trong kênh <strong>#{currentChannel?.name}</strong>.
                    <br />
                    <span style={{ fontSize: '12px', opacity: 0.75 }}>Di chuột vào tin nhắn và bấm biểu tượng Ghim để lưu lại.</span>
                  </div>
                ) : (
                  pinnedMessages.map(pm => (
                    <div key={pm.id} className="pinned-item-card">
                      <div className="pinned-item-top">
                        <strong>{pm.senderName}</strong>
                        <button
                          type="button"
                          className="pinned-unpin-btn"
                          title="Bỏ ghim"
                          onClick={() => togglePinMessage(pm.id)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="pinned-item-content">
                        {parseStickerToken(pm.content)?.label || pm.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Nút bật/tắt danh sách thành viên phòng */}
          {onToggleMemberList && (
            <button 
              type="button"
              className={`header-icon-btn ${isMemberListOpen ? 'active' : ''}`}
              title="Danh sách thành viên phòng"
              onClick={onToggleMemberList}
              aria-label="Danh sách thành viên phòng"
            >
              <Users size={20} />
            </button>
          )}

          {/* Hộp tìm kiếm */}
          <div className="discord-search-box">
            <input 
              placeholder="Tìm kiếm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              disabled={!currentChannel || isLoading}
            />
            <Search size={16} className="search-icon" />
          </div>
        </div>
      </div>

      {/* 2. Messages List Container */}
      <div 
        className="chat-messages-container" 
        ref={chatMessagesRef}
        onScroll={handleScroll}
      >
        {isLoading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
            gap: '12px'
          }}>
            <Loader2 size={32} className="spin-animation" color="var(--accent)" />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>Đang tải tin nhắn kênh #{currentChannel?.name}...</span>
          </div>
        ) : currentRoom && currentChannel ? (
          <div className="messages-flow">
            {/* Hero Welcome Banner ở đầu kênh */}
            <div className="channel-hero-welcome">
              <div className="hero-hash-circle">
                <Hash size={42} />
              </div>
              <h1 className="hero-title">
                Chào mừng đến với #{currentChannel.name}!
              </h1>
              <p className="hero-subtitle">
                Đây là khởi đầu của kênh <strong>#{currentChannel.name}</strong> thuộc phòng <strong>{currentRoom.name}</strong>.
              </p>
              {displayedMessages.length === 0 && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
                  <button 
                    type="button"
                    className="header-btn blurple" 
                    onClick={() => onInvite()} 
                    title="Mời bạn bè vào phòng"
                    style={{ padding: '8px 14px', borderRadius: '4px' }}
                  >
                    <UserPlus size={16} />
                    <span>Mời bạn bè</span>
                  </button>
                  <button 
                    type="button"
                    className="header-btn" 
                    onClick={() => mainInputRef.current?.focus()} 
                    title="Gửi tin nhắn đầu tiên"
                    style={{ padding: '8px 14px', borderRadius: '4px', background: 'var(--bg-hover)', color: 'var(--text-header)' }}
                  >
                    <Send size={16} />
                    <span>Gửi tin nhắn</span>
                  </button>
                </div>
              )}
            </div>

            {displayedMessages.map((msg, idx) => {
              const prevMsg = idx > 0 ? displayedMessages[idx - 1] : undefined;
              const curDateKey = getDateKey(msg.timestamp);
              const prevDateKey = prevMsg ? getDateKey(prevMsg.timestamp) : '';
              const isNewDay = idx === 0 || (curDateKey && curDateKey !== prevDateKey);
              const isGrouped = !isNewDay && shouldGroupWithPrevious(msg, prevMsg, curDateKey, prevDateKey);
              const timeInfo = formatMessageTime(msg.timestamp);

              // Tin nhắn hệ thống
              if (msg.senderId === -1 || msg.content.startsWith('🔔') || msg.senderName === 'Hệ thống') {
                const joinedName = extractJoinedUser(msg.content);
                const displayContent = joinedName 
                  ? `${joinedName} vừa mới xuất hiện!` 
                  : msg.content.replace(/^🔔\s*/, '');

                return (
                  <React.Fragment key={msg.id || idx}>
                    {isNewDay && curDateKey && (
                      <div className="date-divider">
                        <span className="date-badge">{formatDateLabel(curDateKey)}</span>
                      </div>
                    )}
                    <div className="discord-system-message-row" id={`msg-${msg.id}`}>
                      <div className="system-msg-main">
                        <ArrowRight size={16} className="system-arrow-icon" />
                        <span className="system-text">
                          <strong className="joined-username">{joinedName || displayContent}</strong>{' '}
                          {joinedName ? 'vừa mới xuất hiện!' : ''}{' '}
                          <span className="system-time">{timeInfo.short}</span>
                        </span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              }

              const isMyMsg = Boolean(msg.isMe || (currentUserId && Number(msg.senderId) === Number(currentUserId)));
              const sticker = parseStickerToken(msg.content);
              const canEdit = isMyMsg && msg.id > 0 && !sticker;
              const canDelete = (isMyMsg || isOwner || currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && msg.id > 0;
              const isPinned = currentPinnedIds.includes(msg.id);

              return (
                <React.Fragment key={msg.id || idx}>
                  {/* Ngăn cách ngày */}
                  {isNewDay && curDateKey && (
                    <div className="date-divider">
                      <span className="date-badge">{formatDateLabel(curDateKey)}</span>
                    </div>
                  )}

                  <div 
                    className={`discord-message-row ${isGrouped ? 'grouped' : ''} ${isPinned ? 'pinned-row' : ''}`}
                    id={`msg-${msg.id}`}
                  >
                    {isGrouped ? (
                      <span className="grouped-timestamp" title={timeInfo.full}>
                        {timeInfo.short}
                      </span>
                    ) : (
                      <div className="msg-avatar-col">
                        <div className="user-avatar-circle">
                          {msg.senderName ? msg.senderName.charAt(0).toUpperCase() : 'U'}
                        </div>
                      </div>
                    )}

                    <div className="msg-content-col">
                      {!isGrouped && (
                        <div className="msg-header-line">
                          <span className="sender-name">
                            {msg.senderName}
                          </span>
                          <span className="msg-timestamp" title={timeInfo.full}>
                            {timeInfo.short}
                          </span>
                          {isPinned && (
                            <span className="msg-pinned-tag" title="Tin nhắn đã ghim">
                              📌 Đã ghim
                            </span>
                          )}
                        </div>
                      )}

                      {editingId === msg.id ? (
                        <div className="msg-edit-wrap">
                          <input
                            type="text"
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            onKeyDown={e => {
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
                        <div className="msg-body">
                          {msg.content}
                          {msg.isEdited && <span className="edited-badge" title="Tin nhắn đã chỉnh sửa">(đã chỉnh sửa)</span>}
                        </div>
                      )}
                    </div>

                    {/* Toolbar thao tác ghim / sửa / xóa tin nhắn */}
                    <div className="msg-quick-toolbar">
                      <button
                        type="button"
                        className={`quick-action-btn ${isPinned ? 'active' : ''}`}
                        title={isPinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}
                        onClick={() => togglePinMessage(msg.id)}
                      >
                        <Pin size={14} />
                      </button>
                      {canEdit && editingId !== msg.id && (
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
                      {canDelete && (
                        <button 
                          type="button"
                          className="quick-action-btn danger" 
                          title="Xóa tin nhắn"
                          onClick={() => handleDelete(msg.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        ) : (
          /* Màn hình khi chưa chọn phòng hoặc kênh */
          <div className="chat-empty-state">
            <div className="empty-state-logo-wrap">
              <Logo size={64} />
            </div>
            <h2 className="empty-state-title">
              {currentRoom ? `Phòng ${currentRoom.name}` : 'Chào mừng bạn đến với Huddle'}
            </h2>
            <p className="empty-state-desc">
              {currentRoom 
                ? 'Hãy chọn một kênh chat ở danh sách bên trái để bắt đầu trò chuyện.' 
                : 'Hãy chọn một phòng ở thanh biểu tượng ngoài cùng bên trái để bắt đầu.'}
            </p>
          </div>
        )}
      </div>

      {/* 3. Bottom Input Box */}
      <div className="chat-input-container" style={{ position: 'relative' }}>
        {showEmojiPicker && (
          <EmojiStickerPicker
            onSelectEmoji={(emoji) => {
              setInputText((prev) => prev + emoji);
              mainInputRef.current?.focus();
            }}
            onSelectSticker={(stickerToken) => {
              onSendMessage(stickerToken);
              setShowEmojiPicker(false);
            }}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}

        {showAttachMenu && (
          <QuickAttachMenu
            onInsertTemplate={(tpl) => {
              setInputText((prev) => prev + tpl);
              mainInputRef.current?.focus();
            }}
            onOpenStickerTab={() => {
              setShowAttachMenu(false);
              setShowEmojiPicker(true);
            }}
            onClose={() => setShowAttachMenu(false)}
          />
        )}

        <div className="chat-input-pill">
          <button 
            type="button" 
            className="input-attach-btn" 
            title="Chèn nhanh / Nhãn dán"
            aria-label="Chèn nhanh"
            disabled={!currentChannel || isLoading}
            onClick={() => {
              setShowAttachMenu((v) => !v);
              setShowEmojiPicker(false);
            }}
          >
            <PlusCircle size={22} />
          </button>

          <input
            ref={mainInputRef}
            placeholder={
              currentChannel 
                ? `Gửi tin nhắn tới #${currentChannel.name}` 
                : (currentRoom ? 'Hãy chọn một kênh để gõ tin nhắn...' : 'Hãy chọn phòng để bắt đầu...')
            }
            disabled={!currentChannel || isLoading}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <button 
            type="button" 
            className={`input-emoji-btn ${showEmojiPicker ? 'active' : ''}`}
            title="Chọn Emoji & Sticker"
            aria-label="Chọn Emoji & Sticker"
            disabled={!currentChannel || isLoading}
            onClick={() => {
              setShowEmojiPicker((v) => !v);
              setShowAttachMenu(false);
            }}
          >
            <Smile size={22} />
          </button>

          <button 
            type="button"
            className="chat-send-btn" 
            title="Gửi tin nhắn (Enter)"
            onClick={handleSend}
            disabled={!inputText.trim() || !currentChannel || isLoading}
            aria-label="Gửi tin nhắn"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatCenter;
