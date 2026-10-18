import React, { useState, useRef, useEffect } from 'react';
import { Smile, Sticker as StickerIcon, Search, X, Code, Quote, Sparkles, Flame } from 'lucide-react';

export interface StickerItem {
  id: string;
  emoji: string;
  label: string;
  bgGradient: string;
}

export const STICKER_PACK: StickerItem[] = [
  { id: 'wave', emoji: '👋', label: 'Chào bạn nha!', bgGradient: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)' },
  { id: 'party', emoji: '🎉', label: 'Ăn mừng thôi!', bgGradient: 'linear-gradient(135deg, #EB459E 0%, #9B59B6 100%)' },
  { id: 'love', emoji: '💖', label: 'Thả tim cực mạnh!', bgGradient: 'linear-gradient(135deg, #ED4245 0%, #EB459E 100%)' },
  { id: 'lol', emoji: '🤣', label: 'Cười xỉu luôn!', bgGradient: 'linear-gradient(135deg, #FEE75C 0%, #F59E0B 100%)' },
  { id: 'gg', emoji: '🏆', label: 'Good Game (GG)!', bgGradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' },
  { id: 'fire', emoji: '🔥', label: 'Quá cháy luôn!', bgGradient: 'linear-gradient(135deg, #EF4444 0%, #F97316 100%)' },
  { id: 'ok', emoji: '👌', label: 'Okela chốt đơn!', bgGradient: 'linear-gradient(135deg, #23A55A 0%, #10B981 100%)' },
  { id: 'coding', emoji: '💻', label: 'Đang fix bug...', bgGradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' },
  { id: 'coffee', emoji: '☕', label: 'Làm ly cà phê!', bgGradient: 'linear-gradient(135deg, #92400E 0%, #B45309 100%)' },
  { id: 'cry', emoji: '😭', label: 'Khóc một dòng sông', bgGradient: 'linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%)' },
  { id: 'sleep', emoji: '😴', label: 'Đi ngủ trước đây', bgGradient: 'linear-gradient(135deg, #6366F1 0%, #4338CA 100%)' },
  { id: 'rocket', emoji: '🚀', label: 'Bay lên mặt trăng!', bgGradient: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)' }
];

export const EMOJI_CATEGORIES: { id: string; name: string; icon: string; emojis: string[] }[] = [
  {
    id: 'smileys',
    name: 'Mặt cười & Cảm xúc',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
      '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
      '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
      '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨',
      '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
      '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐',
      '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧',
      '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓',
      '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀'
    ]
  },
  {
    id: 'gestures',
    name: 'Cử chỉ & Con người',
    icon: '👋',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
      '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍',
      '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
      '🙏', '✍️', '💪', '🦾', '🫶', '❤️', '🧡', '💛', '💚', '💙',
      '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗',
      '💖', '💘', '💝', '💟', '💯', '💢', '💥', '💫', '💦', '💨'
    ]
  },
  {
    id: 'activities',
    name: 'Hoạt động & Giải trí',
    icon: '🎮',
    emojis: [
      '🎮', '🕹️', '🎲', '🎯', '🎳', '🎰', '🧩', '🏆', '🥇', '🥈',
      '🥉', '🏅', '🎖️', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎱',
      '🎸', '🎹', '🎺', '🎻', '🥁', '🎤', '🎧', '🎬', '🎨', '🎭',
      '🎉', '🎊', '🎈', '🎂', '🎁', '🎆', '🎇', '🧨', '✨', '🔥',
      '⚡', '🌈', '☀️', '🌙', '⭐', '🌟', '☄️', '🚀', '🛸', '💻'
    ]
  },
  {
    id: 'food',
    name: 'Đồ ăn & Thức uống',
    icon: '🍔',
    emojis: [
      '🍎', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍓', '🫐', '🍒',
      '🍑', '🥝', '🍅', '🥑', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮',
      '🌯', '🍜', '🍝', '🍣', '🍤', '🍙', '🍚', '🍛', '🍢', '🍡',
      '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬',
      '🍫', '🍿', '🍩', '🍪', '☕', '🍵', '🧋', '🥤', '🍺', '🍻'
    ]
  }
];

export function formatStickerToken(sticker: StickerItem): string {
  return `[STICKER:${sticker.id}|${sticker.label}|${sticker.emoji}]`;
}

export function parseStickerToken(content: string): StickerItem | null {
  if (!content) return null;
  const trimmed = content.trim();
  const match = /^\[STICKER:([a-z0-9_-]+)\|([^|\]]+)\|([^\]]+)\]$/i.exec(trimmed);
  if (!match) return null;
  const [, id, label, emoji] = match;
  const found = STICKER_PACK.find(s => s.id === id);
  return {
    id,
    label,
    emoji,
    bgGradient: found?.bgGradient || 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)'
  };
}

interface EmojiStickerPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onSelectSticker: (stickerToken: string) => void;
  onClose: () => void;
}

export const EmojiStickerPicker: React.FC<EmojiStickerPickerProps> = ({
  onSelectEmoji,
  onSelectSticker,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'emoji' | 'sticker'>('emoji');
  const [selectedCategory, setSelectedCategory] = useState<string>('smileys');
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  const filteredStickers = STICKER_PACK.filter(s =>
    !search.trim() || s.label.toLowerCase().includes(search.trim().toLowerCase()) || s.id.includes(search.trim().toLowerCase())
  );

  return (
    <div
      ref={containerRef}
      className="emoji-sticker-popover"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="emoji-sticker-header">
        <div className="emoji-sticker-tabs">
          <button
            type="button"
            className={`emoji-sticker-tab ${activeTab === 'emoji' ? 'active' : ''}`}
            onClick={() => setActiveTab('emoji')}
          >
            <Smile size={15} />
            <span>Emoji</span>
          </button>
          <button
            type="button"
            className={`emoji-sticker-tab ${activeTab === 'sticker' ? 'active' : ''}`}
            onClick={() => setActiveTab('sticker')}
          >
            <StickerIcon size={15} />
            <span>Sticker</span>
          </button>
        </div>
        <button type="button" className="emoji-sticker-close" onClick={onClose} title="Đóng">
          <X size={16} />
        </button>
      </div>

      {activeTab === 'emoji' ? (
        <>
          <div className="emoji-category-bar">
            {EMOJI_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`emoji-cat-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
                title={cat.name}
              >
                {cat.icon}
              </button>
            ))}
          </div>
          <div className="emoji-sticker-body">
            {EMOJI_CATEGORIES.filter(c => c.id === selectedCategory).map(cat => (
              <div key={cat.id}>
                <div className="emoji-cat-title">{cat.name}</div>
                <div className="emoji-grid">
                  {cat.emojis.map((em, idx) => (
                    <button
                      key={`${cat.id}-${idx}`}
                      type="button"
                      className="emoji-cell-btn"
                      onClick={() => onSelectEmoji(em)}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="emoji-search-wrap">
            <Search size={14} className="emoji-search-icon" />
            <input
              type="text"
              className="emoji-search-input"
              placeholder="Tìm kiếm sticker..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="emoji-sticker-body">
            <div className="emoji-cat-title">Bộ nhãn dán Discord Mini</div>
            <div className="sticker-grid">
              {filteredStickers.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  className="sticker-card-btn"
                  style={{ background: st.bgGradient }}
                  onClick={() => {
                    onSelectSticker(formatStickerToken(st));
                    onClose();
                  }}
                >
                  <span className="sticker-card-emoji">{st.emoji}</span>
                  <span className="sticker-card-label">{st.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

interface QuickAttachMenuProps {
  onInsertTemplate: (text: string) => void;
  onOpenStickerTab: () => void;
  onClose: () => void;
}

export const QuickAttachMenu: React.FC<QuickAttachMenuProps> = ({
  onInsertTemplate,
  onOpenStickerTab,
  onClose
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [onClose]);

  return (
    <div ref={menuRef} className="quick-attach-popover" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="quick-attach-item"
        onClick={() => {
          onOpenStickerTab();
          onClose();
        }}
      >
        <Sparkles size={16} style={{ color: '#f59e0b' }} />
        <div>
          <div className="quick-attach-title">Gửi Nhãn dán (Sticker)</div>
          <div className="quick-attach-desc">Chọn nhãn dán cảm xúc sinh động</div>
        </div>
      </button>
      <button
        type="button"
        className="quick-attach-item"
        onClick={() => {
          onInsertTemplate('`code` ');
          onClose();
        }}
      >
        <Code size={16} style={{ color: '#5865f2' }} />
        <div>
          <div className="quick-attach-title">Chèn đoạn mã (Code)</div>
          <div className="quick-attach-desc">Định dạng lệnh hoặc đoạn code ngắn</div>
        </div>
      </button>
      <button
        type="button"
        className="quick-attach-item"
        onClick={() => {
          onInsertTemplate('>>> ');
          onClose();
        }}
      >
        <Quote size={16} style={{ color: '#23a55a' }} />
        <div>
          <div className="quick-attach-title">Chèn trích dẫn (Quote)</div>
          <div className="quick-attach-desc">Làm nổi bật thông báo quan trọng</div>
        </div>
      </button>
      <button
        type="button"
        className="quick-attach-item"
        onClick={() => {
          onInsertTemplate('🔥 [Thông báo] ');
          onClose();
        }}
      >
        <Flame size={16} style={{ color: '#ef4444' }} />
        <div>
          <div className="quick-attach-title">Tiêu đề nổi bật</div>
          <div className="quick-attach-desc">Tạo thông báo nhanh trong phòng</div>
        </div>
      </button>
    </div>
  );
};
