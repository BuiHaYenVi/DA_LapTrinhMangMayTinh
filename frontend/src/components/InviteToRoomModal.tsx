import React, { useState, useMemo, useEffect } from 'react';
import type { Room, Friend, User } from '../types/chat';
import { X, UserPlus, Check, Search, Copy, CheckCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
  friends: Friend[];
  members: User[];
  onInviteMember: (target: number | string) => Promise<void> | void;
}

export const InviteToRoomModal: React.FC<Props> = ({
  isOpen,
  onClose,
  room,
  friends = [],
  members = [],
  onInviteMember
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [invitedMap, setInvitedMap] = useState<Record<number, boolean>>({});
  const [directIdInput, setDirectIdInput] = useState('');
  const [directIdError, setDirectIdError] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInvitedMap({});
      setSearchQuery('');
      setDirectIdInput('');
      setDirectIdError('');
    }
  }, [isOpen, room?.id]);

  // Tập hợp các ID đã có trong phòng hiện tại
  const memberIdSet = useMemo(() => {
    const set = new Set<number>();
    members.forEach(m => {
      if (m && typeof m.id === 'number' && m.id > 0) {
        set.add(m.id);
      }
    });
    return set;
  }, [members]);

  // Lọc danh sách bạn bè theo ô tìm kiếm
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const query = searchQuery.trim().toLowerCase();
    return friends.filter(f => 
      (f.displayName && f.displayName.toLowerCase().includes(query)) ||
      (f.username && f.username.toLowerCase().includes(query))
    );
  }, [friends, searchQuery]);

  if (!isOpen || !room) return null;

  const handleInviteFriend = async (friendId: number) => {
    try {
      await onInviteMember(friendId);
      setInvitedMap(prev => ({ ...prev, [friendId]: true }));
    } catch (e) {
      // lỗi đã được xử lý ở callback
    }
  };

  const handleDirectInvite = async () => {
    setDirectIdError('');
    const raw = directIdInput.trim();
    if (!raw) {
      setDirectIdError('Vui lòng nhập tên đăng nhập (@username) hoặc ID người dùng.');
      return;
    }

    const asNum = Number(raw);
    if (!isNaN(asNum) && Number.isInteger(asNum) && asNum > 0) {
      if (memberIdSet.has(asNum)) {
        setDirectIdError('Người dùng này đã có mặt trong phòng.');
        return;
      }
      try {
        await onInviteMember(asNum);
        setDirectIdInput('');
        setInvitedMap(prev => ({ ...prev, [asNum]: true }));
      } catch (e: any) {
        setDirectIdError(e?.message || 'Không thể mời người dùng này.');
      }
      return;
    }

    const cleanUsername = raw.startsWith('@') ? raw.slice(1).trim() : raw;
    if (!cleanUsername) {
      setDirectIdError('Tên đăng nhập không hợp lệ.');
      return;
    }
    const alreadyInRoom = members.some(
      m => (m.username && m.username.toLowerCase() === cleanUsername.toLowerCase()) ||
           (m.displayName && m.displayName.toLowerCase() === cleanUsername.toLowerCase())
    );
    if (alreadyInRoom) {
      setDirectIdError('Người dùng này đã có mặt trong phòng.');
      return;
    }

    try {
      await onInviteMember(cleanUsername);
      setDirectIdInput('');
    } catch (e: any) {
      setDirectIdError(e?.message || 'Không thể mời người dùng này.');
    }
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(String(room.id)).then(() => {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-container invite-modal-card" 
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-room-modal-title"
        style={{ width: 460, maxWidth: '94vw' }}
      >
        {/* Header Modal */}
        <div className="invite-modal-header">
          <div className="invite-modal-header-left">
            <div className="invite-modal-icon-badge">
              <UserPlus size={20} />
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <h3 id="invite-room-modal-title" className="invite-modal-title">
                Mời bạn bè tham gia
              </h3>
              <p className="invite-modal-subtitle">
                Phòng <span className="highlight-friend">#{room.name}</span> (ID: #{room.id})
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

        {/* Body Modal */}
        <div className="invite-modal-body">
          {/* Ô tìm kiếm bạn bè */}
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <Search 
              size={16} 
              color="var(--text-muted)" 
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} 
            />
            <input
              type="text"
              placeholder="Tìm kiếm bạn bè theo tên..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg-3)',
                color: 'var(--text-header)',
                fontSize: 13,
                boxSizing: 'border-box',
                outline: 'none'
              }}
              autoFocus
            />
          </div>

          {/* Danh sách bạn bè */}
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
            Bạn bè ({filteredFriends.length})
          </div>

          {filteredFriends.length === 0 ? (
            <div style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 13,
              backgroundColor: 'var(--bg-3)',
              borderRadius: 8,
              marginBottom: 16
            }}>
              {friends.length === 0 
                ? 'Bạn chưa có người bạn nào trong danh sách bạn bè.' 
                : 'Không tìm thấy bạn bè phù hợp với từ khóa.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18, maxHeight: 220, overflowY: 'auto' }}>
              {filteredFriends.map(friend => {
                const isMember = memberIdSet.has(friend.id);
                const isInvited = invitedMap[friend.id] === true;

                return (
                  <div
                    key={friend.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: 'var(--bg-3)',
                      borderRadius: 6,
                      border: '1px solid var(--border)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div 
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            backgroundColor: 'var(--accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: 14
                          }}
                        >
                          {friend.displayName ? friend.displayName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div 
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            backgroundColor: friend.online ? 'var(--status-online, #23a55a)' : '#80848e',
                            border: '2px solid var(--bg-3)'
                          }}
                        />
                      </div>

                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-header)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {friend.displayName}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          @{friend.username}
                        </div>
                      </div>
                    </div>

                    <div style={{ flexShrink: 0, marginLeft: 12 }}>
                      {isMember ? (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, padding: '4px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.05)' }}>
                          Đã tham gia
                        </span>
                      ) : isInvited ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#23a55a', fontWeight: 600, padding: '4px 8px', borderRadius: 4, background: 'rgba(35, 165, 90, 0.15)' }}>
                          <Check size={14} />
                          Đã gửi lời mời
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: '6px 14px', fontSize: 13, borderRadius: 4 }}
                          onClick={() => handleInviteFriend(friend.id)}
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

          {/* Chia sẻ ID phòng hoặc mời trực tiếp bằng ID */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                MÃ ID PHÒNG ĐỂ CHIA SẺ
              </span>
              <button 
                type="button" 
                onClick={handleCopyRoomId}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copiedId ? '#23a55a' : 'var(--accent)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                {copiedId ? <CheckCheck size={14} /> : <Copy size={14} />}
                {copiedId ? 'Đã sao chép' : 'Sao chép ID'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input
                type="text"
                placeholder="Nhập @username hoặc ID người dùng..."
                value={directIdInput}
                onChange={e => {
                  setDirectIdInput(e.target.value);
                  setDirectIdError('');
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleDirectInvite();
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-3)',
                  color: 'var(--text-header)',
                  fontSize: 13,
                  outline: 'none'
                }}
              />
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '8px 14px', fontSize: 13, whiteSpace: 'nowrap' }}
                onClick={handleDirectInvite}
              >
                Gửi lời mời
              </button>
            </div>
            {directIdError && (
              <div style={{ fontSize: 12, color: '#f23f43', marginTop: 6 }}>
                ⚠️ {directIdError}
              </div>
            )}
          </div>
        </div>

        {/* Footer Modal */}
        <div className="invite-modal-footer">
          <span className="invite-footer-hint">
            Nhấn <kbd>Esc</kbd> để đóng
          </span>
          <button type="button" className="btn-cancel" onClick={onClose} style={{ padding: '7px 16px', borderRadius: 6 }}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteToRoomModal;
