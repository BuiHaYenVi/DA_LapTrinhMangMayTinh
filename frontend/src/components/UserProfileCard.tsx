import React, { useState, useEffect, useRef } from 'react';
import type { User, PresenceStatus } from '../types/chat';
import { 
  X, Crown, Shield, User as UserIcon, MessageSquare, 
  Settings, Check, Send, MoreVertical, Edit2
} from 'lucide-react';
import { 
  loadStoredSettings, 
  updateUserPresence, 
  updateCustomStatus 
} from './UserSettingsModal';

interface Props {
  user: User;
  currentUserId?: number;
  currentUserRole?: string;
  roomRole?: string;
  roomName?: string;
  anchorRect?: DOMRect | null;
  onClose: () => void;
  onDirectMessage: (userId: number, name: string, initialMessage?: string) => void;
  onOpenSettings?: () => void;
  onSetMemberRole?: (userId: number, role: string) => void;
  onTransferOwner?: (userId: number) => void;
  onKickMember?: (userId: number) => void;
}

export const UserProfileCard: React.FC<Props> = ({
  user,
  currentUserId,
  currentUserRole,
  roomRole,
  roomName,
  anchorRect,
  onClose,
  onDirectMessage,
  onOpenSettings,
  onSetMemberRole,
  onTransferOwner,
  onKickMember
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const isMe = user.id === currentUserId;
  const isOwner = currentUserRole === 'OWNER';
  const isAdmin = currentUserRole === 'ADMIN';
  const targetRole = roomRole || user.role || 'MEMBER';
  const canManage = !isMe && (isOwner || (isAdmin && targetRole !== 'OWNER' && targetRole !== 'ADMIN'));

  // Local state
  const [storedSettings, setStoredSettings] = useState(loadStoredSettings);
  const [quickMsg, setQuickMsg] = useState('');
  const [isEditingCustomStatus, setIsEditingCustomStatus] = useState(false);
  const [editingStatusText, setEditingStatusText] = useState('');
  const [showManagerMenu, setShowManagerMenu] = useState(false);

  // Sync settings when changed
  useEffect(() => {
    const handleSync = () => setStoredSettings(loadStoredSettings());
    window.addEventListener('user_settings_updated', handleSync);
    return () => window.removeEventListener('user_settings_updated', handleSync);
  }, []);

  // Close on outside click or ESC
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Determine avatar icon, avatar color, banner color, presence, custom status
  const avatarChar = isMe
    ? (storedSettings.avatarIcon || (user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'))
    : (user.avatarIcon || (user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'));

  const avatarColor = isMe 
    ? (storedSettings.avatarColor || '#5865F2') 
    : (user.avatarColor || '#2DD4BF');

  const bannerColor = isMe 
    ? (storedSettings.bannerColor || '#23A55A') 
    : (user.bannerColor || '#5865F2');

  const effectivePresence: PresenceStatus = isMe
    ? (storedSettings.presenceStatus || 'online')
    : (user.online === false ? 'offline' : (user.presenceStatus || 'online'));

  const effectiveCustomStatus = isMe
    ? (storedSettings.customStatus || '')
    : (user.customStatus || (user.online === false ? 'Ngoại tuyến' : ''));

  const effectiveBio = isMe
    ? (storedSettings.bio || '')
    : (user.bio || '');

  // Calculate Popover Position (float left of anchor, align vertically, clamp within viewport)
  const cardWidth = 320;
  const cardHeight = 440;
  let top = 100;
  let left = 100;

  if (anchorRect) {
    // Put card to the left of member sidebar item
    left = anchorRect.left - cardWidth - 12;
    if (left < 12) {
      // If no room on left, put it on right
      left = anchorRect.right + 12;
    }
    // Vertical alignment
    top = Math.max(12, Math.min(window.innerHeight - cardHeight - 20, anchorRect.top - 40));
  } else {
    // Center if no anchor
    left = Math.max(12, (window.innerWidth - cardWidth) / 2);
    top = Math.max(12, (window.innerHeight - cardHeight) / 2);
  }

  // Handle switching status for current user
  const handleSelectPresence = (st: PresenceStatus) => {
    updateUserPresence(st);
  };

  // Save custom status inline
  const handleSaveCustomStatus = () => {
    updateCustomStatus(editingStatusText.trim());
    setIsEditingCustomStatus(false);
  };

  // Send quick DM
  const handleSendQuickDm = (e: React.FormEvent) => {
    e.preventDefault();
    onDirectMessage(user.id, user.displayName, quickMsg.trim() || undefined);
    onClose();
  };

  // Moderator actions
  const handleRoleAction = (type: 'role' | 'transfer' | 'kick') => {
    setShowManagerMenu(false);
    if (type === 'role') {
      const nextRole = targetRole === 'ADMIN' ? 'MEMBER' : 'ADMIN';
      if (onSetMemberRole) onSetMemberRole(user.id, nextRole);
    } else if (type === 'transfer') {
      if (onTransferOwner) onTransferOwner(user.id);
    } else if (type === 'kick') {
      if (onKickMember) onKickMember(user.id);
    }
    onClose();
  };

  const presenceLabels: Record<PresenceStatus, string> = {
    online: 'Trực tuyến',
    idle: 'Chờ',
    dnd: 'Không làm phiền',
    invisible: 'Ẩn danh',
    offline: 'Ngoại tuyến'
  };

  const presenceColors: Record<PresenceStatus, string> = {
    online: '#23a55a',
    idle: '#f0b232',
    dnd: '#f23f43',
    invisible: '#80848e',
    offline: '#80848e'
  };

  return (
    <div 
      className="discord-profile-popover-backdrop"
      onClick={onClose}
    >
      <div 
        ref={cardRef}
        className="discord-profile-card"
        style={{ top, left }}
        onClick={e => e.stopPropagation()}
      >
        {/* 1. HEADER BANNER */}
        <div 
          className="discord-profile-banner"
          style={{ backgroundColor: bannerColor }}
        >
          <div className="discord-profile-banner-actions">
            {!isMe && (
              <button
                type="button"
                className="banner-icon-btn"
                title="Nhắn tin riêng"
                onClick={() => {
                  onDirectMessage(user.id, user.displayName);
                  onClose();
                }}
              >
                <MessageSquare size={16} />
              </button>
            )}

            {canManage && (
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="banner-icon-btn"
                  title="Quản lý thành viên"
                  onClick={() => setShowManagerMenu(prev => !prev)}
                >
                  <MoreVertical size={16} />
                </button>

                {showManagerMenu && (
                  <div className="profile-manager-dropdown">
                    {isOwner && (
                      <>
                        <button
                          type="button"
                          className="manager-dropdown-item"
                          onClick={() => handleRoleAction('role')}
                        >
                          {targetRole === 'ADMIN' ? 'Hạ xuống Thành viên' : 'Phong làm Phó nhóm'}
                        </button>
                        <button
                          type="button"
                          className="manager-dropdown-item warning"
                          onClick={() => handleRoleAction('transfer')}
                        >
                          Chuyển quyền Chủ phòng
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="manager-dropdown-item danger"
                      onClick={() => handleRoleAction('kick')}
                    >
                      Xóa khỏi phòng (Kick)
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              className="banner-icon-btn close-btn"
              title="Đóng"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 2. AVATAR & STATUS BUBBLE ROW */}
        <div className="discord-profile-avatar-row">
          <div className="discord-profile-avatar-wrapper">
            <div 
              className="discord-profile-avatar"
              style={{ 
                backgroundColor: avatarColor,
                fontSize: isMe && storedSettings.avatarIcon ? '32px' : '26px'
              }}
            >
              {avatarChar}
            </div>

            {/* Chấm trạng thái có viền dày */}
            <div 
              className={`discord-profile-status-badge ${effectivePresence}`}
              style={{ backgroundColor: presenceColors[effectivePresence] }}
              title={presenceLabels[effectivePresence]}
            />
          </div>

          {/* Bong bóng trạng thái tùy chỉnh kiểu Discord */}
          <div className="discord-profile-bubble-container">
            {isMe && isEditingCustomStatus ? (
              <div className="discord-profile-bubble-edit">
                <input
                  type="text"
                  maxLength={60}
                  className="bubble-edit-input"
                  value={editingStatusText}
                  onChange={e => setEditingStatusText(e.target.value)}
                  placeholder="Đặt trạng thái..."
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveCustomStatus();
                    if (e.key === 'Escape') setIsEditingCustomStatus(false);
                  }}
                />
                <button 
                  type="button" 
                  className="bubble-save-btn" 
                  onClick={handleSaveCustomStatus}
                  title="Lưu"
                >
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <div 
                className={`discord-profile-bubble ${isMe ? 'interactive' : ''}`}
                onClick={() => {
                  if (isMe) {
                    setEditingStatusText(effectiveCustomStatus);
                    setIsEditingCustomStatus(true);
                  }
                }}
                title={isMe ? 'Nhấn để chỉnh sửa trạng thái tùy chỉnh' : undefined}
              >
                <div className="discord-profile-bubble-tail" />
                <span className="bubble-text">
                  {effectiveCustomStatus ? (
                    `💬 ${effectiveCustomStatus}`
                  ) : (
                    isMe ? '+ Đặt trạng thái tùy chỉnh' : 'Trực tuyến'
                  )}
                </span>
                {isMe && <Edit2 size={11} className="bubble-edit-icon" />}
              </div>
            )}
          </div>
        </div>

        {/* 3. THÔNG TIN HỒ SƠ CHI TIẾT */}
        <div className="discord-profile-body">
          <div className="discord-profile-card-inner">
            {/* Tên hiển thị và Username */}
            <div className="discord-profile-header-info">
              <h3 className="profile-display-name">
                {user.displayName || user.username}
                {isMe && <span className="profile-you-badge"> (Bạn)</span>}
              </h3>
              <div className="profile-username">
                @{user.username}
              </div>
            </div>

            <div className="profile-divider" />

            {/* Vai trò trong phòng */}
            <div className="profile-section">
              <div className="profile-section-title">VAI TRÒ TRONG PHÒNG</div>
              <div className="profile-role-row">
                {targetRole === 'OWNER' && (
                  <span className="profile-role-pill owner">
                    <Crown size={12} /> Chủ phòng
                  </span>
                )}
                {targetRole === 'ADMIN' && (
                  <span className="profile-role-pill admin">
                    <Shield size={12} /> Phó nhóm
                  </span>
                )}
                {targetRole === 'MEMBER' && (
                  <span className="profile-role-pill member">
                    <UserIcon size={12} /> Thành viên
                  </span>
                )}
              </div>
            </div>

            {/* Tiểu sử giới thiệu */}
            {effectiveBio ? (
              <div className="profile-section">
                <div className="profile-section-title">GIỚI THIỆU</div>
                <div className="profile-bio-text">{effectiveBio}</div>
              </div>
            ) : (
              roomName && (
                <div className="profile-section">
                  <div className="profile-section-title">PHÒNG CHAT HIỆN TẠI</div>
                  <div className="profile-room-meta">📍 {roomName}</div>
                </div>
              )
            )}

            {/* 4. PHẦN HÀNH ĐỘNG DÀNH CHO BẢN THÂN HOẶC THÀNH VIÊN KHÁC */}
            {isMe ? (
              <div className="profile-self-actions">
                {/* Nút sửa hồ sơ */}
                <button
                  type="button"
                  className="profile-primary-btn"
                  onClick={() => {
                    onClose();
                    if (onOpenSettings) onOpenSettings();
                  }}
                >
                  <Settings size={15} /> Sửa Hồ Sơ
                </button>

                {/* Bộ chọn trạng thái nhanh */}
                <div className="profile-section" style={{ marginTop: '12px' }}>
                  <div className="profile-section-title">TRẠNG THÁI HIỆN DIỆN</div>
                  <div className="quick-presence-grid">
                    {[
                      { id: 'online', label: 'Trực tuyến', color: '#23a55a' },
                      { id: 'idle', label: 'Chờ', color: '#f0b232' },
                      { id: 'dnd', label: 'Không làm phiền', color: '#f23f43' },
                      { id: 'invisible', label: 'Ẩn danh', color: '#80848e' }
                    ].map(st => (
                      <button
                        key={st.id}
                        type="button"
                        className={`quick-presence-chip ${effectivePresence === st.id ? 'active' : ''}`}
                        onClick={() => handleSelectPresence(st.id as PresenceStatus)}
                      >
                        <span 
                          className="chip-dot" 
                          style={{ backgroundColor: st.color }} 
                        />
                        <span>{st.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="profile-other-actions">
                {/* Ô nhắn tin nhanh đến người này */}
                <form onSubmit={handleSendQuickDm} className="profile-quick-dm-form">
                  <input
                    type="text"
                    className="profile-quick-dm-input"
                    value={quickMsg}
                    onChange={e => setQuickMsg(e.target.value)}
                    placeholder={`Nhắn tin cho @${user.displayName || user.username}...`}
                  />
                  <button 
                    type="submit" 
                    className="profile-quick-dm-send-btn"
                    title="Gửi tin nhắn"
                  >
                    <Send size={15} />
                  </button>
                </form>

                <button
                  type="button"
                  className="profile-dm-link-btn"
                  onClick={() => {
                    onDirectMessage(user.id, user.displayName);
                    onClose();
                  }}
                >
                  <MessageSquare size={14} /> Mở cuộc trò chuyện riêng tư
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
