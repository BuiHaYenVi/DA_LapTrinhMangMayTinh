import React, { useState } from 'react';
import { Plus, Settings } from 'lucide-react';
import { Logo } from './Logo';

interface Props {
  onDirectMessage: () => void;
  onOpenExplore?: () => void;
  onAddServer: () => void;
}

export const WorkspaceSidebar: React.FC<Props> = ({ onDirectMessage, onAddServer }) => {
  const [activeItem, setActiveItem] = useState<string>('server-1');

  return (
    <div className="workspace-strip">
      <button 
        className={`pill-item ${activeItem === 'dm' ? 'active' : ''}`}
        title="LTMang Chat - Trang chủ"
        onClick={() => { setActiveItem('dm'); onDirectMessage(); }}
        style={{ padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}
      >
        <Logo size={42} withGlow={false} />
      </button>

      <div className="strip-separator" />

      <button 
        className={`pill-item ${activeItem === 'server-1' ? 'active' : ''}`}
        title="LTMang - Group Chat"
        onClick={() => setActiveItem('server-1')}
        style={{ fontWeight: 700, fontSize: '13px' }}
      >
        LTM
      </button>

      <button 
        className={`pill-item ${activeItem === 'server-gaming' ? 'active' : ''}`}
        title="Gaming Lounge"
        onClick={() => setActiveItem('server-gaming')}
        style={{ fontWeight: 700, fontSize: '13px' }}
      >
        🎮
      </button>

      <button 
        className={`pill-item ${activeItem === 'server-study' ? 'active' : ''}`}
        title="Study & Code"
        onClick={() => setActiveItem('server-study')}
        style={{ fontWeight: 700, fontSize: '13px' }}
      >
        📚
      </button>

      <button 
        className="pill-item green"
        title="Tạo phòng hoặc máy chủ mới"
        onClick={onAddServer}
      >
        <Plus size={22} />
      </button>

      <div style={{ flex: 1 }} />

      <button 
        className="pill-item"
        title="Cài đặt hệ thống"
        onClick={() => alert("Discord Mini — Đồ án Lập trình mạng CMP180 HUTECH\nPhiên bản: 2.0 (React + Java TCP Socket)")}
      >
        <Settings size={20} />
      </button>
    </div>
  );
};
