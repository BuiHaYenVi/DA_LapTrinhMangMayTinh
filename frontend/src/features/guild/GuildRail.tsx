import React, { useState } from 'react';
import {
  Home,
  Plus,
  X,
  KeyRound,
  Sparkles,
  Radio,
  Calendar,
  Bookmark,
  Settings,
  Layers,
  Server,
} from 'lucide-react';
import { useAppStore } from '../../shared/state/appStore';
import type { Guild, FriendRequest } from '../../shared/types/api';

export const GuildRail: React.FC = () => {
  const {
    currentUser,
    theme,
    viewMode,
    setViewMode,
    guilds,
    selectGuild,
    createGuild,
    joinGuildByInvite,
    friendRequests,
    setSettingsOpen,
  } = useAppStore();

  const [hoveredId, setHoveredId] = useState<string | number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  const [newGuildName, setNewGuildName] = useState('');
  const [newGuildIcon, setNewGuildIcon] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const isDark = theme === 'dark';

  // Calculate pending incoming friend requests count
  const pendingIncomingCount = Array.isArray(friendRequests)
    ? friendRequests.filter(
        (req: FriendRequest) => req.direction === 'INCOMING'
      ).length
    : 0;

  const isHomeActive = viewMode === 'friends' || viewMode === 'dm';

  const handleOpenCreateModal = () => {
    setNewGuildName('');
    setNewGuildIcon('');
    setModalError(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenJoinModal = () => {
    setInviteCode('');
    setModalError(null);
    setIsJoinModalOpen(true);
  };

  const handleCreateGuildSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newGuildName.trim();
    if (!trimmedName) {
      setModalError('Vui lòng nhập tên máy chủ (Guild).');
      return;
    }
    const initials =
      newGuildIcon.trim().toUpperCase().slice(0, 3) ||
      trimmedName
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) ||
      'SV';

    setIsSubmitting(true);
    setModalError(null);
    try {
      await createGuild(trimmedName, initials);
      setIsCreateModalOpen(false);
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : 'Không thể tạo máy chủ.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinGuildSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = inviteCode.trim();
    if (!trimmedCode) {
      setModalError('Vui lòng nhập mã mời (Invite Code).');
      return;
    }
    setIsSubmitting(true);
    setModalError(null);
    try {
      await joinGuildByInvite(trimmedCode);
      setIsJoinModalOpen(false);
    } catch (err) {
      setModalError(
        err instanceof Error
          ? err.message
          : 'Mã mời không hợp lệ hoặc đã hết hạn.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getGuildUnread = (g: Guild): number => {
    if (Array.isArray(g.channels)) {
      return g.channels.reduce((acc, ch) => acc + (ch.unreadCount ?? 0), 0);
    }
    return 0;
  };

  return (
    <>
      <aside
        aria-label="Thanh máy chủ và điều hướng chính"
        className="dock-rail-shell select-none"
      >
        {/* Top: Cloverleaf Brand Logo + Nav items */}
        <div className="flex w-full flex-col items-center gap-4 overflow-y-auto no-scrollbar">
          {/* Cloverleaf Abstract 4-Petal Floral Logo from Mockup */}
          <div
            className="flex h-11 w-11 items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
            title="Messages Home"
            onClick={() => setViewMode('friends')}
          >
            <svg
              className="w-8 h-8 text-[#111111] dark:text-[#F8FAFC]"
              viewBox="0 0 32 32"
              fill="currentColor"
            >
              <circle cx="16" cy="8" r="4.2" />
              <circle cx="16" cy="24" r="4.2" />
              <circle cx="8" cy="16" r="4.2" />
              <circle cx="24" cy="16" r="4.2" />
            </svg>
          </div>

          <div className="flex w-full flex-col items-center gap-3 pt-1">
            {/* 1. Home Button */}
            <div
              className="relative flex w-full items-center justify-center"
              onMouseEnter={() => setHoveredId('home')}
              onMouseLeave={() => setHoveredId(null)}
            >
              <button
                type="button"
                onClick={() => setViewMode('friends')}
                aria-label="Trang chủ / Bạn bè"
                className={`relative flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-150 active:scale-95 ${
                  viewMode === 'friends'
                    ? 'text-[#111111] dark:text-emerald-400'
                    : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Home className="h-5 w-5" strokeWidth={1.8} />
                {pendingIncomingCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-[#F43F5E] px-1 text-[9px] font-bold text-white">
                    {pendingIncomingCount}
                  </span>
                )}
              </button>
              {hoveredId === 'home' && (
                <div className="pointer-events-none fixed left-[78px] z-50 rounded-xl bg-[#111111] px-2.5 py-1 text-xs font-semibold text-white shadow-lg">
                  Trang chủ
                </div>
              )}
            </div>

            {/* 2. Plus Button (Add / Create Guild) */}
            <div
              className="relative flex w-full items-center justify-center"
              onMouseEnter={() => setHoveredId('add-server')}
              onMouseLeave={() => setHoveredId(null)}
            >
              <button
                type="button"
                onClick={handleOpenCreateModal}
                aria-label="Tạo máy chủ mới"
                className="flex h-10 w-10 items-center justify-center rounded-2xl text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-150 active:scale-95"
              >
                <Plus className="h-5 w-5" strokeWidth={2.2} />
              </button>
              {hoveredId === 'add-server' && (
                <div className="pointer-events-none fixed left-[78px] z-50 rounded-xl bg-[#111111] px-2.5 py-1 text-xs font-semibold text-white shadow-lg">
                  Tạo máy chủ mới
                </div>
              )}
            </div>

            {/* 3. Calendar / Schedule Button */}
            <div
              className="relative flex w-full items-center justify-center"
              onMouseEnter={() => setHoveredId('calendar')}
              onMouseLeave={() => setHoveredId(null)}
            >
              <button
                type="button"
                onClick={() => setHoveredId(null)}
                aria-label="Lịch & Sự kiện"
                className="relative flex h-10 w-10 items-center justify-center rounded-2xl text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-150 active:scale-95"
              >
                <Calendar className="h-5 w-5" strokeWidth={1.8} />
              </button>
              {hoveredId === 'calendar' && (
                <div className="pointer-events-none fixed left-[78px] z-50 rounded-xl bg-[#111111] px-2.5 py-1 text-xs font-semibold text-white shadow-lg">
                  Lịch & Sự kiện
                </div>
              )}
            </div>

            {/* 4. Active Messages Pill (Rounded Black Capsule from Mockup!) */}
            <div
              className="relative flex w-full items-center justify-center my-0.5"
              onMouseEnter={() => setHoveredId('messages')}
              onMouseLeave={() => setHoveredId(null)}
            >
              <button
                type="button"
                onClick={() => setViewMode('dm')}
                aria-label="Hộp thư & Tin nhắn"
                className={`relative flex h-11 w-11 items-center justify-center rounded-[18px] transition-all duration-200 active:scale-95 ${
                  viewMode === 'dm' || isHomeActive
                    ? 'bg-[#111111] text-white shadow-md dark:bg-emerald-500 dark:text-[#090E0C]'
                    : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Layers className="h-5 w-5" strokeWidth={2} />
              </button>
              {hoveredId === 'messages' && (
                <div className="pointer-events-none fixed left-[78px] z-50 rounded-xl bg-[#111111] px-2.5 py-1 text-xs font-semibold text-white shadow-lg">
                  Tin nhắn (Messages)
                </div>
              )}
            </div>

            {/* Guilds / Servers Switcher icon if guilds exist */}
            {guilds.length > 0 && (() => {
              const totalGuildUnread = guilds.reduce((acc, g) => acc + getGuildUnread(g), 0);
              return (
                <div
                  className="relative flex w-full items-center justify-center"
                  onMouseEnter={() => setHoveredId('guilds-list')}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('guild');
                      if (guilds[0]) selectGuild(guilds[0].id);
                    }}
                    aria-label="Danh sách máy chủ Discord"
                    className={`relative flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-150 active:scale-95 ${
                      viewMode === 'guild'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                        : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Server className="h-5 w-5" strokeWidth={1.8} />
                    {totalGuildUnread > 0 && (
                      <span className="absolute -right-1 -top-1 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-[#F43F5E] px-1 text-[9px] font-bold text-white">
                        {totalGuildUnread}
                      </span>
                    )}
                  </button>
                  {hoveredId === 'guilds-list' && (
                    <div className="pointer-events-none fixed left-[78px] z-50 rounded-xl bg-[#111111] px-2.5 py-1 text-xs font-semibold text-white shadow-lg">
                      Máy chủ Discord ({guilds.length})
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Bottom Stack: Bookmark + Settings + User Profile Avatar ("N") */}
        <div className="flex w-full flex-col items-center gap-3 pt-2">
          {/* Bookmark / Saved Messages */}
          <div
            className="relative flex w-full items-center justify-center"
            onMouseEnter={() => setHoveredId('bookmark')}
            onMouseLeave={() => setHoveredId(null)}
          >
            <button
              type="button"
              onClick={() => setHoveredId(null)}
              aria-label="Tin nhắn đã lưu"
              className="flex h-9 w-9 items-center justify-center rounded-2xl text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all active:scale-95"
            >
              <Bookmark className="h-5 w-5" strokeWidth={1.8} />
            </button>
            {hoveredId === 'bookmark' && (
              <div className="pointer-events-none fixed left-[78px] z-50 rounded-xl bg-[#111111] px-2.5 py-1 text-xs font-semibold text-white shadow-lg">
                Đã lưu
              </div>
            )}
          </div>

          {/* Settings / Gear */}
          <div
            className="relative flex w-full items-center justify-center"
            onMouseEnter={() => setHoveredId('settings')}
            onMouseLeave={() => setHoveredId(null)}
          >
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Cài đặt hệ thống"
              className="flex h-9 w-9 items-center justify-center rounded-2xl text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all active:scale-95"
            >
              <Settings className="h-5 w-5" strokeWidth={1.8} />
            </button>
            {hoveredId === 'settings' && (
              <div className="pointer-events-none fixed left-[78px] z-50 rounded-xl bg-[#111111] px-2.5 py-1 text-xs font-semibold text-white shadow-lg">
                Cài đặt & Giao diện
              </div>
            )}
          </div>

          {/* Monogram "N" / Current User Avatar Circle (from reference mockup) */}
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#111111] dark:bg-emerald-500 text-white dark:text-[#090E0C] font-extrabold text-sm shadow-xs cursor-pointer transition-transform hover:scale-105 active:scale-95 mt-1"
            title={currentUser?.displayName || 'Tài khoản'}
            onClick={() => setSettingsOpen(true)}
          >
            {currentUser?.displayName?.[0]?.toUpperCase() || 'N'}
          </div>
        </div>
      </aside>

      {/* Create Guild Modal */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl transition-all ${
              isDark
                ? 'border-[#334155] bg-[#1E293B] text-[#F8FAFC]'
                : 'border-[#E2E8F0] bg-white text-[#0F172A]'
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Tạo Máy Chủ Mới (Guild)</h2>
                  <p
                    className={`text-xs ${
                      isDark ? 'text-[#94A3B8]' : 'text-[#64748B]'
                    }`}
                  >
                    Tự động khởi tạo kênh #general (TCP/WS) & General Voice (WebRTC)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#E2E8F0]/50"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGuildSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#CBD5E1]">
                  Tên Máy Chủ *
                </label>
                <input
                  type="text"
                  value={newGuildName}
                  onChange={(e) => setNewGuildName(e.target.value)}
                  placeholder="VD: Nhóm Đồ Án Lập Trình Mạng"
                  autoFocus
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 ${
                    isDark
                      ? 'border-[#334155] bg-[#0F172A] text-white placeholder-[#64748B]'
                      : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8]'
                  }`}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#CBD5E1]">
                  Ký tự biểu tượng (Tối đa 3 ký tự)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    maxLength={3}
                    value={newGuildIcon}
                    onChange={(e) =>
                      setNewGuildIcon(e.target.value.toUpperCase())
                    }
                    placeholder="VD: LTM"
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-bold uppercase outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 ${
                      isDark
                        ? 'border-[#334155] bg-[#0F172A] text-white placeholder-[#64748B]'
                        : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8]'
                    }`}
                  />
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2563EB] text-sm font-bold text-white shadow-sm">
                    {newGuildIcon.trim() ||
                      newGuildName
                        .trim()
                        .split(/\s+/)
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2) ||
                      'SV'}
                  </div>
                </div>
              </div>

              {modalError && (
                <div className="rounded-xl bg-[#FFE4E6] px-3 py-2 text-xs font-semibold text-[#F43F5E]">
                  {modalError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    handleOpenJoinModal();
                  }}
                  className="mr-auto text-xs font-semibold text-[#2563EB] hover:underline"
                >
                  Tham gia bằng mã mời
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    isDark
                      ? 'bg-[#334155] text-[#CBD5E1] hover:bg-[#475569]'
                      : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                  }`}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-[#2563EB] px-5 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-[#1D4ED8] disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang tạo...' : 'Tạo Máy Chủ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Guild by Invite Code Modal */}
      {isJoinModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={() => setIsJoinModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl transition-all ${
              isDark
                ? 'border-[#334155] bg-[#1E293B] text-[#F8FAFC]'
                : 'border-[#E2E8F0] bg-white text-[#0F172A]'
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E0F2FE] text-[#0284C7]">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Tham Gia Bằng Mã Mời</h2>
                  <p
                    className={`text-xs ${
                      isDark ? 'text-[#94A3B8]' : 'text-[#64748B]'
                    }`}
                  >
                    Nhập mã mời 6–8 ký tự để kết nối vào máy chủ của nhóm
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsJoinModalOpen(false)}
                className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#E2E8F0]/50"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleJoinGuildSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#CBD5E1]">
                  Mã mời máy chủ (Invite Code) *
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="VD: LTM2026"
                  autoFocus
                  className={`w-full rounded-xl border px-3.5 py-2.5 font-mono text-sm font-bold tracking-wider uppercase outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 ${
                    isDark
                      ? 'border-[#334155] bg-[#0F172A] text-white placeholder-[#64748B]'
                      : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8]'
                  }`}
                />
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#64748B]">
                  <Radio className="h-3.5 w-3.5 text-[#10B981]" />
                  <span>
                    Đồng bộ tự động tất cả kênh chat (`room_id == channel_id`) qua TCP & WS
                  </span>
                </div>
              </div>

              {modalError && (
                <div className="rounded-xl bg-[#FFE4E6] px-3 py-2 text-xs font-semibold text-[#F43F5E]">
                  {modalError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    isDark
                      ? 'bg-[#334155] text-[#CBD5E1] hover:bg-[#475569]'
                      : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                  }`}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-[#2563EB] px-5 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-[#1D4ED8] disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang tham gia...' : 'Tham Gia Ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default GuildRail;
