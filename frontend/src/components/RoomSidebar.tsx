import React, { useState, useRef, useEffect } from 'react';
import type { Room, Channel, User, Friend, MessageItem } from '../types/chat';
import { 
  Hash, Plus, Settings, ChevronDown, ChevronUp, LogOut, 
  UserPlus, Users, MessageSquare
} from 'lucide-react';

interface Props {
  currentRoom: Room | null;
  channels: Channel[];
  currentChannel: Channel | null;
  currentUser: User | null;
  isDirectMessageMode: boolean;
  friends?: Friend[];
  pendingCount?: number;
  currentDirectUser?: Friend | null;
  onSelectDirectUser?: (friend: Friend | null) => void;
  directUnreadMap?: Record<number, number>;
  directMessagesMap?: Record<number, MessageItem[]>;
  onOpenAddFriend?: () => void;
  onSelectChannel: (channel: Channel) => void;
  onCreateChannel: () => void;
  onRenameRoom?: (roomId: number, name: string) => void;
  onDeleteRoom?: (roomId: number) => void;
  onSetRoomDesc?: (roomId: number, description: string) => void;
  onLogout?: () => void;
  onOpenSettings?: () => void;
  onInvite?: () => void;
  onLeaveRoom?: () => void;
  isServerMenuOpen?: boolean;
  onToggleServerMenu?: () => void;
  onCloseServerMenu?: () => void;
}

export const RoomSidebar: React.FC<Props> = ({
  currentRoom,
  channels,
  currentChannel,
  currentUser,
  isDirectMessageMode,
  friends = [],
  pendingCount = 0,
  currentDirectUser = null,
  onSelectDirectUser,
  directUnreadMap = {},
  directMessagesMap = {},
  onOpenAddFriend,
  onSelectChannel,
  onCreateChannel,
  onRenameRoom,
  onDeleteRoom,
  onSetRoomDesc,
  onLogout: _onLogout,
  onOpenSettings,
  onInvite,
  onLeaveRoom,
  isServerMenuOpen: propIsServerMenuOpen,
  onToggleServerMenu,
  onCloseServerMenu
}) => {
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [localServerMenuOpen, setLocalServerMenuOpen] = useState(false);
  const isServerMenuOpen = propIsServerMenuOpen !== undefined ? propIsServerMenuOpen : localServerMenuOpen;

  const toggleServerMenu = () => {
    if (onToggleServerMenu) {
      onToggleServerMenu();
    } else {
      setLocalServerMenuOpen(prev => !prev);
    }
  };

  const closeServerMenu = () => {
    if (onCloseServerMenu) {
      onCloseServerMenu();
    } else {
      setLocalServerMenuOpen(false);
    }
  };

  const serverMenuRef = useRef<HTMLDivElement>(null);

  // Đóng Server Menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (serverMenuRef.current && !serverMenuRef.current.contains(event.target as Node)) {
        closeServerMenu();
      }
    };
    if (isServerMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isServerMenuOpen]);

  const openSettings = (room: Room, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRoom(room);
    setNewName(room.name);
    setNewDesc(room.description || '');
    closeServerMenu();
  };

  const handleSaveSettings = () => {
    if (!editingRoom) return;
    if (newName.trim() && newName.trim() !== editingRoom.name && onRenameRoom) {
      onRenameRoom(editingRoom.id, newName.trim());
    }
    if (newDesc.trim() !== (editingRoom.description || '') && onSetRoomDesc) {
      onSetRoomDesc(editingRoom.id, newDesc.trim());
    }
    setEditingRoom(null);
  };

  const handleDelete = () => {
    if (!editingRoom) return;
    if (onDeleteRoom) {
      onDeleteRoom(editingRoom.id);
    }
    setEditingRoom(null);
  };

  const isManager = currentRoom?.role === 'OWNER' || currentRoom?.role === 'ADMIN';

  // 1. GIAO DIỆN CHẾ ĐỘ TIN NHẮN TRỰC TIẾP (Khi click vào logo ứng dụng ở đầu Cột 1)
  if (isDirectMessageMode) {
    return (
      <div className="room-sidebar">
        <div className="server-header" style={{ cursor: 'default' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <MessageSquare size={18} color="var(--accent)" />
            <span className="server-title-text" title="Tin nhắn trực tiếp">
              Tin nhắn trực tiếp
            </span>
          </div>
        </div>

        <div className="room-section" style={{ padding: '8px' }}>
          {/* Mục Bạn bè */}
          <div 
            className={`channel-item ${currentDirectUser === null ? 'active' : ''}`} 
            style={{ marginBottom: '12px', cursor: 'pointer' }}
            onClick={() => onSelectDirectUser && onSelectDirectUser(null)}
          >
            <Users size={18} className="channel-hash-icon" />
            <span className="channel-name" style={{ fontWeight: 600 }}>Bạn bè</span>
            {pendingCount > 0 && (
              <span className="direct-unread-badge" style={{ marginLeft: 'auto' }}>
                {pendingCount}
              </span>
            )}
          </div>

          {/* Tiêu đề TIN NHẮN TRỰC TIẾP */}
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>▾ TIN NHẮN TRỰC TIẾP</span>
            {onOpenAddFriend && (
              <button
                type="button"
                className="section-add-btn"
                title="Thêm bạn bè"
                aria-label="Thêm bạn bè"
                onClick={onOpenAddFriend}
              >
                <Plus size={14} />
              </button>
            )}
          </div>

          {/* Danh sách bạn bè để chat 1-1 */}
          <div className="direct-message-list" style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
            {friends.length === 0 ? (
              <div style={{
                padding: '12px 10px',
                fontSize: '12px',
                color: 'var(--text-3)',
                lineHeight: 1.5,
                backgroundColor: 'var(--bg-3)',
                borderRadius: '6px',
                margin: '4px 0'
              }}>
                Chưa có tin nhắn trực tiếp nào. Hãy chọn mục <strong>Bạn bè</strong> để bắt đầu trò chuyện!
              </div>
            ) : (
              friends.map(friend => {
                const isActive = currentDirectUser?.id === friend.id;
                const unread = directUnreadMap[friend.id] || 0;
                const friendMsgs = directMessagesMap?.[friend.id] || [];
                const lastMsg = friendMsgs.length > 0 ? friendMsgs[friendMsgs.length - 1] : null;

                return (
                  <div
                    key={friend.id}
                    className={`channel-item dm-sidebar-item ${isActive ? 'active' : ''}`}
                    onClick={() => onSelectDirectUser && onSelectDirectUser(friend)}
                    style={{ cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                  >
                    <div className="user-avatar-wrap" style={{ marginRight: '10px', position: 'relative', flexShrink: 0 }}>
                      <div className="user-avatar-circle" style={{ width: '32px', height: '32px', fontSize: '13px' }}>
                        {friend.displayName ? Array.from(friend.displayName.trim())[0]?.toUpperCase() : 'U'}
                      </div>
                      <div className={`status-dot ${friend.online ? '' : 'offline'}`} style={{ width: '9px', height: '9px', bottom: '-1px', right: '-1px' }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                        <div className="channel-name" style={{
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          fontSize: '13px',
                          fontWeight: unread > 0 ? 700 : 500,
                          color: isActive ? 'var(--text-1)' : (unread > 0 ? 'var(--text-1)' : 'var(--text-2)')
                        }}>
                          {friend.displayName}
                        </div>
                        {lastMsg?.timestamp && (
                          <span style={{ fontSize: '11px', color: 'var(--text-3)', flexShrink: 0 }}>
                            {lastMsg.timestamp}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginTop: '2px' }}>
                        <div style={{
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          fontSize: '11.5px',
                          color: unread > 0 ? 'var(--text-1)' : 'var(--text-3)',
                          fontWeight: unread > 0 ? 600 : 400
                        }}>
                          {lastMsg ? lastMsg.content : `@${friend.username}`}
                        </div>

                        {unread > 0 && (
                          <span className="direct-unread-badge" style={{ flexShrink: 0 }}>
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* User Profile Bar ở đáy */}
        <div className="user-profile-bar">
          <div className="user-avatar-wrap">
            <div className="user-avatar-circle">
              {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="status-dot" title="Trực tuyến" />
          </div>

          <div className="user-info">
            <div 
              className="name" 
              title={currentUser?.displayName || currentUser?.username || 'Người dùng'}
            >
              {currentUser?.displayName || currentUser?.username || 'Người dùng'}
            </div>
            <div className="status" title="Trực tuyến">Trực tuyến</div>
          </div>

          <div className="user-profile-actions">
            <button
              type="button"
              className="user-action-btn"
              title="Cài đặt người dùng"
              onClick={onOpenSettings}
              aria-label="Cài đặt người dùng"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. GIAO DIỆN CHẾ ĐỘ PHÒNG (Hiển thị các kênh của phòng đang chọn)
  return (
    <div className="room-sidebar">
      {/* 1. Header: Tiêu đề là tên phòng đang chọn */}
      <div 
        ref={serverMenuRef}
        className={`server-header ${isServerMenuOpen ? 'open' : ''}`} 
        onClick={() => currentRoom && toggleServerMenu()}
        title={currentRoom ? currentRoom.name : 'Chưa chọn phòng'}
        style={{ cursor: currentRoom ? 'pointer' : 'default' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          <span className="server-title-text" title={currentRoom?.name || 'Chưa chọn phòng'}>
            {currentRoom ? currentRoom.name : 'Chưa chọn phòng'}
          </span>
        </div>

        {currentRoom && (
          isServerMenuOpen ? (
            <ChevronUp size={18} className="server-chevron" />
          ) : (
            <ChevronDown size={18} className="server-chevron" />
          )
        )}

        {/* Dropdown Menu của Phòng */}
        {currentRoom && isServerMenuOpen && (
          <div className="server-dropdown-menu" onClick={e => e.stopPropagation()}>
            <div 
              className="dropdown-item blurple" 
              onClick={() => {
                closeServerMenu();
                if (onInvite) onInvite();
              }}
            >
              <span>Mời vào phòng</span>
              <UserPlus size={16} color="var(--accent)" />
            </div>

            {isManager && (
              <div 
                className="dropdown-item" 
                onClick={(e) => openSettings(currentRoom, e)}
              >
                <span>Cài đặt phòng</span>
                <Settings size={16} />
              </div>
            )}

            {isManager && (
              <div 
                className="dropdown-item" 
                onClick={() => {
                  closeServerMenu();
                  onCreateChannel();
                }}
              >
                <span>Tạo kênh chat mới</span>
                <Plus size={16} />
              </div>
            )}

            {onLeaveRoom && (
              <div 
                className="dropdown-item danger" 
                onClick={() => {
                  closeServerMenu();
                  onLeaveRoom();
                }}
              >
                <span>Rời khỏi phòng</span>
                <LogOut size={16} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Danh sách Kênh chat của riêng phòng đang chọn */}
      <div className="room-section">
        {currentRoom ? (
          <>
            <div className="section-title">
              <span>▾ KÊNH CHAT</span>
              {/* Nút "+" cạnh KÊNH CHAT chỉ cho phép chủ phòng hoặc quản lý */}
              {isManager && (
                <button 
                  className="add-btn" 
                  title={`Tạo kênh chat trong ${currentRoom.name}`} 
                  onClick={onCreateChannel}
                  aria-label="Tạo kênh chat"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>

            {channels.map(channel => {
              const isSelected = currentChannel?.id === channel.id;

              return (
                <div
                  key={channel.id}
                  className={`channel-item ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectChannel(channel)}
                  title={`Kênh #${channel.name}`}
                >
                  <Hash size={18} className="channel-hash-icon" />
                  <span className="channel-name" title={channel.name}>
                    {channel.name}
                  </span>
                </div>
              );
            })}

            {channels.length === 0 && (
              <div style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                Chưa có kênh nào trong phòng này.
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: '24px 16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
            👈 Hãy chọn một phòng ở thanh bên trái để xem các kênh chat.
          </div>
        )}
      </div>

      {/* 3. User Profile Bar ở đáy Cột 2 */}
      <div className="user-profile-bar">
        <div className="user-avatar-wrap">
          <div className="user-avatar-circle">
            {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="status-dot" title="Trực tuyến" />
        </div>

        <div className="user-info">
          <div 
            className="name" 
            title={currentUser?.displayName || currentUser?.username || 'Người dùng'}
          >
            {currentUser?.displayName || currentUser?.username || 'Người dùng'}
          </div>
          <div className="status" title="Trực tuyến">Trực tuyến</div>
        </div>

        <div className="user-profile-actions">
          <button
            type="button"
            className="user-action-btn"
            title="Cài đặt người dùng"
            onClick={onOpenSettings}
            aria-label="Cài đặt người dùng"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Modal Cài đặt Phòng (Đổi tên, mô tả, xóa phòng) */}
      {editingRoom && (
        <div className="modal-backdrop" onClick={() => setEditingRoom(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <h3 style={{ marginTop: 0 }}>Cài đặt phòng: {editingRoom.name}</h3>

            <div className="modal-field">
              <label>Tên phòng chat</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="modal-field">
              <label>Mô tả phòng</label>
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                rows={2}
                maxLength={120}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
              {editingRoom.role === 'OWNER' && (
                <button
                  type="button"
                  className="btn-danger-outline"
                  onClick={handleDelete}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  Xóa phòng
                </button>
              )}
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                <button type="button" className="btn-cancel" onClick={() => setEditingRoom(null)}>
                  Hủy
                </button>
                <button type="button" className="btn-primary" onClick={handleSaveSettings}>
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomSidebar;
