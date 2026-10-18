import React from 'react';
import type { Room, Friend } from '../types/chat';
import { X, UserPlus, Check, Hash } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  friend: Friend | null;
  rooms: Room[];
  onInvite: (roomId: number, friendId: number) => void;
  invitedRoomIds?: number[];
}

export const InviteFriendModal: React.FC<Props> = ({
  isOpen,
  onClose,
  friend,
  rooms,
  onInvite,
  invitedRoomIds = []
}) => {
  if (!isOpen || !friend) return null;

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
              Mời {friend.displayName} vào phòng
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
            Chọn phòng chat bạn muốn mời <strong>{friend.displayName}</strong> (@{friend.username}) cùng tham gia:
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
                      onClick={() => onInvite(room.id, friend.id)}
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
