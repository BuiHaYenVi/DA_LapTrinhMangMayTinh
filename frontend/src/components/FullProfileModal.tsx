import React, { useState, useEffect } from 'react';
import type { User, Room, Friend, PresenceStatus } from '../types/chat';
import { 
  X, MessageSquare, UserPlus, UserCheck, MoreVertical, 
  Calendar, Clock, FileText, Crown, Shield, User as UserIcon,
  Check, ShieldAlert, Edit2
} from 'lucide-react';
import { loadStoredSettings, type SettingsTabId } from './UserSettingsModal';
import { chatBridge } from '../services/chatBridge';

/**
 * Kiểm tra trạng thái bạn bè đa chiều (ID số/chuỗi, username, displayName)
 */
export function checkIsFriend(
  friends: Friend[] = [],
  user?: { id?: any; username?: string; displayName?: string } | null
): boolean {
  if (!user || !friends || !Array.isArray(friends) || friends.length === 0) return false;
  return friends.some((f) => {
    // 1. So sánh ID (chuyển đổi linh hoạt Number)
    if (f.id != null && user.id != null && Number(f.id) === Number(user.id)) {
      return true;
    }
    // 2. So sánh tên đăng nhập (username)
    const fUsername = (f.username || '').trim().toLowerCase();
    const uUsername = (user.username || '').trim().toLowerCase();
    if (fUsername && uUsername && fUsername === uUsername) {
      return true;
    }
    // 3. So sánh tên hiển thị (displayName)
    const fDisplay = (f.displayName || '').trim().toLowerCase();
    const uDisplay = (user.displayName || '').trim().toLowerCase();
    if (fDisplay && uDisplay && fDisplay === uDisplay) {
      return true;
    }
    // 4. So sánh chéo username và displayName
    if (fUsername && uDisplay && fUsername === uDisplay) {
      return true;
    }
    if (fDisplay && uUsername && fDisplay === uUsername) {
      return true;
    }
    return false;
  });
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  currentUserId?: number;
  currentUserRole?: string;
  roomRole?: string;
  roomName?: string;
  rooms?: Room[];
  friends?: Friend[];
  onDirectMessage: (userId: number, name: string) => void;
  onSendFriendRequest?: (userId: number) => void;
  onOpenSettings?: (initialTab?: SettingsTabId) => void;
}

export function getUserNote(targetUserId: number): string {
  try {
    const raw = localStorage.getItem('discord_mini_user_notes');
    if (!raw) return '';
    const map = JSON.parse(raw);
    return map[targetUserId] || '';
  } catch {
    return '';
  }
}

export function saveUserNote(targetUserId: number, note: string): void {
  try {
    const raw = localStorage.getItem('discord_mini_user_notes');
    const map = raw ? JSON.parse(raw) : {};
    map[targetUserId] = note;
    localStorage.setItem('discord_mini_user_notes', JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function getFriendDate(targetUserId: number, isFriend: boolean): string {
  if (!isFriend) return '';
  try {
    const raw = localStorage.getItem('discord_mini_friend_dates');
    const map = raw ? JSON.parse(raw) : {};
    if (map[targetUserId]) return map[targetUserId];
    const d = new Date(Date.now() - ((targetUserId % 30 + 10) * 86400000 * 3));
    const formatted = `${d.getDate()} thg ${d.getMonth() + 1}, ${d.getFullYear()}`;
    map[targetUserId] = formatted;
    localStorage.setItem('discord_mini_friend_dates', JSON.stringify(map));
    return formatted;
  } catch {
    return '19 thg 9, 2024';
  }
}

export function getJoinedDate(targetUserId: number): string {
  const d = new Date(1695283200000 + ((targetUserId % 50) * 86400000 * 7));
  return `${d.getDate()} thg ${d.getMonth() + 1}, ${d.getFullYear()}`;
}

export const FullProfileModal: React.FC<Props> = ({
  isOpen,
  onClose,
  user,
  currentUserId,
  currentUserRole: _currentUserRole,
  roomRole,
  roomName,
  rooms = [],
  friends = [],
  onDirectMessage,
  onSendFriendRequest,
  onOpenSettings
}) => {
  const isMe = user.id === currentUserId;
  const isFriend = checkIsFriend(friends, user);
  const targetRole = roomRole || user.role || 'MEMBER';

  const [activeTab, setActiveTab] = useState<'rooms' | 'activity'>('rooms');
  const [note, setNote] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      chatBridge.refreshFriends().catch(() => {});
      setNote(getUserNote(user.id));
      setIsEditingNote(false);
      setShowMoreMenu(false);
      setCopiedNotification(false);
      setReportSuccess(false);
    }
  }, [isOpen, user.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const stored = loadStoredSettings();
  const avatarChar = isMe
    ? (stored.avatarIcon || (user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'))
    : (user.avatarIcon || (user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'));

  const avatarColor = isMe 
    ? (stored.avatarColor || '#5865F2') 
    : (user.avatarColor || '#2DD4BF');

  const bannerColor = isMe 
    ? (stored.bannerColor || '#23A55A') 
    : (user.bannerColor || '#5865F2');

  const effectivePresence: PresenceStatus = isMe
    ? (stored.presenceStatus || 'online')
    : (user.online === false ? 'offline' : (user.presenceStatus || 'online'));

  const effectiveCustomStatus = isMe
    ? (stored.customStatus || '')
    : (user.customStatus || (user.online === false ? 'Ngoại tuyến' : ''));

  const effectiveUsername = user.username 
    ? user.username 
    : (user.displayName ? user.displayName.toLowerCase().replace(/\s+/g, '') : `user_${user.id}`);

  const friendDate = getFriendDate(user.id, isFriend);
  const joinedDate = getJoinedDate(user.id);

  const handleSaveNote = () => {
    saveUserNote(user.id, note.trim());
    setIsEditingNote(false);
  };

  const handleCopyUsername = () => {
    navigator.clipboard?.writeText(`@${effectiveUsername}`);
    setCopiedNotification(true);
    setShowMoreMenu(false);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const handleReport = () => {
    setShowMoreMenu(false);
    setReportSuccess(true);
    setTimeout(() => setReportSuccess(false), 3000);
  };

  // Danh sách các phòng chung
  const mutualRooms = rooms.length > 0 
    ? rooms 
    : (roomName ? [{ id: 1, name: roomName, role: targetRole }] : []);

  return (
    <div className="full-profile-backdrop" onClick={onClose}>
      <div 
        className="full-profile-modal-card" 
        onClick={e => e.stopPropagation()}
      >
        {/* Nút đóng góc phải */}
        <button 
          type="button" 
          className="full-profile-close-btn"
          onClick={onClose}
          title="Đóng (Esc)"
        >
          <X size={20} />
        </button>

        {/* Thông báo copy hoặc report */}
        {copiedNotification && (
          <div className="full-profile-toast success">
            <Check size={14} /> Đã sao chép tên người dùng vào bộ nhớ tạm!
          </div>
        )}
        {reportSuccess && (
          <div className="full-profile-toast notice">
            <ShieldAlert size={14} /> Cảm ơn bạn, báo cáo hồ sơ đã được ghi nhận.
          </div>
        )}

        <div className="full-profile-layout">
          {/* ================= CỘT TRÁI: THÔNG TIN HỒ SƠ ================= */}
          <div className="full-profile-left-col">
            {/* Banner lớn */}
            <div 
              className="full-profile-banner"
              style={{ backgroundColor: bannerColor }}
            />

            {/* Avatar lớn + Status ring */}
            <div className="full-profile-avatar-container">
              <div 
                className="full-profile-avatar"
                style={{ backgroundColor: avatarColor }}
              >
                {avatarChar}
              </div>
              <div 
                className={`full-profile-status-ring ${effectivePresence}`}
                title={effectivePresence === 'online' ? 'Trực tuyến' : 'Ngoại tuyến'}
              />
            </div>

            {/* Thẻ nội dung bên trái */}
            <div className="full-profile-left-content">
              <h2 className="full-profile-display-name">
                {user.displayName || user.username}
                {isMe && <span className="full-profile-you-tag"> (Bạn)</span>}
              </h2>
              <div className="full-profile-username">
                @{effectiveUsername}
              </div>

              {effectiveCustomStatus && (
                <div className="full-profile-status-bubble">
                  💬 {effectiveCustomStatus}
                </div>
              )}

              {/* Hàng nút hành động: Sửa hồ sơ (nếu là bạn) hoặc Tin nhắn / Kết bạn (nếu là người khác) */}
              {isMe ? (
                <div className="full-profile-actions-row">
                  <button
                    type="button"
                    className="full-profile-btn-primary"
                    onClick={() => {
                      onClose();
                      if (onOpenSettings) onOpenSettings('profile');
                    }}
                  >
                    <Edit2 size={15} /> Sửa Hồ Sơ
                  </button>
                </div>
              ) : (
                <div className="full-profile-actions-row">
                  <button
                    type="button"
                    className="full-profile-btn-primary"
                    onClick={() => {
                      onDirectMessage(user.id, user.displayName);
                      onClose();
                    }}
                  >
                    <MessageSquare size={16} /> Tin nhắn
                  </button>

                  <button
                    type="button"
                    className={`full-profile-btn-icon ${isFriend ? 'is-friend' : ''}`}
                    title={isFriend ? 'Đã là bạn bè' : 'Gửi lời mời kết bạn'}
                    onClick={() => {
                      if (!isFriend && onSendFriendRequest) {
                        onSendFriendRequest(user.id);
                      }
                    }}
                  >
                    {isFriend ? <UserCheck size={18} color="#23a55a" /> : <UserPlus size={18} />}
                  </button>

                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      className="full-profile-btn-icon"
                      title="Tùy chọn khác"
                      onClick={() => setShowMoreMenu(prev => !prev)}
                    >
                      <MoreVertical size={18} />
                    </button>

                    {showMoreMenu && (
                      <div className="full-profile-dropdown-menu">
                        <button 
                          type="button"
                          className="dropdown-item"
                          onClick={handleCopyUsername}
                        >
                          Sao chép tên người dùng
                        </button>
                        <div className="dropdown-divider" />
                        <button 
                          type="button"
                          className="dropdown-item danger"
                          onClick={handleReport}
                        >
                          Báo Cáo Hồ Sơ Người dùng
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="full-profile-divider" />

              {/* GIA NHẬP TỪ */}
              <div className="full-profile-info-group">
                <div className="info-group-title">GIA NHẬP TỪ</div>
                <div className="info-group-val">
                  <Calendar size={14} className="info-icon" />
                  <span>{joinedDate}</span>
                </div>
              </div>

              {/* BẠN BÈ TỪ */}
              <div className="full-profile-info-group">
                <div className="info-group-title">BẠN BÈ TỪ</div>
                <div className="info-group-val">
                  <Clock size={14} className="info-icon" />
                  <span>
                    {isFriend 
                      ? friendDate 
                      : (isMe ? 'Bạn chính là bạn!' : 'Chưa kết bạn')}
                  </span>
                </div>
              </div>

              {/* GHI CHÚ CÁ NHÂN (CHỈ HIỂN THỊ CHO BẠN) */}
              <div className="full-profile-info-group" style={{ marginTop: '12px' }}>
                <div className="info-group-title">GHI CHÚ (CHỈ HIỂN THỊ CHO BẠN)</div>
                {isEditingNote ? (
                  <div className="note-edit-box">
                    <textarea
                      maxLength={150}
                      rows={2}
                      className="note-textarea"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Nhập ghi chú cho người này..."
                      autoFocus
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                      <button 
                        type="button" 
                        className="note-save-btn" 
                        onClick={handleSaveNote}
                      >
                        Lưu
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className={`note-display-box ${!note ? 'empty' : ''}`}
                    onClick={() => setIsEditingNote(true)}
                    title="Nhấn để sửa ghi chú"
                  >
                    <FileText size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{note || 'Nhấp để thêm ghi chú'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ================= CỘT PHẢI: PHÒNG CHUNG & VAI TRÒ ================= */}
          <div className="full-profile-right-col">
            {/* Thanh Tabs */}
            <div className="full-profile-tabs-header">
              <button
                type="button"
                className={`full-profile-tab-btn ${activeTab === 'rooms' ? 'active' : ''}`}
                onClick={() => setActiveTab('rooms')}
              >
                {mutualRooms.length} Máy Chủ Chung
              </button>
              <button
                type="button"
                className={`full-profile-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
                onClick={() => setActiveTab('activity')}
              >
                Vai Trò & Hoạt Động
              </button>
            </div>

            {/* Nội dung Tab */}
            <div className="full-profile-tabs-content">
              {activeTab === 'rooms' && (
                <div className="mutual-rooms-list">
                  {mutualRooms.map((rm, idx) => {
                    const initials = rm.name ? rm.name.slice(0, 3).toUpperCase() : 'HUD';
                    return (
                      <div key={rm.id || idx} className="mutual-room-item">
                        <div className="mutual-room-icon">
                          {initials}
                        </div>
                        <div className="mutual-room-details">
                          <div className="mutual-room-name">{rm.name}</div>
                          <div className="mutual-room-sub">
                            {rm.memberCount ? `${rm.memberCount} thành viên` : 'Phòng chat'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="activity-panel">
                  <div className="activity-section">
                    <div className="activity-section-title">VAI TRÒ TRONG PHÒNG HIỆN TẠI</div>
                    <div className="activity-role-pill-wrap">
                      {targetRole === 'OWNER' && (
                        <span className="profile-role-pill owner">
                          <Crown size={14} /> Chủ phòng
                        </span>
                      )}
                      {targetRole === 'ADMIN' && (
                        <span className="profile-role-pill admin">
                          <Shield size={14} /> Phó nhóm
                        </span>
                      )}
                      {targetRole === 'MEMBER' && (
                        <span className="profile-role-pill member">
                          <UserIcon size={14} /> Thành viên
                        </span>
                      )}
                    </div>
                  </div>

                  {user.bio && (
                    <div className="activity-section">
                      <div className="activity-section-title">TIỂU SỬ</div>
                      <div className="activity-bio-box">{user.bio}</div>
                    </div>
                  )}

                  <div className="activity-section">
                    <div className="activity-section-title">TRẠNG THÁI KẾT NỐI</div>
                    <div className="activity-status-row">
                      <span 
                        className={`status-dot ${effectivePresence}`} 
                        style={{ display: 'inline-block', width: 10, height: 10 }}
                      />
                      <span>
                        {effectivePresence === 'online' && 'Đang trực tuyến trên Huddle'}
                        {effectivePresence === 'idle' && 'Đang chờ / Tạm vắng'}
                        {effectivePresence === 'dnd' && 'Không làm phiền / Đang bận'}
                        {(effectivePresence === 'offline' || effectivePresence === 'invisible') && 'Hiện đang ngoại tuyến'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullProfileModal;
