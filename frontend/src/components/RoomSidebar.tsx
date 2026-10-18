import React, { useState, useRef, useEffect } from 'react';
import type { Room, Channel, User, Friend, MessageItem } from '../types/chat';
import { 
  Hash, Plus, Settings, ChevronDown, ChevronUp, LogOut, 
  UserPlus, Users, MessageSquare, X, Trash2
} from 'lucide-react';
import { formatTime } from './chat/chatShared';
import {
  ROOM_ICON_PRESETS,
  ROOM_COLOR_PRESETS,
  getRoomCustomStyle,
  saveRoomCustomStyle
} from './rail/RoomRailItem';

interface Props {
  currentRoom: Room | null;
  channels: Channel[];
  currentChannel: Channel | null;
  currentUser: User | null;
  currentUserRole?: string;
  isOwner?: boolean;
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
  onRenameChannel?: (channelId: number, name: string) => void;
  onDeleteChannel?: (channelId: number) => void;
  onLogout?: () => void;
  onOpenSettings?: () => void;
  onInvite?: () => void;
  onLeaveRoom?: () => void;
  isServerMenuOpen?: boolean;
  onToggleServerMenu?: () => void;
  onCloseServerMenu?: () => void;
  externalSettingsRoom?: Room | null;
  onClearExternalSettingsRoom?: () => void;
  externalDeleteRoom?: Room | null;
  onClearExternalDeleteRoom?: () => void;
}

function getLocalUserStyle(): { 
  avatarColor: string; 
  avatarIcon: string; 
  bannerColor: string;
  bio: string; 
  presenceStatus: 'online' | 'idle' | 'dnd' | 'invisible';
  customStatus: string;
} {
  try {
    const raw = localStorage.getItem('discord_mini_user_settings_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        avatarColor: parsed.avatarColor || '#5865F2',
        avatarIcon: parsed.avatarIcon || '',
        bannerColor: parsed.bannerColor || '#23A55A',
        bio: parsed.bio || '',
        presenceStatus: parsed.presenceStatus || 'online',
        customStatus: parsed.customStatus || ''
      };
    }
  } catch {
    // ignore
  }
  return { 
    avatarColor: '#5865F2', 
    avatarIcon: '', 
    bannerColor: '#23A55A',
    bio: '', 
    presenceStatus: 'online', 
    customStatus: '' 
  };
}

export const RoomSidebar: React.FC<Props> = ({
  currentRoom,
  channels,
  currentChannel,
  currentUser,
  currentUserRole,
  isOwner = false,
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
  onRenameChannel,
  onDeleteChannel,
  onLogout: _onLogout,
  onOpenSettings,
  onInvite,
  onLeaveRoom,
  isServerMenuOpen: propIsServerMenuOpen,
  onToggleServerMenu,
  onCloseServerMenu,
  externalSettingsRoom,
  onClearExternalSettingsRoom,
  externalDeleteRoom,
  onClearExternalDeleteRoom
}) => {
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [roomIcon, setRoomIcon] = useState('');
  const [roomColor, setRoomColor] = useState('');
  const [confirmDeleteRoom, setConfirmDeleteRoom] = useState<Room | null>(null);

  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [channelNewName, setChannelNewName] = useState('');
  const [hiddenFriendMap, setHiddenFriendMap] = useState<Record<number, number>>({});
  const [localServerMenuOpen, setLocalServerMenuOpen] = useState(false);
  const [userStyle, setUserStyle] = useState(getLocalUserStyle);

  const isServerMenuOpen = propIsServerMenuOpen !== undefined ? propIsServerMenuOpen : localServerMenuOpen;

  useEffect(() => {
    const syncStyle = () => setUserStyle(getLocalUserStyle());
    window.addEventListener('user_settings_updated', syncStyle);
    window.addEventListener('storage', syncStyle);
    return () => {
      window.removeEventListener('user_settings_updated', syncStyle);
      window.removeEventListener('storage', syncStyle);
    };
  }, []);

  useEffect(() => {
    if (externalSettingsRoom) {
      const style = getRoomCustomStyle(externalSettingsRoom.id, externalSettingsRoom.name);
      setEditingRoom(externalSettingsRoom);
      setNewName(externalSettingsRoom.name);
      setNewDesc(externalSettingsRoom.description || '');
      setRoomIcon(style.icon || '');
      setRoomColor(style.color || '');
      onClearExternalSettingsRoom?.();
    }
  }, [externalSettingsRoom, onClearExternalSettingsRoom]);

  useEffect(() => {
    if (externalDeleteRoom) {
      setConfirmDeleteRoom(externalDeleteRoom);
      onClearExternalDeleteRoom?.();
    }
  }, [externalDeleteRoom, onClearExternalDeleteRoom]);

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

  const openSettings = (room: Room, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const style = getRoomCustomStyle(room.id, room.name);
    setEditingRoom(room);
    setNewName(room.name);
    setNewDesc(room.description || '');
    setRoomIcon(style.icon || '');
    setRoomColor(style.color || '');
    closeServerMenu();
  };

  const handleSaveSettings = () => {
    if (!editingRoom) return;
    const finalName = newName.trim() || editingRoom.name;
    saveRoomCustomStyle(editingRoom.id, finalName, {
      icon: roomIcon || undefined,
      color: roomColor || undefined
    });
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
    const target = editingRoom;
    setEditingRoom(null);
    setConfirmDeleteRoom(target);
  };

  const executeConfirmDelete = () => {
    if (!confirmDeleteRoom) return;
    if (onDeleteRoom) {
      onDeleteRoom(confirmDeleteRoom.id);
    }
    setConfirmDeleteRoom(null);
  };

  const openChannelSettings = (channel: Channel, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChannel(channel);
    setChannelNewName(channel.name);
  };

  const handleSaveChannelSettings = () => {
    if (!editingChannel) return;
    if (channelNewName.trim() && channelNewName.trim() !== editingChannel.name && onRenameChannel) {
      onRenameChannel(editingChannel.id, channelNewName.trim());
    }
    setEditingChannel(null);
  };

  const handleDeleteChannel = () => {
    if (!editingChannel) return;
    if (onDeleteChannel) {
      onDeleteChannel(editingChannel.id);
    }
    setEditingChannel(null);
  };

  const effectiveRole = currentRoom?.role || currentUserRole;
  const isRoomOwner = Boolean(isOwner || effectiveRole === 'OWNER');
  const isManager = Boolean(isRoomOwner || effectiveRole === 'ADMIN');

  const userAvatarChar = userStyle.avatarIcon || (currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U');

  const presenceLabels: Record<string, string> = {
    online: 'Trực tuyến',
    idle: 'Chờ',
    dnd: 'Không làm phiền',
    invisible: 'Ẩn danh'
  };
  const currentStatusLabel = userStyle.customStatus || presenceLabels[userStyle.presenceStatus] || 'Trực tuyến';

  const renderUserProfileBar = () => (
    <div 
      className="user-profile-bar" 
      onClick={onOpenSettings}
      style={{ cursor: 'pointer' }}
      title="Nhấp để mở Cài đặt hồ sơ & trạng thái"
    >
      <div className="user-avatar-wrap">
        <div
          className="user-avatar-circle"
          style={{
            background: userStyle.avatarColor || 'var(--accent)',
            fontSize: userStyle.avatarIcon ? '16px' : undefined
          }}
        >
          {userAvatarChar}
        </div>
        <div 
          className={`status-dot ${userStyle.presenceStatus || 'online'}`} 
          title={presenceLabels[userStyle.presenceStatus] || 'Trực tuyến'} 
        />
      </div>

      <div className="user-info">
        <div 
          className="name" 
          title={currentUser?.displayName || currentUser?.username || 'Người dùng'}
        >
          {currentUser?.displayName || currentUser?.username || 'Người dùng'}
        </div>
        <div className="status" title={currentStatusLabel}>
          {userStyle.customStatus ? `💬 ${userStyle.customStatus}` : currentStatusLabel}
        </div>
      </div>

      <div className="user-profile-actions" onClick={e => e.stopPropagation()}>
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
  );

  // 1. GIAO DIỆN CHẾ ĐỘ TIN NHẮN TRỰC TIẾP
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
          <div className="section-title dm-section-title">
            <span className="dm-section-title-text">TIN NHẮN TRỰC TIẾP</span>
            {onOpenAddFriend && (
              <button
                type="button"
                className="dm-section-add-btn"
                title="Tạo tin nhắn riêng"
                aria-label="Tạo tin nhắn riêng"
                onClick={onOpenAddFriend}
              >
                <Plus size={16} />
              </button>
            )}
          </div>

          {/* Danh sách bạn bè để chat 1-1 */}
          <div className="direct-message-list dm-sidebar-list">
            {(() => {
              const visibleFriends = friends.filter(friend => {
                const hiddenLastId = hiddenFriendMap[friend.id];
                if (hiddenLastId === undefined) return true;
                if (currentDirectUser?.id === friend.id) return true;
                const friendMsgs = directMessagesMap?.[friend.id] || [];
                const lastMsg = friendMsgs[friendMsgs.length - 1];
                const lastId = lastMsg?.id || 0;
                const unread = directUnreadMap[friend.id] || 0;
                return unread > 0 || lastId > hiddenLastId;
              });

              if (visibleFriends.length === 0) {
                return (
                  <div className="dm-empty-sidebar-notice">
                    Chưa có tin nhắn trực tiếp nào. Hãy chọn mục <strong>Bạn bè</strong> để bắt đầu trò chuyện!
                  </div>
                );
              }

              return visibleFriends.map(friend => {
                const isActive = currentDirectUser?.id === friend.id;
                const unread = directUnreadMap[friend.id] || 0;
                const friendMsgs = directMessagesMap?.[friend.id] || [];
                const lastMsg = friendMsgs.length > 0 ? friendMsgs[friendMsgs.length - 1] : null;

                return (
                  <div
                    key={friend.id}
                    className={`dm-conversation-row ${isActive ? 'active' : ''}`}
                    onClick={() => onSelectDirectUser && onSelectDirectUser(friend)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="user-avatar-wrap">
                      <div className="user-avatar-circle" style={{ width: '32px', height: '32px', fontSize: '13px' }}>
                        {friend.displayName ? Array.from(friend.displayName.trim())[0]?.toUpperCase() : 'U'}
                      </div>
                      <div className={`status-dot ${friend.online ? '' : 'offline'}`} />
                    </div>

                    <div className="dm-conv-body">
                      <div className="dm-conv-top">
                        <span className="dm-conv-name" title={friend.displayName || friend.username}>
                          {friend.displayName || friend.username}
                        </span>
                        {lastMsg?.timestamp && (
                          <span className="dm-conv-time" title={lastMsg.timestamp}>
                            {formatTime(lastMsg.timestamp)}
                          </span>
                        )}
                      </div>

                      <div className="dm-conv-bottom">
                        <span 
                          className="dm-conv-preview" 
                          title={lastMsg ? (lastMsg.isMe ? `Bạn: ${lastMsg.content}` : lastMsg.content) : `@${friend.username}`}
                        >
                          {lastMsg ? (lastMsg.isMe ? `Bạn: ${lastMsg.content}` : lastMsg.content) : `@${friend.username}`}
                        </span>

                        {unread > 0 && (
                          <span className="dm-unread-badge">
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="dm-conv-close-btn"
                      title="Ẩn hội thoại"
                      aria-label="Ẩn hội thoại"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHiddenFriendMap(prev => ({
                          ...prev,
                          [friend.id]: lastMsg?.id || 0
                        }));
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {renderUserProfileBar()}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {onInvite && (
              <button
                type="button"
                className="server-header-invite-btn"
                title={`Mời bạn bè vào ${currentRoom.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onInvite();
                }}
                aria-label="Mời bạn bè"
              >
                <UserPlus size={16} />
              </button>
            )}
            {isServerMenuOpen ? (
              <ChevronUp size={18} className="server-chevron" />
            ) : (
              <ChevronDown size={18} className="server-chevron" />
            )}
          </div>
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

            {isRoomOwner ? (
              <div 
                className="dropdown-item danger" 
                onClick={() => {
                  closeServerMenu();
                  setConfirmDeleteRoom(currentRoom);
                }}
              >
                <span>Xóa phòng</span>
                <Trash2 size={16} />
              </div>
            ) : (
              onLeaveRoom && (
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
              )
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
              {isManager && (
                <button 
                  type="button"
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
                  <div className="channel-actions-group" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {onInvite && (
                      <button
                        type="button"
                        className="channel-action-btn channel-invite-btn"
                        title={`Mời vào kênh #${channel.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectChannel(channel);
                          onInvite();
                        }}
                        aria-label={`Mời vào kênh #${channel.name}`}
                      >
                        <UserPlus size={14} />
                      </button>
                    )}
                    {isManager && (
                      <button
                        type="button"
                        className="channel-settings-btn"
                        title={`Cài đặt kênh #${channel.name}`}
                        onClick={(e) => openChannelSettings(channel, e)}
                        aria-label={`Cài đặt kênh #${channel.name}`}
                      >
                        <Settings size={14} />
                      </button>
                    )}
                  </div>
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
      {renderUserProfileBar()}

      {/* Modal Cài đặt Phòng (Đổi tên, mô tả, icon, màu sắc, xóa phòng) */}
      {editingRoom && (
        <div className="modal-backdrop" onClick={() => setEditingRoom(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
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

            <div className="modal-field">
              <label>Biểu tượng phòng (Icon)</label>
              <div className="custom-icon-picker-row">
                {ROOM_ICON_PRESETS.map((ic, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`custom-icon-chip ${roomIcon === ic ? 'active' : ''}`}
                    onClick={() => setRoomIcon(ic)}
                  >
                    {ic || 'Chữ'}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-field">
              <label>Màu nền biểu tượng</label>
              <div className="custom-color-picker-row">
                {ROOM_COLOR_PRESETS.map((colorHex, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`custom-color-swatch ${roomColor === colorHex ? 'active' : ''}`}
                    style={{ backgroundColor: colorHex || '#313338' }}
                    onClick={() => setRoomColor(colorHex)}
                    title={colorHex ? `Màu ${colorHex}` : 'Mặc định'}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
              {(editingRoom.role === 'OWNER' || (currentRoom?.id === editingRoom.id && isRoomOwner)) && (
                <button
                  type="button"
                  className="btn-danger-outline"
                  onClick={handleDelete}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Trash2 size={15} />
                  <span>Xóa phòng</span>
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

      {/* Modal Xác nhận Xóa Phòng */}
      {confirmDeleteRoom && (
        <div className="modal-backdrop" onClick={() => setConfirmDeleteRoom(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h3 style={{ marginTop: 0, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Trash2 size={20} />
              <span>Xóa '{confirmDeleteRoom.name}'?</span>
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-normal)', lineHeight: 1.5, marginBottom: 20 }}>
              Bạn có chắc bạn muốn xóa <strong>{confirmDeleteRoom.name}</strong>? Toàn bộ các kênh và lịch sử tin nhắn trong phòng này sẽ bị xóa và không thể hoàn tác.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn-cancel" onClick={() => setConfirmDeleteRoom(null)}>
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={executeConfirmDelete}
                style={{
                  background: 'var(--danger)',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Xóa phòng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cài đặt Kênh (Đổi tên, xóa kênh) */}
      {editingChannel && (
        <div className="modal-backdrop" onClick={() => setEditingChannel(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <h3 style={{ marginTop: 0 }}>Cài đặt kênh: #{editingChannel.name}</h3>

            <div className="modal-field">
              <label>Tên kênh chat</label>
              <input
                type="text"
                value={channelNewName}
                onChange={e => setChannelNewName(e.target.value)}
                maxLength={50}
                placeholder="Nhập tên kênh mới..."
                autoFocus
              />
            </div>

            {editingChannel.name.toLowerCase() === 'chung' && (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 12 }}>
                ℹ️ Kênh <strong>#chung</strong> là kênh chính của phòng và không thể xóa.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
              {isManager && editingChannel.name.toLowerCase() !== 'chung' && channels.length > 1 && (
                <button
                  type="button"
                  className="btn-danger-outline"
                  onClick={handleDeleteChannel}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  Xóa kênh
                </button>
              )}
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                <button type="button" className="btn-cancel" onClick={() => setEditingChannel(null)}>
                  Hủy
                </button>
                <button type="button" className="btn-primary" onClick={handleSaveChannelSettings}>
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
