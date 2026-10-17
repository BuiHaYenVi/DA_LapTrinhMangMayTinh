import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Globe,
  Layers,
  Lock,
  Moon,
  Radio,
  Server,
  ShieldCheck,
  Sun,
  Terminal,
  UserCheck,
  UserPlus,
  Wifi,
} from 'lucide-react';
import { getTranslation } from '../../shared/i18n/translations';
import { TEAM_PERSONAS, useAppStore } from '../../shared/state/appStore';

const DEMO_MEMBERS: {
  key: 'vi' | 'an' | 'vinh' | 'hai';
  badge: string;
  transportTag: string;
}[] = [
  { key: 'vi', badge: 'OWNER • TCP/WS Lead', transportTag: 'WS :8081' },
  { key: 'an', badge: 'ADMIN • UDP/WebRTC', transportTag: 'UDP :5001' },
  { key: 'vinh', badge: 'ADMIN • Swing Bridge', transportTag: 'TCP :5000' },
  { key: 'hai', badge: 'MEMBER • Neon DB', transportTag: 'HTTP :8080' },
];

export const AuthScreen: React.FC = () => {
  const {
    login,
    register,
    loginDemo,
    theme,
    toggleTheme,
    locale,
    setLocale,
    connectionMode,
  } = useAppStore();

  const t = getTranslation(locale);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('yen_vi');
  const [password, setPassword] = useState('123456');
  const [displayName, setDisplayName] = useState('Bùi Hà Yến Vi');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim()) {
      setErrorMsg(locale === 'vi' ? 'Vui lòng nhập tên đăng nhập.' : 'Username is required.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg(locale === 'vi' ? 'Vui lòng nhập mật khẩu.' : 'Password is required.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password, displayName.trim() || username.trim());
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Authentication error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-viewport">
      {/* Top Architecture Header Bar */}
      <header className="auth-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: 'var(--primary)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '16px',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
            }}
          >
            OP
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="text-headline-md">{t.appName}</span>
              <span className="protocol-pill protocol-pill-tcp">TCP :5000</span>
              <span className="protocol-pill protocol-pill-udp">UDP :5001</span>
              <span className="protocol-pill protocol-pill-ws">WS :8081</span>
            </div>
            <p className="text-body-sm" style={{ color: 'var(--on-surface-secondary)' }}>
              {t.appSubtitle}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}
            aria-label="Switch language"
          >
            <Globe size={15} />
            <span>{locale === 'vi' ? 'Tiếng Việt (VI)' : 'English (EN)'}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={toggleTheme}
            aria-label="Toggle color theme"
          >
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            <span>{theme === 'light' ? 'Dark Navy' : 'Light Ocean'}</span>
          </button>
        </div>
      </header>

      {/* Main Split Workspace */}
      <main className="auth-shell">
        {/* Left Column: Multi-Protocol Architecture & Telemetry Preview */}
        <section className="auth-hero-panel">
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              alignSelf: 'flex-start',
              padding: '6px 12px',
              borderRadius: '9999px',
              backgroundColor: 'var(--primary-soft)',
              color: 'var(--primary)',
              border: '1px solid var(--primary-tint)',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            <Radio size={14} />
            <span>JAVA 21 MULTI-PROTOCOL SERVER • REACT 19 REAL-TIME WORKSPACE</span>
          </div>

          <h1 className="text-headline-display" style={{ fontSize: '36px', lineHeight: 1.18 }}>
            {t.auth.welcomeTitle}
          </h1>

          <p className="text-body-lg" style={{ color: 'var(--on-surface-secondary)', maxWidth: '60ch' }}>
            {t.auth.welcomeSubtitle}
          </p>

          {/* 4-Protocol Matrix Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
            }}
          >
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="protocol-pill protocol-pill-tcp">TCP SOCKET :5000</span>
                <Server size={16} style={{ color: 'var(--telemetry-tcp)' }} />
              </div>
              <div className="text-label-lg" style={{ marginTop: '4px' }}>
                Đồng bộ Java Swing & Web
              </div>
              <p className="text-body-sm" style={{ color: 'var(--on-surface-secondary)' }}>
                Khung truyền <code>ROOM_MSG</code> và <code>PRIVATE_MSG</code> cầu nối hai chiều thời gian thực.
              </p>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="protocol-pill protocol-pill-udp">UDP DATAGRAM :5001</span>
                <Activity size={16} style={{ color: 'var(--telemetry-udp)' }} />
              </div>
              <div className="text-label-lg" style={{ marginTop: '4px' }}>
                Typing & Ping RTT Độ trễ thấp
              </div>
              <p className="text-body-sm" style={{ color: 'var(--on-surface-secondary)' }}>
                Đo kiểm khứ hồi <code>PING_UDP</code> (~1.2ms) kèm cơ chế tự động <code>UDP_FALLBACK</code>.
              </p>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="protocol-pill protocol-pill-ws">WEBSOCKET :8081</span>
                <Wifi size={16} style={{ color: 'var(--telemetry-ws)' }} />
              </div>
              <div className="text-label-lg" style={{ marginTop: '4px' }}>
                Luồng Sự kiện Full-Duplex
              </div>
              <p className="text-body-sm" style={{ color: 'var(--on-surface-secondary)' }}>
                Tin nhắn, cảm xúc, ghim, trạng thái hiện diện và báo hiệu WebRTC SDP/ICE.
              </p>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="protocol-pill protocol-pill-http">HTTP REST :8080</span>
                <Layers size={16} style={{ color: 'var(--warning)' }} />
              </div>
              <div className="text-label-lg" style={{ marginTop: '4px' }}>
                Neon PostgreSQL & File bytea
              </div>
              <p className="text-body-sm" style={{ color: 'var(--on-surface-secondary)' }}>
                Xác thực JWT HMAC-SHA256, tải tệp nhị phân 5MB và tìm kiếm toàn văn GIN.
              </p>
            </div>
          </div>

          {/* Live Wire Frame Preview Box */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--surface-muted)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={15} style={{ color: 'var(--primary)' }} />
                <span className="text-label-md">LIVE WIRE-FRAME INSPECTOR PREVIEW</span>
              </div>
              <span className="text-mono-sm" style={{ color: 'var(--success)' }}>
                ● {connectionMode === 'live' ? t.auth.backendStatusLive : t.auth.backendStatusMock}
              </span>
            </div>
            <div
              className="text-mono-sm"
              style={{
                color: 'var(--on-surface-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div>
                <span style={{ color: 'var(--telemetry-tcp)', fontWeight: 700 }}>[TCP :5000]</span>{' '}
                ROOM_MSG|1|yen_vi|Đồng bộ khung truyền TCP Socket &amp; WebSocket!
              </div>
              <div>
                <span style={{ color: 'var(--telemetry-udp)', fontWeight: 700 }}>[UDP :5001]</span>{' '}
                PING_UDP|104|1760673600123 → PONG_UDP (RTT = 1.34 ms)
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: 1-Click Demo Login + Standard Auth Form */}
        <section className="auth-card" aria-label="Authentication panel">
          {/* 1-Click Capstone Team Personas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="text-label-lg" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} />
                {t.auth.demoSectionTitle}
              </span>
              <span className="protocol-pill protocol-pill-udp">1-Click Instant</span>
            </div>
            <p className="text-body-sm" style={{ color: 'var(--on-surface-secondary)' }}>
              {t.auth.demoSectionHint}
            </p>

            <div className="persona-grid">
              {DEMO_MEMBERS.map(({ key, badge, transportTag }) => {
                const member = TEAM_PERSONAS[key];
                const initials = member.displayName
                  .split(' ')
                  .slice(-2)
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase();
                return (
                  <button
                    key={key}
                    type="button"
                    className="persona-btn"
                    onClick={() => loginDemo(key)}
                  >
                    <div
                      className="persona-avatar"
                      style={{ backgroundColor: member.avatarColor ?? '#2563EB' }}
                    >
                      {initials}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        className="text-label-lg"
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {member.displayName}
                      </div>
                      <div
                        className="text-mono-sm"
                        style={{
                          color: 'var(--on-surface-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        @{member.username} • {transportTag}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--primary)',
                          marginTop: '2px',
                        }}
                      >
                        {badge}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: 'var(--on-surface-muted)',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
            <span>HOẶC ĐĂNG NHẬP TÀI KHOẢN MÁY CHỦ (:8080)</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
          </div>

          {/* Mode Switcher Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              padding: '4px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--surface-muted)',
              border: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              className="btn btn-sm"
              style={{
                backgroundColor: mode === 'login' ? 'var(--surface)' : 'transparent',
                color: mode === 'login' ? 'var(--primary)' : 'var(--on-surface-secondary)',
                boxShadow: mode === 'login' ? 'var(--shadow-sm)' : 'none',
              }}
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
            >
              <UserCheck size={15} />
              <span>{t.auth.loginTab}</span>
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{
                backgroundColor: mode === 'register' ? 'var(--surface)' : 'transparent',
                color: mode === 'register' ? 'var(--primary)' : 'var(--on-surface-secondary)',
                boxShadow: mode === 'register' ? 'var(--shadow-sm)' : 'none',
              }}
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
              }}
            >
              <UserPlus size={15} />
              <span>{t.auth.registerTab}</span>
            </button>
          </div>

          {/* Standard Login / Register Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="field-group">
              <label htmlFor="auth-username" className="field-label">
                {t.auth.usernameLabel}
              </label>
              <input
                id="auth-username"
                type="text"
                className="field-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.auth.usernamePlaceholder}
                autoComplete="username"
              />
            </div>

            {mode === 'register' && (
              <div className="field-group">
                <label htmlFor="auth-displayname" className="field-label">
                  {t.auth.displayNameLabel}
                </label>
                <input
                  id="auth-displayname"
                  type="text"
                  className="field-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t.auth.displayNamePlaceholder}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="field-group">
              <label htmlFor="auth-password" className="field-label">
                {t.auth.passwordLabel}
              </label>
              <input
                id="auth-password"
                type="password"
                className="field-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.auth.passwordPlaceholder}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {errorMsg && (
              <div
                className="field-error"
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--error-soft)',
                  border: '1px solid var(--error)',
                }}
              >
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ width: '100%', marginTop: '4px' }}
            >
              <Lock size={16} />
              <span>
                {submitting
                  ? 'Đang xác thực...'
                  : mode === 'login'
                    ? t.auth.loginButton
                    : t.auth.registerButton}
              </span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '8px',
              borderTop: '1px solid var(--border)',
              fontSize: '12px',
              color: 'var(--on-surface-muted)',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
              JWT HMAC-SHA256 Stateless Auth
            </span>
            <span className="font-mono">channel_id === room_id</span>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AuthScreen;
