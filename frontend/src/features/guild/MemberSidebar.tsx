import React, { useState } from 'react';
import {
  Crown,
  Shield,
  MessageSquare,
  UserPlus,
  Check,
  X,
  Radio,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '../../shared/state/appStore';
import type { MemberRole, PresenceStatus } from '../../shared/types/api';

interface NormalizedMember {
  userId: number;
  username: string;
  displayName: string;
  role: MemberRole;
  status: PresenceStatus;
  customStatus?: string | null;
  avatarColor?: string;
  transport?: string;
}

export const MemberSidebar: React.FC = () => {
  const {
    currentUser,
    theme,
    activeGuild,
    members,
    friends,
    isMemberSidebarOpen,
    openDmWithUser,
    sendFriendRequest,
    updateMemberRole,
    setViewMode,
  } = useAppStore();

  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [sentRequestIds, setSentRequestIds] = useState<number[]>([]);

  if (!isMemberSidebarOpen) {
    return null;
  }

  const isDark = theme === 'dark';

  // Normalize member objects so whether store passes ChannelMember or User-like objects, it works seamlessly
  const normalizedMembers: NormalizedMember[] = (Array.isArray(members)
    ? members
    : []
  ).map((raw) => {
    const r = raw as unknown as Record<string, unknown>;
    const uid =
      typeof r.userId === 'number'
        ? r.userId
        : typeof r.id === 'number'
        ? r.id
        : 0;
    const roleVal = (r.role as MemberRole) ||
      (activeGuild && activeGuild.ownerId === uid ? 'OWNER' : 'MEMBER');
    const statusVal = (r.status as PresenceStatus) || 'ONLINE';
    return {
      userId: uid,
      username: String(r.username || 'user'),
      displayName: String(r.displayName || r.username || 'Thành viên'),
      role: roleVal,
      status: statusVal,
      customStatus: (r.customStatus as string | null | undefined) ?? null,
      avatarColor: (r.avatarColor as string | undefined) || undefined,
      transport: (r.transport as string | undefined) || 'WS',
    };
  });

  // Check if currentUser is OWNER or ADMIN
  const myMember = normalizedMembers.find((m) => m.userId === currentUser?.id);
  const isCurrentUserOwner =
    myMember?.role === 'OWNER' ||
    Boolean(activeGuild && currentUser && activeGuild.ownerId === currentUser.id);

  // Group online members by role, and offline members separately
  const onlineOwners = normalizedMembers.filter(
    (m) => m.status !== 'OFFLINE' && m.role === 'OWNER'
  );
  const onlineAdmins = normalizedMembers.filter(
    (m) => m.status !== 'OFFLINE' && m.role === 'ADMIN'
  );
  const onlineRegulars = normalizedMembers.filter(
    (m) => m.status !== 'OFFLINE' && m.role === 'MEMBER'
  );
  const offlineMembers = normalizedMembers.filter(
    (m) => m.status === 'OFFLINE'
  );

  const selectedMember =
    normalizedMembers.find((m) => m.userId === selectedMemberId) || null;

  const getPresenceDot = (status: PresenceStatus) => {
    switch (status) {
      case 'ONLINE':
        return { color: 'bg-[#10B981]', label: 'Trực tuyến' };
      case 'IDLE':
        return { color: 'bg-[#F59E0B]', label: 'Đang chờ (Idle)' };
      case 'DND':
        return { color: 'bg-[#F43F5E]', label: 'Không làm phiền' };
      default:
        return { color: 'bg-[#94A3B8]', label: 'Ngoại tuyến' };
    }
  };

  const isAlreadyFriend = (uid: number, uname: string) => {
    if (!Array.isArray(friends)) return false;
    return friends.some((f) => f.id === uid || f.username === uname);
  };

  const handleOpenDm = async (member: NormalizedMember) => {
    await Promise.resolve(openDmWithUser(member.userId));
    setViewMode('dm');
    setSelectedMemberId(null);
  };

  const handleAddFriend = async (member: NormalizedMember) => {
    await Promise.resolve(sendFriendRequest(member.username));
    setSentRequestIds((prev) => [...prev, member.userId]);
  };

  const handleRoleChange = async (member: NormalizedMember, role: MemberRole) => {
    await Promise.resolve(updateMemberRole(member.userId, role));
  };

  const renderMemberRow = (member: NormalizedMember) => {
    const dot = getPresenceDot(member.status);
    const isSelected = selectedMemberId === member.userId;
    const isOffline = member.status === 'OFFLINE';

    return (
      <button
        key={member.userId}
        type="button"
        onClick={() =>
          setSelectedMemberId(
            selectedMemberId === member.userId ? null : member.userId
          )
        }
        className={`group flex h-[46px] w-full items-center justify-between rounded-2xl px-2.5 text-left transition ${
          isSelected
            ? 'bg-[#111820] text-white shadow-2xs dark:bg-[#1E2B25] dark:text-[#10B981]'
            : isDark
            ? 'hover:bg-[#16221C]'
            : 'hover:bg-[#F2F7F4]'
        } ${isOffline ? 'opacity-65 hover:opacity-100' : ''}`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {/* Avatar + 10px presence dot */}
          <div className="relative shrink-0">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#111820] text-xs font-bold text-white dark:bg-emerald-600"
              style={
                member.avatarColor
                  ? { backgroundColor: member.avatarColor }
                  : undefined
              }
            >
              {member.displayName.slice(0, 2).toUpperCase()}
            </div>
            <span
              title={dot.label}
              className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full ring-2 ${
                isDark ? 'ring-[#111815]' : 'ring-white'
              } ${dot.color}`}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span
                className={`truncate text-[13px] font-bold ${
                  isSelected
                    ? 'text-white dark:text-[#10B981]'
                    : isDark
                    ? 'text-[#F8FAFC]'
                    : 'text-[#0F172A]'
                }`}
              >
                {member.displayName}
              </span>
              {member.role === 'OWNER' && (
                <Crown
                  className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]"
                  aria-label="Trưởng nhóm (Owner)"
                />
              )}
              {member.role === 'ADMIN' && (
                <Shield
                  className="h-3.5 w-3.5 shrink-0 text-[#10B981]"
                  aria-label="Quản trị viên (Admin)"
                />
              )}
            </div>

            <div
              className={`truncate text-[11px] ${
                isSelected
                  ? 'text-slate-300 dark:text-emerald-200'
                  : isDark
                  ? 'text-[#94A3B8]'
                  : 'text-[#64748B]'
              }`}
            >
              {member.customStatus || `@${member.username}`}
            </div>
          </div>
        </div>

        {/* Transport Badge (WS / TCP) */}
        {member.status !== 'OFFLINE' && member.transport && (
          <span
            className={`ml-1 shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold ${
              member.transport === 'TCP'
                ? 'bg-[#FEF3C7] text-[#D97706]'
                : isDark
                ? 'bg-[#18241F] text-[#10B981]'
                : 'bg-[#E8F5EE] text-[#059669]'
            }`}
            title={
              member.transport === 'TCP'
                ? 'Kết nối từ Java Swing TCP :5000'
                : 'Kết nối từ Web Client WS :8081'
            }
          >
            {member.transport}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      aria-label="Danh sách thành viên kênh"
      className={`relative flex h-full w-[260px] shrink-0 flex-col border-l select-none transition-colors duration-200 ${
        isDark
          ? 'border-[#1E2B25] bg-[#111815] text-[#F8FAFC]'
          : 'border-[#E8EFEA] bg-white text-[#0F172A]'
      }`}
    >
      {/* Top Summary Header (64px) */}
      <div
        className={`flex h-[64px] shrink-0 items-center justify-between border-b px-4 ${
          isDark ? 'border-[#1E2B25]' : 'border-[#E8EFEA]'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-wider uppercase text-[#64748B]">
            Thành viên ({normalizedMembers.length})
          </span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F5EE] px-2 py-0.5 font-mono text-[10px] font-bold text-[#059669]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
          {normalizedMembers.length - offlineMembers.length} Online
        </span>
      </div>

      {/* Scrollable Role Groups */}
      <div className="flex-1 space-y-5 overflow-y-auto px-2.5 py-3">
        {/* OWNER GROUP */}
        {onlineOwners.length > 0 && (
          <div>
            <div className="mb-1.5 px-2 text-[11px] font-bold tracking-[0.06em] uppercase text-[#F59E0B]">
              OWNER — Trưởng nhóm ({onlineOwners.length})
            </div>
            <div className="space-y-0.5">
              {onlineOwners.map(renderMemberRow)}
            </div>
          </div>
        )}

        {/* ADMIN GROUP */}
        {onlineAdmins.length > 0 && (
          <div>
            <div className="mb-1.5 px-2 text-[11px] font-bold tracking-[0.06em] uppercase text-[#2563EB] dark:text-[#3B82F6]">
              ADMIN — Quản trị ({onlineAdmins.length})
            </div>
            <div className="space-y-0.5">
              {onlineAdmins.map(renderMemberRow)}
            </div>
          </div>
        )}

        {/* MEMBER GROUP */}
        {onlineRegulars.length > 0 && (
          <div>
            <div
              className={`mb-1.5 px-2 text-[11px] font-bold tracking-[0.06em] uppercase ${
                isDark ? 'text-[#94A3B8]' : 'text-[#475569]'
              }`}
            >
              MEMBER — Thành viên ({onlineRegulars.length})
            </div>
            <div className="space-y-0.5">
              {onlineRegulars.map(renderMemberRow)}
            </div>
          </div>
        )}

        {/* OFFLINE GROUP */}
        {offlineMembers.length > 0 && (
          <div>
            <div className="mb-1.5 px-2 text-[11px] font-bold tracking-[0.06em] uppercase text-[#94A3B8]">
              OFFLINE — Ngoại tuyến ({offlineMembers.length})
            </div>
            <div className="space-y-0.5">
              {offlineMembers.map(renderMemberRow)}
            </div>
          </div>
        )}
      </div>

      {/* FLOATING USER PROFILE POPOVER CARD */}
      {selectedMember && (
        <div
          className={`absolute top-16 right-[268px] z-50 w-[280px] overflow-hidden rounded-3xl border shadow-2xl transition-all ${
            isDark
              ? 'border-[#283830] bg-[#111815] text-[#F8FAFC]'
              : 'border-[#E5EFE9] bg-white text-[#0F172A]'
          }`}
        >
          {/* Top Emerald Banner */}
          <div className="relative h-16 bg-gradient-to-r from-[#10B981] to-[#059669]">
            <button
              type="button"
              onClick={() => setSelectedMemberId(null)}
              className="absolute top-2 right-2 rounded-full bg-slate-950/30 p-1 text-white hover:bg-slate-950/50"
              aria-label="Đóng hồ sơ"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-4 pb-4">
            {/* Avatar overlapping banner */}
            <div className="-mt-8 mb-3 flex items-end justify-between">
              <div className="relative">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-[#111820] text-lg font-bold text-white ring-4 ${
                    isDark ? 'ring-[#111815]' : 'ring-white'
                  }`}
                  style={
                    selectedMember.avatarColor
                      ? { backgroundColor: selectedMember.avatarColor }
                      : undefined
                  }
                >
                  {selectedMember.displayName.slice(0, 2).toUpperCase()}
                </div>
                <span
                  className={`absolute right-0 bottom-0 h-4 w-4 rounded-full ring-2 ${
                    isDark ? 'ring-[#111815]' : 'ring-white'
                  } ${getPresenceDot(selectedMember.status).color}`}
                />
              </div>

              {/* Role Badge */}
              <div className="flex items-center gap-1">
                {selectedMember.role === 'OWNER' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2.5 py-1 text-xs font-bold text-[#D97706]">
                    <Crown className="h-3.5 w-3.5" />
                    Trưởng nhóm
                  </span>
                )}
                {selectedMember.role === 'ADMIN' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F5EE] px-2.5 py-1 text-xs font-bold text-[#10B981]">
                    <Shield className="h-3.5 w-3.5" />
                    Quản trị
                  </span>
                )}
                {selectedMember.role === 'MEMBER' && (
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isDark
                        ? 'bg-[#18241F] text-[#94A3B8]'
                        : 'bg-[#F0F5F2] text-[#475569]'
                    }`}
                  >
                    Thành viên
                  </span>
                )}
              </div>
            </div>

            {/* Name & Username */}
            <div>
              <h3 className="text-base font-bold leading-snug">
                {selectedMember.displayName}
              </h3>
              <div className="flex items-center gap-2 font-mono text-xs text-[#64748B]">
                <span>@{selectedMember.username}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-[#10B981]">
                  <Radio className="h-3 w-3" />
                  {selectedMember.transport === 'TCP'
                    ? 'Swing TCP :5000'
                    : 'Web WS :8081'}
                </span>
              </div>
            </div>

            {/* Custom Status Box */}
            {selectedMember.customStatus && (
              <div
                className={`mt-3 flex items-center gap-2 rounded-2xl border p-2.5 text-xs ${
                  isDark
                    ? 'border-[#283830] bg-[#141C18] text-[#CBD5E1]'
                    : 'border-[#E5EFE9] bg-[#F7FAF8] text-[#475569]'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#10B981]" />
                <span className="truncate">{selectedMember.customStatus}</span>
              </div>
            )}

            {/* Quick Actions (DM + Add Friend) if not currentUser */}
            {currentUser?.id !== selectedMember.userId && (
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenDm(selectedMember)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#10B981] px-3 py-2.5 text-xs font-bold text-white shadow-2xs transition hover:bg-[#059669]"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Nhắn tin riêng</span>
                </button>

                {!isAlreadyFriend(
                  selectedMember.userId,
                  selectedMember.username
                ) && (
                  <button
                    type="button"
                    disabled={sentRequestIds.includes(selectedMember.userId)}
                    onClick={() => handleAddFriend(selectedMember)}
                    className={`flex items-center justify-center gap-1 rounded-2xl border px-3 py-2.5 text-xs font-bold transition ${
                      sentRequestIds.includes(selectedMember.userId)
                        ? 'border-[#10B981] bg-[#E8F5EE] text-[#059669]'
                        : isDark
                        ? 'border-[#283830] bg-[#141C18] text-[#F8FAFC] hover:border-[#10B981]'
                        : 'border-[#E5EFE9] bg-[#F7FAF8] text-[#0F172A] hover:border-[#10B981]'
                    }`}
                  >
                    {sentRequestIds.includes(selectedMember.userId) ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Đã gửi</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Kết bạn</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Role Management (Owner Only) */}
            {isCurrentUserOwner && currentUser?.id !== selectedMember.userId && (
              <div className="mt-4 border-t border-[#E2E8F0] pt-3 dark:border-[#334155]">
                <label className="mb-1.5 block text-[10px] font-bold tracking-wider uppercase text-[#64748B]">
                  Phân quyền thành viên (Chỉ Owner)
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['OWNER', 'ADMIN', 'MEMBER'] as MemberRole[]).map(
                    (roleOpt) => {
                      const active = selectedMember.role === roleOpt;
                      return (
                        <button
                          key={roleOpt}
                          type="button"
                          onClick={() =>
                            handleRoleChange(selectedMember, roleOpt)
                          }
                          className={`rounded-lg py-1.5 text-[11px] font-bold transition ${
                            active
                              ? 'bg-[#2563EB] text-white'
                              : isDark
                              ? 'bg-[#0F172A] text-[#94A3B8] hover:text-white'
                              : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                          }`}
                        >
                          {roleOpt}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};

export default MemberSidebar;
