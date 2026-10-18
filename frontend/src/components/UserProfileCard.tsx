import React, { useState, useEffect, useRef } from 'react';
import type { User, PresenceStatus, Room, Friend } from '../types/chat';
import { 
  X, Crown, Shield, User as UserIcon, MessageSquare, 
  Settings, Check, Send, MoreVertical, Edit2, Clock, 
  FileText, UserPlus, UserCheck, ExternalLink
} from 'lucide-react';
import { 
  loadStoredSettings, 
  updateUserPresence, 
  updateCustomStatus,
  type SettingsTabId
} from './UserSettingsModal';
import { 
  FullProfileModal, 
  getUserNote, 
  saveUserNote, 
  getFriendDate 
} from './FullProfileModal';

interface Props {
  user: User;
  currentUserId?: number;
  currentUserRole?: string;
  roomRole?: string;
  roomName?: string;
  rooms?: Room[];
  friends?: Friend[];
  onSendFriendRequest?: (userId: number) => void;
  anchorRect?: DOMRect | null;
  onClose: () => void;
  onDirectMessage: (userId: number, name: string, initialMessage?: string) => void;
  onOpenSettings?: (initialTab?: SettingsTabId) => void;
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
  rooms = [],
  friends = [],
  onSendFriendRequest,
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
  const isFriend = Boolean(friends.some(f => f.id === user.id));

  // Local state
  const [storedSettings, setStoredSettings] = useState(loadStoredSettings);
  const [quickMsg, setQuickMsg] = useState('');
  const [isEditingCustomStatus, setIsEditingCustomStatus] = useState(false);
  const [editingStatusText, setEditingStatusText] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isFullProfileOpen, setIsFullProfileOpen] = useState(false);
  const [note, setNote] = useState(() => getUserNote(user.id));
  const [isEditingNote, setIsEditingNote] = useState(false);

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

  const effectiveUsername = user.username 
    ? user.username 
    : (user.displayName ? user.displayName.toLowerCase().replace(/\s+/g, '') : `user_${user.id}`);

  const friendDate = getFriendDate(user.id, isFriend);
  const mutualRoomsCount = rooms.length > 0 ? rooms.length : 1;

  // Calculate Popover Position (float left of anchor, align vertically, clamp within viewport)
  const cardWidth = 320;
  const cardHeight = 490;
  let top = 100;
  let left = 100;

  if (anchorRect) {
    left = anchorRect.left - cardWidth - 12;
    if (left < 12) {
      left = anchorRect.right + 12;
    }
    top = Math.max(12, Math.min(window.innerHeight - cardHeight - 20, anchorRect.top - 40));
  } else {
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

  // Save quick note
  const handleSaveNote = () => {
    saveUserNote(user.id, note.trim());
    setIsEditingNote(false);
  };

  // Send quick DM
  const handleSendQuickDm = (e: React.FormEvent) => {
    e.preventDefault();
    onDirectMessage(user.id, user.displayName, quickMsg.trim() || undefined);
    onClose();
  };

  // Moderator actions
  const handleRoleAction = (type: 'role' | 'transfer' | 'kick') => {
    setShowMoreMenu(false);
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
    <>
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
                <>
                  <button
                    type="button"
                    className="banner-icon-btn"
                    title={isFriend ? 'Đã là bạn bè' : 'Gửi lời mời kết bạn'}
                    onClick={() => {
                      if (!isFriend && onSendFriendRequest) {
                        onSendFriendRequest(user.id);
                      }
                    }}
                  >
                    {isFriend ? <UserCheck size={16} color="#23a55a" /> : <UserPlus size={16} />}
                  </button>

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
                </>
              )}

              {/* DẤU 3 CHẤM LUÔN CÓ CHO MỌI NGƯỜI DÙNG */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="banner-icon-btn"
                  title="Tùy chọn khác"
                  onClick={() => setShowMoreMenu(prev => !prev)}
                >
                  <MoreVertical size={16} />
                </button>

                {showMoreMenu && (
                  <div className="profile-manager-dropdown">
                    <button
                      type="button"
                      className="manager-dropdown-item highlight"
                      onClick={() => {
                        setShowMoreMenu(false);
                        setIsFullProfileOpen(true);
                      }}
                    >
                      <UserIcon size={14} style={{ marginRight: 6 }} /> Xem hồ sơ đầy đủ
                    </button>

                    <button
                      type="button"
                      className="manager-dropdown-item"
                      onClick={() => {
                        navigator.clipboard?.writeText(`@${effectiveUsername}`);
                        setShowMoreMenu(false);
                      }}
                    >
                      Sao chép tên người dùng
                    </button>

                    {!isFriend && !isMe && onSendFriendRequest && (
                      <button
                        type="button"
                        className="manager-dropdown-item"
                        onClick={() => {
                          onSendFriendRequest(user.id);
                          setShowMoreMenu(false);
                        }}
                      >
                        <UserPlus size={14} style={{ marginRight: 6 }} /> Gửi lời mời kết bạn
                      </button>
                    )}

                    {canManage && (
                      <>
                        <div className="dropdown-divider" />
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
                      </>
                    )}

                    <div className="dropdown-divider" />
                    <button
                      type="button"
                      className="manager-dropdown-item"
                      onClick={() => setShowMoreMenu(false)}
                    >
                      Bỏ qua
                    </button>
                    <button
                      type="button"
                      className="manager-dropdown-item danger"
                      onClick={() => setShowMoreMenu(false)}
                    >
                      Chặn
                    </button>
                    <button
                      type="button"
                      className="manager-dropdown-item danger"
                      onClick={() => setShowMoreMenu(false)}
                    >
                      Báo Cáo Hồ Sơ Người dùng
                    </button>
                  </div>
                )}
              </div>

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
              {/* Tên hiển thị và Username chuẩn Discord */}
              <div className="discord-profile-header-info">
                <h3 className="profile-display-name">
                  {user.displayName || user.username}
                  {isMe && <span className="profile-you-badge"> (Bạn)</span>}
                </h3>
                <div className="profile-username">
                  @{effectiveUsername}
                </div>
              </div>

              <div className="profile-divider" />

              {/* VAI TRÒ TRONG PHÒNG */}
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

              {/* BẠN BÈ TỪ LÚC NÀO & GIA NHẬP TỪ */}
              <div className="profile-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div className="profile-section-title">BẠN BÈ TỪ</div>
                  <div className="profile-meta-val" title={isFriend ? friendDate : 'Chưa kết bạn'}>
                    <Clock size={12} className="meta-icon" />
                    <span>{isFriend ? friendDate : (isMe ? 'Chính bạn' : 'Chưa kết bạn')}</span>
                  </div>
                </div>
                <div>
                  <div className="profile-section-title">MÁY CHỦ CHUNG</div>
                  <div className="profile-meta-val">
                    <span>{mutualRoomsCount} phòng chung</span>
                  </div>
                </div>
              </div>

              {/* GHI CHÚ (CHỈ HIỂN THỊ CHO BẠN) */}
              <div className="profile-section" style={{ marginTop: '8px' }}>
                <div className="profile-section-title">GHI CHÚ (CHỈ HIỂN THỊ CHO BẠN)</div>
                {isEditingNote ? (
                  <div className="note-edit-box-mini">
                    <input
                      type="text"
                      maxLength={120}
                      className="note-input-mini"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Nhấp để thêm ghi chú..."
                      autoFocus
                      onBlur={handleSaveNote}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveNote();
                        if (e.key === 'Escape') setIsEditingNote(false);
                      }}
                    />
                  </div>
                ) : (
                  <div 
                    className={`note-preview-mini ${!note ? 'empty' : ''}`}
                    onClick={() => setIsEditingNote(true)}
                    title="Bấm để chỉnh sửa ghi chú"
                  >
                    <FileText size={11} />
                    <span>{note || 'Nhấp để thêm ghi chú'}</span>
                  </div>
                )}
              </div>

              {/* Tiểu sử giới thiệu nếu có */}
              {effectiveBio && (
                <div className="profile-section">
                  <div className="profile-section-title">GIỚI THIỆU</div>
                  <div className="profile-bio-text">{effectiveBio}</div>
                </div>
              )}

              {/* Nút Xem hồ sơ đầy đủ */}
              <button
                type="button"
                className="profile-full-view-btn"
                onClick={() => setIsFullProfileOpen(true)}
              >
                <ExternalLink size={13} /> Xem hồ sơ đầy đủ
              </button>

              {/* 4. PHẦN HÀNH ĐỘNG DÀNH CHO BẢN THÂN HOẶC THÀNH VIÊN KHÁC */}
              {isMe ? (
                <div className="profile-self-actions">
                  <button
                    type="button"
                    className="profile-primary-btn"
                    onClick={() => {
                      onClose();
                      if (onOpenSettings) onOpenSettings('profile');
                    }}
                  >
                    <Settings size={15} /> Sửa Hồ Sơ
                  </button>

                  <div className="profile-section" style={{ marginTop: '10px' }}>
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

      {/* MODAL HỒ SƠ ĐẦY ĐỦ PHONG CÁCH DISCORD */}
      {isFullProfileOpen && (
        <FullProfileModal
          isOpen={isFullProfileOpen}
          onClose={() => setIsFullProfileOpen(false)}
          user={user}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          roomRole={targetRole}
          roomName={roomName}
          rooms={rooms}
          friends={friends}
          onDirectMessage={onDirectMessage}
          onSendFriendRequest={onSendFriendRequest}
          onOpenSettings={onOpenSettings}
        />
      )}
    </>
  );
};

export default UserProfileCard;
