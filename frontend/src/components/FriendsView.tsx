import React, { useState } from 'react';
import type { Friend, PendingFriendRequest, SearchUserResult } from '../types/chat';
import { 
  Users, MessageSquare, UserPlus, Check, X, Search, 
  Clock, Sparkles, UserCheck
} from 'lucide-react';

export type FriendsTab = 'online' | 'all' | 'pending' | 'add_friend';

interface Props {
  friends: Friend[];
  pendingRequests: PendingFriendRequest[];
  searchResults: SearchUserResult[];
  currentUserId: number;
  initialTab?: FriendsTab;
  onSelectDirectUser: (friend: Friend) => void;
  onOpenInviteModal: (friend: Friend) => void;
  onAcceptRequest: (requestId: number) => void;
  onRejectRequest: (requestId: number) => void;
  onSearchUsers: (query: string) => void;
  onSendFriendRequest: (userId: number) => void;
}

export const FriendsView: React.FC<Props> = ({
  friends,
  pendingRequests,
  searchResults,
  currentUserId,
  initialTab = 'online',
  onSelectDirectUser,
  onOpenInviteModal,
  onAcceptRequest,
  onRejectRequest,
  onSearchUsers,
  onSendFriendRequest
}) => {
  const [currentTab, setCurrentTab] = useState<FriendsTab>(initialTab);
  const [filterQuery, setFilterQuery] = useState('');
  const [searchUsernameQuery, setSearchUsernameQuery] = useState('');
  const [sentRequestUserIds, setSentRequestUserIds] = useState<number[]>([]);

  const onlineFriends = friends.filter(f => f.online);
  const displayedFriends = (currentTab === 'online' ? onlineFriends : friends).filter(f => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return f.displayName.toLowerCase().includes(q) || f.username.toLowerCase().includes(q);
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchUsernameQuery.trim()) {
      onSearchUsers(searchUsernameQuery.trim());
    }
  };

  const handleSendRequestClick = (userId: number) => {
    onSendFriendRequest(userId);
    setSentRequestUserIds(prev => [...prev, userId]);
  };

  return (
    <div className="friends-view-container">
      {/* 1. Header Bar: Tiêu đề & Danh sách Tab */}
      <div className="friends-header-bar">
        <div className="friends-header-title">
          <Users size={20} color="var(--accent)" />
          <span>Bạn bè</span>
        </div>

        <div className="friends-divider-vertical" />

        <div className="friends-tab-group" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={currentTab === 'online'}
            className={`friends-tab-btn ${currentTab === 'online' ? 'active' : ''}`}
            onClick={() => setCurrentTab('online')}
          >
            Trực tuyến ({onlineFriends.length})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={currentTab === 'all'}
            className={`friends-tab-btn ${currentTab === 'all' ? 'active' : ''}`}
            onClick={() => setCurrentTab('all')}
          >
            Tất cả ({friends.length})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={currentTab === 'pending'}
            className={`friends-tab-btn ${currentTab === 'pending' ? 'active' : ''}`}
            onClick={() => setCurrentTab('pending')}
          >
            Chờ xử lý
            {pendingRequests.length > 0 && (
              <span className="friends-badge-count">{pendingRequests.length}</span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={currentTab === 'add_friend'}
            className={`friends-tab-btn add-friend-tab ${currentTab === 'add_friend' ? 'active' : ''}`}
            onClick={() => setCurrentTab('add_friend')}
          >
            Thêm bạn
          </button>
        </div>
      </div>

      {/* 2. Content Body theo từng Tab */}
      <div className="friends-content-body">
        {/* TAB TRỰC TUYẾN & TẤT CẢ */}
        {(currentTab === 'online' || currentTab === 'all') && (
          <div className="friends-list-wrapper">
            {/* Thanh tìm kiếm nhanh bạn bè */}
            <div className="friends-search-box">
              <Search size={16} className="friends-search-icon" />
              <input
                type="text"
                placeholder="Tìm kiếm bạn bè..."
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
              />
              {filterQuery && (
                <button 
                  type="button" 
                  className="friends-clear-btn" 
                  onClick={() => setFilterQuery('')}
                  aria-label="Xóa bộ lọc"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="friends-section-title">
              {currentTab === 'online' 
                ? `TRỰC TUYẾN — ${displayedFriends.length}`
                : `TẤT CẢ BẠN BÈ — ${displayedFriends.length}`
              }
            </div>

            {displayedFriends.length === 0 ? (
              <div className="friends-empty-card">
                <div className="empty-icon-circle">
                  <Sparkles size={32} color="var(--accent)" />
                </div>
                <h3>{currentTab === 'online' ? 'Không có bạn bè nào đang trực tuyến' : 'Bạn chưa có người bạn nào'}</h3>
                <p>
                  {currentTab === 'online'
                    ? 'Bạn bè của bạn hiện đang ngoại tuyến hoặc bận. Hãy thử chuyển sang tab "Tất cả".'
                    : 'Hãy chuyển qua tab "Thêm bạn" để tìm kiếm và kết nối với bạn bè mới!'}
                </p>
                {currentTab !== 'online' && (
                  <button
                    type="button"
                    className="btn-accent"
                    style={{ marginTop: '12px' }}
                    onClick={() => setCurrentTab('add_friend')}
                  >
                    Tìm và thêm bạn ngay
                  </button>
                )}
              </div>
            ) : (
              <div className="friends-rows-list">
                {displayedFriends.map(friend => (
                  <div 
                    key={friend.id} 
                    className="friend-row-item"
                    onClick={() => onSelectDirectUser(friend)}
                  >
                    <div className="friend-info-left">
                      <div className="user-avatar-wrap">
                        <div className="user-avatar-circle">
                          {friend.displayName ? friend.displayName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className={`status-dot ${friend.online ? '' : 'offline'}`} />
                      </div>

                      <div className="friend-name-block">
                        <div className="friend-display-name">
                          {friend.displayName}
                        </div>
                        <div className="friend-username">
                          @{friend.username} • {friend.online ? 'Đang hoạt động' : 'Ngoại tuyến'}
                        </div>
                      </div>
                    </div>

                    <div className="friend-actions-right" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        className="friend-action-circle-btn"
                        title="Nhắn tin riêng 1-1"
                        aria-label={`Nhắn tin riêng với ${friend.displayName}`}
                        onClick={() => onSelectDirectUser(friend)}
                      >
                        <MessageSquare size={18} />
                      </button>

                      <button
                        type="button"
                        className="friend-action-circle-btn"
                        title="Mời vào phòng chat"
                        aria-label={`Mời ${friend.displayName} vào phòng chat`}
                        onClick={() => onOpenInviteModal(friend)}
                      >
                        <UserPlus size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB CHỜ XỬ LÝ (PENDING REQUESTS) */}
        {currentTab === 'pending' && (
          <div className="friends-list-wrapper">
            <div className="friends-section-title">
              LỜI MỜI ĐANG CHỜ — {pendingRequests.length}
            </div>

            {pendingRequests.length === 0 ? (
              <div className="friends-empty-card">
                <div className="empty-icon-circle">
                  <UserCheck size={32} color="var(--accent)" />
                </div>
                <h3>Không có lời mời kết bạn nào đang chờ</h3>
                <p>Tuyệt vời! Bạn đã xử lý hết mọi lời mời kết bạn.</p>
              </div>
            ) : (
              <div className="friends-rows-list">
                {pendingRequests.map(req => (
                  <div key={req.requestId} className="friend-row-item">
                    <div className="friend-info-left">
                      <div className="user-avatar-wrap">
                        <div className="user-avatar-circle">
                          {req.senderDisplayName ? req.senderDisplayName.charAt(0).toUpperCase() : 'U'}
                        </div>
                      </div>

                      <div className="friend-name-block">
                        <div className="friend-display-name">
                          {req.senderDisplayName}
                        </div>
                        <div className="friend-username">
                          @{req.senderUsername}
                          {req.time && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
                              <Clock size={12} /> {req.time}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="friend-actions-right">
                      <button
                        type="button"
                        className="friend-action-circle-btn accept"
                        title="Chấp nhận lời mời kết bạn"
                        aria-label={`Chấp nhận lời mời từ ${req.senderDisplayName}`}
                        onClick={() => onAcceptRequest(req.requestId)}
                      >
                        <Check size={18} />
                      </button>

                      <button
                        type="button"
                        className="friend-action-circle-btn reject"
                        title="Từ chối lời mời kết bạn"
                        aria-label={`Từ chối lời mời từ ${req.senderDisplayName}`}
                        onClick={() => onRejectRequest(req.requestId)}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB THÊM BẠN (ADD FRIEND & SEARCH) */}
        {currentTab === 'add_friend' && (
          <div className="friends-add-wrapper">
            <div className="add-friend-intro">
              <h2>THÊM BẠN BÈ</h2>
              <p>Bạn có thể tìm kiếm người dùng qua tên đăng nhập hoặc tên hiển thị để gửi lời mời kết bạn.</p>
            </div>

            <form className="add-friend-form" onSubmit={handleSearchSubmit}>
              <div className="add-friend-input-box">
                <input
                  type="text"
                  placeholder="Nhập tên đăng nhập hoặc tên hiển thị của người dùng..."
                  value={searchUsernameQuery}
                  onChange={e => setSearchUsernameQuery(e.target.value)}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!searchUsernameQuery.trim()}
                  className="btn-accent"
                >
                  Tìm kiếm
                </button>
              </div>
            </form>

            {/* Danh sách kết quả tìm kiếm */}
            {searchResults.length > 0 && (
              <div className="search-results-section" style={{ marginTop: '24px' }}>
                <div className="friends-section-title">
                  KẾT QUẢ TÌM KIẾM ({searchResults.length})
                </div>

                <div className="friends-rows-list">
                  {searchResults.map(user => {
                    const isSelf = user.id === currentUserId;
                    const isAlreadyFriend = user.isFriend;
                    const isRequestSent = sentRequestUserIds.includes(user.id);

                    return (
                      <div key={user.id} className="friend-row-item">
                        <div className="friend-info-left">
                          <div className="user-avatar-wrap">
                            <div className="user-avatar-circle">
                              {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className={`status-dot ${user.online ? '' : 'offline'}`} />
                          </div>

                          <div className="friend-name-block">
                            <div className="friend-display-name">
                              {user.displayName}
                              {isSelf && <span style={{ fontSize: '12px', color: 'var(--text-3)', marginLeft: '6px' }}>(Bạn)</span>}
                            </div>
                            <div className="friend-username">
                              @{user.username} • {user.online ? 'Trực tuyến' : 'Ngoại tuyến'}
                            </div>
                          </div>
                        </div>

                        <div className="friend-actions-right">
                          {isSelf ? (
                            <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>Tài khoản của bạn</span>
                          ) : isAlreadyFriend ? (
                            <span className="badge-already-friend">
                              <Check size={14} /> Bạn bè
                            </span>
                          ) : isRequestSent ? (
                            <span className="badge-already-sent">
                              <Clock size={14} /> Đã gửi yêu cầu
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn-accent"
                              style={{ padding: '6px 14px', fontSize: '13px' }}
                              onClick={() => handleSendRequestClick(user.id)}
                            >
                              <UserPlus size={15} style={{ marginRight: '6px' }} />
                              Kết bạn
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
