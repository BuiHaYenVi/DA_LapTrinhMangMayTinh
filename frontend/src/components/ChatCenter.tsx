import React, { useState, useRef, useEffect } from 'react';
import type { Room, Channel, MessageItem, User } from '../types/chat';
import { 
  Hash, Search, UserPlus, Send, Edit3, Trash2,
  Users, ArrowRight, Loader2, MessageSquare, PlusCircle, Smile, Bell, BellOff, Pin, X,
  Volume2, MessagesSquare, Lock, ChevronDown
} from 'lucide-react';
import { Logo } from './Logo';
import { 
  EmojiStickerPicker, 
  QuickAttachMenu, 
  MessageReactionPicker,
  parseStickerToken, 
  extractStickerFromContent 
} from './chat/EmojiStickerPicker';
import { loadStoredSettings } from './UserSettingsModal';
import { chatBridge } from '../services/chatBridge';
import { 
  type FileAttachment, 
  encodeAttachmentToken, 
  extractAttachmentFromContent 
} from './chat/attachmentUtils';
import { MessageAttachmentView, AttachmentPreviewBox } from './chat/MessageAttachmentView';
import { MessageReactionList } from './chat/MessageReactionList';
import { 
  loadReactionsMap, 
  toggleMessageReaction, 
  type ReactionsMap 
} from './chat/reactionManager';
import { ForumChannelView } from './chat/ForumChannelView';
import { VoiceChannelView } from './chat/VoiceChannelView';
import { getRoomCustomStyle } from './rail/RoomRailItem';

interface Props {
  currentRoom: Room | null;
  currentChannel: Channel | null;
  isDirectMessageMode?: boolean;
  isLoading?: boolean;
  messages: MessageItem[];
  currentUserId: number;
  currentUserName?: string;
  currentUserRole?: string;
  currentUser?: User | null;
  members?: User[];
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

const QUICK_REACTIONS = ['👍', '😭', '💯'];

// 1. Định dạng giờ tin nhắn theo 24h hoặc 12h từ cài đặt người dùng
function formatMessageTime(rawTime: string): { short: string; full: string } {
  if (!rawTime) return { short: 'Vừa xong', full: '' };
  const normalized = rawTime.includes('T') ? rawTime : rawTime.replace(' ', 'T');
  const d = new Date(normalized);

  let use12h = false;
  try {
    const settings = loadStoredSettings();
    if (settings.timeFormat === '12h') use12h = true;
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

// 5. Gom tin nhắn liên tiếp của cùng người trong vòng 5 phút (trừ khi có nhãn dán Sticker)
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

  // Nhãn dán (Sticker) luôn là khối media độc lập, không gộp thu gọn 24px để tránh đè chữ lên nhau
  if (extractStickerFromContent(current.content).sticker || extractStickerFromContent(previous.content).sticker) {
    return false;
  }

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
  currentUserName,
  currentUserRole,
  currentUser,
  members = [],
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
  const [pendingAttachment, setPendingAttachment] = useState<FileAttachment | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<number | null>(null);
  const [reactionsMap, setReactionsMap] = useState<ReactionsMap>(() => loadReactionsMap());
  const [pinnedIdsByChannel, setPinnedIdsByChannel] = useState<Record<string, number[]>>(() => {
    try {
      const raw = localStorage.getItem(PINNED_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [, setRoomCustomTick] = useState(0);

  // Lắng nghe cập nhật tùy chỉnh phòng (màu nền riêng...)
  useEffect(() => {
    const handleRoomCustomUpdated = () => setRoomCustomTick(t => t + 1);
    window.addEventListener('room_custom_updated', handleRoomCustomUpdated);
    return () => window.removeEventListener('room_custom_updated', handleRoomCustomUpdated);
  }, []);

  const currentRoomStyle = currentRoom ? getRoomCustomStyle(currentRoom.id, currentRoom.name) : {};
  const currentRoomBg = currentRoomStyle.chatBackground || undefined;

  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const mainInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lắng nghe cập nhật reaction
  useEffect(() => {
    const handleReactionsUpdated = (e: any) => {
      setReactionsMap(e.detail || loadReactionsMap());
    };
    window.addEventListener('message_reactions_updated', handleReactionsUpdated);
    return () => window.removeEventListener('message_reactions_updated', handleReactionsUpdated);
  }, []);

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

  const handleToggleReaction = (msgId: number, emoji: string) => {
    const author = currentUserName || 'Tôi';
    toggleMessageReaction(msgId, emoji, author);
    setReactionsMap(loadReactionsMap());
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAttachment(true);
    try {
      const res = await chatBridge.uploadFile(file);
      if (res && res.url) {
        setPendingAttachment({
          name: res.name || file.name,
          size: res.size || `${(file.size / 1024).toFixed(1)} KB`,
          type: res.type || file.type,
          url: res.url
        });
      }
    } catch (err) {
      console.error('Lỗi khi tải tệp tin lên:', err);
    } finally {
      setIsUploadingAttachment(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Xóa ô nhập tin khi đổi kênh hoặc đổi phòng để tránh gửi nhầm
  useEffect(() => {
    setInputText('');
    setEditingId(null);
    setSearchTerm('');
    setShowEmojiPicker(false);
    setShowAttachMenu(false);
    setShowPinnedPopover(false);
    setPendingAttachment(null);
    setReactionPickerMsgId(null);
  }, [currentRoom?.id, currentChannel?.id, isDirectMessageMode]);

  const displayedMessages = searchTerm.trim()
    ? messages.filter(m =>
        m.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.senderName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : messages;

  const [, setSettingsTick] = useState(0);
  useEffect(() => {
    const onSettingsUpdate = () => setSettingsTick(v => v + 1);
    window.addEventListener('user_settings_updated', onSettingsUpdate);
    return () => window.removeEventListener('user_settings_updated', onSettingsUpdate);
  }, []);

  const handleSend = () => {
    let textToSend = inputText.trim();
    if (pendingAttachment) {
      const token = encodeAttachmentToken(pendingAttachment);
      textToSend = textToSend ? `${textToSend} ${token}` : token;
    }
    if (!textToSend) return;
    isUserSendingRef.current = true;
    onSendMessage(textToSend);
    setInputText('');
    setPendingAttachment(null);
    setShowEmojiPicker(false);
    if (mainInputRef.current) {
      mainInputRef.current.style.height = 'auto';
    }
  };

  // Tự động co giãn chiều cao của textarea theo nội dung gõ
  useEffect(() => {
    if (mainInputRef.current) {
      mainInputRef.current.style.height = 'auto';
      const scrollH = mainInputRef.current.scrollHeight;
      mainInputRef.current.style.height = `${Math.min(Math.max(scrollH, 24), 160)}px`;
    }
  }, [inputText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const stored = loadStoredSettings();
      // Nếu enterToSend bị tắt: Ctrl + Enter gửi, Enter xuống dòng
      if (stored.enterToSend === false) {
        if (e.ctrlKey) {
          e.preventDefault();
          handleSend();
        }
        return;
      }
      // Mặc định enterToSend bật: Shift + Enter cho phép xuống dòng, Enter gửi tin
      if (!e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
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

  const [newMessagesBelow, setNewMessagesBelow] = useState(0);
  const [, setIsNearBottom] = useState(true);
  const [isLoadingMoreHistory, setIsLoadingMoreHistory] = useState(false);
  const [hasReachedHistoryEnd, setHasReachedHistoryEnd] = useState(false);

  // Bộ nhớ vị trí cuộn theo từng phòng/kênh (Scroll Position Memory)
  const channelScrollMemoryRef = useRef<Record<string, number>>({});
  const isNearBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(messages.length);
  const prevFirstMsgIdRef = useRef<number | null>(messages[0]?.id || null);
  const scrollSnapshotRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const isUserSendingRef = useRef(false);
  const activeChannelKeyRef = useRef<string>('');

  const currentChannelKey = `${currentRoom?.id || 0}_${currentChannel?.id || 0}`;

  // Cập nhật ref kênh hiện tại
  useEffect(() => {
    activeChannelKeyRef.current = currentChannelKey;
  }, [currentChannelKey]);

  // Khi chuyển kênh/phòng: Lưu vị trí kênh cũ và khôi phục vị trí của kênh mới
  useEffect(() => {
    setNewMessagesBelow(0);
    setIsNearBottom(true);
    isNearBottomRef.current = true;
    setIsLoadingMoreHistory(false);
    setHasReachedHistoryEnd(false);
    prevMessagesLengthRef.current = messages.length;
    prevFirstMsgIdRef.current = messages[0]?.id || null;

    const savedPos = channelScrollMemoryRef.current[currentChannelKey];
    requestAnimationFrame(() => {
      if (!chatMessagesRef.current) return;
      if (typeof savedPos === 'number') {
        chatMessagesRef.current.scrollTop = savedPos;
      } else {
        chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
      }
    });
  }, [currentRoom?.id, currentChannel?.id]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTo({
        top: chatMessagesRef.current.scrollHeight,
        behavior
      });
      setNewMessagesBelow(0);
      setIsNearBottom(true);
      isNearBottomRef.current = true;
    }
  };

  const handleScroll = () => {
    const el = chatMessagesRef.current;
    if (!el) return;

    // Lưu vị trí cuộn của kênh hiện tại
    channelScrollMemoryRef.current[currentChannelKey] = el.scrollTop;

    // Kiểm tra xem người dùng có đang ở gần đáy (trong khoảng 120px) hay không
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom <= 120;
    setIsNearBottom(nearBottom);
    isNearBottomRef.current = nearBottom;

    if (nearBottom) {
      setNewMessagesBelow(0);
    }

    // Tự động tải thêm tin nhắn cũ khi cuộn lên gần đầu danh sách (<= 40px)
    if (el.scrollTop <= 40 && !isLoadingMoreHistory && !hasReachedHistoryEnd) {
      if (messages.length > 0 && onLoadMore) {
        scrollSnapshotRef.current = {
          scrollHeight: el.scrollHeight,
          scrollTop: el.scrollTop
        };
        setIsLoadingMoreHistory(true);
        onLoadMore(messages[0].id);
      }
    }
  };

  // Xử lý giữ nguyên vị trí cuộn khi tin cũ được thêm vào đầu (prepend history)
  // và cuộn bám đáy thông minh khi có tin mới
  useEffect(() => {
    const el = chatMessagesRef.current;
    if (!el) return;

    const prevLen = prevMessagesLengthRef.current;
    const currentLen = messages.length;
    const prevFirstId = prevFirstMsgIdRef.current;
    const currentFirstId = messages[0]?.id || null;

    prevMessagesLengthRef.current = currentLen;
    prevFirstMsgIdRef.current = currentFirstId;

    // 1. Nếu tải thêm tin nhắn cũ vào đầu (first message id thay đổi và số tin nhắn tăng)
    if (scrollSnapshotRef.current && currentLen > prevLen && prevFirstId !== currentFirstId) {
      const { scrollHeight: oldHeight, scrollTop: oldTop } = scrollSnapshotRef.current;
      const heightDifference = el.scrollHeight - oldHeight;
      el.scrollTop = oldTop + heightDifference;
      scrollSnapshotRef.current = null;
      setIsLoadingMoreHistory(false);
      return;
    }

    // Nếu đã gọi loadMore nhưng số tin nhắn không đổi -> máy chủ đã hết tin cũ
    if (isLoadingMoreHistory && currentLen === prevLen) {
      setIsLoadingMoreHistory(false);
      setHasReachedHistoryEnd(true);
    }

    // 2. Nếu do chính người dùng vừa gửi tin nhắn -> lập tức cuộn xuống cuối
    if (isUserSendingRef.current) {
      isUserSendingRef.current = false;
      el.scrollTop = el.scrollHeight;
      setNewMessagesBelow(0);
      setIsNearBottom(true);
      isNearBottomRef.current = true;
      return;
    }

    // 3. Nếu có tin nhắn mới tới (tin nhắn được thêm vào cuối)
    if (currentLen > prevLen) {
      const stored = loadStoredSettings();
      if (stored.autoScroll === false) return;

      if (isNearBottomRef.current) {
        // Đang ở gần đáy -> tự động trượt xuống tin mới
        el.scrollTop = el.scrollHeight;
      } else {
        // Đang cuộn lên đọc tin cũ -> KHÔNG kéo xuống, hiển thị nút 'Có tin nhắn mới'
        const addedCount = currentLen - prevLen;
        setNewMessagesBelow((prev) => prev + addedCount);
      }
    }
  }, [messages, isLoading]);


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
          <div className="chat-header-channel-wrap" title={currentChannel ? `${currentChannel.isPrivate ? '[Riêng tư] ' : ''}Kênh ${currentChannel.name}` : ''}>
            {currentChannel?.isPrivate ? (
              <Lock size={20} className="channel-lock-icon" style={{ color: 'var(--text-muted)' }} />
            ) : currentChannel?.type === 'voice' ? (
              <Volume2 size={22} className="channel-hash-icon" />
            ) : currentChannel?.type === 'forum' ? (
              <MessagesSquare size={22} className="channel-hash-icon" />
            ) : (
              <Hash size={22} className="channel-hash-icon" />
            )}
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
          {/* Nút Mời bạn bè nhanh vào phòng */}
          {onInvite && (
            <button
              type="button"
              className="header-icon-btn"
              title="Mời bạn bè vào phòng"
              aria-label="Mời bạn bè"
              onClick={onInvite}
            >
              <UserPlus size={20} />
            </button>
          )}

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
                        {parseStickerToken(pm.content) 
                          ? `🏷️ [Nhãn dán] ${parseStickerToken(pm.content)?.name}` 
                          : pm.content}
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

      {currentChannel?.type === 'forum' ? (
        <ForumChannelView channel={currentChannel} currentUser={currentUser || null} />
      ) : currentChannel?.type === 'voice' ? (
        <VoiceChannelView 
          channel={currentChannel} 
          currentUser={currentUser || null} 
          members={members} 
        />
      ) : (
        <>
          {/* 2. Messages List Container */}
          <div 
            className="chat-messages-container" 
            ref={chatMessagesRef}
            onScroll={handleScroll}
            style={currentRoomBg ? { backgroundColor: currentRoomBg } : undefined}
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
            {/* Thanh báo / nút bấm tải thêm tin nhắn cũ nếu người dùng muốn bấm chủ động */}
            {onLoadMore && messages.length > 0 && !hasReachedHistoryEnd && (
              <div className="chat-load-more-row">
                <button
                  type="button"
                  className="chat-load-more-btn"
                  onClick={() => {
                    if (chatMessagesRef.current) {
                      scrollSnapshotRef.current = {
                        scrollHeight: chatMessagesRef.current.scrollHeight,
                        scrollTop: chatMessagesRef.current.scrollTop
                      };
                    }
                    setIsLoadingMoreHistory(true);
                    onLoadMore(messages[0].id);
                  }}
                  disabled={isLoadingMoreHistory}
                >
                  {isLoadingMoreHistory ? (
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
                <div className="discord-welcome-cards-grid">
                  <button
                    type="button"
                    className="discord-welcome-card"
                    onClick={() => onInvite()}
                    title="Mời bạn bè vào phòng"
                  >
                    <div className="welcome-card-icon" style={{ background: 'rgba(88, 101, 242, 0.15)', color: '#5865f2' }}>
                      <UserPlus size={22} />
                    </div>
                    <div className="welcome-card-content">
                      <div className="welcome-card-title">Mời bạn bè của bạn</div>
                      <div className="welcome-card-desc">Chia sẻ mã phòng hoặc gửi lời mời để cùng nhau trò chuyện</div>
                    </div>
                    <ArrowRight size={16} className="welcome-card-arrow" />
                  </button>

                  <button
                    type="button"
                    className="discord-welcome-card"
                    onClick={() => mainInputRef.current?.focus()}
                    title="Gửi tin nhắn đầu tiên"
                  >
                    <div className="welcome-card-icon" style={{ background: 'rgba(35, 165, 90, 0.15)', color: '#23a55a' }}>
                      <Send size={22} />
                    </div>
                    <div className="welcome-card-content">
                      <div className="welcome-card-title">Gửi tin nhắn đầu tiên</div>
                      <div className="welcome-card-desc">Bắt đầu cuộc trò chuyện trong kênh #{currentChannel.name}</div>
                    </div>
                    <ArrowRight size={16} className="welcome-card-arrow" />
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
              const { text: afterAttachmentText, attachment } = extractAttachmentFromContent(msg.content);
              const { text: cleanText, sticker } = extractStickerFromContent(afterAttachmentText);
              const canEdit = isMyMsg && msg.id > 0 && !sticker && Boolean(cleanText);
              const canDelete = (isMyMsg || isOwner || currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && msg.id > 0;
              const isPinned = currentPinnedIds.includes(msg.id);
              const msgReactions = reactionsMap[msg.id] || [];

              const memberInfo = !isMyMsg && members 
                ? members.find(m => (msg.senderId && m.id === msg.senderId) || (msg.senderName && (m.displayName === msg.senderName || m.username === msg.senderName)))
                : null;
              const mySettings = isMyMsg ? loadStoredSettings() : null;
              const avatarChar = isMyMsg
                ? (mySettings?.avatarIcon || (msg.senderName ? msg.senderName.charAt(0).toUpperCase() : 'U'))
                : (memberInfo?.avatarIcon || (msg.senderName ? msg.senderName.charAt(0).toUpperCase() : 'U'));
              const avatarColor = isMyMsg
                ? (mySettings?.avatarColor || 'var(--accent)')
                : (memberInfo?.avatarColor || undefined);
              const isAvatarEmoji = isMyMsg ? Boolean(mySettings?.avatarIcon) : Boolean(memberInfo?.avatarIcon);

              return (
                <React.Fragment key={msg.id || idx}>
                  {/* Ngăn cách ngày */}
                  {isNewDay && curDateKey && (
                    <div className="date-divider">
                      <span className="date-badge">{formatDateLabel(curDateKey)}</span>
                    </div>
                  )}

                  <div 
                    className={`discord-message-row ${isGrouped ? 'grouped' : ''} ${sticker ? 'sticker-row' : ''} ${isPinned ? 'pinned-row' : ''}`}
                    id={`msg-${msg.id}`}
                    style={{ position: 'relative' }}
                  >
                    {isGrouped ? (
                      <span className="grouped-timestamp" title={timeInfo.full}>
                        {timeInfo.short}
                      </span>
                    ) : (
                      <div className="msg-avatar-col">
                        <div 
                          className="user-avatar-circle"
                          style={{
                            backgroundColor: avatarColor,
                            fontSize: isAvatarEmoji ? '18px' : undefined
                          }}
                        >
                          {avatarChar}
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
                      ) : (
                        <div className="msg-payload-wrap">
                          {/* Nội dung text nếu có */}
                          {cleanText ? (
                            <div className="msg-body">
                              {cleanText}
                              {msg.isEdited && <span className="edited-badge" title="Tin nhắn đã chỉnh sửa">(đã chỉnh sửa)</span>}
                            </div>
                          ) : null}

                          {/* Đính kèm ảnh hoặc tệp tin */}
                          {attachment && (
                            <MessageAttachmentView attachment={attachment} />
                          )}

                          {/* Nhãn dán Sticker luôn render thành một khối block độc lập */}
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

                          {/* Danh sách reaction emoji dưới tin nhắn */}
                          <MessageReactionList
                            messageId={msg.id}
                            reactions={msgReactions}
                            currentUserName={currentUserName || 'Tôi'}
                            onToggleReaction={(emoji) => handleToggleReaction(msg.id, emoji)}
                            onOpenPicker={() => setReactionPickerMsgId(msg.id)}
                          />
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

                    {/* Toolbar thao tác Quick Reaction / ghim / sửa / xóa tin nhắn */}
                    <div className="msg-quick-toolbar">
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
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

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
            onUploadFile={() => fileInputRef.current?.click()}
            onClose={() => setShowAttachMenu(false)}
          />
        )}

        <AttachmentPreviewBox
          attachment={pendingAttachment}
          isUploading={isUploadingAttachment}
          onRemove={() => setPendingAttachment(null)}
        />

        <div className="chat-input-pill">
          <button 
            type="button" 
            className="input-attach-btn" 
            title="Đính kèm tệp tin / Hình ảnh"
            aria-label="Đính kèm tệp tin"
            disabled={!currentChannel || isLoading}
            onClick={() => {
              setShowAttachMenu((v) => !v);
              setShowEmojiPicker(false);
            }}
          >
            <PlusCircle size={22} />
          </button>

          <textarea
            ref={mainInputRef}
            rows={1}
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
            title={loadStoredSettings().enterToSend ? "Gửi tin nhắn (Enter)" : "Gửi tin nhắn (Ctrl + Enter)"}
            onClick={handleSend}
            disabled={(!inputText.trim() && !pendingAttachment) || !currentChannel || isLoading}
            aria-label="Gửi tin nhắn"
          >
            <Send size={18} />
          </button>
        </div>

        {/* Nút 'Có tin nhắn mới · Xuống cuối' bám trên ô nhập khi người dùng cuộn lên trên */}
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
        </>
      )}
    </div>
  );
};

export default ChatCenter;
