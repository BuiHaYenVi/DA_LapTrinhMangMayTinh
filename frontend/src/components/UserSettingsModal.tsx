import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { User } from '../types/chat';
import { chatBridge } from '../services/chatBridge';
import { 
  X, User as UserIcon, Palette, Bell, MessageSquare, 
  Activity, Keyboard, Info, LogOut, Check, Volume2, 
  ArrowDown, Lock, RefreshCw
} from 'lucide-react';

export type SettingsTabId = 
  | 'account' 
  | 'appearance' 
  | 'notifications' 
  | 'chat' 
  | 'network' 
  | 'shortcuts' 
  | 'about';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  currentUserRole?: string;
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
  onLogout: () => void;
  onProfileUpdated?: (newDisplayName: string) => void;
}

const AVATAR_COLORS = [
  '#5865F2', // Blurple
  '#2DD4BF', // Teal
  '#0EA5E9', // Sky
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#8B5CF6'  // Purple
];

const AVATAR_ICONS = ['', '😎', '🐱', '🐶', '🦊', '🐼', '👑', '⚡', '🔥', '🎮', '💻', '🌸'];

const LOCAL_STORAGE_KEY = 'discord_mini_user_settings_v2';
const LEGACY_STORAGE_KEY = 'ltmang_settings_v2';

export interface StoredSettings {
  themeMode: 'dark' | 'light' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  messageDensity: 'compact' | 'cozy';
  timeFormat: '12h' | '24h';
  soundEnabled: boolean;
  mentionNotify: boolean;
  soundVolume: number;
  autoScroll: boolean;
  enterToSend: boolean;
  showTyping: boolean;
  autoReconnect: boolean;
  avatarColor: string;
  avatarIcon: string;
  bio: string;
}

const DEFAULT_SETTINGS: StoredSettings = {
  themeMode: 'dark',
  fontSize: 'medium',
  messageDensity: 'cozy',
  timeFormat: '24h',
  soundEnabled: true,
  mentionNotify: true,
  soundVolume: 80,
  autoScroll: true,
  enterToSend: true,
  showTyping: true,
  autoReconnect: true,
  avatarColor: '#5865F2',
  avatarIcon: '',
  bio: ''
};

export const loadStoredSettings = (): StoredSettings => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveStoredSettings = (settings: StoredSettings) => {
  try {
    const json = JSON.stringify(settings);
    localStorage.setItem(LOCAL_STORAGE_KEY, json);
    localStorage.setItem(LEGACY_STORAGE_KEY, json);
    document.documentElement.setAttribute('data-font-size', settings.fontSize);
    document.documentElement.setAttribute('data-density', settings.messageDensity);
    window.dispatchEvent(new CustomEvent('user_settings_updated', { detail: settings }));
  } catch (err) {
    console.warn('Lỗi ghi cài đặt vào localStorage:', err);
  }
};

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentUserRole: _currentUserRole,
  theme: _theme,
  onThemeChange,
  onLogout,
  onProfileUpdated
}) => {
  // Navigation
  const [activeTab, setActiveTab] = useState<SettingsTabId>('account');
  const tabs: { id: SettingsTabId; label: string; icon: React.ReactNode }[] = [
    { id: 'account', label: 'Tài khoản của tôi', icon: <UserIcon size={18} /> },
    { id: 'appearance', label: 'Giao diện', icon: <Palette size={18} /> },
    { id: 'notifications', label: 'Thông báo & âm thanh', icon: <Bell size={18} /> },
    { id: 'chat', label: 'Trò chuyện', icon: <MessageSquare size={18} /> },
    { id: 'network', label: 'Kết nối & mạng', icon: <Activity size={18} /> },
    { id: 'shortcuts', label: 'Phím tắt', icon: <Keyboard size={18} /> },
    { id: 'about', label: 'Giới thiệu', icon: <Info size={18} /> }
  ];

  // Persistent settings state
  const [settings, setSettings] = useState<StoredSettings>(loadStoredSettings);

  // Profile Form state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarColor, setAvatarColor] = useState('#5865F2');
  const [avatarIcon, setAvatarIcon] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ text: string; type: 'success' | 'error' | 'notice' } | null>(null);

  // Change Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passFeedback, setPassFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);


  // Network tab state
  const [pingMs, setPingMs] = useState(24);
  const [uptimeSeconds, setUptimeSeconds] = useState(128);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Focus trap ref
  const modalCardRef = useRef<HTMLDivElement>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);

  // Khởi tạo form khi mở modal hoặc currentUser đổi
  useEffect(() => {
    if (isOpen) {
      const stored = loadStoredSettings();
      setSettings(stored);
      setDisplayName(currentUser?.displayName || currentUser?.username || '');
      setBio(stored.bio || '');
      setAvatarColor(stored.avatarColor || '#5865F2');
      setAvatarIcon(stored.avatarIcon || '');
      setProfileFeedback(null);
      setPassFeedback(null);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, currentUser]);

  // Bộ đếm thời gian kết nối (Uptime)
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setUptimeSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Đồng bộ theme hệ thống nếu chọn "system"
  useEffect(() => {
    if (settings.themeMode === 'system') {
      const isSystemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      onThemeChange(isSystemDark ? 'dark' : 'light');
    }
  }, [settings.themeMode, onThemeChange]);

  // Cập nhật cài đặt và lưu localStorage
  const updateSetting = useCallback(<K extends keyof StoredSettings>(key: K, value: StoredSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      saveStoredSettings(next);
      return next;
    });
  }, []);

  // Web Audio API: Phát âm thanh thử nghiệm êm dịu
  const handlePlayTestSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // Note D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // Note A5
      const gainVal = Math.max(0.01, Math.min(1, (settings.soundVolume / 100) * 0.25));
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.warn('Lỗi phát âm thanh Web Audio:', e);
    }
  };

  // Keyboard navigation & Focus Trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Đóng modal khi bấm Escape
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Đổi tab khi bấm ArrowUp / ArrowDown
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const activeElement = document.activeElement;
        const isNavFocused = navContainerRef.current?.contains(activeElement);
        // Chỉ chuyển tab khi người dùng không đang gõ văn bản
        const isTyping = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';
        if (!isTyping || isNavFocused) {
          e.preventDefault();
          const currentIndex = tabs.findIndex(t => t.id === activeTab);
          let nextIndex = currentIndex;
          if (e.key === 'ArrowUp') {
            nextIndex = currentIndex <= 0 ? tabs.length - 1 : currentIndex - 1;
          } else {
            nextIndex = currentIndex >= tabs.length - 1 ? 0 : currentIndex + 1;
          }
          setActiveTab(tabs[nextIndex].id);
        }
      }

      // Focus trap
      if (e.key === 'Tab' && modalCardRef.current) {
        const focusable = modalCardRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, onClose, tabs]);

  // Kiểm tra có thay đổi ở form hồ sơ không
  const initialName = currentUser?.displayName || currentUser?.username || '';
  const initialBio = settings.bio || '';
  const initialColor = settings.avatarColor || '#5865F2';
  const initialIcon = settings.avatarIcon || '';
  const hasProfileChanges = 
    displayName.trim() !== initialName.trim() ||
    bio.trim() !== initialBio.trim() ||
    avatarColor !== initialColor ||
    avatarIcon !== initialIcon;

  // Xử lý Lưu hồ sơ
  const handleSaveProfile = async () => {
    if (!hasProfileChanges || isSavingProfile) return;
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setProfileFeedback({ text: 'Tên hiển thị không được để trống.', type: 'error' });
      return;
    }
    if (trimmedName.length > 32) {
      setProfileFeedback({ text: 'Tên hiển thị không được vượt quá 32 ký tự.', type: 'error' });
      return;
    }

    setIsSavingProfile(true);
    setProfileFeedback(null);

    // Luôn lưu màu sắc, icon đại diện và tiểu sử ngay lập tức
    setSettings(prev => {
      const next = {
        ...prev,
        avatarColor,
        avatarIcon,
        bio: bio.trim()
      };
      saveStoredSettings(next);
      return next;
    });

    if (trimmedName !== initialName.trim()) {
      const res = await chatBridge.updateProfile(trimmedName, bio.trim(), avatarColor);
      setIsSavingProfile(false);

      if (res.notSupported) {
        setProfileFeedback({ text: 'Đã lưu biểu tượng & tiểu sử. Tên hiển thị đang chờ máy chủ cập nhật.', type: 'notice' });
        return;
      }

      if (res.success) {
        if (onProfileUpdated) {
          onProfileUpdated(res.displayName || trimmedName);
        }
        setProfileFeedback({ text: 'Đã lưu thay đổi hồ sơ thành công!', type: 'success' });
        setTimeout(() => setProfileFeedback(null), 3000);
      } else {
        setProfileFeedback({ text: res.message || 'Lỗi khi cập nhật tên hiển thị trên máy chủ.', type: 'error' });
      }
    } else {
      setIsSavingProfile(false);
      setProfileFeedback({ text: 'Đã lưu biểu tượng, màu đại diện và tiểu sử thành công!', type: 'success' });
      setTimeout(() => setProfileFeedback(null), 3000);
    }
  };

  // Xử lý Đổi mật khẩu
  const handleChangePassword = async () => {
    if (isChangingPass) return;
    setPassFeedback(null);

    if (!oldPassword) {
      setPassFeedback({ text: 'Vui lòng nhập mật khẩu hiện tại.', type: 'error' });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPassFeedback({ text: 'Mật khẩu mới phải có tối thiểu 6 ký tự.', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassFeedback({ text: 'Mật khẩu nhập lại không khớp.', type: 'error' });
      return;
    }

    setIsChangingPass(true);
    const res = await chatBridge.changePassword(oldPassword, newPassword);
    setIsChangingPass(false);

    if (res.notSupported) {
      setPassFeedback({ text: 'Tính năng đang phát triển', type: 'error' });
      return;
    }

    if (res.success) {
      setPassFeedback({ text: 'Đổi mật khẩu thành công!', type: 'success' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassFeedback(null), 3500);
    } else {
      setPassFeedback({ text: res.message || 'Mật khẩu hiện tại không chính xác.', type: 'error' });
    }
  };

  // Kiểm tra đo ping kết nối
  const handlePingTest = async () => {
    setIsReconnecting(true);
    try {
      const t0 = performance.now();
      await chatBridge.getStatus();
      setPingMs(Math.max(1, Math.round(performance.now() - t0)));
    } catch {
      setPingMs(999);
    } finally {
      setTimeout(() => setIsReconnecting(false), 400);
    }
  };

  if (!isOpen) return null;

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  return (
    <div 
      className="settings-modal-backdrop" 
      onClick={onClose} 
      role="dialog" 
      aria-modal="true"
      aria-labelledby="settings-window-title"
    >
      <div 
        className="settings-window-card" 
        ref={modalCardRef}
        onClick={e => e.stopPropagation()}
      >
        {/* ================= CỘT TRÁI: MENU ĐIỀU HƯỚNG (220px) ================= */}
        <aside className="settings-nav-sidebar">
          <div className="settings-sidebar-header">
            <span className="settings-sidebar-brand" id="settings-window-title">CÀI ĐẶT</span>
          </div>

          <nav className="settings-nav-list" ref={navContainerRef} role="tablist" aria-label="Menu cài đặt">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`settings-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="settings-nav-icon">{tab.icon}</span>
                  <span className="settings-nav-label">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Nút Đăng xuất ở cuối Menu */}
          <div className="settings-sidebar-footer">
            <button
              type="button"
              className="settings-nav-logout-btn"
              onClick={() => {
                onClose();
                onLogout();
              }}
              title="Đăng xuất khỏi tài khoản"
            >
              <LogOut size={16} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </aside>

        {/* ================= CỘT PHẢI: NỘI DUNG CHI TIẾT ================= */}
        <main className="settings-content-area">
          {/* Nút đóng modal góc phải trên */}
          <button
            type="button"
            className="settings-window-close-btn"
            onClick={onClose}
            aria-label="Đóng cửa sổ Cài đặt"
            title="Đóng (Esc)"
          >
            <X size={18} />
          </button>

          {/* 1. MỤC: TÀI KHOẢN CỦA TÔI */}
          {activeTab === 'account' && (
            <div className="settings-tab-panel">
              <h2 className="settings-panel-title">Tài khoản của tôi</h2>

              {/* Thẻ Hồ Sơ */}
              <div className="settings-card-box">
                <div className="settings-profile-preview-row">
                  <div 
                    className="settings-avatar-large" 
                    style={{ backgroundColor: avatarColor, fontSize: avatarIcon ? '28px' : undefined }}
                  >
                    {avatarIcon || (displayName ? displayName.charAt(0).toUpperCase() : 'U')}
                  </div>
                  <div className="settings-profile-preview-meta">
                    <h3 className="settings-profile-preview-name">{displayName || 'Chưa đặt tên'}</h3>
                    <span className="settings-profile-preview-user">@{currentUser?.username || 'user'}</span>
                  </div>
                </div>

                {/* Chọn biểu tượng đại diện (Icon / Emoji) */}
                <div className="settings-form-group">
                  <label className="settings-form-label">Biểu tượng đại diện (Icon)</label>
                  <div className="custom-icon-picker-row">
                    {AVATAR_ICONS.map((ic, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`custom-icon-chip ${avatarIcon === ic ? 'active' : ''}`}
                        onClick={() => setAvatarIcon(ic)}
                        title={ic ? `Biểu tượng ${ic}` : 'Chữ cái đầu mặc định'}
                      >
                        {ic || 'Chữ'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chọn màu avatar */}
                <div className="settings-form-group">
                  <label className="settings-form-label">Màu ảnh đại diện</label>
                  <div className="settings-color-swatches">
                    {AVATAR_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        className={`settings-color-dot ${avatarColor === c ? 'selected' : ''}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setAvatarColor(c)}
                        title={c}
                        aria-label={`Chọn màu ${c}`}
                      >
                        {avatarColor === c && <Check size={14} color="#fff" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ô Tên hiển thị (Tối đa 32 ký tự) */}
                <div className="settings-form-group">
                  <div className="settings-label-row">
                    <label className="settings-form-label" htmlFor="input-display-name">Tên hiển thị</label>
                    <span className="settings-char-counter">{displayName.length}/32</span>
                  </div>
                  <input
                    id="input-display-name"
                    type="text"
                    maxLength={32}
                    className="settings-text-input"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Nhập tên hiển thị của bạn..."
                  />
                </div>

                {/* Ô Tiểu sử (Tối đa 120 ký tự, có bộ đếm) */}
                <div className="settings-form-group">
                  <div className="settings-label-row">
                    <label className="settings-form-label" htmlFor="input-bio">Tiểu sử</label>
                    <span className="settings-char-counter">{bio.length}/120</span>
                  </div>
                  <textarea
                    id="input-bio"
                    maxLength={120}
                    rows={3}
                    className="settings-textarea-input"
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Giới thiệu đôi nét về bản thân bạn..."
                  />
                </div>

                {/* Username chỉ đọc */}
                <div className="settings-form-group">
                  <div className="settings-label-row">
                    <label className="settings-form-label">Tên người dùng (Username)</label>
                    <span className="settings-readonly-badge"><Lock size={11} /> Chỉ đọc</span>
                  </div>
                  <input
                    type="text"
                    className="settings-text-input readonly"
                    value={currentUser?.username || ''}
                    readOnly
                    disabled
                  />
                </div>

                {/* Feedback Lưu hồ sơ */}
                {profileFeedback && (
                  <div className={`settings-feedback-banner ${profileFeedback.type}`}>
                    {profileFeedback.text}
                  </div>
                )}

                {/* Nút Lưu thay đổi (Chỉ bật khi có thay đổi) */}
                <div className="settings-form-actions">
                  <button
                    type="button"
                    className="settings-btn-primary"
                    disabled={!hasProfileChanges || isSavingProfile}
                    onClick={handleSaveProfile}
                  >
                    {isSavingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </div>

              {/* Khối Đổi Mật Khẩu */}
              <div className="settings-card-box">
                <h3 className="settings-card-heading">Đổi mật khẩu</h3>
                
                <div className="settings-form-group">
                  <label className="settings-form-label" htmlFor="old-pass">Mật khẩu hiện tại</label>
                  <input
                    id="old-pass"
                    type="password"
                    className="settings-text-input"
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group half">
                    <label className="settings-form-label" htmlFor="new-pass">Mật khẩu mới</label>
                    <input
                      id="new-pass"
                      type="password"
                      className="settings-text-input"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                    />
                  </div>

                  <div className="settings-form-group half">
                    <label className="settings-form-label" htmlFor="confirm-pass">Nhập lại mật khẩu mới</label>
                    <input
                      id="confirm-pass"
                      type="password"
                      className="settings-text-input"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Khớp với mật khẩu mới"
                    />
                  </div>
                </div>

                {passFeedback && (
                  <div className={`settings-feedback-banner ${passFeedback.type}`}>
                    {passFeedback.text}
                  </div>
                )}

                <div className="settings-form-actions">
                  <button
                    type="button"
                    className="settings-btn-secondary"
                    disabled={isChangingPass || !oldPassword || !newPassword}
                    onClick={handleChangePassword}
                  >
                    {isChangingPass ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. MỤC: GIAO DIỆN */}
          {activeTab === 'appearance' && (
            <div className="settings-tab-panel">
              <h2 className="settings-panel-title">Giao diện</h2>

              {/* Chọn Theme Tối / Sáng / Theo hệ thống */}
              <div className="settings-card-box">
                <label className="settings-form-label">Chế độ hiển thị</label>
                <div className="settings-theme-cards-grid">
                  <button
                    type="button"
                    className={`settings-theme-card ${settings.themeMode === 'dark' ? 'active' : ''}`}
                    onClick={() => {
                      updateSetting('themeMode', 'dark');
                      onThemeChange('dark');
                    }}
                  >
                    <div className="settings-theme-card-preview dark-theme-preview">
                      <div className="preview-topbar" />
                      <div className="preview-sidebar" />
                      <div className="preview-chat-body" />
                    </div>
                    <div className="settings-theme-card-content">
                      <span className="settings-theme-name">🌙 Chế độ Tối</span>
                      <span className="settings-theme-desc">Dịu mắt khi dùng buổi tối</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`settings-theme-card ${settings.themeMode === 'light' ? 'active' : ''}`}
                    onClick={() => {
                      updateSetting('themeMode', 'light');
                      onThemeChange('light');
                    }}
                  >
                    <div className="settings-theme-card-preview light-theme-preview">
                      <div className="preview-topbar" />
                      <div className="preview-sidebar" />
                      <div className="preview-chat-body" />
                    </div>
                    <div className="settings-theme-card-content">
                      <span className="settings-theme-name">☀️ Chế độ Sáng</span>
                      <span className="settings-theme-desc">Rõ nét ban ngày</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`settings-theme-card ${settings.themeMode === 'system' ? 'active' : ''}`}
                    onClick={() => {
                      updateSetting('themeMode', 'system');
                      const isSystemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                      onThemeChange(isSystemDark ? 'dark' : 'light');
                    }}
                  >
                    <div className="settings-theme-card-preview system-theme-preview">
                      <div className="half-dark" />
                      <div className="half-light" />
                    </div>
                    <div className="settings-theme-card-content">
                      <span className="settings-theme-name">💻 Theo hệ thống</span>
                      <span className="settings-theme-desc">Tự động theo cài đặt HĐH</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Cỡ chữ (3 mức) */}
              <div className="settings-card-box">
                <label className="settings-form-label">Cỡ chữ hiển thị</label>
                <div className="settings-segmented-group">
                  {(['small', 'medium', 'large'] as const).map(size => {
                    const label = size === 'small' ? 'Nhỏ (13px)' : size === 'medium' ? 'Vừa (15px)' : 'Lớn (17px)';
                    return (
                      <button
                        key={size}
                        type="button"
                        className={`settings-segmented-btn ${settings.fontSize === size ? 'active' : ''}`}
                        onClick={() => {
                          updateSetting('fontSize', size);
                          document.documentElement.setAttribute('data-font-size', size);
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mật độ tin nhắn */}
              <div className="settings-card-box">
                <label className="settings-form-label">Mật độ tin nhắn</label>
                <div className="settings-segmented-group">
                  <button
                    type="button"
                    className={`settings-segmented-btn ${settings.messageDensity === 'compact' ? 'active' : ''}`}
                    onClick={() => {
                      updateSetting('messageDensity', 'compact');
                      document.documentElement.setAttribute('data-density', 'compact');
                    }}
                  >
                    Gọn (Compact)
                  </button>
                  <button
                    type="button"
                    className={`settings-segmented-btn ${settings.messageDensity === 'cozy' ? 'active' : ''}`}
                    onClick={() => {
                      updateSetting('messageDensity', 'cozy');
                      document.documentElement.setAttribute('data-density', 'cozy');
                    }}
                  >
                    Thoải mái (Cozy)
                  </button>
                </div>
              </div>

              {/* Định dạng giờ */}
              <div className="settings-card-box">
                <label className="settings-form-label">Định dạng hiển thị thời gian</label>
                <div className="settings-segmented-group">
                  <button
                    type="button"
                    className={`settings-segmented-btn ${settings.timeFormat === '12h' ? 'active' : ''}`}
                    onClick={() => updateSetting('timeFormat', '12h')}
                  >
                    12 Giờ (02:30 CH)
                  </button>
                  <button
                    type="button"
                    className={`settings-segmented-btn ${settings.timeFormat === '24h' ? 'active' : ''}`}
                    onClick={() => updateSetting('timeFormat', '24h')}
                  >
                    24 Giờ (14:30)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. MỤC: THÔNG BÁO & ÂM THANH */}
          {activeTab === 'notifications' && (
            <div className="settings-tab-panel">
              <h2 className="settings-panel-title">Thông báo & âm thanh</h2>

              {/* Công tắc âm thanh tin mới */}
              <div className="settings-card-box">
                <div className="settings-toggle-row">
                  <div className="settings-toggle-info">
                    <span className="settings-toggle-title">Âm báo tin nhắn mới</span>
                    <span className="settings-toggle-desc">Phát âm thanh nhẹ nhàng mỗi khi có tin nhắn mới gửi đến kênh</span>
                  </div>
                  <label className="settings-switch">
                    <input
                      type="checkbox"
                      checked={settings.soundEnabled}
                      onChange={e => updateSetting('soundEnabled', e.target.checked)}
                    />
                    <span className="settings-slider round" />
                  </label>
                </div>

                <div className="settings-toggle-divider" />

                {/* Công tắc thông báo nhắc tên */}
                <div className="settings-toggle-row">
                  <div className="settings-toggle-info">
                    <span className="settings-toggle-title">Thông báo khi được nhắc tên (@mention)</span>
                    <span className="settings-toggle-desc">Nhận thông báo ưu tiên khi có ai đó gắn thẻ username của bạn</span>
                  </div>
                  <label className="settings-switch">
                    <input
                      type="checkbox"
                      checked={settings.mentionNotify}
                      onChange={e => updateSetting('mentionNotify', e.target.checked)}
                    />
                    <span className="settings-slider round" />
                  </label>
                </div>
              </div>

              {/* Âm lượng & Nút Nghe thử */}
              <div className="settings-card-box">
                <label className="settings-form-label">Âm lượng thông báo</label>
                <div className="settings-volume-control-row">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    className="settings-range-slider"
                    value={settings.soundVolume}
                    onChange={e => updateSetting('soundVolume', Number(e.target.value))}
                  />
                  <span className="settings-volume-value">{settings.soundVolume}%</span>
                  <button
                    type="button"
                    className="settings-btn-sound-test"
                    onClick={handlePlayTestSound}
                    title="Phát thử âm thanh"
                  >
                    <Volume2 size={16} />
                    <span>Nghe thử</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. MỤC: TRÒ CHUYỆN */}
          {activeTab === 'chat' && (
            <div className="settings-tab-panel">
              <h2 className="settings-panel-title">Trò chuyện</h2>

              <div className="settings-card-box">
                {/* Tự động cuộn xuống tin mới */}
                <div className="settings-toggle-row">
                  <div className="settings-toggle-info">
                    <span className="settings-toggle-title">
                      <ArrowDown size={16} className="settings-inline-icon" />
                      Tự động cuộn xuống tin mới
                    </span>
                    <span className="settings-toggle-desc">Tự động giữ tầm nhìn ở tin nhắn mới nhất khi đang trò chuyện</span>
                  </div>
                  <label className="settings-switch">
                    <input
                      type="checkbox"
                      checked={settings.autoScroll}
                      onChange={e => updateSetting('autoScroll', e.target.checked)}
                    />
                    <span className="settings-slider round" />
                  </label>
                </div>

                <div className="settings-toggle-divider" />

                {/* Enter để gửi / Shift+Enter xuống dòng */}
                <div className="settings-toggle-row">
                  <div className="settings-toggle-info">
                    <span className="settings-toggle-title">Nhấn Enter để gửi tin nhắn</span>
                    <span className="settings-toggle-desc">Bấm Enter để gửi đi ngay, dùng tổ hợp Shift + Enter để xuống dòng</span>
                  </div>
                  <label className="settings-switch">
                    <input
                      type="checkbox"
                      checked={settings.enterToSend}
                      onChange={e => updateSetting('enterToSend', e.target.checked)}
                    />
                    <span className="settings-slider round" />
                  </label>
                </div>

                <div className="settings-toggle-divider" />

                {/* Hiện chỉ báo đang nhập */}
                <div className="settings-toggle-row">
                  <div className="settings-toggle-info">
                    <span className="settings-toggle-title">Hiện chỉ báo "Đang soạn tin..."</span>
                    <span className="settings-toggle-desc">Hiển thị khi có thành viên trong kênh đang gõ tin nhắn</span>
                  </div>
                  <label className="settings-switch">
                    <input
                      type="checkbox"
                      checked={settings.showTyping}
                      onChange={e => updateSetting('showTyping', e.target.checked)}
                    />
                    <span className="settings-slider round" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 5. MỤC: KẾT NỐI & MẠNG */}
          {activeTab === 'network' && (
            <div className="settings-tab-panel">
              <h2 className="settings-panel-title">Kết nối & mạng</h2>

              <div className="settings-card-box">
                <div className="settings-network-status-banner connected">
                  <div className="network-status-dot online" />
                  <div className="network-status-text">
                    <strong>Đã kết nối ổn định</strong>
                    <span>Dữ liệu TCP và luồng SSE hoạt động bình thường</span>
                  </div>
                </div>

                <div className="settings-network-details-grid">
                  <div className="network-detail-item">
                    <span className="network-detail-label">Máy chủ Chat TCP</span>
                    <span className="network-detail-value">127.0.0.1:5000</span>
                  </div>

                  <div className="network-detail-item">
                    <span className="network-detail-label">Cổng giao tiếp Web Bridge</span>
                    <span className="network-detail-value">localhost:8080</span>
                  </div>

                  <div className="network-detail-item">
                    <span className="network-detail-label">Độ trễ Ping hiện tại</span>
                    <span className="network-detail-value ping-value">{pingMs} ms</span>
                  </div>

                  <div className="network-detail-item">
                    <span className="network-detail-label">Thời gian kết nối (Uptime)</span>
                    <span className="network-detail-value">{formatUptime(uptimeSeconds)}</span>
                  </div>
                </div>

                <div className="settings-toggle-divider" />

                {/* Tự động kết nối lại */}
                <div className="settings-toggle-row">
                  <div className="settings-toggle-info">
                    <span className="settings-toggle-title">Tự động kết nối lại</span>
                    <span className="settings-toggle-desc">Tự động thiết lập lại luồng SSE và Socket khi phát hiện mất kết nối</span>
                  </div>
                  <label className="settings-switch">
                    <input
                      type="checkbox"
                      checked={settings.autoReconnect}
                      onChange={e => updateSetting('autoReconnect', e.target.checked)}
                    />
                    <span className="settings-slider round" />
                  </label>
                </div>

                <div className="settings-form-actions">
                  <button
                    type="button"
                    className="settings-btn-secondary"
                    onClick={handlePingTest}
                    disabled={isReconnecting}
                  >
                    <RefreshCw size={14} className={isReconnecting ? 'spin' : ''} />
                    <span>{isReconnecting ? 'Đang kiểm tra...' : 'Kết nối lại ngay'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 6. MỤC: PHÍM TẮT */}
          {activeTab === 'shortcuts' && (
            <div className="settings-tab-panel">
              <h2 className="settings-panel-title">Phím tắt</h2>

              <div className="settings-card-box">
                <table className="settings-shortcuts-table">
                  <thead>
                    <tr>
                      <th>Thao tác</th>
                      <th>Phím tắt</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Gửi tin nhắn</td>
                      <td><kbd>Enter</kbd></td>
                    </tr>
                    <tr>
                      <td>Xuống dòng trong ô nhập</td>
                      <td><kbd>Shift</kbd> + <kbd>Enter</kbd></td>
                    </tr>
                    <tr>
                      <td>Mở Cài đặt người dùng</td>
                      <td><kbd>Ctrl</kbd> + <kbd>,</kbd></td>
                    </tr>
                    <tr>
                      <td>Đóng cửa sổ / Thoát</td>
                      <td><kbd>Esc</kbd></td>
                    </tr>
                    <tr>
                      <td>Chỉnh sửa tin nhắn gần nhất</td>
                      <td><kbd>↑</kbd> (trong ô nhập rỗng)</td>
                    </tr>
                    <tr>
                      <td>Di chuyển giữa các mục Cài đặt</td>
                      <td><kbd>↑</kbd> / <kbd>↓</kbd></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 7. MỤC: GIỚI THIỆU */}
          {activeTab === 'about' && (
            <div className="settings-tab-panel">
              <h2 className="settings-panel-title">Giới thiệu</h2>

              <div className="settings-card-box about-box">
                <div className="about-brand-row">
                  <div className="about-logo-badge">HDL</div>
                  <div>
                    <h3 className="about-app-name">Huddle</h3>
                    <span className="about-app-version">Phiên bản v2.0 (Ổn định)</span>
                  </div>
                </div>

                <p className="about-desc">
                  Ứng dụng nhắn tin nhóm thời gian thực hỗ trợ phân chia không gian Phòng chat, Kênh văn bản độc lập và quản trị thành viên phân tán.
                </p>

                <div className="about-info-list">
                  <div className="about-info-item">
                    <span className="about-info-label">Dự án:</span>
                    <span className="about-info-value">Nhóm 08 · Lập trình mạng (CMP180) · HUTECH</span>
                  </div>
                  <div className="about-info-item">
                    <span className="about-info-label">Công nghệ:</span>
                    <span className="about-info-value">Java TCP + Web SSE + React TypeScript</span>
                  </div>
                  <div className="about-info-item">
                    <span className="about-info-label">Kiến trúc:</span>
                    <span className="about-info-value">Client/Server phân tán · TCP Socket non-blocking · REST/SSE Bridge</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
