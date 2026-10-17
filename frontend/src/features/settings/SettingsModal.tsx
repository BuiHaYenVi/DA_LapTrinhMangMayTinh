import React, { useEffect, useState } from 'react';
import {
  Activity,
  Check,
  Globe,
  Keyboard,
  LogOut,
  Moon,
  Palette,
  Radio,
  ShieldAlert,
  Sun,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { getTranslation } from '../../shared/i18n/translations';
import { TEAM_PERSONAS, useAppStore } from '../../shared/state/appStore';
import type { PresenceStatus } from '../../shared/types/api';

type SettingsTab = 'profile' | 'appearance' | 'network' | 'shortcuts';

const PRESENCE_OPTIONS: {
  status: PresenceStatus;
  labelVi: string;
  labelEn: string;
  color: string;
}[] = [
  { status: 'ONLINE', labelVi: 'Trực tuyến (Online)', labelEn: 'Online', color: 'var(--presence-online)' },
  { status: 'IDLE', labelVi: 'Tạm vắng (Idle)', labelEn: 'Idle', color: 'var(--presence-idle)' },
  { status: 'DND', labelVi: 'Không làm phiền (Do Not Disturb)', labelEn: 'Do Not Disturb', color: 'var(--presence-dnd)' },
  { status: 'OFFLINE', labelVi: 'Ẩn / Ngoại tuyến (Invisible)', labelEn: 'Offline / Invisible', color: 'var(--presence-offline)' },
];

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setSettingsOpen,
    currentUser,
    updatePresence,
    loginDemo,
    logout,
    theme,
    setTheme,
    locale,
    setLocale,
    connectionMode,
    isConnected,
    udpBlockedSimulated,
    setUdpBlockedSimulated,
    triggerRttProbe,
    setMonitorOpen,
  } = useAppStore();

  const t = getTranslation(locale);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [selectedStatus, setSelectedStatus] = useState<PresenceStatus>(
    currentUser?.status ?? 'ONLINE',
  );
  const [customStatusText, setCustomStatusText] = useState<string>(
    currentUser?.customStatus ?? '',
  );

  useEffect(() => {
    if (currentUser) {
      setSelectedStatus(currentUser.status ?? 'ONLINE');
      setCustomStatusText(currentUser.customStatus ?? '');
    }
  }, [currentUser]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSettingsOpen, setSettingsOpen]);

  if (!isSettingsOpen) return null;

  const handleSavePresence = (e: React.FormEvent) => {
    e.preventDefault();
    updatePresence(selectedStatus, customStatusText.trim());
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={t.settings.title}
      onClick={(e) => {
        if (e.target === e.currentTarget) setSettingsOpen(false);
      }}
    >
      <div className="modal-dialog settings-dialog">
        {/* Left Navigation Sidebar */}
        <aside className="settings-nav">
          <div
            className="text-label-sm"
            style={{
              padding: '4px 12px 10px',
              color: 'var(--on-surface-muted)',
            }}
          >
            {t.settings.title}
          </div>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <UserIcon size={16} />
            <span>{t.settings.profileTab}</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            <Palette size={16} />
            <span>{t.settings.appearanceTab}</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === 'network' ? 'active' : ''}`}
            onClick={() => setActiveTab('network')}
          >
            <Radio size={16} />
            <span>{t.settings.networkTab}</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === 'shortcuts' ? 'active' : ''}`}
            onClick={() => setActiveTab('shortcuts')}
          >
            <Keyboard size={16} />
            <span>{t.settings.shortcutsTab}</span>
          </button>

          <div style={{ flex: 1 }} />

          <button
            type="button"
            className="settings-nav-item"
            style={{ color: 'var(--error)' }}
            onClick={logout}
          >
            <LogOut size={16} />
            <span>{t.settings.logoutButton}</span>
          </button>
        </aside>

        {/* Right Content Area */}
        <section className="settings-content">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '14px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <h2 className="text-headline-md">
              {activeTab === 'profile' && t.settings.profileTab}
              {activeTab === 'appearance' && t.settings.appearanceTab}
              {activeTab === 'network' && t.settings.networkTab}
              {activeTab === 'shortcuts' && t.settings.shortcutsTab}
            </h2>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setSettingsOpen(false)}
              aria-label={t.settings.closeButton}
            >
              <X size={15} />
              <span>{t.settings.closeButton}</span>
            </button>
          </div>

          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Current User Summary Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--surface-subtle)',
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '9999px',
                    backgroundColor: currentUser?.avatarColor ?? '#2563EB',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: 700,
                    position: 'relative',
                  }}
                >
                  {(currentUser?.displayName ?? 'OP')
                    .split(' ')
                    .slice(-2)
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase()}
                  <span
                    className={`presence-dot presence-${currentUser?.status ?? 'ONLINE'}`}
                    style={{
                      position: 'absolute',
                      right: '0px',
                      bottom: '0px',
                      width: '14px',
                      height: '14px',
                      border: '2px solid var(--surface)',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="text-headline-sm">{currentUser?.displayName}</span>
                    <span className="protocol-pill protocol-pill-tcp">
                      {currentUser?.role ?? 'MEMBER'}
                    </span>
                  </div>
                  <div className="text-mono-sm" style={{ color: 'var(--on-surface-secondary)' }}>
                    @{currentUser?.username} • ID #{currentUser?.id}
                  </div>
                </div>
              </div>

              {/* Presence & Custom Status Form */}
              <form
                onSubmit={handleSavePresence}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                <div className="field-group">
                  <label className="field-label">{t.settings.statusLabel}</label>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '8px',
                    }}
                  >
                    {PRESENCE_OPTIONS.map((opt) => {
                      const active = selectedStatus === opt.status;
                      return (
                        <button
                          key={opt.status}
                          type="button"
                          onClick={() => setSelectedStatus(opt.status)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                            backgroundColor: active ? 'var(--primary-soft)' : 'var(--surface-subtle)',
                            fontWeight: 600,
                            fontSize: '13px',
                            textAlign: 'left',
                          }}
                        >
                          <span
                            className="presence-dot"
                            style={{ backgroundColor: opt.color }}
                          />
                          <span style={{ flex: 1 }}>
                            {locale === 'vi' ? opt.labelVi : opt.labelEn}
                          </span>
                          {active && <Check size={15} style={{ color: 'var(--primary)' }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="field-group">
                  <label htmlFor="settings-custom-status" className="field-label">
                    {t.settings.customStatusLabel}
                  </label>
                  <input
                    id="settings-custom-status"
                    type="text"
                    className="field-input"
                    value={customStatusText}
                    onChange={(e) => setCustomStatusText(e.target.value)}
                    placeholder={t.settings.customStatusPlaceholder}
                  />
                </div>

                <div>
                  <button type="submit" className="btn btn-primary">
                    <Check size={16} />
                    <span>{t.settings.saveStatus}</span>
                  </button>
                </div>
              </form>

              {/* Quick Switch Between 4 Team Members */}
              <div
                style={{
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={14} />
                  <span>Chuyển nhanh tư cách 4 thành viên đồ án (Instant Persona Switch)</span>
                </div>
                <div className="persona-grid">
                  {(['vi', 'an', 'vinh', 'hai'] as const).map((key) => {
                    const p = TEAM_PERSONAS[key];
                    const isMe = currentUser?.username === p.username;
                    return (
                      <button
                        key={key}
                        type="button"
                        className="persona-btn"
                        style={{
                          borderColor: isMe ? 'var(--primary)' : undefined,
                          backgroundColor: isMe ? 'var(--primary-soft)' : undefined,
                        }}
                        onClick={() => loginDemo(key)}
                      >
                        <div
                          className="persona-avatar"
                          style={{ backgroundColor: p.avatarColor ?? '#2563EB' }}
                        >
                          {p.displayName
                            .split(' ')
                            .slice(-2)
                            .map((w) => w[0])
                            .join('')}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="text-label-lg">{p.displayName}</div>
                          <div className="text-mono-sm" style={{ color: 'var(--on-surface-muted)' }}>
                            @{p.username} • {p.role}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="field-group">
                <label className="field-label">{t.settings.themeLabel}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${theme === 'light' ? 'var(--primary)' : 'var(--border)'}`,
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Sun size={18} style={{ color: '#2563EB' }} />
                      {theme === 'light' && <span className="protocol-pill protocol-pill-tcp">ACTIVE</span>}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{t.settings.themeLight}</div>
                    <div style={{ fontSize: '12px', color: '#475569' }}>
                      #FFFFFF Surface • #F8FAFC Ice Slate • #2563EB Ocean Blue
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${theme === 'dark' ? 'var(--primary)' : 'var(--border)'}`,
                      backgroundColor: '#0F172A',
                      color: '#F8FAFC',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Moon size={18} style={{ color: '#3B82F6' }} />
                      {theme === 'dark' && <span className="protocol-pill protocol-pill-tcp">ACTIVE</span>}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{t.settings.themeDark}</div>
                    <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                      #0B1120 Rail • #1E293B Stage • #3B82F6 Luminous Blue
                    </div>
                  </button>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">{t.settings.languageLabel}</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className={`btn ${locale === 'vi' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setLocale('vi')}
                  >
                    <Globe size={16} />
                    <span>Tiếng Việt (VI)</span>
                  </button>
                  <button
                    type="button"
                    className={`btn ${locale === 'en' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setLocale('en')}
                  >
                    <Globe size={16} />
                    <span>English (EN)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'network' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--surface-subtle)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div className="text-label-lg">{t.settings.connectionModeLabel}</div>
                  <div className="text-mono-sm" style={{ color: 'var(--on-surface-secondary)', marginTop: '4px' }}>
                    Mode: {connectionMode.toUpperCase()} • Connected: {String(isConnected)}
                  </div>
                </div>
                <span className={`protocol-pill ${isConnected ? 'protocol-pill-udp' : 'protocol-pill-fallback'}`}>
                  {connectionMode === 'live' ? 'LIVE JAVA 21 SERVER' : 'INTERACTIVE MULTI-PROTOCOL SIM'}
                </span>
              </div>

              {/* Firewall UDP Block Simulation Toggle */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: udpBlockedSimulated ? 'var(--error-soft)' : 'var(--surface-subtle)',
                  border: `1px solid ${udpBlockedSimulated ? 'var(--error)' : 'var(--border)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert
                      size={18}
                      style={{ color: udpBlockedSimulated ? 'var(--error)' : 'var(--primary)' }}
                    />
                    <span className="text-label-lg">{t.settings.udpSimulationLabel}</span>
                  </div>
                  <button
                    type="button"
                    className={`btn btn-sm ${udpBlockedSimulated ? 'btn-danger' : 'btn-secondary'}`}
                    onClick={() => setUdpBlockedSimulated(!udpBlockedSimulated)}
                  >
                    {udpBlockedSimulated ? 'Đang chặn UDP :5001 (Bấm để mở)' : 'Đang mở UDP :5001 (Bấm để chặn)'}
                  </button>
                </div>
                <p className="text-body-sm" style={{ color: 'var(--on-surface-secondary)' }}>
                  {t.settings.udpSimulationDesc}
                </p>
              </div>

              {/* Quick Telemetry Actions */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    triggerRttProbe();
                  }}
                >
                  <Activity size={16} />
                  <span>Bắn gói đo độ trễ Ping RTT (TCP/WS vs UDP)</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSettingsOpen(false);
                    setMonitorOpen(true);
                  }}
                >
                  <Radio size={16} />
                  <span>Mở Bảng Giám sát Gói tin (Protocol Monitor)</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { keys: 'Ctrl + K / Cmd + K', desc: 'Mở Bảng điều khiển nhanh (Command Palette)' },
                { keys: 'Enter', desc: 'Gửi tin nhắn văn bản vào kênh hiện tại' },
                { keys: 'Shift + Enter', desc: 'Xuống dòng trong khung soạn thảo tin nhắn' },
                { keys: 'Escape', desc: 'Đóng hộp thoại, hủy trả lời hoặc hủy chỉnh sửa tin nhắn' },
              ].map((item) => (
                <div
                  key={item.keys}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--surface-subtle)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span className="text-body-md">{item.desc}</span>
                  <span className="kbd-badge">{item.keys}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default SettingsModal;
