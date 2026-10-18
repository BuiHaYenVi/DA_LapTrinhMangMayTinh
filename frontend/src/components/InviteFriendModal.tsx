import React, { useState } from 'react';
import type { Room, Friend } from '../types/chat';
import { X, UserPlus, Check, Hash, Search } from 'lucide-react';

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
  rooms,
  friends = [],
  roomMemberIds = [],
  onInvite,
  onInviteByUsername,
  invitedRoomIds = [],
  invitedFriendIds = []
}) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [filterText, setFilterText] = useState('');

  if (!isOpen || (!friend && !targetRoom)) return null;

  const handleUsernameInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRoom || !usernameInput.trim()) return;
    if (onInviteByUsername) {
      onInviteByUsername(targetRoom.id, usernameInput.trim());
      setUsernameInput('');
    }
  };

  // Chế độ 2: Đang ở trong phòng (hoặc chọn phòng) -> Mời bạn bè / người dùng vào phòng đó
  if (targetRoom && !friend) {
    const filteredFriends = friends.filter(f => {
      if (!filterText.trim()) return true;
      const q = filterText.toLowerCase();
      return f.displayName.toLowerCase().includes(q) || f.username.toLowerCase().includes(q);
    });

    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="modal-container invite-modal-card"
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-modal-title"
        >
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={20} color="var(--accent)" />
              <h3 id="invite-modal-title" className="modal-title">
                Mời bạn bè vào {targetRoom.name}
              </h3>
            </div>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>

          <div className="modal-body" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            {/* Mời trực tiếp bằng tên đăng nhập */}
            {onInviteByUsername && (
              <form onSubmit={handleUsernameInvite} style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Mời theo tên đăng nhập
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Nhập @username người dùng cần mời..."
                    value={usernameInput}
                    onChange={e => setUsernameInput(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-3)',
                      color: 'var(--text-1)',
                      fontSize: '13px'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!usernameInput.trim()}
                    className="btn-action btn-accent"
                    style={{
                      padding: '8px 14px',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      cursor: usernameInput.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Mời ngay
                  </button>
                </div>
              </form>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Danh sách bạn bè ({friends.length})
              </span>
            </div>

            {friends.length > 3 && (
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Lọc nhanh bạn bè..."
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px 7px 30px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-3)',
                    color: 'var(--text-1)',
                    fontSize: '13px'
                  }}
                />
              </div>
            )}

            {filteredFriends.length === 0 ? (
              <div style={{
                padding: '20px 16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '13px',
                backgroundColor: 'var(--bg-3)',
                borderRadius: '8px'
              }}>
                {friends.length === 0
                  ? 'Bạn chưa có người bạn nào trong danh sách. Bạn vẫn có thể nhập trực tiếp tên đăng nhập ở ô bên trên để mời!'
                  : 'Không tìm thấy người bạn nào khớp với từ khóa.'}
              </div>
            ) : (
              <div className="invite-room-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredFriends.map(f => {
                  const isAlreadyMember = roomMemberIds.includes(f.id);
                  const isInvited = invitedFriendIds.includes(f.id);
                  const disabled = isAlreadyMember || isInvited;

                  return (
                    <div
                      key={f.id}
                      className="invite-room-row"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        backgroundColor: 'var(--bg-3)',
                        borderRadius: '8px',
                        border: '1px solid var(--border)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                        <div className="user-avatar-wrap">
                          <div className="user-avatar-circle" style={{ width: '34px', height: '34px', fontSize: '13px' }}>
                            {f.displayName ? Array.from(f.displayName.trim())[0]?.toUpperCase() : 'U'}
                          </div>
                          <div className={`status-dot ${f.online ? '' : 'offline'}`} />
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: '14px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {f.displayName}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                            @{f.username}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onInvite(targetRoom.id, f.id)}
                        className={`btn-action ${disabled ? 'btn-success' : 'btn-accent'}`}
                        style={{
                          padding: '6px 14px',
                          fontSize: '13px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: disabled ? 'default' : 'pointer'
                        }}
                      >
                        {isAlreadyMember ? (
                          <>
                            <Check size={14} />
                            Đã trong phòng
                          </>
                        ) : isInvited ? (
                          <>
                            <Check size={14} />
                            Đã mời
                          </>
                        ) : (
                          'Mời'
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="modal-footer" style={{ justifyContent: 'flex-end', marginTop: '16px' }}>
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Chế độ 1: Đang chọn 1 người bạn -> Chọn phòng muốn mời người bạn đó vào
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-container invite-modal-card" 
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-modal-title"
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={20} color="var(--accent)" />
            <h3 id="invite-modal-title" className="modal-title">
              Mời {friend?.displayName} vào phòng
            </h3>
          </div>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '360px', overflowY: 'auto' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Chọn phòng chat bạn muốn mời <strong>{friend?.displayName}</strong> (@{friend?.username}) cùng tham gia:
          </p>

          {rooms.length === 0 ? (
            <div style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '13px',
              backgroundColor: 'var(--bg-3)',
              borderRadius: '8px'
            }}>
              Bạn chưa tham gia phòng chat nào. Hãy tạo hoặc tham gia một phòng trước.
            </div>
          ) : (
            <div className="invite-room-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rooms.map(room => {
                const isInvited = invitedRoomIds.includes(room.id);
                return (
                  <div
                    key={room.id}
                    className="invite-room-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: 'var(--bg-3)',
                      borderRadius: '8px',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                      <div 
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          backgroundColor: 'var(--bg-card)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--accent)',
                          fontWeight: 700,
                          fontSize: '14px',
                          flexShrink: 0
                        }}
                      >
                        <Hash size={18} />
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: '14px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {room.name}
                        </div>
                        {room.description && (
                          <div style={{ fontSize: '12px', color: 'var(--text-3)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {room.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isInvited}
                      onClick={() => friend && onInvite(room.id, friend.id)}
                      className={`btn-action ${isInvited ? 'btn-success' : 'btn-accent'}`}
                      style={{
                        padding: '6px 14px',
                        fontSize: '13px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: isInvited ? 'default' : 'pointer'
                      }}
                    >
                      {isInvited ? (
                        <>
                          <Check size={14} />
                          Đã mời
                        </>
                      ) : (
                        'Mời'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'flex-end', marginTop: '16px' }}>
          <button 
            type="button" 
            className="btn-cancel" 
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
