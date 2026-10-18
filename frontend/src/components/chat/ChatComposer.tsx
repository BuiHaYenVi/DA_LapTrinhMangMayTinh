import React, { useState, useRef } from 'react';
import { Send, Smile, PlusCircle } from 'lucide-react';
import { EmojiStickerPicker, QuickAttachMenu } from './EmojiStickerPicker';

interface Props {
  placeholder?: string;
  disabled?: boolean;
  onSendMessage: (text: string) => void;
}

export const ChatComposer: React.FC<Props> = ({
  placeholder = 'Nhập tin nhắn...',
  disabled = false,
  onSendMessage
}) => {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSendMessage(trimmed);
    setText('');
    setShowEmojiPicker(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
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
      handleSubmit();
    }
  };

  return (
    <div className="dm-composer" style={{ position: 'relative' }}>
      {showEmojiPicker && (
        <EmojiStickerPicker
          onSelectEmoji={(emoji) => {
            setText((prev) => prev + emoji);
            inputRef.current?.focus();
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
            setText((prev) => prev + tpl);
            inputRef.current?.focus();
          }}
          onOpenStickerTab={() => {
            setShowAttachMenu(false);
            setShowEmojiPicker(true);
          }}
          onClose={() => setShowAttachMenu(false)}
        />
      )}

      <form className="dm-composer-form" onSubmit={handleSubmit}>
        <div className="dm-composer-pill">
          <button
            type="button"
            className="input-attach-btn"
            title="Chèn nhanh / Nhãn dán"
            aria-label="Chèn nhanh"
            disabled={disabled}
            onClick={() => {
              setShowAttachMenu((v) => !v);
              setShowEmojiPicker(false);
            }}
            style={{ marginRight: '6px' }}
          >
            <PlusCircle size={20} />
          </button>

          <input
            ref={inputRef}
            type="text"
            className="dm-composer-input"
            placeholder={placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            aria-label="Nội dung tin nhắn"
          />

          <div className="dm-composer-actions">
            <button
              type="button"
              className={`dm-composer-btn emoji ${showEmojiPicker ? 'active' : ''}`}
              title="Chọn Emoji & Sticker"
              aria-label="Chọn Emoji & Sticker"
              disabled={disabled}
              onClick={() => {
                setShowEmojiPicker((v) => !v);
                setShowAttachMenu(false);
              }}
            >
              <Smile size={20} />
            </button>
            <button
              type="submit"
              className="dm-composer-btn send"
              title="Gửi tin nhắn"
              aria-label="Gửi tin nhắn"
              disabled={!text.trim() || disabled}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
