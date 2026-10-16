import React, { useState } from 'react';
import type { User, Friend, PendingFriendRequest } from '../types/chat';
import { UserCheck, UserX, MessageCircle, Crown, Search, RefreshCw } from 'lucide-react';

interface Props {
  members: User[];
  friends: Friend[];
  pendingRequests: PendingFriendRequest[];
  onDirectMessage: (userId: number, name: string) => void;
  onAcceptFriend: (requestId: number) => void;
  onRejectFriend: (requestId: number) => void;
  onAddFriend: () => void;
  onRefreshFriends: () => void;
}

export const MemberSidebar: React.FC<Props> = ({
  members,
  friends,
  pendingRequests,
  onDirectMessage,
  onAcceptFriend,
  onRejectFriend,
  onAddFriend,
  onRefreshFriends
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'friends'>('members');

  return (
    <div className="member-sidebar">
      {/* Tabs */}
      <div className="member-tabs">
        <div 
          className={`member-tab ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          Thành viên ({members.length})
        </div>
        <div 
          className={`member-tab ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          Bạn bè ({friends.length})
        </div>
      </div>

      {activeTab === 'members' ? (
        <div className="member-list">
          <div className="section-title">TRỰC TUYẾN — {members.filter(m => m.online !== false).length}</div>
          {members.map(member => (
            <div 
              key={member.id} 
              className="member-item online"
              onClick={() => onDirectMessage(member.id, member.displayName)}
              title="Nhấn đúp hoặc click để chat riêng"
            >
              <div className="user-avatar-wrap">
                <div className="user-avatar-circle" style={{ width: 32, height: 32, fontSize: 13 }}>
                  {member.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="status-dot" style={{ width: 8, height: 8 }} />
              </div>

              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="name">{member.displayName}</span>
                {member.role === 'OWNER' && (
                  <span title="Trưởng nhóm"><Crown size={14} color="var(--accent-yellow)" /></span>
                )}
              </div>
            </div>
          ))}

          {members.length === 0 && (
            <div style={{ padding: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
              Hãy vào một phòng chat để xem danh sách thành viên.
            </div>
          )}
        </div>
      ) : (
        <div className="member-list">
          <div style={{ display: 'flex', gap: '6px', padding: '6px 4px 10px 4px' }}>
            <button 
              className="header-btn blurple" 
              style={{ flex: 1, fontSize: '12px', padding: '6px' }}
              onClick={onAddFriend}
            >
              <Search size={14} /> Thêm bạn
            </button>
            <button 
              className="icon-btn" 
              style={{ background: 'var(--bg-input)' }}
              title="Tải lại danh sách"
              onClick={onRefreshFriends}
            >
              <RefreshCw size={15} />
            </button>
          </div>

          {pendingRequests.length > 0 && (
            <>
              <div className="section-title">LỜI MỜI ĐANG CHỜ ({pendingRequests.length})</div>
              {pendingRequests.map(req => (
                <div key={req.requestId} style={{ background: 'var(--bg-primary)', padding: '8px', borderRadius: '4px', marginBottom: '6px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-header)' }}>
                    {req.senderDisplayName}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{req.senderUsername}</div>

                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <button 
                      className="header-btn" 
                      style={{ background: 'var(--accent-green)', padding: '4px 8px', fontSize: '12px' }}
                      onClick={() => onAcceptFriend(req.requestId)}
                    >
                      <UserCheck size={13} /> Nhận
                    </button>
                    <button 
                      className="header-btn" 
                      style={{ background: 'var(--accent-red)', padding: '4px 8px', fontSize: '12px' }}
                      onClick={() => onRejectFriend(req.requestId)}
                    >
                      <UserX size={13} /> Hủy
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          <div className="section-title">DANH SÁCH BẠN BÈ ({friends.length})</div>
          {friends.map(friend => (
            <div 
              key={friend.id}
              className={`member-item ${friend.online ? 'online' : ''}`}
              onClick={() => onDirectMessage(friend.id, friend.displayName)}
            >
              <div className="user-avatar-wrap">
                <div className="user-avatar-circle" style={{ width: 32, height: 32, fontSize: 13 }}>
                  {friend.displayName.charAt(0).toUpperCase()}
                </div>
                {friend.online && <div className="status-dot" style={{ width: 8, height: 8 }} />}
              </div>

              <div style={{ flex: 1 }}>
                <div className="name">{friend.displayName}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{friend.username}</div>
              </div>

              <button className="icon-btn" title="Gửi tin nhắn riêng">
                <MessageCircle size={16} />
              </button>
            </div>
          ))}

          {friends.length === 0 && (
            <div style={{ padding: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
              Chưa có bạn bè nào. Hãy nhấn "Thêm bạn" để kết nối!
            </div>
          )}
        </div>
      )}
    </div>
  );
};
