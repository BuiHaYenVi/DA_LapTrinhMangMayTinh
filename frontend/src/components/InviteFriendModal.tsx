import React, { useState, useEffect, useMemo } from 'react';
import type { Room, Friend } from '../types/chat';
import { X, UserPlus, Check, Search, Users } from 'lucide-react';
import { getRoomAcronym } from './rail/RoomRailItem';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  friend: Friend | null;
  targetRoom?: Room | null;
  rooms: Room[];
  friends?: Friend[];
  roomMemberIds?: number[];
  onInvite: (roomId: number, friendId: number) => void;
  onInviteByUsername?: (roomId: number, username: string) => void;
  invitedRoomIds?: number[];
  invitedFriendIds?: number[];
}

export const InviteFriendModal: React.FC<Props> = ({
  isOpen,
  onClose,
  friend,
  targetRoom = null,
  rooms = [],
  friends = [],
  roomMemberIds = [],
  onInvite,
  onInviteByUsername,
  invitedRoomIds = [],
  invitedFriendIds = []
}) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [filterText, setFilterText] = useState('');
  const [roomSearchQuery, setRoomSearchQuery] = useState('');

  // Đóng modal bằng phím Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lọc danh sách phòng theo ô tìm kiếm ở Chế độ 1
  const filteredRooms = useMemo(() => {
    if (!roomSearchQuery.trim()) return rooms;
    const q = roomSearchQuery.trim().toLowerCase();
    return rooms.filter(r => 
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  }, [rooms, roomSearchQuery]);

  // Lọc danh sách bạn bè theo ô tìm kiếm ở Chế độ 2
  const filteredFriends = useMemo(() => {
    if (!filterText.trim()) return friends;
    const q = filterText.trim().toLowerCase();
    return friends.filter(f => 
      (f.displayName && f.displayName.toLowerCase().includes(q)) ||
      (f.username && f.username.toLowerCase().includes(q))
    );
  }, [friends, filterText]);

  if (!isOpen || (!friend && !targetRoom)) return null;

  const handleUsernameInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRoom || !usernameInput.trim()) return;
    if (onInviteByUsername) {
      onInviteByUsername(targetRoom.id, usernameInput.trim());
      setUsernameInput('');
    }
  };

  // ==========================================================================
  // CHẾ ĐỘ 2: ĐANG Ở TRONG PHÒNG -> MỜI BẠN BÈ / NGƯỜI DÙNG VÀO PHÒNG ĐÓ
  // ==========================================================================
  if (targetRoom && !friend) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="invite-modal-card"
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-modal-title"
        >
          {/* Header */}
          <div className="invite-modal-header">
            <div className="invite-modal-header-left">
              <div className="invite-modal-icon-badge">
                <UserPlus size={20} />
              </div>
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <h3 id="invite-modal-title" className="invite-modal-title">
                  Mời bạn bè vào phòng
                </h3>
                <p className="invite-modal-subtitle">
                  Mời tham gia vào <span className="highlight-friend">{targetRoom.name}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              className="invite-modal-close-btn"
              onClick={onClose}
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="invite-modal-body">
            {/* Mời trực tiếp bằng tên đăng nhập */}
            {onInviteByUsername && (
              <form onSubmit={handleUsernameInvite} style={{ marginBottom: 4 }}>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Mời theo tên đăng nhập
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Nhập @username người dùng..."
                    value={usernameInput}
                    onChange={e => setUsernameInput(e.target.value)}
                    className="invite-search-input"
                    style={{ padding: '8px 12px' }}
                  />
                  <button
                    type="submit"
                    disabled={!usernameInput.trim()}
                    className="invite-btn-action"
                    style={{ opacity: usernameInput.trim() ? 1 : 0.5, cursor: usernameInput.trim() ? 'pointer' : 'not-allowed' }}
                  >
                    Mời ngay
                  </button>
                </div>
              </form>
            )}

            {/* Ô tìm kiếm bạn bè */}
            {friends.length > 2 && (
              <div className="invite-search-box">
                <Search size={15} className="invite-search-icon" />
                <input
                  type="text"
                  placeholder="Lọc danh sách bạn bè..."
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                  className="invite-search-input"
                />
                {filterText && (
                  <button
                    type="button"
                    className="invite-search-clear"
                    onClick={() => setFilterText('')}
                    aria-label="Xóa tìm kiếm"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )}

            {/* Danh sách bạn bè */}
            {filteredFriends.length === 0 ? (
              <div style={{
                padding: '28px 16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 13,
                backgroundColor: 'var(--bg-3)',
                borderRadius: 10,
                border: '1px dashed rgba(255, 255, 255, 0.08)'
              }}>
                {friends.length === 0
                  ? 'Bạn chưa có người bạn nào trong danh sách. Hãy nhập @username ở ô trên để mời trực tiếp!'
                  : 'Không tìm thấy người bạn nào khớp với từ khóa.'}
              </div>
            ) : (
              <div className="invite-room-list">
                {filteredFriends.map(f => {
                  const isAlreadyMember = roomMemberIds.includes(f.id);
                  const isInvited = invitedFriendIds.includes(f.id);

                  return (
                    <div key={f.id} className="invite-room-row">
                      <div className="invite-room-left">
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: '50%',
                              backgroundColor: 'var(--accent)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--on-accent, #fff)',
                              fontWeight: 700,
                              fontSize: 14
                            }}
                          >
                            {f.displayName ? Array.from(f.displayName.trim())[0]?.toUpperCase() : 'U'}
                          </div>
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              right: 0,
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              backgroundColor: f.online ? '#23a55a' : '#80848e',
                              border: '2px solid var(--bg-3)'
                            }}
                          />
                        </div>
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div className="invite-room-name">
                            {f.displayName}
                          </div>
                          <div className="invite-room-meta">
                            @{f.username}
                          </div>
                        </div>
                      </div>

                      <div style={{ flexShrink: 0, marginLeft: 12 }}>
                        {isAlreadyMember ? (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, padding: '5px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.06)' }}>
                            Đã tham gia
                          </span>
                        ) : isInvited ? (
                          <span className="invite-badge-success">
                            <Check size={14} />
                            Đã mời
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onInvite(targetRoom.id, f.id)}
                            className="invite-btn-action"
                          >
                            Mời
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="invite-modal-footer">
            <span className="invite-footer-hint">
              Nhấn <kbd>Esc</kbd> để đóng
            </span>
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              style={{ padding: '7px 16px', borderRadius: 6 }}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // CHẾ ĐỘ 1: ĐANG CHỌN 1 BẠN BÈ -> CHỌN PHÒNG CHAT MUỐN MỜI BẠN ĐÓ VÀO
  // ==========================================================================
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="invite-modal-card" 
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-modal-title"
      >
        {/* Header cao cấp chuẩn Discord */}
        <div className="invite-modal-header">
          <div className="invite-modal-header-left">
            <div className="invite-modal-icon-badge">
              <UserPlus size={20} />
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <h3 id="invite-modal-title" className="invite-modal-title">
                Mời {friend?.displayName} vào phòng
              </h3>
              <p className="invite-modal-subtitle">
                Chọn phòng bạn muốn cùng tham gia với <span className="highlight-friend">{friend?.displayName}</span> (@{friend?.username})
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="invite-modal-close-btn" 
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Thân hộp thoại */}
        <div className="invite-modal-body">
          {/* Thanh tìm kiếm phòng nếu có nhiều phòng */}
          {rooms.length > 2 && (
            <div className="invite-search-box">
              <Search size={15} className="invite-search-icon" />
              <input
                type="text"
                placeholder="Tìm kiếm phòng chat theo tên..."
                value={roomSearchQuery}
                onChange={e => setRoomSearchQuery(e.target.value)}
                className="invite-search-input"
              />
              {roomSearchQuery && (
                <button
                  type="button"
                  className="invite-search-clear"
                  onClick={() => setRoomSearchQuery('')}
                  aria-label="Xóa tìm kiếm"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}

          {/* Danh sách phòng */}
          {filteredRooms.length === 0 ? (
            <div style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 13,
              backgroundColor: 'var(--bg-3)',
              borderRadius: 10,
              border: '1px dashed rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8
            }}>
              <Users size={28} style={{ opacity: 0.4 }} />
              <div>
                {rooms.length === 0
                  ? 'Bạn chưa tham gia phòng chat nào. Hãy tạo hoặc tham gia một phòng trước khi mời bạn bè!'
                  : 'Không tìm thấy phòng chat nào khớp với từ khóa tìm kiếm.'}
              </div>
            </div>
          ) : (
            <div className="invite-room-list">
              {filteredRooms.map(room => {
                const isInvited = invitedRoomIds.includes(room.id);
                const acronym = getRoomAcronym(room.name);

                return (
                  <div key={room.id} className="invite-room-row">
                    {/* Thông tin phòng bên trái: Avatar biểu tượng phòng + Tên + Mô tả */}
                    <div className="invite-room-left">
                      <div className="invite-room-avatar" aria-hidden="true">
                        {acronym}
                      </div>
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div className="invite-room-name">
                          {room.name}
                        </div>
                        <div className="invite-room-meta">
                          {room.description ? room.description : 'Phòng chat cộng đồng'}
                        </div>
                      </div>
                    </div>

                    {/* Nút mời hoặc trạng thái đã mời bên phải */}
                    <div style={{ flexShrink: 0, marginLeft: 12 }}>
                      {isInvited ? (
                        <span className="invite-badge-success">
                          <Check size={14} />
                          Đã gửi lời mời
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => friend && onInvite(room.id, friend.id)}
                          className="invite-btn-action"
                        >
                          Mời
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="invite-modal-footer">
          <span className="invite-footer-hint">
            Nhấn <kbd>Esc</kbd> để đóng
          </span>
          <button 
            type="button" 
            className="btn-cancel" 
            onClick={onClose}
            style={{ padding: '7px 16px', borderRadius: 6 }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteFriendModal;
