import React, { useState } from 'react';
import type { Room, MessageItem } from '../types/chat';
import { Hash, Search, UserPlus, LogOut, Plus, Smile, Image, Paperclip, Send } from 'lucide-react';

interface Props {
  currentRoom: Room | null;
  messages: MessageItem[];
  currentUserId: number;
  onSendMessage: (text: string) => void;
  onInvite: () => void;
  onLeave: () => void;
  onKick: () => void;
  isOwner: boolean;
}

export const ChatCenter: React.FC<Props> = ({
  currentRoom,
  messages,
  currentUserId,
  onSendMessage,
  onInvite,
  onLeave,
  onKick,
  isOwner
}) => {
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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

  return (
    <div className="chat-center">
      {/* 1. Header Bar */}
      <div className="chat-header">
        <div className="chat-header-left">
          <Hash size={24} color="var(--text-muted)" />
          <div className="chat-header-title">{currentRoom ? currentRoom.name : 'Chọn phòng chat'}</div>
          {currentRoom && (
            <div className="chat-header-desc">
              Nơi mọi người cùng thảo luận, chia sẻ và học hỏi.
            </div>
          )}
        </div>

        <div className="chat-header-right">
          <div className="search-pill">
            <Search size={14} color="var(--text-muted)" />
            <input 
              placeholder="Tìm kiếm trong phòng..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
                onClick={() => setSearchTerm('')}
              >
                ✕
              </button>
            )}
          </div>

          {currentRoom && (
            <>
              <button className="header-btn blurple" onClick={onInvite} title="Mời bạn vào phòng">
                <UserPlus size={15} />
                <span>Mời bạn</span>
              </button>

              {isOwner && (
                <button className="header-btn red" onClick={onKick} title="Kick thành viên (chỉ Trưởng nhóm)">
                  <span>Kick</span>
                </button>
              )}

              <button className="header-btn red" onClick={onLeave} title="Rời phòng">
                <LogOut size={15} />
                <span>Rời phòng</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Messages History */}
      <div className="chat-messages">
        {currentRoom ? (
          <>
            <div className="date-divider">
              <span className="date-badge">16/10/2026</span>
            </div>

            {displayedMessages.map((msg, idx) => (
              <div 
                key={msg.id || idx} 
                className={`message-card ${msg.senderId === currentUserId ? 'highlight' : ''}`}
              >
                <div className="message-avatar">
                  {msg.senderName ? msg.senderName.charAt(0).toUpperCase() : 'U'}
                </div>

                <div className="message-body">
                  <div className="message-header">
                    <span className={`sender-name ${msg.senderId === currentUserId ? 'me' : ''}`}>
                      {msg.senderName} {msg.senderId === currentUserId ? '(Bạn)' : ''}
                    </span>
                    <span className="message-time">{msg.timestamp || 'Vừa xong'}</span>
                  </div>

                  <div className="message-content">{msg.content}</div>

                  <div className="reactions-list">
                    <div className="reaction-pill">
                      <span>👍</span>
                      <span>1</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
                <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-header)' }}>
                  Chào mừng đến với #{currentRoom.name}!
                </p>
                <p style={{ fontSize: '13px', marginTop: '6px' }}>
                  Đây là sự khởi đầu của kênh trò chuyện. Hãy gửi tin nhắn đầu tiên!
                </p>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            <Hash size={48} />
            <p style={{ marginTop: '12px', fontSize: '16px', fontWeight: 600 }}>Chưa chọn phòng chat</p>
            <p style={{ fontSize: '13px' }}>Hãy chọn một phòng ở danh sách bên trái để tham gia trò chuyện.</p>
          </div>
        )}
      </div>

      {/* 3. Bottom Input Box */}
      <div className="chat-input-container">
        <div className="chat-input-pill">
          <button className="icon-btn" title="Đính kèm file">
            <Plus size={20} />
          </button>

          <input
            placeholder={currentRoom ? `Nhắn tin trong #${currentRoom.name}...` : 'Hãy chọn phòng để gõ tin nhắn...'}
            disabled={!currentRoom}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <button className="icon-btn" title="Thêm Emoji" onClick={() => setInputText(prev => prev + ' 😊 ')}><Smile size={18} /></button>
          <button className="icon-btn" title="Hình ảnh" onClick={() => setInputText(prev => prev + ' [Hình ảnh] ')}><Image size={18} /></button>
          <button className="icon-btn" title="Đính kèm file" onClick={() => setInputText(prev => prev + ' [File đính kèm] ')}><Paperclip size={18} /></button>

          <button 
            className="icon-btn" 
            style={{ color: inputText.trim() ? 'var(--accent-blurple)' : 'var(--text-muted)' }}
            onClick={handleSend}
            disabled={!inputText.trim()}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
