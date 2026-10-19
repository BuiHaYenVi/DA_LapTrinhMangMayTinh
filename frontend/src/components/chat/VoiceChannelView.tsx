import React, { useState, useEffect } from 'react';
import { 
  Mic, MicOff, Headphones, VolumeX, Monitor, 
  PhoneOff, Radio, Users 
} from 'lucide-react';
import type { Channel, User } from '../../types/chat';

interface Props {
  channel: Channel;
  currentUser: User | null;
  members: User[];
  onDisconnect?: () => void;
}

export const VoiceChannelView: React.FC<Props> = ({
  channel,
  currentUser,
  members = [],
  onDisconnect
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Hiệu ứng giả lập phát hiện giọng nói (voice activity) sinh động chuẩn Discord
  useEffect(() => {
    if (isMuted) {
      setIsSpeaking(false);
      return;
    }
    const interval = setInterval(() => {
      // Xác suất 40% nhấp nháy nói chuyện
      setIsSpeaking(Math.random() > 0.6);
    }, 1800);
    return () => clearInterval(interval);
  }, [isMuted]);

  // Giả lập danh sách người đang ở trong phòng thoại (ít nhất gồm currentUser và các thành viên online)
  const voiceParticipants = [
    {
      id: currentUser?.id || 1,
      displayName: currentUser?.displayName || currentUser?.username || 'Tôi (Bạn)',
      isSpeaking: isSpeaking,
      isMuted: isMuted,
      avatarColor: currentUser?.avatarColor || '#5865f2'
    },
    ...members
      .filter(m => m.id !== currentUser?.id && m.online !== false)
      .slice(0, 3)
      .map(m => ({
        id: m.id,
        displayName: m.displayName || m.username,
        isSpeaking: Math.random() > 0.7,
        isMuted: false,
        avatarColor: m.avatarColor || '#23a55a'
      }))
  ];

  return (
    <div className="voice-channel-viewport" style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-2)', overflow: 'hidden' }}>
      {/* Banner Trạng thái Kết nối Thoại */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', backgroundColor: 'var(--bg-1)', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#23a55a', fontSize: '13px', fontWeight: 600 }}>
            <Radio size={16} className="voice-connected-pulse" />
            <span>Đã kết nối thoại</span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>|</span>
          <span style={{ fontSize: '13px', color: 'var(--text-header)', fontWeight: 600 }}>
            🔊 {channel.name}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px' }}>
            RTC 18ms
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <Users size={15} />
          <span>{voiceParticipants.length} người đang kết nối</span>
        </div>
      </div>

      {/* Lưới Grid Hiển thị Người tham gia Kênh Thoại */}
      <div style={{ flex: 1, padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignContent: 'center', overflowY: 'auto' }}>
        {voiceParticipants.map(participant => (
          <div
            key={participant.id}
            style={{
              position: 'relative',
              backgroundColor: 'var(--bg-card)',
              borderRadius: '12px',
              border: participant.isSpeaking ? '2px solid #23a55a' : '2px solid var(--border-color)',
              boxShadow: participant.isSpeaking ? '0 0 12px rgba(35, 165, 90, 0.35)' : 'none',
              height: '180px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
            }}
          >
            {/* Avatar Người tham gia */}
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: participant.avatarColor,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                fontWeight: 700,
                border: participant.isSpeaking ? '3px solid #23a55a' : '3px solid transparent',
                transition: 'all 0.15s ease',
                marginBottom: '12px'
              }}
            >
              {participant.displayName.charAt(0).toUpperCase()}
            </div>

            {/* Tên & Trạng thái Micro */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '85%', overflow: 'hidden' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-header)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {participant.displayName}
              </span>
              {participant.isMuted && (
                <MicOff size={14} color="#f23f43" style={{ flexShrink: 0 }} />
              )}
            </div>

            {participant.isSpeaking && (
              <span style={{ position: 'absolute', bottom: '10px', fontSize: '11px', color: '#23a55a', fontWeight: 600 }}>
                Đang nói...
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Bảng Điều Khiển Thoại ở đáy (Control Dock) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '16px 24px', backgroundColor: 'var(--bg-1)', borderTop: '1px solid var(--border-color)' }}>
        {/* Nút Bật/Tắt Micro */}
        <button
          type="button"
          onClick={() => setIsMuted(v => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: isMuted ? '#f23f43' : 'var(--bg-card)',
            color: isMuted ? '#ffffff' : 'var(--text-header)',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transition: 'all 0.15s ease'
          }}
          title={isMuted ? 'Bật Mic (Unmute)' : 'Tắt Mic (Mute)'}
          aria-label={isMuted ? 'Bật Mic' : 'Tắt Mic'}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Nút Bật/Tắt Tai nghe */}
        <button
          type="button"
          onClick={() => setIsDeafened(v => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: isDeafened ? '#f23f43' : 'var(--bg-card)',
            color: isDeafened ? '#ffffff' : 'var(--text-header)',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transition: 'all 0.15s ease'
          }}
          title={isDeafened ? 'Bật Âm thanh (Undeafen)' : 'Tắt Âm thanh (Deafen)'}
          aria-label={isDeafened ? 'Bật Âm thanh' : 'Tắt Âm thanh'}
        >
          {isDeafened ? <VolumeX size={20} /> : <Headphones size={20} />}
        </button>

        {/* Nút Chia sẻ Màn hình */}
        <button
          type="button"
          onClick={() => setIsScreenSharing(v => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: isScreenSharing ? 'var(--accent)' : 'var(--bg-card)',
            color: isScreenSharing ? '#ffffff' : 'var(--text-header)',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transition: 'all 0.15s ease'
          }}
          title={isScreenSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}
          aria-label="Chia sẻ màn hình"
        >
          <Monitor size={20} />
        </button>

        {/* Nút Ngắt kết nối phòng thoại (Màu đỏ) */}
        <button
          type="button"
          onClick={onDisconnect}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '24px',
            border: 'none',
            backgroundColor: '#f23f43',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(242, 63, 67, 0.35)',
            transition: 'background-color 0.15s ease'
          }}
          title="Rời khỏi phòng thoại"
          aria-label="Ngắt kết nối"
        >
          <PhoneOff size={18} />
          <span>Ngắt kết nối</span>
        </button>
      </div>
    </div>
  );
};

export default VoiceChannelView;
