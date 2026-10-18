import React, { useState, useRef, useEffect } from 'react';
import type { Room, Channel, MessageItem } from '../types/chat';
import { 
  Hash, Search, UserPlus, Send, Edit3, Trash2,
  Users, ArrowRight, Loader2, MessageSquare, PlusCircle, Smile, Bell, Pin
} from 'lucide-react';
import { Logo } from './Logo';

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
}

// 1. Định dạng giờ tin nhắn dạng HH:mm, di chuột vào hiện đầy đủ ngày giờ giây
function formatMessageTime(rawTime: string): { short: string; full: string } {
  if (!rawTime) return { short: 'Vừa xong', full: '' };
  const normalized = rawTime.includes('T') ? rawTime : rawTime.replace(' ', 'T');
  const d = new Date(normalized);

  if (isNaN(d.getTime())) {
    const match = rawTime.match(/(\d{2}:\d{2})/);
    return { short: match ? match[1] : rawTime, full: rawTime };
  }

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

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
  isOwner
}) => {
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const mainInputRef = useRef<HTMLInputElement>(null);

  // Xóa ô nhập tin khi đổi kênh hoặc đổi phòng để tránh gửi nhầm
  useEffect(() => {
    setInputText('');
    setEditingId(null);
    setSearchTerm('');
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
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
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

  // Cuộn xuống tin mới nhất
  useEffect(() => {
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
              Chức năng kết bạn và nhắn tin riêng 1–1 chưa được triển khai trong lượt này theo đúng yêu cầu phạm vi.
              Hệ thống hiện đang tập trung hoàn thiện mô hình <strong>PHÒNG → KÊNH</strong> chat chữ.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-center">
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

        <div className="chat-header-right">
          {/* Nút thông báo */}
          <button className="header-icon-btn" title="Thông báo" aria-label="Thông báo">
            <Bell size={20} />
          </button>

          {/* Nút tin nhắn ghim */}
          <button className="header-icon-btn" title="Tin nhắn đã ghim" aria-label="Tin nhắn đã ghim">
            <Pin size={20} />
          </button>

          {/* Nút bật/tắt danh sách thành viên phòng */}
          {onToggleMemberList && (
            <button 
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
              placeholder={`Tìm kiếm`}
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
                    className="header-btn blurple" 
                    onClick={onInvite} 
                    title="Mời bạn bè vào phòng"
                    style={{ padding: '8px 14px', borderRadius: '4px' }}
                  >
                    <UserPlus size={16} />
                    <span>Mời bạn bè</span>
                  </button>
                  <button 
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

              const canEdit = msg.senderId === currentUserId;
              const canDelete = msg.senderId === currentUserId || isOwner || currentUserRole === 'ADMIN';

              return (
                <React.Fragment key={msg.id || idx}>
                  {/* Ngăn cách ngày */}
                  {isNewDay && curDateKey && (
                    <div className="date-divider">
                      <span className="date-badge">{formatDateLabel(curDateKey)}</span>
                    </div>
                  )}

                  <div 
                    className={`discord-message-row ${isGrouped ? 'grouped' : ''}`}
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
                            <button className="btn-cancel" onClick={() => setEditingId(null)}>Hủy (Esc)</button>
                            <button className="btn-primary" onClick={() => handleSaveEdit(msg.id)}>Lưu (Enter)</button>
                          </div>
                        </div>
                      ) : (
                        <div className="msg-body">
                          {msg.content}
                          {msg.isEdited && <span className="edited-badge" title="Tin nhắn đã chỉnh sửa">(đã chỉnh sửa)</span>}
                        </div>
                      )}
                    </div>

                    {/* Toolbar thao tác sửa / xóa tin nhắn */}
                    <div className="msg-quick-toolbar">
                      {canEdit && editingId !== msg.id && (
                        <button 
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
            className="input-emoji-btn" 
            title="Biểu cảm"
            aria-label="Biểu cảm"
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
