import React, { useState, useEffect, useMemo } from 'react';
import type { Room, User } from '../types/chat';
import { 
  X, Info, Users, ShieldCheck, Trash2, LogOut, 
  Crown, Shield, User as UserIcon, Search, AlertCircle, 
  Check, UserMinus, ArrowRightLeft 
} from 'lucide-react';
import { 
  getRoomCustomStyle, 
  saveRoomCustomStyle, 
  ROOM_ICON_PRESETS, 
  ROOM_COLOR_PRESETS, 
  ROOM_BANNER_PRESETS,
  ROOM_BACKGROUND_PRESETS,
  getRoomAcronym
} from './rail/RoomRailItem';

export type RoomSettingsTab = 'overview' | 'members' | 'roles';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  currentUser: User | null;
  currentUserRole?: string;
  members: User[];
  onRenameRoom: (roomId: number, name: string) => void;
  onSetRoomDesc?: (roomId: number, description: string) => void;
  onDeleteRoom: (roomId: number) => void;
  onLeaveRoom: (roomId: number) => void;
  onKickMember?: (roomId: number, userId: number) => void;
  onSetMemberRole?: (roomId: number, userId: number, role: string) => void;
  onTransferOwner?: (roomId: number, userId: number) => void;
}

export const RoomSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  room,
  currentUser,
  currentUserRole = 'MEMBER',
  members = [],
  onRenameRoom,
  onSetRoomDesc,
  onDeleteRoom,
  onLeaveRoom,
  onKickMember,
  onSetMemberRole,
  onTransferOwner
}) => {
  const [activeTab, setActiveTab] = useState<RoomSettingsTab>('overview');
  const [roomName, setRoomName] = useState(room.name);
  const [roomDesc, setRoomDesc] = useState(room.description || '');
  const [roomIcon, setRoomIcon] = useState('');
  const [roomColor, setRoomColor] = useState('');
  const [bannerColor, setBannerColor] = useState('#1e1f22');
  const [chatBackground, setChatBackground] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete_room' | 'leave_room' | 'kick' | 'transfer_owner';
    targetUser?: User;
  } | null>(null);

  // Phân quyền theo role
  const isOwner = currentUserRole === 'OWNER' || room.role === 'OWNER';
  const isAdmin = currentUserRole === 'ADMIN' || room.role === 'ADMIN';
  const canEdit = isOwner || isAdmin;

  // Nạp style đã lưu của phòng
  useEffect(() => {
    if (isOpen) {
      setRoomName(room.name);
      setRoomDesc(room.description || '');
      const st = getRoomCustomStyle(room.id, room.name);
      setRoomIcon(st.icon || '');
      setRoomColor(st.color || '');
      setBannerColor(st.bannerColor || '#1e1f22');
      setChatBackground(st.chatBackground || '');
      setActiveTab('overview');
      setConfirmAction(null);
    }
  }, [isOpen, room]);

  // Phím tắt ESC để đóng cửa sổ cài đặt
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (confirmAction) {
          setConfirmAction(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, confirmAction, onClose]);

  const initialStyle = useMemo(() => getRoomCustomStyle(room.id, room.name), [room.id, room.name]);
  const hasChanges = canEdit && (
    roomName.trim() !== room.name ||
    roomDesc.trim() !== (room.description || '') ||
    roomIcon !== (initialStyle.icon || '') ||
    roomColor !== (initialStyle.color || '') ||
    bannerColor !== (initialStyle.bannerColor || '#1e1f22') ||
    chatBackground !== (initialStyle.chatBackground || '')
  );

  const handleResetChanges = () => {
    setRoomName(room.name);
    setRoomDesc(room.description || '');
    setRoomIcon(initialStyle.icon || '');
    setRoomColor(initialStyle.color || '');
    setBannerColor(initialStyle.bannerColor || '#1e1f22');
    setChatBackground(initialStyle.chatBackground || '');
  };

  const handleSaveChanges = () => {
    if (!canEdit) return;
    const finalName = roomName.trim() || room.name;
    saveRoomCustomStyle(room.id, finalName, {
      icon: roomIcon || undefined,
      color: roomColor || undefined,
      bannerColor: bannerColor || undefined,
      chatBackground: chatBackground || undefined
    });

    if (finalName !== room.name) {
      onRenameRoom(room.id, finalName);
    }
    if (roomDesc.trim() !== (room.description || '') && onSetRoomDesc) {
      onSetRoomDesc(room.id, roomDesc.trim());
    }
  };

  if (!isOpen) return null;

  const onlineMembersCount = members.filter(m => m.online !== false).length || 1;
  const filteredMembers = members.filter(m => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (m.displayName && m.displayName.toLowerCase().includes(q)) ||
      (m.username && m.username.toLowerCase().includes(q))
    );
  });

  return (
    <div className="settings-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="settings-window-card room-settings-window" onClick={e => e.stopPropagation()}>
        {/* Nút đóng tròn ESC ở góc trên bên phải chuẩn Discord */}
        <div className="settings-esc-close-wrap">
          <button
            type="button"
            className="settings-close-circle-btn"
            onClick={onClose}
            title="Đóng cài đặt (ESC)"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
          <span className="settings-esc-label">ESC</span>
        </div>

        {/* ================= CỘT TRÁI: SIDEBAR CÀI ĐẶT PHÒNG ================= */}
        <aside className="settings-nav-sidebar">
          <div className="settings-sidebar-header">
            <span className="settings-sidebar-brand" title={room.name}>
              {room.name.toUpperCase()}
            </span>
          </div>

          <nav className="settings-nav-list" aria-label="Cài đặt phòng">
            <button
              type="button"
              className={`settings-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <Info size={18} className="settings-nav-icon" />
              <span>Hồ Sơ Máy Chủ</span>
            </button>

            <button
              type="button"
              className={`settings-nav-item ${activeTab === 'members' ? 'active' : ''}`}
              onClick={() => setActiveTab('members')}
            >
              <Users size={18} className="settings-nav-icon" />
              <span>Thành Viên ({members.length})</span>
            </button>

            <button
              type="button"
              className={`settings-nav-item ${activeTab === 'roles' ? 'active' : ''}`}
              onClick={() => setActiveTab('roles')}
            >
              <ShieldCheck size={18} className="settings-nav-icon" />
              <span>Vai Trò & Quyền Hạn</span>
            </button>
          </nav>

          {/* Nhóm hành động nguy hiểm ở đáy sidebar */}
          <div className="settings-sidebar-footer">
            {isOwner ? (
              <button
                type="button"
                className="settings-danger-action-btn"
                onClick={() => setConfirmAction({ type: 'delete_room' })}
              >
                <Trash2 size={16} />
                <span>Xóa Máy Chủ</span>
              </button>
            ) : (
              <button
                type="button"
                className="settings-danger-action-btn"
                onClick={() => setConfirmAction({ type: 'leave_room' })}
              >
                <LogOut size={16} />
                <span>Rời Khỏi Máy Chủ</span>
              </button>
            )}
          </div>
        </aside>

        {/* ================= CỘT PHẢI: NỘI DUNG TỪNG TAB ================= */}
        <main className="settings-content-viewport">
          <div className="settings-content-body">
            {/* ----------------- TAB 1: HỒ SƠ MÁY CHỦ (OVERVIEW) ----------------- */}
            {activeTab === 'overview' && (
              <div className="room-profile-tab-wrapper">
                <div className="room-profile-header-text">
                  <h2 className="settings-section-title">Hồ Sơ Máy Chủ</h2>
                  <p className="settings-section-desc">
                    Tùy chỉnh cách máy chủ của bạn xuất hiện trong danh sách phòng và thẻ xem trước.
                  </p>
                </div>

                {!canEdit && (
                  <div className="role-restriction-banner">
                    <AlertCircle size={16} color="#f59e0b" />
                    <span>
                      Bạn đang xem máy chủ với vai trò <strong>Thành viên</strong>. Chỉ Chủ phòng hoặc Phó phòng mới có quyền chỉnh sửa thông tin.
                    </span>
                  </div>
                )}

                <div className="room-profile-columns-layout">
                  {/* Cột trái: Form cấu hình thông tin */}
                  <div className="room-profile-form-col">
                    <div className="settings-field-box">
                      <label className="settings-field-label">Tên máy chủ</label>
                      <input
                        type="text"
                        className="settings-input-control"
                        value={roomName}
                        onChange={e => setRoomName(e.target.value)}
                        disabled={!canEdit}
                        maxLength={50}
                        placeholder="Nhập tên phòng..."
                      />
                    </div>

                    <div className="settings-field-box">
                      <label className="settings-field-label">Mô tả máy chủ</label>
                      <textarea
                        className="settings-textarea-control"
                        value={roomDesc}
                        onChange={e => setRoomDesc(e.target.value)}
                        disabled={!canEdit}
                        rows={3}
                        maxLength={120}
                        placeholder="Giới thiệu đôi nét về máy chủ này..."
                      />
                    </div>

                    {/* Biểu tượng phòng (Icon & Màu đại diện) */}
                    <div className="settings-field-box">
                      <label className="settings-field-label">Biểu tượng máy chủ</label>
                      <p className="settings-field-hint">
                        Chọn biểu tượng hoặc màu nền đại diện cho phòng trên thanh bên trái.
                      </p>
                      <div className="room-icon-selector-grid">
                        {ROOM_ICON_PRESETS.map((ic, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className={`room-icon-choice-btn ${roomIcon === ic ? 'active' : ''}`}
                            onClick={() => canEdit && setRoomIcon(ic)}
                            disabled={!canEdit}
                          >
                            {ic || 'Chữ'}
                          </button>
                        ))}
                      </div>

                      <div className="room-avatar-color-strip">
                        {ROOM_COLOR_PRESETS.map((colHex, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className={`room-color-choice-dot ${roomColor === colHex ? 'active' : ''}`}
                            style={{ backgroundColor: colHex || '#313338' }}
                            onClick={() => canEdit && setRoomColor(colHex)}
                            disabled={!canEdit}
                            title={colHex ? `Màu ${colHex}` : 'Mặc định'}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Biểu ngữ (Banner Colors - Chuẩn ảnh mẫu Discord) */}
                    <div className="settings-field-box">
                      <label className="settings-field-label">Biểu Ngữ</label>
                      <p className="settings-field-hint">
                        Chọn tông màu hiển thị trên thẻ xem trước hồ sơ máy chủ.
                      </p>
                      <div className="room-banner-palette-grid">
                        {ROOM_BANNER_PRESETS.map((bCol, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className={`room-banner-color-tile ${bannerColor === bCol ? 'active' : ''}`}
                            style={{ backgroundColor: bCol }}
                            onClick={() => canEdit && setBannerColor(bCol)}
                            disabled={!canEdit}
                            title={`Biểu ngữ màu ${bCol}`}
                          >
                            {bannerColor === bCol && <Check size={16} color="#ffffff" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Nền phòng chat (Chỉ áp dụng trong vùng tin nhắn của phòng này) */}
                    <div className="settings-field-box">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label className="settings-field-label">Màu nền phòng chat</label>
                        {chatBackground && (
                          <button
                            type="button"
                            onClick={() => canEdit && setChatBackground('')}
                            disabled={!canEdit}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--accent)',
                              fontSize: '12px',
                              cursor: 'pointer',
                              padding: '2px 6px'
                            }}
                          >
                            Khôi phục nền mặc định
                          </button>
                        )}
                      </div>
                      <p className="settings-field-hint">
                        Tùy chỉnh màu nền cho khu vực hiển thị tin nhắn của phòng này. Không làm thay đổi theme của ứng dụng, thanh bên hay ô nhập tin.
                      </p>
                      <div className="room-banner-palette-grid">
                        {ROOM_BACKGROUND_PRESETS.map((bgCol, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className={`room-banner-color-tile ${chatBackground === bgCol ? 'active' : ''}`}
                            style={{ 
                              backgroundColor: bgCol || 'var(--bg-chat)',
                              border: !bgCol ? '2px dashed var(--border)' : undefined
                            }}
                            onClick={() => canEdit && setChatBackground(bgCol)}
                            disabled={!canEdit}
                            title={bgCol ? `Nền màu ${bgCol}` : 'Mặc định (theo theme ứng dụng)'}
                          >
                            {chatBackground === bgCol && (
                              <Check size={16} color={bgCol && (bgCol.startsWith('#F') || bgCol.startsWith('#f')) ? '#0f1415' : '#ffffff'} />
                            )}
                            {!bgCol && !chatBackground && (
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Mặc định</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Cột phải: Live Preview Card (Thẻ xem trước chuẩn Discord) */}
                  <div className="room-profile-preview-col">
                    <span className="preview-heading-label">Xem trước máy chủ</span>
                    <div className="discord-server-preview-card">
                      {/* Banner màu gradient */}
                      <div 
                        className="server-preview-banner" 
                        style={{ backgroundColor: bannerColor }}
                      />

                      {/* Avatar máy chủ chồng lên banner */}
                      <div className="server-preview-body">
                        <div 
                          className="server-preview-avatar"
                          style={{ backgroundColor: roomColor || '#5865f2' }}
                        >
                          {roomIcon ? (
                            <span className="server-preview-avatar-icon">{roomIcon}</span>
                          ) : (
                            <span className="server-preview-avatar-text">
                              {getRoomAcronym(roomName || room.name)}
                            </span>
                          )}
                        </div>

                        <div className="server-preview-info">
                          <h3 className="server-preview-title" title={roomName || room.name}>
                            {roomName.trim() || room.name}
                          </h3>

                          {roomDesc.trim() && (
                            <p className="server-preview-desc">
                              {roomDesc.trim()}
                            </p>
                          )}

                          <div className="server-preview-stats">
                            <span className="stat-online-dot" />
                            <span>{onlineMembersCount} Trực tuyến</span>
                            <span className="stat-sep">•</span>
                            <span>{members.length} Thành viên</span>
                          </div>

                          <div className="server-preview-established">
                            Thành lập từ thg 10 2026
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Thanh thông báo nổi lưu thay đổi */}
                {hasChanges && (
                  <div className="settings-floating-save-bar">
                    <span className="floating-save-text">Cẩn thận — bạn có thay đổi chưa lưu!</span>
                    <div className="floating-save-actions">
                      <button type="button" className="btn-reset" onClick={handleResetChanges}>
                        Đặt lại
                      </button>
                      <button type="button" className="btn-save" onClick={handleSaveChanges}>
                        Lưu Thay Đổi
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ----------------- TAB 2: THÀNH VIÊN (MEMBERS) ----------------- */}
            {activeTab === 'members' && (
              <div className="room-members-tab-wrapper">
                <div className="room-profile-header-text">
                  <h2 className="settings-section-title">Thành Viên Trong Máy Chủ</h2>
                  <p className="settings-section-desc">
                    Quản lý danh sách thành viên, phân quyền vai trò và quyền truy cập vào máy chủ.
                  </p>
                </div>

                <div className="members-tab-search-bar">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm thành viên..."
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                  />
                </div>

                <div className="members-management-list">
                  {filteredMembers.map(member => {
                    const isTargetOwner = member.role === 'OWNER' || (room.role === 'OWNER' && member.id === currentUser?.id);
                    const isTargetAdmin = member.role === 'ADMIN';
                    const isSelf = currentUser && member.id === currentUser.id;

                    return (
                      <div key={member.id} className="member-management-item">
                        <div className="member-info-col">
                          <div className="user-avatar-wrap">
                            <div className="user-avatar-circle" style={{ width: 36, height: 36, fontSize: 14 }}>
                              {member.displayName ? member.displayName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <span className={`status-indicator-dot ${member.online !== false ? 'status-online' : 'status-offline'}`} />
                          </div>
                          <div className="member-name-group">
                            <div className="member-display-name">
                              {member.displayName || member.username}
                              {isSelf && <span className="member-you-tag">(Bạn)</span>}
                            </div>
                            <div className="member-username">@{member.username}</div>
                          </div>
                        </div>

                        {/* Badge vai trò */}
                        <div className="member-role-col">
                          {isTargetOwner ? (
                            <span className="role-badge owner">
                              <Crown size={12} /> Chủ phòng
                            </span>
                          ) : isTargetAdmin ? (
                            <span className="role-badge admin">
                              <Shield size={12} /> Phó phòng
                            </span>
                          ) : (
                            <span className="role-badge member">
                              <UserIcon size={12} /> Thành viên
                            </span>
                          )}
                        </div>

                        {/* Nút hành động theo quyền hạn */}
                        <div className="member-actions-col">
                          {isOwner && !isSelf && (
                            <>
                              {isTargetAdmin ? (
                                <button
                                  type="button"
                                  className="member-action-btn secondary"
                                  title="Giáng cấp xuống Thành viên"
                                  onClick={() => onSetMemberRole && onSetMemberRole(room.id, member.id, 'MEMBER')}
                                >
                                  Hạ xuống Member
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="member-action-btn primary"
                                  title="Thăng cấp lên Phó phòng"
                                  onClick={() => onSetMemberRole && onSetMemberRole(room.id, member.id, 'ADMIN')}
                                >
                                  Lên Phó phòng
                                </button>
                              )}

                              <button
                                type="button"
                                className="member-action-btn outline"
                                title="Chuyển quyền Chủ phòng"
                                onClick={() => setConfirmAction({ type: 'transfer_owner', targetUser: member })}
                              >
                                <ArrowRightLeft size={13} /> Chuyển chủ phòng
                              </button>

                              <button
                                type="button"
                                className="member-action-btn danger"
                                title="Kick khỏi phòng"
                                onClick={() => setConfirmAction({ type: 'kick', targetUser: member })}
                              >
                                <UserMinus size={13} /> Kick
                              </button>
                            </>
                          )}

                          {isAdmin && !isOwner && !isTargetOwner && !isTargetAdmin && !isSelf && (
                            <button
                              type="button"
                              className="member-action-btn danger"
                              title="Kick khỏi phòng"
                              onClick={() => setConfirmAction({ type: 'kick', targetUser: member })}
                            >
                              <UserMinus size={13} /> Kick
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ----------------- TAB 3: VAI TRÒ & PHÂN QUYỀN (ROLES) ----------------- */}
            {activeTab === 'roles' && (
              <div className="room-roles-tab-wrapper">
                <div className="room-profile-header-text">
                  <h2 className="settings-section-title">Vai Trò & Quyền Hạn Trong Phòng</h2>
                  <p className="settings-section-desc">
                    Hệ thống phân cấp quyền hạn bảo đảm an toàn và trật tự cho máy chủ.
                  </p>
                </div>

                <div className="roles-detail-cards-grid">
                  {/* Card 1: Chủ phòng */}
                  <div className="role-detail-card owner-card">
                    <div className="role-card-header">
                      <div className="role-card-icon-wrap owner">
                        <Crown size={22} />
                      </div>
                      <div>
                        <h4 className="role-card-name">Chủ Phòng (Server Owner)</h4>
                        <span className="role-card-level">Cấp bậc 1 • Toàn quyền quản trị</span>
                      </div>
                    </div>
                    <ul className="role-permission-list">
                      <li><Check size={14} color="#23a55a" /> Quyền chỉnh sửa tên, mô tả, biểu tượng, biểu ngữ máy chủ.</li>
                      <li><Check size={14} color="#23a55a" /> Quản lý danh sách kênh: Tạo kênh mới, đổi tên, xóa kênh.</li>
                      <li><Check size={14} color="#23a55a" /> Bổ nhiệm hoặc bãi nhiệm Phó phòng (Admin).</li>
                      <li><Check size={14} color="#23a55a" /> Kick bất kỳ thành viên nào vi phạm nội quy.</li>
                      <li><Check size={14} color="#23a55a" /> Chuyển quyền chủ phòng hoặc xóa vĩnh viễn máy chủ.</li>
                    </ul>
                  </div>

                  {/* Card 2: Phó phòng */}
                  <div className="role-detail-card admin-card">
                    <div className="role-card-header">
                      <div className="role-card-icon-wrap admin">
                        <Shield size={22} />
                      </div>
                      <div>
                        <h4 className="role-card-name">Phó Phòng (Quản Trị Viên)</h4>
                        <span className="role-card-level">Cấp bậc 2 • Quản trị điều phối</span>
                      </div>
                    </div>
                    <ul className="role-permission-list">
                      <li><Check size={14} color="#23a55a" /> Tùy chỉnh tên, mô tả và biểu ngữ máy chủ.</li>
                      <li><Check size={14} color="#23a55a" /> Quản lý kênh chat: Tạo kênh mới, sửa tên kênh.</li>
                      <li><Check size={14} color="#23a55a" /> Kick các Thành viên thường vi phạm quy định.</li>
                      <li><X size={14} color="#f23f43" /> Không thể kick Chủ phòng hoặc Phó phòng khác.</li>
                      <li><X size={14} color="#f23f43" /> Không có quyền xóa máy chủ hay đổi vai trò Admin.</li>
                    </ul>
                  </div>

                  {/* Card 3: Thành viên */}
                  <div className="role-detail-card member-card">
                    <div className="role-card-header">
                      <div className="role-card-icon-wrap member">
                        <UserIcon size={22} />
                      </div>
                      <div>
                        <h4 className="role-card-name">Thành Viên (Member)</h4>
                        <span className="role-card-level">Cấp bậc 3 • Người tham gia</span>
                      </div>
                    </div>
                    <ul className="role-permission-list">
                      <li><Check size={14} color="#23a55a" /> Nhắn tin, gửi tệp đính kèm và hình ảnh trong các kênh.</li>
                      <li><Check size={14} color="#23a55a" /> Thả biểu cảm emoji reaction vào tin nhắn của mọi người.</li>
                      <li><Check size={14} color="#23a55a" /> Xem thông tin hồ sơ máy chủ và danh sách thành viên.</li>
                      <li><Check size={14} color="#23a55a" /> Tự do rời khỏi máy chủ bất kỳ lúc nào.</li>
                      <li><X size={14} color="#f23f43" /> Không có quyền chỉnh sửa cấu hình hệ thống máy chủ.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

        </main>
      </div>

      {/* ================= MODAL XÁC NHẬN HÀNH ĐỘNG ================= */}
      {confirmAction && (
        <div className="modal-backdrop" onClick={() => setConfirmAction(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            {confirmAction.type === 'delete_room' && (
              <>
                <h3 className="modal-title danger" style={{ color: '#f23f43', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Trash2 size={20} />
                  <span>Xóa máy chủ '{room.name}'?</span>
                </h3>
                <p style={{ fontSize: 14, color: 'var(--text-normal)', lineHeight: 1.5, margin: '14px 0 20px' }}>
                  Hành động này <strong>không thể hoàn tác</strong>. Toàn bộ các kênh trò chuyện và lịch sử tin nhắn trong máy chủ này sẽ bị xóa vĩnh viễn.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className="btn-cancel" onClick={() => setConfirmAction(null)}>
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => {
                      onDeleteRoom(room.id);
                      setConfirmAction(null);
                      onClose();
                    }}
                  >
                    Xóa máy chủ
                  </button>
                </div>
              </>
            )}

            {confirmAction.type === 'leave_room' && (
              <>
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LogOut size={20} />
                  <span>Rời khỏi '{room.name}'?</span>
                </h3>
                <p style={{ fontSize: 14, color: 'var(--text-normal)', lineHeight: 1.5, margin: '14px 0 20px' }}>
                  Bạn có chắc chắn muốn rời khỏi máy chủ này? Bạn sẽ cần một lời mời mới để có thể tham gia lại.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className="btn-cancel" onClick={() => setConfirmAction(null)}>
                    Giữ lại
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => {
                      onLeaveRoom(room.id);
                      setConfirmAction(null);
                      onClose();
                    }}
                  >
                    Rời phòng
                  </button>
                </div>
              </>
            )}

            {confirmAction.type === 'kick' && confirmAction.targetUser && (
              <>
                <h3 className="modal-title danger" style={{ color: '#f23f43', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserMinus size={20} />
                  <span>Kick '{confirmAction.targetUser.displayName || confirmAction.targetUser.username}'?</span>
                </h3>
                <p style={{ fontSize: 14, color: 'var(--text-normal)', lineHeight: 1.5, margin: '14px 0 20px' }}>
                  Bạn có chắc muốn đuổi người này ra khỏi máy chủ? Họ sẽ không thể xem hoặc gửi tin nhắn trong phòng cho tới khi được mời lại.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className="btn-cancel" onClick={() => setConfirmAction(null)}>
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => {
                      if (onKickMember && confirmAction.targetUser) {
                        onKickMember(room.id, confirmAction.targetUser.id);
                      }
                      setConfirmAction(null);
                    }}
                  >
                    Xác nhận Kick
                  </button>
                </div>
              </>
            )}

            {confirmAction.type === 'transfer_owner' && confirmAction.targetUser && (
              <>
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Crown size={20} color="#f59e0b" />
                  <span>Chuyển quyền Chủ phòng?</span>
                </h3>
                <p style={{ fontSize: 14, color: 'var(--text-normal)', lineHeight: 1.5, margin: '14px 0 20px' }}>
                  Bạn có chắc chắn muốn chuyển quyền Chủ sở hữu máy chủ cho <strong>{confirmAction.targetUser.displayName || confirmAction.targetUser.username}</strong>? Bạn sẽ trở thành Phó phòng và không thể tự lấy lại quyền Chủ phòng nếu không được chuyển lại.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className="btn-cancel" onClick={() => setConfirmAction(null)}>
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ background: '#f59e0b', color: '#000', fontWeight: 600 }}
                    onClick={() => {
                      if (onTransferOwner && confirmAction.targetUser) {
                        onTransferOwner(room.id, confirmAction.targetUser.id);
                      }
                      setConfirmAction(null);
                    }}
                  >
                    Chuyển quyền
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomSettingsModal;
