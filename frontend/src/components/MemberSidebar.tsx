import React, { useState } from 'react';
import type { User, Room, Friend } from '../types/chat';
import { Crown, Shield, MoreVertical } from 'lucide-react';
import { UserProfileCard } from './UserProfileCard';
import { loadStoredSettings, type StoredSettings, type SettingsTabId } from './UserSettingsModal';

interface Props {
  members: User[];
  currentUserId?: number;
  currentUserRole?: string;
  roomName?: string;
  rooms?: Room[];
  friends?: Friend[];
  onDirectMessage: (userId: number, name: string, initialMessage?: string) => void;
  onSendFriendRequest?: (userId: number) => void;
  onOpenSettings?: (initialTab?: SettingsTabId) => void;
  onSetMemberRole?: (userId: number, role: string) => void;
  onTransferOwner?: (userId: number) => void;
  onKickMember?: (userId: number) => void;
}

export const MemberSidebar: React.FC<Props> = ({
  members,
  currentUserId,
  currentUserRole,
  roomName,
  rooms = [],
  friends = [],
  onDirectMessage,
  onSendFriendRequest,
  onOpenSettings,
  onSetMemberRole,
  onTransferOwner,
  onKickMember
}) => {
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [activeProfile, setActiveProfile] = useState<{ user: User; anchorRect: DOMRect } | null>(null);
  const [currentUserStyle, setCurrentUserStyle] = useState<StoredSettings>(loadStoredSettings);

  const onlineMembers = members.filter(m => m.online !== false);
  const offlineMembers = members.filter(m => m.online === false);
  const isOwner = currentUserRole === 'OWNER';
  const isAdmin = currentUserRole === 'ADMIN';

  React.useEffect(() => {
    const handleSync = () => setCurrentUserStyle(loadStoredSettings());
    window.addEventListener('user_settings_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('user_settings_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  React.useEffect(() => {
    const handleOutsideClick = () => setSelectedMember(null);
    if (selectedMember) {
      document.addEventListener('click', handleOutsideClick);
      return () => document.removeEventListener('click', handleOutsideClick);
    }
  }, [selectedMember]);

  const handleAction = (type: 'role' | 'transfer' | 'kick', target: User) => {
    setSelectedMember(null);
    if (type === 'role') {
      const nextRole = target.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
      if (onSetMemberRole) onSetMemberRole(target.id, nextRole);
    } else if (type === 'transfer') {
      if (onTransferOwner) onTransferOwner(target.id);
    } else if (type === 'kick') {
      if (onKickMember) onKickMember(target.id);
    }
  };

  const handleMemberClick = (member: User, e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveProfile({ user: member, anchorRect: rect });
  };

  const renderMemberItem = (member: User, isOnline: boolean) => {
    const isMe = member.id === currentUserId;
    const canManage = !isMe && (isOwner || (isAdmin && member.role !== 'OWNER' && member.role !== 'ADMIN'));
    const isSelected = activeProfile?.user.id === member.id;

    // Đồng bộ ảnh đại diện, màu sắc, biểu tượng và trạng thái cho chính mình (isMe)
    const avatarImage = isMe
      ? (currentUserStyle.avatarImage || member.avatarImage || '')
      : (member.avatarImage || '');

    const avatarColor = isMe 
      ? (currentUserStyle.avatarColor || member.avatarColor || 'var(--accent)')
      : (member.avatarColor || undefined);

    const avatarChar = isMe
      ? (currentUserStyle.avatarIcon || member.avatarIcon || (member.displayName ? member.displayName.charAt(0).toUpperCase() : 'U'))
      : (member.avatarIcon || (member.displayName ? member.displayName.charAt(0).toUpperCase() : 'U'));

    const isEmoji = isMe ? Boolean(currentUserStyle.avatarIcon) : Boolean(member.avatarIcon);

    const presenceClass = isMe
      ? (currentUserStyle.presenceStatus || 'online')
      : (member.presenceStatus || (isOnline ? 'online' : 'offline'));

    const effectiveCustomStatus = isMe
      ? (currentUserStyle.customStatus || member.customStatus || '')
      : (member.customStatus || '');

    return (
      <div 
        key={member.id} 
        className={`member-item ${isOnline ? 'online' : 'offline'} ${isSelected ? 'active-profile' : ''}`}
        onClick={(e) => handleMemberClick(member, e)}
        onContextMenu={(e) => {
          if (canManage) {
            e.preventDefault();
            e.stopPropagation();
            setSelectedMember(prev => prev?.id === member.id ? null : member);
          }
        }}
        title={`Xem hồ sơ & trạng thái của ${member.displayName || member.username}`}
        style={{ position: 'relative', cursor: 'pointer' }}
      >
        <div className="user-avatar-wrap">
          <div 
            className="user-avatar-circle"
            style={{
              backgroundColor: avatarColor,
              fontSize: isEmoji ? '16px' : undefined
            }}
          >
            {avatarImage ? (
              <img src={avatarImage} alt="avatar" className="avatar-img-cover" />
            ) : (
              avatarChar
            )}
          </div>
          <div 
            className={`status-dot ${presenceClass}`} 
            title={presenceClass === 'online' ? 'Trực tuyến' : (presenceClass === 'offline' ? 'Ngoại tuyến' : presenceClass)} 
          />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
            <span className="name">
              {member.displayName} {isMe ? '(Bạn)' : ''}
            </span>
            {member.role === 'OWNER' && (
              <span title="Chủ phòng" style={{ display: 'inline-flex' }}>
                <Crown size={14} color="var(--accent-yellow)" />
              </span>
            )}
            {member.role === 'ADMIN' && (
              <span title="Phó nhóm" style={{ display: 'inline-flex' }}>
                <Shield size={14} color="var(--accent)" />
              </span>
            )}
          </div>
          {effectiveCustomStatus && (
            <span 
              className="member-custom-status" 
              title={effectiveCustomStatus}
              style={{
                fontSize: '11px',
                color: 'var(--text-muted, #949ba4)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: '1.2'
              }}
            >
              💬 {effectiveCustomStatus}
            </span>
          )}
        </div>

        {/* Nút 3 chấm tùy chọn nhanh của Chủ phòng hoặc Phó nhóm */}
        {canManage && (
          <button
            type="button"
            className={`member-more-btn ${selectedMember?.id === member.id ? 'active' : ''}`}
            title="Tùy chọn quản lý thành viên"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedMember(selectedMember?.id === member.id ? null : member);
            }}
          >
            <MoreVertical size={16} />
          </button>
        )}

        {/* Dropdown quản lý thành viên nhanh */}
        {selectedMember?.id === member.id && (
          <div className="member-action-menu" onClick={e => e.stopPropagation()}>
            {isOwner && (
              <>
                <button
                  type="button"
                  className="member-action-btn"
                  onClick={() => handleAction('role', member)}
                >
                  {member.role === 'ADMIN' ? 'Hạ xuống Thành viên' : 'Phong làm Phó nhóm'}
                </button>

                <button
                  type="button"
                  className="member-action-btn warning"
                  onClick={() => handleAction('transfer', member)}
                >
                  Chuyển quyền Chủ phòng
                </button>
              </>
            )}

            <button
              type="button"
              className="member-action-btn danger"
              onClick={() => handleAction('kick', member)}
            >
              Xóa khỏi phòng (Kick)
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="member-sidebar">
      <div className="sidebar-simple-header">
        <span>THÀNH VIÊN PHÒNG ({members.length})</span>
      </div>

      <div className="member-list">
        {onlineMembers.length > 0 && (
          <>
            <div className="section-title">Trực tuyến — {onlineMembers.length}</div>
            {onlineMembers.map(member => renderMemberItem(member, true))}
          </>
        )}

        {offlineMembers.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: '12px' }}>
              Ngoại tuyến — {offlineMembers.length}
            </div>
            {offlineMembers.map(member => renderMemberItem(member, false))}
          </>
        )}

        {members.length === 0 && (
          <div style={{ padding: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Hãy vào một phòng chat để xem danh sách thành viên.
          </div>
        )}
      </div>

      {/* THẺ HỒ SƠ NGƯỜI DÙNG PHONG CÁCH DISCORD */}
      {activeProfile && (
        <UserProfileCard
          user={activeProfile.user}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          roomRole={activeProfile.user.role}
          roomName={roomName}
          rooms={rooms}
          friends={friends}
          onSendFriendRequest={onSendFriendRequest}
          anchorRect={activeProfile.anchorRect}
          onClose={() => setActiveProfile(null)}
          onDirectMessage={onDirectMessage}
          onOpenSettings={onOpenSettings}
          onSetMemberRole={onSetMemberRole}
          onTransferOwner={onTransferOwner}
          onKickMember={onKickMember}
        />
      )}
    </div>
  );
};

export default MemberSidebar;
