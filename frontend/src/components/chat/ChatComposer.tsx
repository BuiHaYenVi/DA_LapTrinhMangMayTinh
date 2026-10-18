import React, { useState, useRef } from 'react';
import { Send, Smile } from 'lucide-react';

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
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSendMessage(trimmed);
    setText('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="dm-composer">
      <form className="dm-composer-form" onSubmit={handleSubmit}>
        <div className="dm-composer-pill">
          <input
            ref={inputRef}
            type="text"
            className="dm-composer-input"
            placeholder={placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled}
            aria-label="Nội dung tin nhắn"
          />

          <div className="dm-composer-actions">
            <button
              type="button"
              className="dm-composer-btn emoji"
              title="Emoji"
              aria-label="Emoji"
              disabled={disabled}
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
