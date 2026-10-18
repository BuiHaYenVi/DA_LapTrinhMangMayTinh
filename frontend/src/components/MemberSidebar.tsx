import React, { useState } from 'react';
import type { User } from '../types/chat';
import { Crown, Shield, MoreVertical } from 'lucide-react';

interface Props {
  members: User[];
  currentUserId?: number;
  currentUserRole?: string;
  onDirectMessage: (userId: number, name: string) => void;
  onSetMemberRole?: (userId: number, role: string) => void;
  onTransferOwner?: (userId: number) => void;
  onKickMember?: (userId: number) => void;
}

export const MemberSidebar: React.FC<Props> = ({
  members,
  currentUserId,
  currentUserRole,
  onDirectMessage,
  onSetMemberRole,
  onTransferOwner,
  onKickMember
}) => {
  const [selectedMember, setSelectedMember] = useState<User | null>(null);

  const onlineMembers = members.filter(m => m.online !== false);
  const offlineMembers = members.filter(m => m.online === false);
  const isOwner = currentUserRole === 'OWNER';
  const isAdmin = currentUserRole === 'ADMIN';

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

  const renderMemberItem = (member: User, isOnline: boolean) => {
    const isMe = member.id === currentUserId;
    const canManage = !isMe && (isOwner || (isAdmin && member.role !== 'OWNER' && member.role !== 'ADMIN'));

    return (
      <div 
        key={member.id} 
        className={`member-item ${isOnline ? 'online' : 'offline'}`}
        onClick={() => !isMe && onDirectMessage(member.id, member.displayName)}
        onContextMenu={(e) => {
          if (canManage) {
            e.preventDefault();
            e.stopPropagation();
            setSelectedMember(prev => prev?.id === member.id ? null : member);
          }
        }}
        title={isMe ? 'Bạn' : (canManage ? 'Nhấn để chat riêng, click chuột phải hoặc bấm 3 chấm để quản lý' : 'Nhấn để gửi tin nhắn riêng')}
        style={{ position: 'relative' }}
      >
        <div className="user-avatar-wrap">
          <div className="user-avatar-circle">
            {member.displayName ? member.displayName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className={`status-dot ${isOnline ? 'online' : 'offline'}`} title={isOnline ? 'Trực tuyến' : 'Ngoại tuyến'} />
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
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

        {/* Nút 3 chấm tùy chọn của Chủ phòng hoặc Phó nhóm */}
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

        {/* Dropdown quản lý thành viên */}
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
    </div>
  );
};
