import React, { useState, useEffect, useRef } from 'react';
import { X, Hash, MessagesSquare, Smile, Lock, Search } from 'lucide-react';
import type { Room, Channel, ChannelType } from '../types/chat';
import { EMOJI_CATEGORIES } from './chat/EmojiStickerPicker';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
  existingChannels?: Channel[];
  onCreateChannel: (
    roomId: number,
    channelName: string,
    channelType: ChannelType,
    isPrivate: boolean
  ) => Promise<{ success: boolean; error?: string }>;
}

export const CreateChannelModal: React.FC<Props> = ({
  isOpen,
  onClose,
  room,
  existingChannels = [],
  onCreateChannel
}) => {
  const [channelType, setChannelType] = useState<ChannelType>('text');
  const [channelName, setChannelName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Popover Emoji Picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('smileys');
  const [hoveredEmoji, setHoveredEmoji] = useState<{ emoji: string; name: string } | null>(null);

  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setChannelType('text');
      setChannelName('');
      setIsPrivate(false);
      setErrorMsg('');
      setIsSubmitting(false);
      setShowEmojiPicker(false);
      setEmojiSearch('');
      setHoveredEmoji(null);
    }
  }, [isOpen]);

  // Đóng popover Emoji khi click ra ngoài
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showEmojiPicker]);

  if (!isOpen || !room) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    setChannelName('');
    setErrorMsg('');
    setShowEmojiPicker(false);
    onClose();
  };

  // Chuẩn hóa tên kênh tự động (thay khoảng trắng thành '-', cho phép emoji và tiếng Việt)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Thay thế khoảng trắng thành dấu '-' chuẩn quy ước kênh Discord
    const formatted = val.replace(/\s+/g, '-');
    setChannelName(formatted);
    if (errorMsg) setErrorMsg('');
  };

  const handleSelectEmoji = (emoji: string) => {
    if (!channelName) {
      setChannelName(`${emoji}-`);
    } else {
      setChannelName(prev => `${prev}-${emoji}`.replace(/-+/g, '-'));
    }
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    let trimmed = channelName.trim();
    // Loại bỏ dấu gạch nối thừa ở đầu và cuối nếu có
    trimmed = trimmed.replace(/^-+|-+$/g, '');

    if (!trimmed) {
      setErrorMsg('Vui lòng nhập tên kênh chat.');
      return;
    }

    if (trimmed.length > 50) {
      setErrorMsg('Tên kênh không được vượt quá 50 ký tự.');
      return;
    }

    // Kiểm tra tên kênh trùng trong cùng một phòng (case-insensitive)
    const isDuplicate = existingChannels.some(
      ch => ch.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setErrorMsg(`Kênh "${trimmed}" đã tồn tại trong máy chủ này. Vui lòng chọn tên khác.`);
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const result = await onCreateChannel(room.id, trimmed, channelType, isPrivate);
      if (result.success) {
        handleClose();
      } else {
        setErrorMsg(result.error || 'Không thể tạo kênh. Vui lòng thử lại.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Lỗi kết nối khi gửi yêu cầu tạo kênh.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lọc emoji theo tìm kiếm
  const filteredEmojis = () => {
    const q = emojiSearch.trim().toLowerCase();
    if (!q) {
      const cat = EMOJI_CATEGORIES.find(c => c.id === activeCategory);
      return cat ? cat.emojis : EMOJI_CATEGORIES[0].emojis;
    }
    const all = EMOJI_CATEGORIES.flatMap(c => c.emojis);
    return all.filter(em => em.includes(q));
  };

  const currentPrefixIcon = () => {
    switch (channelType) {
      case 'forum':
        return <MessagesSquare size={18} />;
      case 'text':
      default:
        return <Hash size={18} />;
    }
  };

  const currentPlaceholder = () => {
    switch (channelType) {
      case 'forum':
        return 'diễn-đàn-thảo-luận';
      case 'text':
      default:
        return 'kênh-mới';
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div
        className="channel-modal-card"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-channel-title"
      >
        {/* Nút đóng (X) ở góc phải trên */}
        <button
          type="button"
          className="channel-modal-close"
          onClick={handleClose}
          disabled={isSubmitting}
          title="Đóng (ESC)"
          aria-label="Đóng"
        >
          <X size={18} />
        </button>

        <form onSubmit={handleSubmit}>
          {/* Header Modal */}
          <div className="channel-modal-header">
            <h2 id="create-channel-title" className="channel-modal-title">
              Tạo kênh
            </h2>
            <div className="channel-modal-subtitle">
              trong <strong>{room.name}</strong>
            </div>
          </div>

          {/* Section: LOẠI KÊNH (Kênh Văn bản thật qua Socket TCP) */}
          <div className="channel-modal-section">
            <label className="channel-section-label">Loại Kênh</label>

            {/* Kênh Văn Bản */}
            <div
              className="channel-type-option active"
              role="radio"
              aria-checked={true}
              tabIndex={0}
            >
              <div className="channel-radio-indicator">
                <div className="channel-radio-dot" />
              </div>
              <div className="channel-type-icon">
                <Hash size={22} />
              </div>
              <div className="channel-type-info">
                <div className="channel-type-name">Kênh Văn bản</div>
                <div className="channel-type-desc">
                  Trò chuyện thời gian thực, gửi hình ảnh, tệp tin và sticker
                </div>
              </div>
            </div>
          </div>

          {/* Section: TÊN KÊNH (Kèm Tiền tố & Nút Emoji Picker chuẩn Discord) */}
          <div className="channel-modal-section" style={{ position: 'relative' }}>
            <label className="channel-section-label" htmlFor="create-channel-name-input">
              Tên kênh
            </label>
            <div className="channel-input-wrapper">
              <span className="channel-input-prefix">
                {currentPrefixIcon()}
              </span>
              <input
                ref={inputRef}
                id="create-channel-name-input"
                type="text"
                className="channel-name-field"
                value={channelName}
                onChange={handleNameChange}
                placeholder={currentPlaceholder()}
                maxLength={50}
                disabled={isSubmitting}
                autoFocus
              />
              <button
                type="button"
                className={`channel-input-suffix ${showEmojiPicker ? 'active' : ''}`}
                title="Chọn biểu cảm cho tên kênh"
                aria-label="Chọn biểu cảm"
                onClick={() => setShowEmojiPicker(v => !v)}
              >
                <Smile size={18} />
              </button>
            </div>

            {/* Popover Emoji Picker nổi khi bấm nút Smiley Face */}
            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                className="channel-emoji-popover"
                onClick={e => e.stopPropagation()}
              >
                {/* Thanh tìm kiếm Emoji */}
                <div className="channel-emoji-search-wrap">
                  <Search size={14} color="var(--text-muted)" />
                  <input
                    type="text"
                    className="channel-emoji-search-input"
                    value={emojiSearch}
                    onChange={e => setEmojiSearch(e.target.value)}
                    placeholder="Tìm biểu cảm..."
                    autoFocus
                  />
                  {emojiSearch && (
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      onClick={() => setEmojiSearch('')}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Danh mục Emoji */}
                {!emojiSearch && (
                  <div className="channel-emoji-categories">
                    {EMOJI_CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        className={`channel-emoji-cat-btn ${activeCategory === cat.id ? 'active' : ''}`}
                        title={cat.name}
                        onClick={() => setActiveCategory(cat.id)}
                      >
                        {cat.icon}
                      </button>
                    ))}
                  </div>
                )}

                {/* Lưới Emoji */}
                <div className="channel-emoji-grid">
                  {filteredEmojis().map((em, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="channel-emoji-item"
                      onClick={() => handleSelectEmoji(em)}
                      onMouseEnter={() => setHoveredEmoji({ emoji: em, name: `emoji_${idx}` })}
                      onMouseLeave={() => setHoveredEmoji(null)}
                    >
                      {em}
                    </button>
                  ))}
                  {filteredEmojis().length === 0 && (
                    <div style={{ gridColumn: '1 / -1', padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                      Không tìm thấy biểu cảm phù hợp.
                    </div>
                  )}
                </div>

                {/* Footer xem trước Emoji đang di chuột */}
                <div className="channel-emoji-preview-footer">
                  <span style={{ fontSize: '22px', minWidth: '28px', textAlign: 'center' }}>
                    {hoveredEmoji ? hoveredEmoji.emoji : '🙂'}
                  </span>
                  <span style={{ fontWeight: 500, color: 'var(--text-normal)' }}>
                    {hoveredEmoji ? `:${hoveredEmoji.emoji}:` : 'Chọn biểu cảm để thêm vào tên'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section: KÊNH RIÊNG & TOGGLE SWITCH */}
          <div className="channel-modal-section private-section">
            <div className="channel-private-row">
              <div className="channel-private-left">
                <Lock size={18} className="channel-private-icon" />
                <span className="channel-private-label">Kênh Riêng</span>
              </div>
              <label className="channel-switch" title="Chuyển đổi trạng thái Kênh Riêng">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={e => setIsPrivate(e.target.checked)}
                  disabled={isSubmitting}
                />
                <span className="channel-slider" />
              </label>
            </div>
            <p className="channel-private-desc">
              Chỉ có thành viên và vai trò được chọn mới có thể nhìn thấy kênh này.
            </p>
          </div>

          {/* Thông báo lỗi inline */}
          {errorMsg && (
            <div style={{ padding: '0 24px 12px' }}>
              <div className="room-modal-inline-error" role="alert">
                ⚠️ {errorMsg}
              </div>
            </div>
          )}

          {/* Footer nút hành động */}
          <div className="channel-modal-footer">
            <button
              type="button"
              className="channel-btn-cancel"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="channel-btn-submit"
              disabled={isSubmitting || !channelName.trim()}
            >
              {isSubmitting ? 'Đang tạo...' : 'Tạo kênh'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChannelModal;
