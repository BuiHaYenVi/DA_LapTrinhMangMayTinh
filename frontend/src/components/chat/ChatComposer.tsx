import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, PlusCircle } from 'lucide-react';
import { EmojiStickerPicker, QuickAttachMenu } from './EmojiStickerPicker';
import { loadStoredSettings } from '../UserSettingsModal';

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
  const [, setTick] = useState(0);

  useEffect(() => {
    const onUpdate = () => setTick(v => v + 1);
    window.addEventListener('user_settings_updated', onUpdate);
    return () => window.removeEventListener('user_settings_updated', onUpdate);
  }, []);

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
    if (e.key === 'Enter') {
      const stored = loadStoredSettings();
      if (stored.enterToSend === false) {
        if (e.ctrlKey) {
          e.preventDefault();
          handleSubmit();
        } else {
          e.preventDefault();
        }
        return;
      }
      if (!e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
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
              title={loadStoredSettings().enterToSend ? "Gửi tin nhắn (Enter)" : "Gửi tin nhắn (Ctrl + Enter)"}
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
