import React, { useState } from 'react';
import {
  Hash,
  Volume2,
  Plus,
  UserPlus,
  Search,
  Mic,
  MicOff,
  Headphones,
  HeadphoneOff,
  Video,
  VideoOff,
  Settings,
  Activity,
  Users,
  Copy,
  Check,
  X,
  PhoneOff,
  Crown,
  Shield,
  ChevronDown,
  ChevronRight,
  Radio,
} from 'lucide-react';
import { useAppStore } from '../../shared/state/appStore';
import type {
  Channel,
  ChannelType,
  PresenceStatus,
  VoiceParticipant,
  DirectConversation,
} from '../../shared/types/api';

const PRESENCE_OPTIONS: {
  status: PresenceStatus;
  label: string;
  desc: string;
  dotColor: string;
}[] = [
  {
    status: 'ONLINE',
    label: 'Trực tuyến (Online)',
    desc: 'Sẵn sàng nhận tin nhắn TCP/WS & cuộc gọi UDP',
    dotColor: 'bg-[#10B981]',
  },
  {
    status: 'IDLE',
    label: 'Chờ (Idle)',
    desc: 'Tạm thời rời bàn phím',
    dotColor: 'bg-[#F59E0B]',
  },
  {
    status: 'DND',
    label: 'Không làm phiền (DND)',
    desc: 'Tắt thông báo âm thanh',
    dotColor: 'bg-[#F43F5E]',
  },
  {
    status: 'OFFLINE',
    label: 'Ẩn (Invisible)',
    desc: 'Hiển thị ngoại tuyến với mọi người',
    dotColor: 'bg-[#94A3B8]',
  },
];

export const ChannelSidebar: React.FC = () => {
  const {
    currentUser,
    theme,
    viewMode,
    setViewMode,
    activeGuild,
    activeGuildId,
    activeChannelId,
    selectChannel,
    createChannel,
    createInvite,
    members,
    dmConversations,
    activeDmId,
    selectDm,
    friendRequests,
    activeVoiceChannelId,
    voiceParticipants,
    localVoiceState,
    joinVoiceChannel,
    leaveVoiceChannel,
    updateLocalVoiceState,
    rttSamples,
    isMonitorOpen,
    setMonitorOpen,
    setSettingsOpen,
    setCommandPaletteOpen,
    updatePresence,
  } = useAppStore();

  const isDark = theme === 'dark';

  const [textCollapsed, setTextCollapsed] = useState(false);
  const [voiceCollapsed, setVoiceCollapsed] = useState(false);

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [generatedInviteCode, setGeneratedInviteCode] = useState<string>('');
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Create Channel Modal State
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [newChannelType, setNewChannelType] = useState<ChannelType>('text');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelTopic, setNewChannelTopic] = useState('');
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);

  // Presence Picker Popover
  const [isPresenceOpen, setIsPresenceOpen] = useState(false);
  const [customStatusInput, setCustomStatusInput] = useState(
    currentUser?.customStatus || ''
  );

  // Determine current user's role in the active guild
  const myMemberRecord = Array.isArray(members)
    ? members.find((m) => m.id === currentUser?.id)
    : undefined;

  const myRole =
    myMemberRecord?.role ||
    currentUser?.role ||
    (activeGuild && currentUser && activeGuild.ownerId === currentUser.id
      ? 'OWNER'
      : 'MEMBER');

  const channels: Channel[] = activeGuild?.channels ?? [];
  const textChannels = channels.filter((c) => c.type === 'text');
  const voiceChannels = channels.filter((c) => c.type === 'voice');

  // Latest RTT in ms for live badge
  const latestSample =
    Array.isArray(rttSamples) && rttSamples.length > 0
      ? rttSamples[rttSamples.length - 1]
      : null;
  const liveRttMs = latestSample
    ? Math.round(latestSample.udpRttMs ?? latestSample.wsRttMs ?? 12)
    : 12;

  const pendingIncomingCount = Array.isArray(friendRequests)
    ? friendRequests.filter((r) => r.direction === 'INCOMING').length
    : 0;

  const handleOpenInviteModal = async () => {
    setIsInviteModalOpen(true);
    setCopiedInvite(false);
    const gid = activeGuildId || activeGuild?.id || 1;
    setIsGeneratingInvite(true);
    try {
      const code = await createInvite(gid);
      setGeneratedInviteCode(code || `LTM${gid}2026`);
    } catch {
      setGeneratedInviteCode(`LTM${gid}2026`);
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleCopyInvite = () => {
    if (!generatedInviteCode) return;
    navigator.clipboard?.writeText(generatedInviteCode).catch(() => {});
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleOpenCreateChannel = (type: ChannelType) => {
    setNewChannelType(type);
    setNewChannelName('');
    setNewChannelTopic('');
    setIsCreateChannelOpen(true);
  };

  const handleCreateChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawName = newChannelName.trim();
    if (!rawName) return;
    const gid = activeGuildId || activeGuild?.id || 1;
    const normalizedName =
      newChannelType === 'text'
        ? rawName.toLowerCase().replace(/\s+/g, '-')
        : rawName;
    setIsCreatingChannel(true);
    try {
      await createChannel(
        gid,
        normalizedName,
        newChannelType,
        newChannelTopic.trim() ||
          (newChannelType === 'text'
            ? 'Kênh thảo luận văn bản TCP/WS'
            : 'Phòng thoại & video WebRTC/UDP')
      );
      setIsCreateChannelOpen(false);
    } finally {
      setIsCreatingChannel(false);
    }
  };

  const getPresenceDotClass = (status?: PresenceStatus) => {
    switch (status) {
      case 'ONLINE':
        return 'bg-[#10B981]';
      case 'IDLE':
        return 'bg-[#F59E0B]';
      case 'DND':
        return 'bg-[#F43F5E]';
      default:
        return 'bg-[#94A3B8]';
    }
  };

  const isMuted = Boolean(localVoiceState?.muted);
  const isDeafened = Boolean(localVoiceState?.deafened);
  const isCameraOn = Boolean(localVoiceState?.cameraOn);

  const handleToggleMic = () => {
    updateLocalVoiceState({ muted: !isMuted });
  };

  const handleToggleDeafen = () => {
    const nextDeaf = !isDeafened;
    updateLocalVoiceState({
      deafened: nextDeaf,
      muted: nextDeaf ? true : isMuted,
    });
  };

  const handleToggleCamera = () => {
    updateLocalVoiceState({ cameraOn: !isCameraOn });
  };

  const activeVoiceChannelObj = channels.find(
    (c) => c.id === activeVoiceChannelId
  );

  return (
    <>
      <aside
        aria-label="Danh sách kênh và tin nhắn trực tiếp"
        className={`relative flex h-full w-[240px] shrink-0 flex-col border-r select-none transition-colors duration-200 ${
          isDark
            ? 'border-[#334155] bg-[#0F172A] text-[#F8FAFC]'
            : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]'
        }`}
      >
        {/* TOP HEADER (56px) */}
        {viewMode === 'guild' ? (
          <div
            className={`flex h-[56px] shrink-0 items-center justify-between border-b px-3.5 ${
              isDark ? 'border-[#334155]' : 'border-[#E2E8F0]'
            }`}
          >
            <div className="min-w-0 flex-1 pr-2">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-[16px] font-bold tracking-tight">
                  {activeGuild?.name || 'Discord Mini'}
                </h1>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                {myRole === 'OWNER' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold text-[#D97706]">
                    <Crown className="h-2.5 w-2.5" />
                    OWNER
                  </span>
                )}
                {myRole === 'ADMIN' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#DBEAFE] px-2 py-0.5 text-[10px] font-bold text-[#2563EB]">
                    <Shield className="h-2.5 w-2.5" />
                    ADMIN
                  </span>
                )}
                {myRole === 'MEMBER' && (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      isDark
                        ? 'bg-[#1E293B] text-[#94A3B8]'
                        : 'bg-[#E2E8F0] text-[#475569]'
                    }`}
                  >
                    MEMBER
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenInviteModal}
              title="Tạo mã mời (Invite Code)"
              aria-label="Tạo mã mời vào máy chủ"
              className="flex h-8 items-center gap-1 rounded-lg bg-[#2563EB] px-2.5 text-xs font-bold text-white shadow-2xs transition hover:bg-[#1D4ED8] active:translate-y-[1px]"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Mời</span>
            </button>
          </div>
        ) : (
          <div
            className={`flex h-[56px] shrink-0 items-center justify-between border-b px-3 ${
              isDark ? 'border-[#334155]' : 'border-[#E2E8F0]'
            }`}
          >
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className={`flex h-9 w-full items-center justify-between rounded-lg border px-2.5 text-xs font-medium transition ${
                isDark
                  ? 'border-[#334155] bg-[#1E293B] text-[#94A3B8] hover:border-[#3B82F6]'
                  : 'border-[#CBD5E1] bg-white text-[#64748B] hover:border-[#2563EB]'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="h-3.5 w-3.5 shrink-0" />
                <span>Tìm bạn hoặc hội thoại...</span>
              </span>
              <kbd
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                  isDark
                    ? 'bg-[#0F172A] text-[#94A3B8]'
                    : 'bg-[#F1F5F9] text-[#475569]'
                }`}
              >
                Ctrl+K
              </kbd>
            </button>
          </div>
        )}

        {/* QUICK SEARCH TRIGGER IN GUILD MODE */}
        {viewMode === 'guild' && (
          <div className="px-2.5 pt-2.5 pb-1">
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className={`flex h-8 w-full items-center justify-between rounded-lg border px-2.5 text-xs font-medium transition ${
                isDark
                  ? 'border-[#334155] bg-[#1E293B]/80 text-[#94A3B8] hover:border-[#3B82F6] hover:text-white'
                  : 'border-[#E2E8F0] bg-white text-[#64748B] shadow-2xs hover:border-[#2563EB] hover:text-[#0F172A]'
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                <Search className="h-3.5 w-3.5 text-[#2563EB]" />
                <span>Tìm nhanh kênh / lệnh</span>
              </span>
              <kbd
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                  isDark
                    ? 'bg-[#0F172A] text-[#94A3B8]'
                    : 'bg-[#F1F5F9] text-[#475569]'
                }`}
              >
                Ctrl+K
              </kbd>
            </button>
          </div>
        )}

        {/* SCROLLABLE MIDDLE CONTENT */}
        <div className="flex-1 space-y-4 overflow-y-auto px-2 py-2.5">
          {viewMode === 'guild' ? (
            <>
              {/* CATEGORY 1: TEXT CHANNELS */}
              <div>
                <div className="mb-1 flex items-center justify-between px-1.5">
                  <button
                    type="button"
                    onClick={() => setTextCollapsed(!textCollapsed)}
                    className={`flex items-center gap-1 text-[11px] font-bold tracking-[0.06em] uppercase transition ${
                      isDark
                        ? 'text-[#94A3B8] hover:text-[#F8FAFC]'
                        : 'text-[#475569] hover:text-[#0F172A]'
                    }`}
                  >
                    {textCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                    <span>KÊNH CHAT VĂN BẢN</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenCreateChannel('text')}
                    title="Tạo kênh văn bản mới"
                    aria-label="Tạo kênh văn bản mới"
                    className={`rounded p-0.5 transition ${
                      isDark
                        ? 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-white'
                        : 'text-[#475569] hover:bg-[#E2E8F0] hover:text-[#2563EB]'
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {!textCollapsed && (
                  <div className="space-y-0.5">
                    {textChannels.map((channel) => {
                      const isSelected = activeChannelId === channel.id;
                      const unread = channel.unreadCount ?? 0;

                      return (
                        <button
                          key={channel.id}
                          type="button"
                          onClick={() => selectChannel(channel.id)}
                          className={`group relative flex h-9 w-full items-center justify-between rounded-[8px] px-2.5 text-left transition-colors ${
                            isSelected
                              ? isDark
                                ? 'bg-[#3B82F6]/20 font-bold text-[#3B82F6]'
                                : 'bg-[#DBEAFE] font-bold text-[#2563EB]'
                              : unread > 0
                              ? isDark
                                ? 'font-bold text-white hover:bg-[#1E293B]'
                                : 'font-bold text-[#0F172A] hover:bg-[#E2E8F0]/70'
                              : isDark
                              ? 'font-medium text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white'
                              : 'font-medium text-[#475569] hover:bg-[#E2E8F0]/70 hover:text-[#0F172A]'
                          }`}
                        >
                          {/* Unread left blue dot */}
                          {unread > 0 && !isSelected && (
                            <span className="absolute left-0.5 h-2 w-1.5 rounded-full bg-[#2563EB]" />
                          )}

                          <div className="flex min-w-0 items-center gap-2">
                            <Hash
                              className={`h-4 w-4 shrink-0 ${
                                isSelected
                                  ? isDark
                                    ? 'text-[#3B82F6]'
                                    : 'text-[#2563EB]'
                                  : 'opacity-75'
                              }`}
                            />
                            <span className="truncate text-[14px]">
                              {channel.name}
                            </span>
                          </div>

                          {unread > 0 && (
                            <span className="ml-2 flex min-w-[18px] items-center justify-center rounded-full bg-[#F43F5E] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                              {unread > 99 ? '99+' : unread}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* CATEGORY 2: VOICE / VIDEO CHANNELS */}
              <div>
                <div className="mb-1 flex items-center justify-between px-1.5">
                  <button
                    type="button"
                    onClick={() => setVoiceCollapsed(!voiceCollapsed)}
                    className={`flex items-center gap-1 text-[11px] font-bold tracking-[0.06em] uppercase transition ${
                      isDark
                        ? 'text-[#94A3B8] hover:text-[#F8FAFC]'
                        : 'text-[#475569] hover:text-[#0F172A]'
                    }`}
                  >
                    {voiceCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                    <span>KÊNH THOẠI / VIDEO</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenCreateChannel('voice')}
                    title="Tạo kênh thoại/video mới"
                    aria-label="Tạo kênh thoại/video mới"
                    className={`rounded p-0.5 transition ${
                      isDark
                        ? 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-white'
                        : 'text-[#475569] hover:bg-[#E2E8F0] hover:text-[#2563EB]'
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {!voiceCollapsed && (
                  <div className="space-y-1">
                    {voiceChannels.map((channel) => {
                      const isJoined = activeVoiceChannelId === channel.id;
                      const channelParticipants: VoiceParticipant[] = Array.isArray(
                        voiceParticipants
                      )
                        ? voiceParticipants.filter(
                            (vp) => vp.channelId === channel.id
                          )
                        : [];

                      return (
                        <div key={channel.id} className="space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              selectChannel(channel.id);
                              joinVoiceChannel(channel.id);
                            }}
                            className={`group flex h-9 w-full items-center justify-between rounded-[8px] px-2.5 text-left transition-colors ${
                              isJoined
                                ? isDark
                                  ? 'bg-[#10B981]/15 font-bold text-[#10B981]'
                                  : 'bg-[#D1FAE5] font-bold text-[#059669]'
                                : isDark
                                ? 'font-medium text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white'
                                : 'font-medium text-[#475569] hover:bg-[#E2E8F0]/70 hover:text-[#0F172A]'
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <Volume2
                                className={`h-4 w-4 shrink-0 ${
                                  isJoined ? 'text-[#10B981]' : 'opacity-75'
                                }`}
                              />
                              <span className="truncate text-[14px]">
                                {channel.name.replace(/^🔊\s*/, '')}
                              </span>
                            </div>

                            <span
                              className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                                isJoined
                                  ? 'bg-[#10B981] text-white'
                                  : isDark
                                  ? 'bg-[#1E293B] text-[#94A3B8]'
                                  : 'bg-[#E2E8F0] text-[#475569]'
                              }`}
                            >
                              {isJoined ? 'UDP LIVE' : 'WebRTC'}
                            </span>
                          </button>

                          {/* Connected Voice Participants right under the voice channel */}
                          {channelParticipants.length > 0 && (
                            <div className="ml-5 space-y-1 border-l-2 border-[#CBD5E1] pl-2.5 dark:border-[#334155]">
                              {channelParticipants.map((vp) => {
                                const isSpeaking =
                                  vp.speaking ?? !vp.muted;
                                return (
                                  <div
                                    key={vp.userId}
                                    className={`flex items-center justify-between rounded-md px-2 py-1 text-xs ${
                                      isDark
                                        ? 'text-[#CBD5E1] hover:bg-[#1E293B]'
                                        : 'text-[#475569] hover:bg-[#E2E8F0]/60'
                                    }`}
                                  >
                                    <div className="flex min-w-0 items-center gap-2">
                                      <div
                                        style={
                                          vp.avatarColor
                                            ? {
                                                backgroundColor: vp.avatarColor,
                                              }
                                            : undefined
                                        }
                                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-[10px] font-bold text-white transition-all ${
                                          isSpeaking
                                            ? 'ring-2 ring-[#10B981] ring-offset-1 ring-offset-transparent'
                                            : 'opacity-85'
                                        }`}
                                      >
                                        {(
                                          vp.displayName ||
                                          vp.username ||
                                          'U'
                                        )
                                          .slice(0, 2)
                                          .toUpperCase()}
                                      </div>
                                      <span className="truncate font-semibold">
                                        {vp.displayName || vp.username}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      {vp.cameraOn && (
                                        <span
                                          title="Đang bật Camera"
                                          className="rounded bg-[#0284C7]/15 p-0.5 text-[#0284C7]"
                                        >
                                          <Video className="h-3 w-3" />
                                        </span>
                                      )}
                                      {vp.muted ? (
                                        <MicOff className="h-3 w-3 text-[#F43F5E]" />
                                      ) : (
                                        <Mic className="h-3 w-3 text-[#10B981]" />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* FRIENDS & DIRECT MESSAGES SIDEBAR */
            <div className="space-y-4">
              {/* Friends Navigation Button */}
              <button
                type="button"
                onClick={() => setViewMode('friends')}
                className={`flex h-10 w-full items-center justify-between rounded-lg px-3 text-sm font-bold transition ${
                  viewMode === 'friends'
                    ? isDark
                      ? 'bg-[#3B82F6]/20 text-[#3B82F6]'
                      : 'bg-[#DBEAFE] text-[#2563EB]'
                    : isDark
                    ? 'text-[#CBD5E1] hover:bg-[#1E293B]'
                    : 'text-[#475569] hover:bg-[#E2E8F0]/70'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Users className="h-4 w-4" />
                  <span>Bạn bè (Friends)</span>
                </span>
                {pendingIncomingCount > 0 && (
                  <span className="rounded-full bg-[#F43F5E] px-2 py-0.5 text-[11px] font-bold text-white">
                    {pendingIncomingCount}
                  </span>
                )}
              </button>

              {/* Direct Messages List */}
              <div>
                <div className="mb-1.5 flex items-center justify-between px-2">
                  <span
                    className={`text-[11px] font-bold tracking-[0.06em] uppercase ${
                      isDark ? 'text-[#94A3B8]' : 'text-[#64748B]'
                    }`}
                  >
                    TIN NHẮN TRỰC TIẾP (DM)
                  </span>
                </div>

                <div className="space-y-1">
                  {Array.isArray(dmConversations) &&
                  dmConversations.length > 0 ? (
                    dmConversations.map((conv: DirectConversation) => {
                      const isActiveDm =
                        viewMode === 'dm' && activeDmId === conv.id;
                      const peer = conv.peerUser;
                      const unread = conv.unreadCount ?? 0;

                      return (
                        <button
                          key={conv.id}
                          type="button"
                          onClick={() => {
                            setViewMode('dm');
                            selectDm(conv.id);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition ${
                            isActiveDm
                              ? isDark
                                ? 'bg-[#3B82F6]/20 text-[#3B82F6]'
                                : 'bg-[#DBEAFE] text-[#2563EB]'
                              : isDark
                              ? 'text-[#CBD5E1] hover:bg-[#1E293B]'
                              : 'text-[#475569] hover:bg-[#E2E8F0]/70'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="relative shrink-0">
                              <div
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB] text-xs font-bold text-white"
                                style={
                                  peer?.avatarColor
                                    ? { backgroundColor: peer.avatarColor }
                                    : undefined
                                }
                              >
                                {(
                                  peer?.displayName ||
                                  peer?.username ||
                                  'U'
                                )
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                              <span
                                className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full ring-2 ${
                                  isDark ? 'ring-[#0F172A]' : 'ring-[#F8FAFC]'
                                } ${getPresenceDotClass(peer?.status)}`}
                              />
                            </div>

                            <div className="min-w-0">
                              <div className="truncate text-xs font-bold">
                                {peer?.displayName || peer?.username}
                              </div>
                              <div
                                className={`truncate text-[11px] ${
                                  isDark ? 'text-[#94A3B8]' : 'text-[#64748B]'
                                }`}
                              >
                                {conv.lastMessagePreview ||
                                  peer?.customStatus ||
                                  `@${peer?.username}`}
                              </div>
                            </div>
                          </div>

                          {unread > 0 && (
                            <span className="ml-1 rounded-full bg-[#F43F5E] px-1.5 py-0.5 text-[10px] font-bold text-white">
                              {unread}
                            </span>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div
                      className={`rounded-xl border border-dashed p-3 text-center text-xs ${
                        isDark
                          ? 'border-[#334155] text-[#94A3B8]'
                          : 'border-[#CBD5E1] text-[#64748B]'
                      }`}
                    >
                      Chưa có cuộc trò chuyện riêng nào. Hãy chọn một người bạn để nhắn tin!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ACTIVE VOICE CONNECTION BANNER (When joined in a Voice Channel) */}
        {activeVoiceChannelId && (
          <div
            className={`border-t px-3 py-2 ${
              isDark
                ? 'border-[#334155] bg-[#0B1120]/90'
                : 'border-[#E2E8F0] bg-[#ECFDF5]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#10B981]">
                  <Radio className="h-3.5 w-3.5 animate-pulse" />
                  <span>Đã kết nối Voice / UDP</span>
                </div>
                <div
                  className={`truncate text-[11px] font-medium ${
                    isDark ? 'text-[#94A3B8]' : 'text-[#475569]'
                  }`}
                >
                  {activeVoiceChannelObj?.name ||
                    `Kênh #${activeVoiceChannelId}`}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  title={isCameraOn ? 'Tắt Camera' : 'Bật Camera'}
                  className={`rounded-lg p-1.5 transition ${
                    isCameraOn
                      ? 'bg-[#0284C7] text-white'
                      : isDark
                      ? 'bg-[#1E293B] text-[#94A3B8] hover:text-white'
                      : 'bg-white text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  {isCameraOn ? (
                    <Video className="h-3.5 w-3.5" />
                  ) : (
                    <VideoOff className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => leaveVoiceChannel()}
                  title="Ngắt kết nối thoại"
                  aria-label="Ngắt kết nối thoại"
                  className="rounded-lg bg-[#F43F5E] p-1.5 text-white transition hover:bg-[#E11D48]"
                >
                  <PhoneOff className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM USER CONTROL BAR (56px) */}
        <div
          className={`relative flex h-[56px] shrink-0 items-center justify-between border-t px-2 ${
            isDark
              ? 'border-[#334155] bg-[#0B1120]'
              : 'border-[#E2E8F0] bg-[#F1F5F9]'
          }`}
        >
          {/* User Avatar & Presence Trigger */}
          <button
            type="button"
            onClick={() => {
              setCustomStatusInput(currentUser?.customStatus || '');
              setIsPresenceOpen(!isPresenceOpen);
            }}
            className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1 text-left transition ${
              isDark ? 'hover:bg-[#1E293B]' : 'hover:bg-[#E2E8F0]'
            }`}
            title="Đổi trạng thái trực tuyến"
          >
            <div className="relative shrink-0">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB] text-xs font-bold text-white"
                style={
                  currentUser?.avatarColor
                    ? { backgroundColor: currentUser.avatarColor }
                    : undefined
                }
              >
                {(
                  currentUser?.displayName ||
                  currentUser?.username ||
                  'ME'
                )
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <span
                className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full ring-2 ${
                  isDark ? 'ring-[#0B1120]' : 'ring-[#F1F5F9]'
                } ${getPresenceDotClass(currentUser?.status)}`}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold leading-tight">
                {currentUser?.displayName ||
                  currentUser?.username ||
                  'Sinh viên'}
              </div>
              <div
                className={`truncate font-mono text-[10px] leading-tight ${
                  isDark ? 'text-[#94A3B8]' : 'text-[#64748B]'
                }`}
              >
                @{currentUser?.username || 'user'}
              </div>
            </div>
          </button>

          {/* Quick Control Buttons: Mic, Deafen, Monitor (with RTT badge), Settings */}
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={handleToggleMic}
              aria-label={isMuted ? 'Bật micro' : 'Tắt micro'}
              title={isMuted ? 'Bật Micro' : 'Tắt Micro'}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                isMuted
                  ? 'bg-[#FFE4E6] text-[#F43F5E] dark:bg-[#F43F5E]/20'
                  : isDark
                  ? 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-white'
                  : 'text-[#475569] hover:bg-[#E2E8F0] hover:text-[#0F172A]'
              }`}
            >
              {isMuted ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={handleToggleDeafen}
              aria-label={
                isDeafened ? 'Bật âm thanh tai nghe' : 'Tắt tiếng tai nghe'
              }
              title={isDeafened ? 'Bật tai nghe' : 'Tắt tai nghe (Deafen)'}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                isDeafened
                  ? 'bg-[#FFE4E6] text-[#F43F5E] dark:bg-[#F43F5E]/20'
                  : isDark
                  ? 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-white'
                  : 'text-[#475569] hover:bg-[#E2E8F0] hover:text-[#0F172A]'
              }`}
            >
              {isDeafened ? (
                <HeadphoneOff className="h-4 w-4" />
              ) : (
                <Headphones className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setMonitorOpen(!isMonitorOpen)}
              aria-label="Mở Network Monitor"
              title={`Network Monitor — RTT: ${liveRttMs} ms`}
              className={`relative flex h-8 items-center gap-0.5 rounded-lg px-1.5 transition ${
                isMonitorOpen
                  ? 'bg-[#2563EB] text-white'
                  : isDark
                  ? 'text-[#10B981] hover:bg-[#1E293B]'
                  : 'text-[#059669] hover:bg-[#E2E8F0]'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span className="font-mono text-[10px] font-bold">
                {liveRttMs}ms
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Cài đặt tài khoản và giao diện"
              title="Cài đặt (Settings)"
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                isDark
                  ? 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-white'
                  : 'text-[#475569] hover:bg-[#E2E8F0] hover:text-[#0F172A]'
              }`}
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>

          {/* PRESENCE PICKER POPOVER */}
          {isPresenceOpen && (
            <div
              className={`absolute bottom-[62px] left-2 z-50 w-[224px] rounded-2xl border p-3 shadow-xl ${
                isDark
                  ? 'border-[#334155] bg-[#1E293B] text-[#F8FAFC]'
                  : 'border-[#E2E8F0] bg-white text-[#0F172A]'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-[#64748B]">
                  Trạng thái trực tuyến
                </span>
                <button
                  type="button"
                  onClick={() => setIsPresenceOpen(false)}
                  className="rounded p-0.5 text-[#64748B] hover:text-[#0F172A]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-1">
                {PRESENCE_OPTIONS.map((opt) => {
                  const isCurrent = currentUser?.status === opt.status;
                  return (
                    <button
                      key={opt.status}
                      type="button"
                      onClick={() => {
                        updatePresence(
                          opt.status,
                          customStatusInput.trim() || undefined
                        );
                        setIsPresenceOpen(false);
                      }}
                      className={`flex w-full items-start gap-2.5 rounded-xl p-2 text-left transition ${
                        isCurrent
                          ? isDark
                            ? 'bg-[#3B82F6]/20 text-white'
                            : 'bg-[#EFF6FF] text-[#2563EB]'
                          : isDark
                          ? 'hover:bg-[#334155]'
                          : 'hover:bg-[#F1F5F9]'
                      }`}
                    >
                      <span
                        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${opt.dotColor}`}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold">{opt.label}</div>
                        <div
                          className={`truncate text-[10px] ${
                            isDark ? 'text-[#94A3B8]' : 'text-[#64748B]'
                          }`}
                        >
                          {opt.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-2.5 border-t border-[#E2E8F0] pt-2.5 dark:border-[#334155]">
                <label className="mb-1 block text-[10px] font-bold uppercase text-[#64748B]">
                  Trạng thái tùy chỉnh
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={customStatusInput}
                    onChange={(e) => setCustomStatusInput(e.target.value)}
                    placeholder="Đang học Lập trình mạng..."
                    className={`w-full rounded-lg border px-2 py-1 text-xs outline-none focus:border-[#2563EB] ${
                      isDark
                        ? 'border-[#334155] bg-[#0F172A] text-white'
                        : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      updatePresence(
                        currentUser?.status || 'ONLINE',
                        customStatusInput.trim() || undefined
                      );
                      setIsPresenceOpen(false);
                    }}
                    className="rounded-lg bg-[#2563EB] px-2.5 py-1 text-xs font-bold text-white hover:bg-[#1D4ED8]"
                  >
                    Lưu
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* INVITE CODE MODAL */}
      {isInviteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={() => setIsInviteModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${
              isDark
                ? 'border-[#334155] bg-[#1E293B] text-[#F8FAFC]'
                : 'border-[#E2E8F0] bg-white text-[#0F172A]'
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  Mời Bạn Bè Vào {activeGuild?.name}
                </h2>
                <p
                  className={`text-xs ${
                    isDark ? 'text-[#94A3B8]' : 'text-[#64748B]'
                  }`}
                >
                  Chia sẻ mã mời dưới đây để đồng đội tham gia máy chủ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="rounded-lg p-1 text-[#64748B] hover:bg-[#E2E8F0]/50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div
              className={`flex items-center justify-between rounded-xl border p-3 ${
                isDark
                  ? 'border-[#334155] bg-[#0F172A]'
                  : 'border-[#CBD5E1] bg-[#F8FAFC]'
              }`}
            >
              <span className="font-mono text-lg font-bold tracking-widest text-[#2563EB] dark:text-[#3B82F6]">
                {isGeneratingInvite
                  ? 'ĐANG TẠO...'
                  : generatedInviteCode || 'LTM2026'}
              </span>

              <button
                type="button"
                onClick={handleCopyInvite}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold text-white transition ${
                  copiedInvite
                    ? 'bg-[#10B981]'
                    : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
                }`}
              >
                {copiedInvite ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Sao chép mã</span>
                  </>
                )}
              </button>
            </div>

            <p className="mt-3 text-[11px] text-[#64748B]">
              Mã mời có hiệu lực trong 24 giờ (tối đa 25 lượt sử dụng).
            </p>
          </div>
        </div>
      )}

      {/* CREATE CHANNEL MODAL */}
      {isCreateChannelOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={() => setIsCreateChannelOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${
              isDark
                ? 'border-[#334155] bg-[#1E293B] text-[#F8FAFC]'
                : 'border-[#E2E8F0] bg-white text-[#0F172A]'
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Tạo Kênh Mới</h2>
              <button
                type="button"
                onClick={() => setIsCreateChannelOpen(false)}
                className="rounded-lg p-1 text-[#64748B] hover:bg-[#E2E8F0]/50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChannelSubmit} className="space-y-4">
              {/* Channel Type Selector */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setNewChannelType('text')}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition ${
                    newChannelType === 'text'
                      ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB] dark:bg-[#3B82F6]/20 dark:text-[#3B82F6]'
                      : isDark
                      ? 'border-[#334155] bg-[#0F172A] text-[#CBD5E1]'
                      : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#475569]'
                  }`}
                >
                  <Hash className="h-5 w-5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold">Kênh Văn Bản</div>
                    <div className="text-[10px] opacity-80">TCP :5000 + WS</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setNewChannelType('voice')}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition ${
                    newChannelType === 'voice'
                      ? 'border-[#10B981] bg-[#ECFDF5] text-[#059669] dark:bg-[#10B981]/20 dark:text-[#10B981]'
                      : isDark
                      ? 'border-[#334155] bg-[#0F172A] text-[#CBD5E1]'
                      : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#475569]'
                  }`}
                >
                  <Volume2 className="h-5 w-5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold">Kênh Thoại / Video</div>
                    <div className="text-[10px] opacity-80">WebRTC / UDP</div>
                  </div>
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#64748B]">
                  Tên Kênh *
                </label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder={
                    newChannelType === 'text'
                      ? 'vd: phan-tich-goi-tin'
                      : 'vd: Phòng Họp Nhóm 4'
                  }
                  autoFocus
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium outline-none focus:border-[#2563EB] ${
                    isDark
                      ? 'border-[#334155] bg-[#0F172A] text-white'
                      : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A]'
                  }`}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#64748B]">
                  Chủ đề kênh (Topic)
                </label>
                <input
                  type="text"
                  value={newChannelTopic}
                  onChange={(e) => setNewChannelTopic(e.target.value)}
                  placeholder="Mô tả nội dung thảo luận của kênh..."
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium outline-none focus:border-[#2563EB] ${
                    isDark
                      ? 'border-[#334155] bg-[#0F172A] text-white'
                      : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A]'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateChannelOpen(false)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    isDark
                      ? 'bg-[#334155] text-[#CBD5E1]'
                      : 'bg-[#F1F5F9] text-[#475569]'
                  }`}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreatingChannel}
                  className="rounded-xl bg-[#2563EB] px-5 py-2 text-sm font-bold text-white hover:bg-[#1D4ED8] disabled:opacity-50"
                >
                  {isCreatingChannel ? 'Đang tạo...' : 'Tạo Kênh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ChannelSidebar;
