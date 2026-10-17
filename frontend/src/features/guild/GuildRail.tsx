import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Compass,
  Sun,
  Moon,
  Activity,
  X,
  KeyRound,
  Sparkles,
  Radio,
} from 'lucide-react';
import { useAppStore } from '../../shared/state/appStore';
import type { Guild, FriendRequest } from '../../shared/types/api';

export const GuildRail: React.FC = () => {
  const {
    theme,
    toggleTheme,
    viewMode,
    setViewMode,
    guilds,
    activeGuildId,
    selectGuild,
    createGuild,
    joinGuildByInvite,
    friendRequests,
    isMonitorOpen,
    setMonitorOpen,
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
        className={`relative z-20 flex h-full w-[72px] shrink-0 flex-col items-center justify-between border-r py-3 select-none transition-colors duration-200 ${
          isDark
            ? 'border-[#334155] bg-[#0B1120] text-[#F8FAFC]'
            : 'border-[#E2E8F0] bg-[#F1F5F9] text-[#0F172A]'
        }`}
      >
        {/* Top Section: Home/Friends + Guilds + Add/Join */}
        <div className="flex w-full flex-col items-center gap-2 overflow-y-auto no-scrollbar">
          {/* Direct Messages & Friends Crest Button */}
          <div
            className="relative flex w-full items-center justify-center"
            onMouseEnter={() => setHoveredId('home-dm')}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Left Pill Indicator */}
            <span
              className={`absolute left-0 w-1 rounded-r-full bg-[#2563EB] transition-all duration-200 ${
                isHomeActive
                  ? 'h-9 opacity-100'
                  : hoveredId === 'home-dm'
                  ? 'h-5 opacity-100'
                  : pendingIncomingCount > 0
                  ? 'h-2.5 opacity-90'
                  : 'h-0 opacity-0'
              }`}
            />

            <button
              type="button"
              onClick={() => setViewMode('friends')}
              aria-label="Tin nhắn trực tiếp & Bạn bè"
              className={`relative flex h-12 w-12 items-center justify-center font-bold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] active:translate-y-[1px] ${
                isHomeActive || hoveredId === 'home-dm'
                  ? 'rounded-[16px] bg-[#2563EB] text-white shadow-sm'
                  : isDark
                  ? 'rounded-[24px] bg-[#1E293B] text-[#CBD5E1] hover:bg-[#2563EB] hover:text-white'
                  : 'rounded-[24px] bg-white text-[#0F172A] shadow-xs hover:bg-[#2563EB] hover:text-white'
              }`}
            >
              <MessageSquare className="h-5 w-5" strokeWidth={2.2} />

              {/* Pending Friend Requests Badge */}
              {pendingIncomingCount > 0 && (
                <span
                  title={`${pendingIncomingCount} lời mời kết bạn đang chờ`}
                  className={`absolute -right-1 -bottom-1 flex min-w-[20px] items-center justify-center rounded-full bg-[#F43F5E] px-1.5 py-0.5 text-[11px] font-bold leading-none text-white ring-[3px] ${
                    isDark ? 'ring-[#0B1120]' : 'ring-[#F1F5F9]'
                  }`}
                >
                  {pendingIncomingCount > 9 ? '9+' : pendingIncomingCount}
                </span>
              )}
            </button>

            {/* Hover Tooltip */}
            {hoveredId === 'home-dm' && (
              <div
                role="tooltip"
                className={`pointer-events-none fixed left-[78px] z-50 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold whitespace-nowrap shadow-lg ${
                  isDark
                    ? 'border-[#334155] bg-[#0F172A] text-[#F8FAFC]'
                    : 'border-[#E2E8F0] bg-[#0F172A] text-white'
                }`}
              >
                <span>Tin nhắn riêng & Bạn bè</span>
                {pendingIncomingCount > 0 && (
                  <span className="rounded-full bg-[#F43F5E] px-1.5 py-0.5 text-[10px] text-white">
                    {pendingIncomingCount}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Horizontal Divider */}
          <div
            className={`my-1 h-[2px] w-8 rounded-full ${
              isDark ? 'bg-[#334155]' : 'bg-[#CBD5E1]'
            }`}
          />

          {/* Guild List */}
          <div className="flex w-full flex-col items-center gap-2">
            {guilds.map((guild) => {
              const isActive =
                viewMode === 'guild' && activeGuildId === guild.id;
              const isHovered = hoveredId === `guild-${guild.id}`;
              const unread = getGuildUnread(guild);

              return (
                <div
                  key={guild.id}
                  className="relative flex w-full items-center justify-center"
                  onMouseEnter={() => setHoveredId(`guild-${guild.id}`)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Animated Left Pill Indicator */}
                  <span
                    className={`absolute left-0 w-1 rounded-r-full bg-[#2563EB] transition-all duration-200 ${
                      isActive
                        ? 'h-9 opacity-100'
                        : isHovered
                        ? 'h-5 opacity-100'
                        : unread > 0
                        ? 'h-2.5 opacity-100'
                        : 'h-0 opacity-0'
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('guild');
                      selectGuild(guild.id);
                    }}
                    aria-label={`Máy chủ ${guild.name}`}
                    className={`relative flex h-12 w-12 items-center justify-center text-sm font-bold tracking-tight transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] active:translate-y-[1px] ${
                      isActive || isHovered
                        ? 'rounded-[16px] bg-[#2563EB] text-white shadow-sm'
                        : isDark
                        ? 'rounded-[24px] bg-[#1E293B] text-[#F8FAFC] hover:bg-[#2563EB] hover:text-white'
                        : 'rounded-[24px] bg-white text-[#0F172A] shadow-xs hover:bg-[#2563EB] hover:text-white'
                    }`}
                  >
                    <span>
                      {(guild.iconText || guild.name.slice(0, 2)).toUpperCase()}
                    </span>

                    {/* Unread Count Badge */}
                    {unread > 0 && (
                      <span
                        className={`absolute -top-1 -right-1 flex min-w-[20px] items-center justify-center rounded-full bg-[#F43F5E] px-1.5 py-0.5 text-[11px] font-bold leading-none text-white ring-[3px] ${
                          isDark ? 'ring-[#0B1120]' : 'ring-[#F1F5F9]'
                        }`}
                      >
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </button>

                  {/* Tooltip */}
                  {isHovered && (
                    <div
                      role="tooltip"
                      className={`pointer-events-none fixed left-[78px] z-50 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold whitespace-nowrap shadow-lg ${
                        isDark
                          ? 'border-[#334155] bg-[#0F172A] text-[#F8FAFC]'
                          : 'border-[#E2E8F0] bg-[#0F172A] text-white'
                      }`}
                    >
                      <span>{guild.name}</span>
                      {unread > 0 && (
                        <span className="rounded-full bg-[#F43F5E] px-1.5 py-0.5 text-[10px] text-white">
                          {unread} mới
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Button: Create Guild (+) */}
          <div
            className="relative mt-1 flex w-full items-center justify-center"
            onMouseEnter={() => setHoveredId('create-guild')}
            onMouseLeave={() => setHoveredId(null)}
          >
            <button
              type="button"
              onClick={handleOpenCreateModal}
              aria-label="Tạo máy chủ mới"
              className={`flex h-12 w-12 items-center justify-center transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] active:scale-95 ${
                hoveredId === 'create-guild'
                  ? 'rounded-[16px] bg-[#10B981] text-white shadow-sm'
                  : isDark
                  ? 'rounded-[24px] bg-[#1E293B] text-[#10B981]'
                  : 'rounded-[24px] bg-white text-[#10B981] shadow-xs'
              }`}
            >
              <Plus className="h-5 w-5" strokeWidth={2.4} />
            </button>

            {hoveredId === 'create-guild' && (
              <div
                role="tooltip"
                className="pointer-events-none fixed left-[78px] z-50 rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-1.5 text-xs font-bold whitespace-nowrap text-white shadow-lg"
              >
                Tạo máy chủ mới (Guild)
              </div>
            )}
          </div>

          {/* Action Button: Join Guild by Invite Code */}
          <div
            className="relative flex w-full items-center justify-center"
            onMouseEnter={() => setHoveredId('join-guild')}
            onMouseLeave={() => setHoveredId(null)}
          >
            <button
              type="button"
              onClick={handleOpenJoinModal}
              aria-label="Tham gia máy chủ bằng mã mời"
              className={`flex h-12 w-12 items-center justify-center transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] active:scale-95 ${
                hoveredId === 'join-guild'
                  ? 'rounded-[16px] bg-[#0284C7] text-white shadow-sm'
                  : isDark
                  ? 'rounded-[24px] bg-[#1E293B] text-[#0EA5E9]'
                  : 'rounded-[24px] bg-white text-[#0284C7] shadow-xs'
              }`}
            >
              <Compass className="h-5 w-5" strokeWidth={2.2} />
            </button>

            {hoveredId === 'join-guild' && (
              <div
                role="tooltip"
                className="pointer-events-none fixed left-[78px] z-50 rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-1.5 text-xs font-bold whitespace-nowrap text-white shadow-lg"
              >
                Tham gia bằng Mã Mời (Invite Code)
              </div>
            )}
          </div>
        </div>

        {/* Bottom Utility Actions: Network Monitor + Theme Toggle */}
        <div className="flex w-full flex-col items-center gap-2 pt-2">
          <div
            className={`h-[1px] w-8 ${
              isDark ? 'bg-[#334155]' : 'bg-[#CBD5E1]'
            }`}
          />

          {/* Network Monitor Shortcut */}
          <div
            className="relative flex w-full items-center justify-center"
            onMouseEnter={() => setHoveredId('rail-monitor')}
            onMouseLeave={() => setHoveredId(null)}
          >
            <button
              type="button"
              onClick={() => setMonitorOpen(!isMonitorOpen)}
              aria-label="Bật/Tắt bảng giám sát giao thức mạng TCP/UDP"
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 focus-visible:outline-2 focus-visible:outline-[#2563EB] active:scale-95 ${
                isMonitorOpen
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : isDark
                  ? 'bg-[#1E293B] text-[#94A3B8] hover:bg-[#334155] hover:text-white'
                  : 'bg-white text-[#475569] shadow-2xs hover:bg-[#E2E8F0] hover:text-[#0F172A]'
              }`}
            >
              <Activity className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#10B981]" />
            </button>

            {hoveredId === 'rail-monitor' && (
              <div
                role="tooltip"
                className="pointer-events-none fixed left-[78px] z-50 rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-1.5 text-xs font-bold whitespace-nowrap text-white shadow-lg"
              >
                Network Monitor (TCP :5000 / UDP :5001)
              </div>
            )}
          </div>

          {/* Quick Theme Switcher */}
          <div
            className="relative flex w-full items-center justify-center"
            onMouseEnter={() => setHoveredId('rail-theme')}
            onMouseLeave={() => setHoveredId(null)}
          >
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                isDark
                  ? 'Chuyển sang giao diện Sáng'
                  : 'Chuyển sang giao diện Tối'
              }
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 focus-visible:outline-2 focus-visible:outline-[#2563EB] active:scale-95 ${
                isDark
                  ? 'bg-[#1E293B] text-[#F59E0B] hover:bg-[#334155]'
                  : 'bg-white text-[#2563EB] shadow-2xs hover:bg-[#DBEAFE]'
              }`}
            >
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            {hoveredId === 'rail-theme' && (
              <div
                role="tooltip"
                className="pointer-events-none fixed left-[78px] z-50 rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-1.5 text-xs font-bold whitespace-nowrap text-white shadow-lg"
              >
                {isDark
                  ? 'Chế độ Sáng (Oceanic Light)'
                  : 'Chế độ Tối (Dark Navy)'}
              </div>
            )}
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
