import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  UserPlus,
  MessageSquare,
  Phone,
  Check,
  CheckCheck,
  X,
  Search,
  Radio,
  FileText,
  Download,
  Sparkles,
  Clock,
  Pin,
  Image as ImageIcon,
} from 'lucide-react';
import { useAppStore } from '../../shared/state/appStore';
import type {
  User,
  FriendRequest,
  Message,
  PresenceStatus,
} from '../../shared/types/api';
import { MessageComposer } from '../chat/MessageComposer';
import { SafeMarkdownContent } from '../chat/ChatStage';
import { VoiceWaveformPlayer } from '../chat/VoiceWaveformPlayer';
import { NetworkMetricCard } from '../chat/NetworkMetricCard';

type FriendsTab = 'online' | 'all' | 'pending' | 'add';

export const FriendsAndDmStage: React.FC = () => {
  const {
    currentUser,
    theme,
    viewMode,
    setViewMode,
    friends,
    friendRequests,
    dmConversations,
    activeDmId,
    dmMessages,
    sendFriendRequest,
    respondFriendRequest,
    openDmWithUser,
    guilds,
    joinVoiceChannel,
  } = useAppStore();

  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<FriendsTab>('online');
  const [filterQuery, setFilterQuery] = useState('');
  const [addUsernameInput, setAddUsernameInput] = useState('');
  const [addStatusMessage, setAddStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  const dmStreamEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (viewMode === 'dm') {
      dmStreamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [viewMode, dmMessages?.length, activeDmId]);

  const friendsList: User[] = Array.isArray(friends) ? friends : [];
  const pendingRequests: FriendRequest[] = Array.isArray(friendRequests)
    ? friendRequests
    : [];

  const onlineFriends = friendsList.filter(
    (f) => (f.status && f.status !== 'OFFLINE') || f.online
  );

  const filteredFriends = (
    activeTab === 'online' ? onlineFriends : friendsList
  ).filter((f) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      f.username.toLowerCase().includes(q) ||
      (f.displayName && f.displayName.toLowerCase().includes(q))
    );
  });

  const getPresenceMeta = (status?: PresenceStatus) => {
    switch (status) {
      case 'ONLINE':
        return {
          dot: 'bg-[#10B981]',
          text: 'Trực tuyến (Online)',
          badgeBg: 'bg-[#D1FAE5] text-[#059669]',
        };
      case 'IDLE':
        return {
          dot: 'bg-[#F59E0B]',
          text: 'Đang chờ (Idle)',
          badgeBg: 'bg-[#FEF3C7] text-[#D97706]',
        };
      case 'DND':
        return {
          dot: 'bg-[#F43F5E]',
          text: 'Không làm phiền (DND)',
          badgeBg: 'bg-[#FFE4E6] text-[#F43F5E]',
        };
      default:
        return {
          dot: 'bg-[#94A3B8]',
          text: 'Ngoại tuyến (Offline)',
          badgeBg: 'bg-[#F1F5F9] text-[#64748B]',
        };
    }
  };

  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = addUsernameInput.trim().replace(/^@/, '');
    if (!cleanUsername) {
      setAddStatusMessage({
        type: 'error',
        text: 'Vui lòng nhập tên tài khoản (@username) cần kết bạn.',
      });
      return;
    }

    setIsSendingRequest(true);
    setAddStatusMessage(null);
    try {
      await sendFriendRequest(cleanUsername);
      setAddStatusMessage({
        type: 'success',
        text: `Đã gửi lời mời kết bạn tới @${cleanUsername}!`,
      });
      setAddUsernameInput('');
    } catch (err) {
      setAddStatusMessage({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : `Không tìm thấy người dùng @${cleanUsername} hoặc đã gửi lời mời.`,
      });
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleStartDmWithFriend = async (userId: number) => {
    await openDmWithUser(userId);
    setViewMode('dm');
  };

  const handleQuickVoiceCall = () => {
    const firstGuild =
      Array.isArray(guilds) && guilds.length > 0 ? guilds[0] : null;
    const voiceCh = firstGuild?.channels?.find((c) => c.type === 'voice');
    if (voiceCh) {
      joinVoiceChannel(voiceCh.id);
    } else {
      joinVoiceChannel(4);
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  // ============================================================================
  // MODE 1: 1-ON-1 DIRECT MESSAGE (DM) STAGE
  // ============================================================================
  if (viewMode === 'dm') {
    const activeConv = Array.isArray(dmConversations)
      ? dmConversations.find((c) => c.id === activeDmId)
      : undefined;
    const peer = activeConv?.peerUser;
    const peerPresence = getPresenceMeta(peer?.status);
    const currentDmMessages: Message[] = Array.isArray(dmMessages)
      ? dmMessages
      : [];

    return (
      <section
        aria-label="Trò chuyện riêng trực tiếp (Direct Message)"
        className="flex h-full min-w-0 flex-1 flex-col text-[#0F172A] transition-colors duration-200 dark:text-[#F8FAFC]"
        style={{
          background: isDark
            ? 'var(--chat-stage-ambient, linear-gradient(180deg, #111815 0%, #131E19 45%, #0F1612 100%))'
            : 'var(--chat-stage-ambient, linear-gradient(180deg, #FFFFFF 0%, #F8FAF9 25%, #F1F7F5 70%, #ECF4F0 100%))',
        }}
      >
        {/* Sticky DM Header (matching reference mockup) */}
        <header
          className={`sticky top-0 z-20 flex h-[68px] shrink-0 items-center justify-between border-b px-7 backdrop-blur-md transition-colors ${
            isDark
              ? 'border-[#1E2B25] bg-[#111815]/85'
              : 'border-[#EEF2F0]/80 bg-white/85'
          }`}
        >
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="relative shrink-0">
              {peer?.avatarUrl ? (
                <img
                  src={peer.avatarUrl}
                  alt={peer.displayName || peer.username}
                  className="h-10 w-10 rounded-full object-cover shadow-2xs"
                />
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#111820] text-sm font-extrabold text-white shadow-2xs dark:bg-emerald-500 dark:text-[#090E0C]"
                  style={
                    peer?.avatarColor
                      ? { backgroundColor: peer.avatarColor }
                      : undefined
                  }
                >
                  {(peer?.displayName || peer?.username || 'DM')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
                {peer?.displayName || peer?.username || 'Alexander Jameson'}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                <span>{peerPresence.text || 'Online'}</span>
              </div>
            </div>
          </div>

          {/* Right Action Controls: Pin, ImageIcon, FileText matching mockup */}
          <div className="flex items-center gap-2.5 text-[#94A3B8] dark:text-slate-400">
            <button
              type="button"
              className="p-2 rounded-xl hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Pin conversation"
            >
              <Pin className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="p-2 rounded-xl hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Media Gallery"
            >
              <ImageIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="p-2 rounded-xl hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Shared Files"
            >
              <FileText className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleQuickVoiceCall}
              title="Voice Call"
              className="p-2 rounded-xl hover:text-[#10B981] hover:bg-[#E8F2EC] dark:hover:bg-[#1E2923] transition ml-1"
            >
              <Phone className="h-4.5 w-4.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('friends')}
              className="rounded-xl border border-[#E5EFE9] bg-[#F4F9F6] px-2.5 py-1 text-xs font-bold text-[#475569] hover:text-[#0F172A] dark:border-[#283830] dark:bg-[#141C18] dark:text-[#CBD5E1] ml-1"
            >
              Bạn bè
            </button>
          </div>
        </header>

        {/* 1-on-1 DM Message Stream */}
        <div className="flex-1 overflow-y-auto px-7 py-6">
          {/* Peer Intro Banner (shown only when empty) */}
          {currentDmMessages.length === 0 && (
            <div
              className={`mb-6 rounded-2xl border p-5 ${
                isDark
                  ? 'border-[#283830] bg-[#141C18]/60'
                  : 'border-[#E5EFE9] bg-[#F7FAF8]'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  style={
                    peer?.avatarColor
                      ? { backgroundColor: peer.avatarColor }
                      : undefined
                  }
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#111820] text-lg font-extrabold text-white shadow-sm dark:bg-emerald-600"
                >
                  {(peer?.displayName || peer?.username || 'DM')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {peer?.displayName ||
                      peer?.username ||
                      'Cuộc trò chuyện riêng'}
                  </h3>
                  <p
                    className={`text-xs ${
                      isDark ? 'text-[#94A3B8]' : 'text-[#475569]'
                    }`}
                  >
                    Đây là khởi đầu lịch sử tin nhắn riêng 1-1 giữa bạn và{' '}
                    <strong>@{peer?.username || 'peer'}</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* DM Messages */}
          <div className="space-y-4">
            {currentDmMessages.map((msg) => {
              const isMe = currentUser?.id === msg.senderId;
              const isVoice =
                msg.content?.includes('[Voice Message]') ||
                msg.content?.startsWith('/voice');
              const isMetric =
                msg.content?.includes('[Network Metric]') ||
                msg.content?.startsWith('/metric') ||
                msg.content?.includes('townhouse');

              if (isMe) {
                return (
                  <div key={msg.id} className="flex flex-col items-end w-full my-1">
                    {isVoice ? (
                      <VoiceWaveformPlayer
                        isOutgoing={true}
                        timestamp={formatTime(msg.createdAt)}
                      />
                    ) : isMetric ? (
                      <NetworkMetricCard
                        isOutgoing={true}
                        attachments={msg.attachments}
                        timestamp={formatTime(msg.createdAt)}
                      />
                    ) : (
                      <div className="max-w-[85%] sm:max-w-[70%] rounded-2xl bg-white border border-[#E2EAE5] text-[#0F172A] px-5 py-3 shadow-2xs text-[14px] leading-relaxed dark:bg-[#1E2923] dark:border-[#283830] dark:text-[#F8FAFC]">
                        <SafeMarkdownContent
                          content={msg.content}
                          currentUsername={currentUser?.username}
                          isDark={isDark}
                        />
                      </div>
                    )}

                    {!isVoice && !isMetric && (
                      <div className="mt-1 flex items-center gap-1.5 px-2 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        <span>{formatTime(msg.createdAt)}</span>
                        <CheckCheck className="h-3.5 w-3.5 text-[#10B981]" />
                      </div>
                    )}
                  </div>
                );
              }

              // Incoming message
              return (
                <div key={msg.id} className="flex items-start gap-3 w-full my-1">
                  {/* Avatar circle */}
                  <div className="shrink-0 mt-1">
                    {peer?.avatarUrl ? (
                      <img
                        src={peer.avatarUrl}
                        alt={peer.displayName || peer.username}
                        className="h-8 w-8 rounded-full object-cover shadow-2xs"
                      />
                    ) : (
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#111820] text-xs font-bold text-white shadow-2xs dark:bg-emerald-600"
                        style={
                          peer?.avatarColor
                            ? { backgroundColor: peer.avatarColor }
                            : undefined
                        }
                      >
                        {(peer?.displayName || peer?.username || 'AJ')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-start max-w-[85%] sm:max-w-[70%]">
                    {isVoice ? (
                      <VoiceWaveformPlayer
                        isOutgoing={false}
                        timestamp={formatTime(msg.createdAt)}
                      />
                    ) : isMetric ? (
                      <NetworkMetricCard
                        isOutgoing={false}
                        attachments={msg.attachments}
                        timestamp={formatTime(msg.createdAt)}
                      />
                    ) : (
                      <div className="rounded-2xl bg-[#111111] text-white px-5 py-3 shadow-2xs text-[14px] leading-relaxed dark:bg-[#141C18]">
                        <SafeMarkdownContent
                          content={msg.content}
                          currentUsername={currentUser?.username}
                          isDark={true}
                        />
                      </div>
                    )}

                    {/* Attachments if any */}
                    {Array.isArray(msg.attachments) &&
                      msg.attachments.length > 0 &&
                      !isMetric && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.attachments.map((att) => {
                            const isImg = att.contentType?.startsWith('image/');
                            const srcUrl = att.dataUrl || att.url;
                            if (isImg) {
                              return (
                                <img
                                  key={att.id}
                                  src={srcUrl}
                                  alt={att.filename}
                                  className="max-h-52 rounded-xl border border-[#CBD5E1] object-cover dark:border-[#334155]"
                                />
                              );
                            }
                            return (
                              <a
                                key={att.id}
                                href={srcUrl}
                                download={att.filename}
                                className="flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs font-bold text-[#10B981] dark:border-[#334155] dark:bg-[#0F172A]"
                              >
                                <FileText className="h-4 w-4" />
                                <span>{att.filename}</span>
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            );
                          })}
                        </div>
                      )}

                    {!isVoice && !isMetric && (
                      <div className="mt-1 flex items-center gap-1.5 px-2 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        <span>{formatTime(msg.createdAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={dmStreamEndRef} />
          </div>
        </div>

        {/* Shared Message Composer in DM mode */}
        <MessageComposer mode="dm" />
      </section>
    );
  }

  // ============================================================================
  // MODE 2: FRIENDS OVERVIEW & MANAGEMENT STAGE ('friends')
  // ============================================================================
  return (
    <section
      aria-label="Quản lý bạn bè và lời mời kết bạn"
      className="flex h-full min-w-0 flex-1 flex-col text-[#0F172A] transition-colors duration-200 dark:text-[#F8FAFC]"
      style={{
        background: isDark
          ? 'var(--chat-stage-ambient, linear-gradient(180deg, #111815 0%, #131E19 45%, #0F1612 100%))'
          : 'var(--chat-stage-ambient, linear-gradient(180deg, #FFFFFF 0%, #F8FAF9 25%, #F1F7F5 70%, #ECF4F0 100%))',
      }}
    >
      {/* TOP FRIENDS NAVIGATION HEADER (56px) */}
      <header
        className={`flex h-[56px] shrink-0 items-center justify-between border-b px-4 backdrop-blur-md ${
          isDark ? 'border-[#1E2B25] bg-[#111815]/85' : 'border-[#E8EFEA]/80 bg-white/80'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-2 flex items-center gap-2 border-r border-[#CBD5E1] pr-4 dark:border-[#334155]">
            <Users className="h-5 w-5 text-[#2563EB]" />
            <h2 className="text-base font-bold">Bạn bè</h2>
          </div>

          {/* Tab 1: Online */}
          <button
            type="button"
            onClick={() => setActiveTab('online')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              activeTab === 'online'
                ? 'bg-[#2563EB] text-white shadow-2xs'
                : isDark
                ? 'text-[#CBD5E1] hover:bg-[#334155]'
                : 'text-[#475569] hover:bg-[#F1F5F9]'
            }`}
          >
            Trực tuyến ({onlineFriends.length})
          </button>

          {/* Tab 2: All Friends */}
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              activeTab === 'all'
                ? 'bg-[#2563EB] text-white shadow-2xs'
                : isDark
                ? 'text-[#CBD5E1] hover:bg-[#334155]'
                : 'text-[#475569] hover:bg-[#F1F5F9]'
            }`}
          >
            Tất cả bạn bè ({friendsList.length})
          </button>

          {/* Tab 3: Pending Requests */}
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              activeTab === 'pending'
                ? 'bg-[#2563EB] text-white shadow-2xs'
                : isDark
                ? 'text-[#CBD5E1] hover:bg-[#334155]'
                : 'text-[#475569] hover:bg-[#F1F5F9]'
            }`}
          >
            <span>Lời mời kết bạn</span>
            {pendingRequests.length > 0 && (
              <span className="rounded-full bg-[#F43F5E] px-1.5 py-0.2 text-[10px] font-bold text-white">
                {pendingRequests.length}
              </span>
            )}
          </button>

          {/* Tab 4: Add Friend */}
          <button
            type="button"
            onClick={() => setActiveTab('add')}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              activeTab === 'add'
                ? 'bg-[#10B981] text-white shadow-2xs'
                : 'bg-[#D1FAE5] text-[#059669] hover:bg-[#10B981] hover:text-white dark:bg-[#10B981]/20 dark:text-[#10B981]'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Thêm bạn</span>
          </button>
        </div>
      </header>

      {/* BODY CONTENT BY TAB */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl">
          {/* TAB: ADD FRIEND */}
          {activeTab === 'add' && (
            <div
              className={`rounded-2xl border p-6 shadow-xs ${
                isDark
                  ? 'border-[#334155] bg-[#0F172A]'
                  : 'border-[#E2E8F0] bg-[#F8FAFC]'
              }`}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2563EB] text-white">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    Thêm Bạn Bè Bằng Username
                  </h3>
                  <p
                    className={`text-xs ${
                      isDark ? 'text-[#94A3B8]' : 'text-[#64748B]'
                    }`}
                  >
                    Nhập tên đăng nhập (@username) của bạn học hoặc thành viên nhóm để kết nối.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSendFriendRequest} className="flex gap-2.5">
                <input
                  type="text"
                  value={addUsernameInput}
                  onChange={(e) => setAddUsernameInput(e.target.value)}
                  placeholder="Nhập username, ví dụ: bao_an hoặc anh_vinh..."
                  autoFocus
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium outline-none focus:border-[#2563EB] ${
                    isDark
                      ? 'border-[#334155] bg-[#1E293B] text-white placeholder-[#64748B]'
                      : 'border-[#CBD5E1] bg-white text-[#0F172A] placeholder-[#94A3B8]'
                  }`}
                />
                <button
                  type="submit"
                  disabled={isSendingRequest}
                  className="rounded-xl bg-[#2563EB] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#1D4ED8] disabled:opacity-50"
                >
                  {isSendingRequest ? 'Đang gửi...' : 'Gửi Lời Mời Kết Bạn'}
                </button>
              </form>

              {addStatusMessage && (
                <div
                  className={`mt-3 rounded-xl px-3.5 py-2.5 text-xs font-bold ${
                    addStatusMessage.type === 'success'
                      ? 'bg-[#D1FAE5] text-[#059669]'
                      : 'bg-[#FFE4E6] text-[#F43F5E]'
                  }`}
                >
                  {addStatusMessage.text}
                </div>
              )}
            </div>
          )}

          {/* TAB: PENDING FRIEND REQUESTS */}
          {activeTab === 'pending' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold tracking-wider uppercase text-[#64748B]">
                  Lời mời kết bạn đang chờ ({pendingRequests.length})
                </h3>
              </div>

              {pendingRequests.length > 0 ? (
                pendingRequests.map((req) => {
                  const isIncoming = req.direction === 'INCOMING';
                  const targetUser = req.user;

                  return (
                    <div
                      key={req.id}
                      className={`flex items-center justify-between rounded-2xl border p-4 transition ${
                        isDark
                          ? 'border-[#334155] bg-[#0F172A]'
                          : 'border-[#E2E8F0] bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          style={
                            targetUser?.avatarColor
                              ? { backgroundColor: targetUser.avatarColor }
                              : undefined
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2563EB] text-xs font-bold text-white"
                        >
                          {(
                            targetUser?.displayName ||
                            targetUser?.username ||
                            'U'
                          )
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-bold">
                            {targetUser?.displayName || targetUser?.username}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[#64748B]">
                            <span>@{targetUser?.username}</span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 text-[#0284C7]">
                              <Clock className="h-3 w-3" />
                              {isIncoming
                                ? 'Lời mời gửi đến bạn'
                                : 'Đang chờ đối phương đồng ý'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isIncoming ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => respondFriendRequest(req.id, true)}
                            className="flex items-center gap-1 rounded-xl bg-[#10B981] px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-[#059669]"
                          >
                            <Check className="h-4 w-4" />
                            <span>Chấp nhận</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => respondFriendRequest(req.id, false)}
                            className="flex items-center gap-1 rounded-xl bg-[#FFE4E6] px-3.5 py-2 text-xs font-bold text-[#F43F5E] transition hover:bg-[#F43F5E] hover:text-white"
                          >
                            <X className="h-4 w-4" />
                            <span>Từ chối</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => respondFriendRequest(req.id, false)}
                          className="rounded-xl bg-[#FFE4E6] px-3 py-1.5 text-xs font-bold text-[#F43F5E] hover:bg-[#F43F5E] hover:text-white"
                        >
                          Hủy lời mời
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div
                  className={`rounded-2xl border border-dashed p-10 text-center ${
                    isDark
                      ? 'border-[#334155] text-[#94A3B8]'
                      : 'border-[#CBD5E1] text-[#64748B]'
                  }`}
                >
                  <Sparkles className="mx-auto mb-2 h-8 w-8 text-[#2563EB]" />
                  <p className="text-sm font-bold">
                    Không có lời mời kết bạn nào đang chờ xử lý
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB: ONLINE OR ALL FRIENDS */}
          {(activeTab === 'online' || activeTab === 'all') && (
            <div className="space-y-4">
              {/* Filter Input */}
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Tìm kiếm bạn bè theo tên hoặc @username..."
                  className={`w-full rounded-xl border py-2.5 pr-4 pl-10 text-sm outline-none transition focus:border-[#2563EB] ${
                    isDark
                      ? 'border-[#334155] bg-[#0F172A] text-white placeholder-[#64748B]'
                      : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8]'
                  }`}
                />
              </div>

              <div className="text-xs font-bold tracking-wider uppercase text-[#64748B]">
                {activeTab === 'online'
                  ? `Bạn bè đang trực tuyến — ${filteredFriends.length}`
                  : `Tất cả bạn bè — ${filteredFriends.length}`}
              </div>

              {filteredFriends.length > 0 ? (
                <div className="space-y-2">
                  {filteredFriends.map((friend) => {
                    const pMeta = getPresenceMeta(friend.status);
                    return (
                      <div
                        key={friend.id}
                        className={`flex items-center justify-between rounded-2xl border p-3.5 transition ${
                          isDark
                            ? 'border-[#334155] bg-[#0F172A] hover:border-[#3B82F6]'
                            : 'border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#2563EB] hover:bg-white'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative shrink-0">
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2563EB] text-xs font-bold text-white"
                              style={
                                friend.avatarColor
                                  ? { backgroundColor: friend.avatarColor }
                                  : undefined
                              }
                            >
                              {(friend.displayName || friend.username || 'F')
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <span
                              className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full ring-2 ${
                                isDark ? 'ring-[#0F172A]' : 'ring-white'
                              } ${pMeta.dot}`}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-bold">
                                {friend.displayName || friend.username}
                              </span>
                              <span className="font-mono text-xs text-[#64748B]">
                                @{friend.username}
                              </span>
                            </div>
                            <div className="truncate text-xs text-[#64748B]">
                              {friend.customStatus || pMeta.text}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartDmWithFriend(friend.id)}
                            className="flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-[#1D4ED8]"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>Nhắn tin (DM)</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleQuickVoiceCall}
                            title="Gọi thoại/video WebRTC"
                            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                              isDark
                                ? 'border-[#334155] bg-[#1E293B] text-[#10B981] hover:bg-[#10B981] hover:text-white'
                                : 'border-[#CBD5E1] bg-white text-[#059669] hover:bg-[#10B981] hover:text-white'
                            }`}
                          >
                            <Phone className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  className={`rounded-2xl border border-dashed p-10 text-center ${
                    isDark
                      ? 'border-[#334155] text-[#94A3B8]'
                      : 'border-[#CBD5E1] text-[#64748B]'
                  }`}
                >
                  <Radio className="mx-auto mb-2 h-8 w-8 text-[#2563EB]" />
                  <p className="text-sm font-bold">
                    {activeTab === 'online'
                      ? 'Hiện chưa có người bạn nào đang trực tuyến'
                      : 'Danh sách bạn bè đang trống'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('add')}
                    className="mt-3 rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-bold text-white hover:bg-[#1D4ED8]"
                  >
                    + Thêm bạn mới
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default FriendsAndDmStage;
