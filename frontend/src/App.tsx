import React from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Info,
  Menu,
  Search,
  Users,
  X,
} from 'lucide-react';
import { AppStoreProvider, useAppStore } from './shared/state/appStore';
import { AuthScreen } from './features/auth/AuthScreen';
import { GuildRail } from './features/guild/GuildRail';
import { ChannelSidebar } from './features/guild/ChannelSidebar';
import { MemberSidebar } from './features/guild/MemberSidebar';
import { ChatStage } from './features/chat/ChatStage';
import { FriendsAndDmStage } from './features/friends/FriendsAndDmStage';
import { NetworkMonitorPanel } from './features/monitor/NetworkMonitorPanel';
import { VoiceCallStage } from './features/voice/VoiceCallStage';
import { SettingsModal } from './features/settings/SettingsModal';
import { CommandPalette } from './features/settings/CommandPalette';
import './App.css';

const WorkspaceContent: React.FC = () => {
  const {
    isAuthenticated,
    viewMode,
    activeGuild,
    activeChannel,
    activeVoiceChannelId,
    isMonitorOpen,
    setMonitorOpen,
    isMemberSidebarOpen,
    setCommandPaletteOpen,
    mobileDrawerOpen,
    setMobileDrawerOpen,
    toasts,
    dismissToast,
  } = useAppStore();

  if (!isAuthenticated) {
    return (
      <>
        <AuthScreen />
        <ToastOverlay toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="workspace-viewport">
      <div className="floating-card-shell" role="application" aria-label="Discord Mini Sage Modern Workspace">
        {/* Column 1: Guild Rail */}
        <GuildRail />

      {/* Mobile backdrop for slide-over drawers */}
      {mobileDrawerOpen !== 'none' && (
        <div
          onClick={() => setMobileDrawerOpen('none')}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            zIndex: 55,
          }}
          aria-hidden="true"
        />
      )}

      {/* Column 2: Channel & DM Sidebar (240px) */}
      <div
        className={`desktop-sidebar-wrapper ${
          mobileDrawerOpen === 'channels' ? 'drawer-open' : ''
        }`}
      >
        <ChannelSidebar />
      </div>

      {/* Column 3: Main Chat / Friends / Voice / Network Monitor Stage (1fr) */}
      <main className="workspace-main-column">
        {/* Responsive mobile topbar (< 1024px) */}
        <div className="mobile-topbar">
          <button
            type="button"
            className="btn-ghost"
            onClick={() =>
              setMobileDrawerOpen(
                mobileDrawerOpen === 'channels' ? 'none' : 'channels',
              )
            }
            aria-label="Mở danh sách kênh"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '8px',
            }}
          >
            <Menu size={16} />
            <span style={{ fontWeight: 700, fontSize: '13px' }}>
              {viewMode === 'guild'
                ? `#${activeChannel?.name || activeGuild?.name || 'general'}`
                : 'Bạn bè & DM'}
            </span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setCommandPaletteOpen(true)}
              aria-label="Tìm kiếm nhanh Ctrl+K"
              style={{ padding: '6px', borderRadius: '8px' }}
            >
              <Search size={16} />
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setMonitorOpen(!isMonitorOpen)}
              aria-label="Bật/tắt Network Monitor"
              style={{ padding: '6px', borderRadius: '8px' }}
            >
              <Activity size={16} />
            </button>
            {viewMode === 'guild' && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() =>
                  setMobileDrawerOpen(
                    mobileDrawerOpen === 'members' ? 'none' : 'members',
                  )
                }
                aria-label="Mở danh sách thành viên"
                style={{ padding: '6px', borderRadius: '8px' }}
              >
                <Users size={16} />
              </button>
            )}
          </div>
        </div>

        {/* WebRTC Voice/Video Call Stage (when connected to a voice channel) */}
        {activeVoiceChannelId !== null && <VoiceCallStage />}

        {/* Main Content: Guild Channel Chat OR Friends & 1-on-1 DM Stage */}
        <div
          style={{
            flex: '1 1 0%',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {viewMode === 'guild' ? <ChatStage /> : <FriendsAndDmStage />}
        </div>

        {/* Network Monitor Telemetry Panel (TCP :5000 vs UDP :5001 RTT & Protocol Frame Dissector) */}
        {isMonitorOpen && <NetworkMonitorPanel />}
      </main>

      {/* Column 4: Member & Role Sidebar (260px) */}
      {viewMode === 'guild' && isMemberSidebarOpen && (
        <div
          className={`desktop-member-wrapper ${
            mobileDrawerOpen === 'members' ? 'drawer-open' : ''
          }`}
        >
          <MemberSidebar />
        </div>
      )}
      </div>

      {/* Global Modals & Overlays */}
      <SettingsModal />
      <CommandPalette />
      <ToastOverlay toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

interface ToastOverlayProps {
  toasts: {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message?: string;
  }[];
  onDismiss: (id: string) => void;
}

const ToastOverlay: React.FC<ToastOverlayProps> = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'success':
        return '#10B981';
      case 'warning':
        return '#F59E0B';
      case 'error':
        return '#F43F5E';
      default:
        return '#2563EB';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={16} style={{ color: '#10B981', flexShrink: 0 }} />;
      case 'warning':
      case 'error':
        return (
          <AlertCircle
            size={16}
            style={{ color: type === 'error' ? '#F43F5E' : '#F59E0B', flexShrink: 0 }}
          />
        );
      default:
        return <Info size={16} style={{ color: '#2563EB', flexShrink: 0 }} />;
    }
  };

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-card"
          style={{ borderLeft: `4px solid ${getBorderColor(t.type)}` }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            {getIcon(t.type)}
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px' }}>{t.title}</div>
              {t.message && (
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    marginTop: '2px',
                  }}
                >
                  {t.message}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Đóng thông báo"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '2px',
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppStoreProvider>
      <WorkspaceContent />
    </AppStoreProvider>
  );
};

export default App;
