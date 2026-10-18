import React, { useState, useRef, useEffect } from 'react';
import { Smile, Sticker as StickerIcon, Search, X, Code, Quote, Sparkles, Flame } from 'lucide-react';

import { 
  STICKER_LIST, 
  type StickerItem, 
  formatStickerToken, 
  parseStickerToken 
} from './stickerData';

export type { StickerItem };
export { formatStickerToken, parseStickerToken, STICKER_LIST };
export const STICKER_PACK = STICKER_LIST;

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
  const [stickerFilter, setStickerFilter] = useState<'all' | 'animated' | 'static'>('all');
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

  const animatedCount = STICKER_LIST.filter(s => s.type === 'animated').length;
  const staticCount = STICKER_LIST.filter(s => s.type === 'static').length;

  const filteredStickers = STICKER_LIST.filter(s => {
    if (stickerFilter !== 'all' && s.type !== stickerFilter) return false;
    if (!search.trim()) return true;
    const query = search.trim().toLowerCase();
    return (
      s.name.toLowerCase().includes(query) ||
      s.pack.toLowerCase().includes(query) ||
      s.id.toLowerCase().includes(query)
    );
  });

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
              placeholder="Tìm kiếm nhãn dán theo tên, gói..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="sticker-filter-bar">
            <button
              type="button"
              className={`sticker-filter-btn ${stickerFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStickerFilter('all')}
            >
              Tất cả ({STICKER_LIST.length})
            </button>
            <button
              type="button"
              className={`sticker-filter-btn ${stickerFilter === 'animated' ? 'active' : ''}`}
              onClick={() => setStickerFilter('animated')}
            >
              🎬 Động ({animatedCount})
            </button>
            <button
              type="button"
              className={`sticker-filter-btn ${stickerFilter === 'static' ? 'active' : ''}`}
              onClick={() => setStickerFilter('static')}
            >
              🖼️ Tĩnh ({staticCount})
            </button>
          </div>

          <div className="emoji-sticker-body sticker-picker-body">
            {filteredStickers.length === 0 ? (
              <div className="sticker-empty-state">
                <span>Không tìm thấy nhãn dán phù hợp</span>
              </div>
            ) : (
              <div className="discord-sticker-grid">
                {filteredStickers.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    className="discord-sticker-card-btn"
                    title={`${st.name} • ${st.type === 'animated' ? 'Nhãn dán Động' : 'Nhãn dán Tĩnh'} (${st.pack})`}
                    onClick={() => {
                      onSelectSticker(formatStickerToken(st));
                      onClose();
                    }}
                  >
                    <div className="discord-sticker-preview-box">
                      <img
                        src={st.url}
                        alt={st.name}
                        className={`discord-picker-sticker-img ${st.type === 'animated' ? 'animated' : 'static'}`}
                        loading="lazy"
                      />
                      {st.type === 'animated' ? (
                        <span className="sticker-badge-gif">GIF</span>
                      ) : (
                        <span className="sticker-badge-static">TĨNH</span>
                      )}
                    </div>
                    <span className="discord-picker-sticker-name">{st.name}</span>
                  </button>
                ))}
              </div>
            )}
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
