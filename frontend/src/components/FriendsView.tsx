import React, { useState, useRef, useEffect } from 'react';
import type { Friend, PendingFriendRequest, SearchUserResult } from '../types/chat';
import { 
  Users, MessageSquare, UserPlus, Check, X, Search, 
  Clock, Sparkles, UserCheck, Loader2
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
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Tắt trạng thái loading khi có kết quả tìm kiếm mới
  useEffect(() => {
    setIsSearching(false);
  }, [searchResults]);

  const onlineFriends = friends.filter(f => f.online);
  const displayedFriends = (currentTab === 'online' ? onlineFriends : friends).filter(f => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return f.displayName.toLowerCase().includes(q) || f.username.toLowerCase().includes(q);
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchUsernameQuery.trim() && !isSearching) {
      setHasSearched(true);
      setIsSearching(true);
      onSearchUsers(searchUsernameQuery.trim());
      // Tự động tắt loading sau 4s nếu server phản hồi chậm
      setTimeout(() => setIsSearching(false), 4000);
    }
  };

  const handleClearSearch = () => {
    setSearchUsernameQuery('');
    searchInputRef.current?.focus();
  };

  const handleSendRequestClick = (userId: number) => {
    onSendFriendRequest(userId);
    setSentRequestUserIds(prev => [...prev, userId]);
  };

  return (
    <div className="friends-view-container">
      {/* 1. Header Bar: Tiêu đề, Tab nhóm & Nút Thêm bạn riêng biệt bên phải */}
      <div className="friends-header-bar">
        <div className="friends-header-left">
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
              <span>Trực tuyến</span>
              <span className="friends-tab-count">({onlineFriends.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={currentTab === 'all'}
              className={`friends-tab-btn ${currentTab === 'all' ? 'active' : ''}`}
              onClick={() => setCurrentTab('all')}
            >
              <span>Tất cả</span>
              <span className="friends-tab-count">({friends.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={currentTab === 'pending'}
              className={`friends-tab-btn ${currentTab === 'pending' ? 'active' : ''}`}
              onClick={() => setCurrentTab('pending')}
            >
              <span>Chờ xử lý</span>
              {pendingRequests.length > 0 && (
                <span className="friends-badge-count">{pendingRequests.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* Nút Thêm bạn là nút nhấn chính (--accent) đặt tách bên phải thanh tab */}
        <div className="friends-header-right">
          <button
            type="button"
            className={`btn-add-friend-primary ${currentTab === 'add_friend' ? 'active' : ''}`}
            onClick={() => setCurrentTab('add_friend')}
          >
            <UserPlus size={16} />
            <span>Thêm bạn</span>
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
              {currentTab === 'online' ? `BẠN BÈ TRỰC TUYẾN — ${displayedFriends.length}` : `TẤT CẢ BẠN BÈ — ${displayedFriends.length}`}
            </div>

            {displayedFriends.length === 0 ? (
              <div className="friends-empty-card">
                <div className="empty-icon-circle">
                  <Sparkles size={32} color="var(--accent)" />
                </div>
                <h3>{currentTab === 'online' ? 'Không có bạn bè nào đang trực tuyến' : 'Bạn chưa có người bạn nào'}</h3>
                <p>
                  {currentTab === 'online'
                    ? 'Bạn bè của bạn hiện đang ngoại tuyến hoặc bận. Hãy thử kiểm tra tab "Tất cả".'
                    : 'Hãy kết nối với bạn bè để bắt đầu trò chuyện và chia sẻ phòng chat!'}
                </p>
                {currentTab !== 'online' ? (
                  <button
                    type="button"
                    className="btn-accent"
                    style={{ marginTop: '14px', padding: '8px 18px', fontSize: '13px' }}
                    onClick={() => setCurrentTab('add_friend')}
                  >
                    <UserPlus size={15} style={{ marginRight: '6px' }} />
                    Tìm và thêm bạn ngay
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-subtle"
                    style={{ marginTop: '14px', padding: '8px 18px', fontSize: '13px' }}
                    onClick={() => setCurrentTab('all')}
                  >
                    Xem tất cả bạn bè
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
                        <div className="user-avatar-circle" style={{ width: '36px', height: '36px', fontSize: '14px' }}>
                          {friend.displayName ? Array.from(friend.displayName.trim())[0]?.toUpperCase() : 'U'}
                        </div>
                        <div className={`status-dot ${friend.online ? 'online' : 'offline'}`} />
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
                <button
                  type="button"
                  className="btn-accent"
                  style={{ marginTop: '14px', padding: '8px 18px', fontSize: '13px' }}
                  onClick={() => setCurrentTab('add_friend')}
                >
                  <UserPlus size={15} style={{ marginRight: '6px' }} />
                  Tìm bạn mới
                </button>
              </div>
            ) : (
              <div className="friends-rows-list">
                {pendingRequests.map(req => (
                  <div key={req.requestId} className="friend-row-item">
                    <div className="friend-info-left">
                      <div className="user-avatar-wrap">
                        <div className="user-avatar-circle" style={{ width: '36px', height: '36px', fontSize: '14px' }}>
                          {req.senderDisplayName ? Array.from(req.senderDisplayName.trim())[0]?.toUpperCase() : 'U'}
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
                <Search size={18} className="add-friend-search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Nhập tên đăng nhập hoặc tên hiển thị của người dùng..."
                  value={searchUsernameQuery}
                  onChange={e => setSearchUsernameQuery(e.target.value)}
                  autoFocus
                />
                {searchUsernameQuery && (
                  <button
                    type="button"
                    className="add-friend-clear-btn"
                    onClick={handleClearSearch}
                    title="Xóa tìm kiếm"
                    aria-label="Xóa tìm kiếm"
                  >
                    <X size={15} />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!searchUsernameQuery.trim() || isSearching}
                  className={`add-friend-submit-btn ${searchUsernameQuery.trim() ? 'active' : ''} ${isSearching ? 'loading' : ''}`}
                >
                  {isSearching ? (
                    <>
                      <Loader2 size={15} className="spin-animation" />
                      <span>Đang tìm...</span>
                    </>
                  ) : (
                    <>
                      <Search size={15} />
                      <span>Tìm kiếm</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Danh sách kết quả tìm kiếm */}
            {searchResults.length > 0 ? (
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
                            <div className="user-avatar-circle" style={{ width: '36px', height: '36px', fontSize: '14px' }}>
                              {user.displayName ? Array.from(user.displayName.trim())[0]?.toUpperCase() : 'U'}
                            </div>
                            <div className={`status-dot ${user.online ? 'online' : 'offline'}`} />
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
                            <span className="badge-already-sent">Bạn</span>
                          ) : isAlreadyFriend ? (
                            <span className="badge-already-friend">
                              <Check size={14} /> Bạn bè
                            </span>
                          ) : isRequestSent ? (
                            <span className="badge-already-sent">
                              <Clock size={14} /> Đã gửi lời mời
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn-accent"
                              style={{ padding: '6px 14px', fontSize: '13px' }}
                              onClick={() => handleSendRequestClick(user.id)}
                            >
                              <UserPlus size={15} style={{ marginRight: '6px' }} />
                              Gửi lời mời
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              hasSearched && (
                <div className="friends-empty-card" style={{ marginTop: '32px' }}>
                  <div className="empty-icon-circle">
                    <Search size={32} color="var(--accent)" />
                  </div>
                  <h3>Không tìm thấy người dùng</h3>
                  <p>Không có kết quả nào khớp với "{searchUsernameQuery}". Hãy kiểm tra lại chính tả nhé.</p>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsView;
