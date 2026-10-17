import React, { useState, useRef, useEffect } from 'react';
import {
  Hash,
  Pin,
  Search,
  Users,
  Activity,
  Reply,
  Smile,
  Edit3,
  Trash2,
  Download,
  FileText,
  X,
  CornerUpRight,
  Radio,
  ZoomIn,
  Check,
  CheckCheck,
} from 'lucide-react';
import { useAppStore } from '../../shared/state/appStore';
import type {
  Message,
  Attachment,
  ReactionGroup,
} from '../../shared/types/api';
import { MessageComposer } from './MessageComposer';
import { VoiceWaveformPlayer } from './VoiceWaveformPlayer';
import { NetworkMetricCard } from './NetworkMetricCard';

const QUICK_REACTION_EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉', '👀'];

/**
 * XSS-safe inline Markdown & @mention parser returning React nodes
 */
function renderFormattedInline(
  text: string,
  currentUsername?: string,
  isDark?: boolean
): React.ReactNode[] {
  const tokenRegex =
    /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|https?:\/\/[^\s<]+|@[a-zA-Z0-9_.-]+)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={index}
          className={`rounded border px-1.5 py-0.5 font-mono text-[12.5px] ${
            isDark
              ? 'border-[#334155] bg-[#0F172A] text-[#38BDF8]'
              : 'border-[#E2E8F0] bg-[#F1F5F9] text-[#0284C7]'
          }`}
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={index} className="font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={index} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }

    if (/^https?:\/\/[^\s<]+$/.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#0284C7] underline decoration-[#0284C7]/50 underline-offset-2 hover:text-[#2563EB]"
        >
          {part}
        </a>
      );
    }

    if (/^@[a-zA-Z0-9_.-]+$/.test(part)) {
      const target = part.slice(1).toLowerCase();
      const isSelf =
        target === 'all' ||
        Boolean(currentUsername && target === currentUsername.toLowerCase());
      return (
        <span
          key={index}
          className={`inline-flex items-center rounded px-1.5 py-0.2 font-bold ${
            isSelf
              ? 'bg-[#2563EB] text-white shadow-2xs'
              : isDark
              ? 'bg-[#3B82F6]/20 text-[#3B82F6]'
              : 'bg-[#DBEAFE] text-[#2563EB]'
          }`}
        >
          {part}
        </span>
      );
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

/**
 * Full XSS-safe Markdown block renderer (supports fenced ```code```, > blockquotes, and lines)
 */
export const SafeMarkdownContent: React.FC<{
  content: string;
  currentUsername?: string;
  isDark?: boolean;
}> = ({ content, currentUsername, isDark }) => {
  if (!content) return null;

  const segments = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-1.5 text-[15px] leading-relaxed break-words">
      {segments.map((segment, segIdx) => {
        if (segment.startsWith('```') && segment.endsWith('```')) {
          const rawInner = segment.slice(3, -3).replace(/^\r?\n/, '');
          const firstNewLine = rawInner.indexOf('\n');
          let lang = '';
          let codeBody = rawInner;
          if (firstNewLine !== -1) {
            const firstLine = rawInner.slice(0, firstNewLine).trim();
            if (/^[a-zA-Z0-9_-]{1,15}$/.test(firstLine)) {
              lang = firstLine;
              codeBody = rawInner.slice(firstNewLine + 1);
            }
          }

          return (
            <div
              key={segIdx}
              className={`my-1.5 overflow-hidden rounded-xl border font-mono text-xs ${
                isDark
                  ? 'border-[#334155] bg-[#0B1120] text-[#F8FAFC]'
                  : 'border-[#CBD5E1] bg-[#0F172A] text-[#F8FAFC]'
              }`}
            >
              {lang && (
                <div className="flex items-center justify-between border-b border-[#334155] bg-[#1E293B] px-3 py-1 text-[10px] font-bold uppercase text-[#38BDF8]">
                  <span>{lang}</span>
                  <span>CODE</span>
                </div>
              )}
              <pre className="overflow-x-auto p-3 leading-relaxed">
                <code>{codeBody}</code>
              </pre>
            </div>
          );
        }

        const lines = segment.split('\n');
        return (
          <React.Fragment key={segIdx}>
            {lines.map((line, lineIdx) => {
              if (line.trim().startsWith('>')) {
                const quoteText = line.replace(/^\s*>\s?/, '');
                return (
                  <blockquote
                    key={lineIdx}
                    className={`my-1 border-l-4 border-[#2563EB] pl-3 italic ${
                      isDark
                        ? 'bg-[#0F172A]/50 py-1 text-[#CBD5E1]'
                        : 'bg-[#EFF6FF]/70 py-1 text-[#475569]'
                    }`}
                  >
                    {renderFormattedInline(quoteText, currentUsername, isDark)}
                  </blockquote>
                );
              }

              return (
                <React.Fragment key={lineIdx}>
                  {renderFormattedInline(line, currentUsername, isDark)}
                  {lineIdx < lines.length - 1 && <br />}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const ChatStage: React.FC = () => {
  const {
    currentUser,
    theme,
    activeGuild,
    activeChannel,
    messages,
    pinnedMessages,
    searchResults,
    searchQuery,
    members,
    editingMessage,
    setReplyingTo,
    setEditingMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    togglePinMessage,
    searchChannelMessages,
    isMonitorOpen,
    setMonitorOpen,
    isMemberSidebarOpen,
    setMemberSidebarOpen,
  } = useAppStore();

  const isDark = theme === 'dark';

  const [localSearchInput, setLocalSearchInput] = useState(searchQuery || '');
  const [isSearchPopoverOpen, setIsSearchPopoverOpen] = useState(false);
  const [isPinsPopoverOpen, setIsPinsPopoverOpen] = useState(false);
  const [openReactionPickerMsgId, setOpenReactionPickerMsgId] = useState<
    number | null
  >(null);
  const [inlineEditText, setInlineEditText] = useState('');
  const [lightboxAttachment, setLightboxAttachment] =
    useState<Attachment | null>(null);

  const streamEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages?.length, activeChannel?.id]);

  const myMember = Array.isArray(members)
    ? members.find((m) => m.id === currentUser?.id)
    : undefined;
  const canModerate =
    myMember?.role === 'OWNER' ||
    myMember?.role === 'ADMIN' ||
    currentUser?.role === 'OWNER' ||
    currentUser?.role === 'ADMIN' ||
    Boolean(
      activeGuild && currentUser && activeGuild.ownerId === currentUser.id
    );

  const channelMessages: Message[] = Array.isArray(messages) ? messages : [];
  const effectivePinned: Message[] =
    Array.isArray(pinnedMessages) && pinnedMessages.length > 0
      ? pinnedMessages
      : channelMessages.filter((m) => m.pinned && !m.deletedAt);

  const scrollToMessage = (messageId: number) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-[#2563EB]');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-[#2563EB]');
      }, 1800);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = localSearchInput.trim();
    searchChannelMessages(q);
    setIsSearchPopoverOpen(Boolean(q));
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const formatDateDivider = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return 'Hôm nay';
    }
  };

  const isSameDay = (iso1: string, iso2: string) => {
    try {
      const d1 = new Date(iso1);
      const d2 = new Date(iso2);
      return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
      );
    } catch {
      return true;
    }
  };

  const isGroupedWithPrevious = (curr: Message, prev?: Message) => {
    if (!prev) return false;
    if (curr.senderId !== prev.senderId) return false;
    if (curr.replyTo) return false;
    if (!isSameDay(curr.createdAt, prev.createdAt)) return false;
    try {
      const diffMs =
        new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
      return diffMs >= 0 && diffMs < 5 * 60 * 1000;
    } catch {
      return false;
    }
  };

  const handleSaveInlineEdit = async (msgId: number) => {
    const trimmed = inlineEditText.trim();
    if (trimmed) {
      await editMessage(msgId, trimmed);
    }
    setEditingMessage(null);
  };

  return (
    <section
      aria-label="Khu vực trò chuyện chính"
      className={`relative flex h-full min-w-0 flex-1 flex-col transition-colors duration-200 ${
        isDark ? 'bg-[#1E293B] text-[#F8FAFC]' : 'bg-white text-[#0F172A]'
      }`}
    >
      {/* STICKY TOP HEADER (64px, modern minimalist style from reference image) */}
      <header
        className={`sticky top-0 z-20 flex h-[64px] shrink-0 items-center justify-between border-b px-5 backdrop-blur-md transition-colors ${
          isDark
            ? 'border-[#1E2B25] bg-[#111815]/90'
            : 'border-[#E8EFEA] bg-white/90'
        }`}
      >
        {/* Left: Contact/Channel Avatar + Name + Online status indicator */}
        <div className="flex min-w-0 flex-1 items-center gap-3 pr-3">
          <div className="relative shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#111820] dark:bg-emerald-500 text-white dark:text-[#090E0C] text-sm font-extrabold shadow-2xs">
              {activeChannel?.name ? activeChannel.name[0].toUpperCase() : 'C'}
            </div>
            <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full bg-[#10B981] ring-2 ring-white dark:ring-[#111815]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-[15.5px] font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
                {activeChannel?.name ? `#${activeChannel.name}` : 'General Chat'}
              </h2>

              {/* Live Transport Bridge Badge */}
              <span
                title="Đồng bộ đa giao thức: WebSocket (:8081) ↔ TCP (:5000) ↔ UDP (:5001)"
                className="hidden xl:inline-flex items-center gap-1 rounded-full bg-[#E8F2EC] dark:bg-[#1B2922] px-2 py-0.5 font-mono text-[9.5px] font-bold text-[#10B981]"
              >
                <Radio className="h-2.5 w-2.5 text-[#10B981]" />
                <span>WS + TCP + UDP</span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                <span>Online</span>
              </span>
              {activeChannel?.topic && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-[280px]">{activeChannel.topic}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Search, Pinned Messages, Network Monitor, Member Sidebar Toggle */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Search Input */}
          <div className="relative hidden md:block">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                value={localSearchInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setLocalSearchInput(val);
                  searchChannelMessages(val);
                  setIsSearchPopoverOpen(Boolean(val.trim()));
                }}
                onFocus={() => {
                  if (localSearchInput.trim()) setIsSearchPopoverOpen(true);
                }}
                placeholder="Tìm tin nhắn (Full-text)..."
                className={`h-8 w-44 rounded-lg border pr-7 pl-8 text-xs font-medium transition-all outline-none focus:w-60 focus:border-[#2563EB] ${
                  isDark
                    ? 'border-[#334155] bg-[#0F172A] text-white placeholder-[#64748B]'
                    : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#64748B]'
                }`}
              />
              {localSearchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearchInput('');
                    searchChannelMessages('');
                    setIsSearchPopoverOpen(false);
                  }}
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </form>

            {/* Search Results Popover */}
            {isSearchPopoverOpen && (
              <div
                className={`absolute top-10 right-0 z-50 max-h-96 w-80 overflow-y-auto rounded-2xl border p-3 shadow-2xl ${
                  isDark
                    ? 'border-[#334155] bg-[#0F172A] text-[#F8FAFC]'
                    : 'border-[#E2E8F0] bg-white text-[#0F172A]'
                }`}
              >
                <div className="mb-2 flex items-center justify-between border-b border-[#E2E8F0] pb-1.5 dark:border-[#334155]">
                  <span className="text-xs font-bold">
                    Kết quả tìm kiếm ({searchResults?.length || 0})
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSearchPopoverOpen(false)}
                    className="rounded p-0.5 text-[#64748B] hover:text-[#0F172A]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {Array.isArray(searchResults) && searchResults.length > 0 ? (
                  <div className="space-y-1.5">
                    {searchResults.map((resMsg) => (
                      <button
                        key={resMsg.id}
                        type="button"
                        onClick={() => {
                          scrollToMessage(resMsg.id);
                          setIsSearchPopoverOpen(false);
                        }}
                        className={`w-full rounded-xl border p-2 text-left text-xs transition ${
                          isDark
                            ? 'border-[#334155] bg-[#1E293B] hover:border-[#3B82F6]'
                            : 'border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#2563EB]'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-[#2563EB] dark:text-[#3B82F6]">
                          <span>{resMsg.senderName}</span>
                          <span className="font-mono text-[10px] text-[#64748B]">
                            {formatTime(resMsg.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2">{resMsg.content}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-[#64748B]">
                    Không tìm thấy tin nhắn khớp với &ldquo;{localSearchInput}&rdquo;
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pinned Messages Popover Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsPinsPopoverOpen(!isPinsPopoverOpen)}
              aria-label="Tin nhắn đã ghim"
              title="Tin nhắn đã ghim (Pinned Messages)"
              className={`relative flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-bold transition ${
                isPinsPopoverOpen
                  ? 'border-[#F59E0B] bg-[#FEF3C7] text-[#D97706]'
                  : isDark
                  ? 'border-[#334155] bg-[#0F172A] text-[#CBD5E1] hover:border-[#F59E0B]'
                  : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] hover:border-[#F59E0B]'
              }`}
            >
              <Pin className="h-3.5 w-3.5 text-[#F59E0B]" />
              <span>{effectivePinned.length}</span>
            </button>

            {isPinsPopoverOpen && (
              <div
                className={`absolute top-10 right-0 z-50 max-h-96 w-80 overflow-y-auto rounded-2xl border p-3 shadow-2xl ${
                  isDark
                    ? 'border-[#334155] bg-[#0F172A] text-[#F8FAFC]'
                    : 'border-[#E2E8F0] bg-white text-[#0F172A]'
                }`}
              >
                <div className="mb-2 flex items-center justify-between border-b border-[#E2E8F0] pb-2 dark:border-[#334155]">
                  <span className="flex items-center gap-1.5 text-xs font-bold">
                    <Pin className="h-3.5 w-3.5 text-[#F59E0B]" />
                    <span>Tin nhắn đã ghim ({effectivePinned.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPinsPopoverOpen(false)}
                    className="rounded p-0.5 text-[#64748B]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {effectivePinned.length > 0 ? (
                  <div className="space-y-2">
                    {effectivePinned.map((pinMsg) => (
                      <div
                        key={pinMsg.id}
                        className={`rounded-xl border p-2.5 text-xs ${
                          isDark
                            ? 'border-[#334155] bg-[#1E293B]'
                            : 'border-[#E2E8F0] bg-[#F8FAFC]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#2563EB] dark:text-[#3B82F6]">
                            {pinMsg.senderName}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                scrollToMessage(pinMsg.id);
                                setIsPinsPopoverOpen(false);
                              }}
                              className="rounded px-1.5 py-0.5 text-[10px] font-bold text-[#2563EB] hover:bg-[#DBEAFE]"
                            >
                              Đi tới
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                togglePinMessage(pinMsg.id, false)
                              }
                              title="Bỏ ghim"
                              className="rounded p-0.5 text-[#64748B] hover:text-[#F43F5E]"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <p className="mt-1 line-clamp-3">{pinMsg.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-[#64748B]">
                    Chưa có tin nhắn nào được ghim trong kênh này.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Network Monitor Button */}
          <button
            type="button"
            onClick={() => setMonitorOpen(!isMonitorOpen)}
            aria-label="Mở bảng giám sát giao thức TCP/UDP"
            className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition ${
              isMonitorOpen
                ? 'border-[#2563EB] bg-[#2563EB] text-white shadow-xs'
                : isDark
                ? 'border-[#334155] bg-[#0F172A] text-[#38BDF8] hover:border-[#3B82F6]'
                : 'border-[#DBEAFE] bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE]'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Protocol Monitor</span>
          </button>

          {/* Member Sidebar Toggle */}
          <button
            type="button"
            onClick={() => setMemberSidebarOpen(!isMemberSidebarOpen)}
            aria-label="Ẩn/Hiện danh sách thành viên"
            title="Ẩn/Hiện danh sách thành viên"
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
              isMemberSidebarOpen
                ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB] dark:bg-[#3B82F6]/20 dark:text-[#3B82F6]'
                : isDark
                ? 'border-[#334155] bg-[#0F172A] text-[#94A3B8]'
                : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]'
            }`}
          >
            <Users className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* MESSAGE STREAM */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Channel Welcome Hero Banner */}
        <div
          className={`mb-6 rounded-2xl border p-5 ${
            isDark
              ? 'border-[#334155] bg-[#0F172A]/60'
              : 'border-[#DBEAFE] bg-gradient-to-r from-[#EFF6FF] to-[#F8FAFC]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563EB] text-white shadow-sm">
              <Hash className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">
                Chào mừng đến với #{activeChannel?.name || 'general'}!
              </h3>
              <p
                className={`text-xs ${
                  isDark ? 'text-[#94A3B8]' : 'text-[#475569]'
                }`}
              >
                {activeChannel?.topic ||
                  'Kênh thảo luận thời gian thực kết nối song song giữa Web Client (WebSocket :8081) và Java Swing Desktop (TCP Socket :5000).'}
              </p>
            </div>
          </div>
        </div>

        {/* Messages List */}
        <div className="space-y-1">
          {channelMessages.map((msg, idx) => {
            const prevMsg = idx > 0 ? channelMessages[idx - 1] : undefined;
            const showDateDivider =
              !prevMsg || !isSameDay(msg.createdAt, prevMsg.createdAt);
            const isGrouped =
              !showDateDivider && isGroupedWithPrevious(msg, prevMsg);

            const isOwnMessage = currentUser?.id === msg.senderId;
            const isDeleted = Boolean(msg.deletedAt);
            const isEditingThis = editingMessage?.id === msg.id;

            const mentionsMe =
              Boolean(
                currentUser?.username &&
                  msg.content
                    ?.toLowerCase()
                    .includes(`@${currentUser.username.toLowerCase()}`)
              ) || Boolean(msg.content?.toLowerCase().includes('@all'));

            return (
              <React.Fragment key={msg.id}>
                {/* Date Divider */}
                {showDateDivider && (
                  <div className="my-5 flex items-center gap-3">
                    <div
                      className={`h-[1px] flex-1 ${
                        isDark ? 'bg-[#334155]' : 'bg-[#E2E8F0]'
                      }`}
                    />
                    <span
                      className={`rounded-full border px-3 py-0.5 text-[11px] font-bold ${
                        isDark
                          ? 'border-[#334155] bg-[#0F172A] text-[#94A3B8]'
                          : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]'
                      }`}
                    >
                      {formatDateDivider(msg.createdAt)}
                    </span>
                    <div
                      className={`h-[1px] flex-1 ${
                        isDark ? 'bg-[#334155]' : 'bg-[#E2E8F0]'
                      }`}
                    />
                  </div>
                )}

                {/* Message Row */}
                <div
                  id={`msg-${msg.id}`}
                  className={`group relative transition-all ${
                    isGrouped ? 'mt-1' : 'mt-3.5'
                  }`}
                >
                  {(() => {
                    const isMe = Boolean(currentUser && msg.senderId === currentUser.id);
                    const isVoice = msg.content?.includes('[Voice Message]') || msg.content?.startsWith('/voice');
                    const isMetric = msg.content?.includes('[Network Metric]') || msg.content?.startsWith('/metric');

                    return (
                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} w-full`}>
                        {/* REPLY REFERENCE BANNER (↱ @sender: preview) */}
                        {msg.replyTo && (
                          <button
                            type="button"
                            onClick={() => scrollToMessage(msg.replyTo!.messageId)}
                            className={`mb-1 flex max-w-full items-center gap-1.5 truncate text-left text-xs transition hover:underline ${
                              isDark ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            <CornerUpRight className="h-3.5 w-3.5 shrink-0 text-[#10B981]" />
                            <span className="font-bold text-[#10B981]">
                              @{msg.replyTo.senderName}
                            </span>
                            <span className="truncate opacity-85">
                              {msg.replyTo.content}
                            </span>
                          </button>
                        )}

                        {/* Sender info for incoming messages if not grouped */}
                        {!isMe && !isGrouped && (
                          <div className="flex items-center gap-2 mb-1 pl-1">
                            <span className="text-xs font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                              {msg.senderName}
                            </span>
                            {msg.transport && (
                              <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#E8F2EC] dark:bg-[#1B2922] text-[#10B981]">
                                {msg.transport}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Special Voice Waveform Player */}
                        {isVoice ? (
                          <VoiceWaveformPlayer isOutgoing={isMe} timestamp={formatTime(msg.createdAt)} />
                        ) : isMetric ? (
                          <NetworkMetricCard
                            isOutgoing={isMe}
                            attachments={msg.attachments}
                            timestamp={formatTime(msg.createdAt)}
                          />
                        ) : (
                          /* Standard High Contrast Message Bubble */
                          <div
                            className={`relative max-w-[85%] sm:max-w-[70%] rounded-[22px] px-4.5 py-3 transition-shadow ${
                              isMe
                                ? 'bg-white dark:bg-[#1C2822] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E5EFE9] dark:border-[#283830] shadow-xs'
                                : 'bg-[#111820] dark:bg-[#141C18] text-white shadow-xs'
                            } ${
                              mentionsMe
                                ? isDark
                                  ? 'ring-2 ring-emerald-500'
                                  : 'ring-2 ring-[#10B981]'
                                : ''
                            }`}
                          >
                            {/* Deleted / Editing / Normal Content */}
                            {isDeleted ? (
                              <p className="text-xs italic opacity-70">
                                (Tin nhắn này đã bị thu hồi)
                              </p>
                            ) : isEditingThis ? (
                              <div className="space-y-2">
                                <textarea
                                  rows={2}
                                  value={inlineEditText}
                                  onChange={(e) => setInlineEditText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSaveInlineEdit(msg.id);
                                    } else if (e.key === 'Escape') {
                                      setEditingMessage(null);
                                    }
                                  }}
                                  className={`w-full rounded-xl border p-2 text-sm outline-none ${
                                    isMe
                                      ? 'bg-slate-50 dark:bg-black/20 text-[#0F172A] dark:text-white border-slate-300'
                                      : 'bg-white/10 text-white border-white/20'
                                  }`}
                                />
                                <div className="flex items-center gap-2 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveInlineEdit(msg.id)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-[#10B981] px-2.5 py-1 font-bold text-white shadow-2xs"
                                  >
                                    <Check className="h-3 w-3" />
                                    <span>Lưu</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingMessage(null)}
                                    className="px-2 py-1 font-semibold opacity-70 hover:opacity-100"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <SafeMarkdownContent
                                  content={msg.content}
                                  currentUsername={currentUser?.username}
                                  isDark={isDark || !isMe}
                                />
                                {msg.editedAt && (
                                  <span className="ml-1.5 text-[10px] italic opacity-60">
                                    (đã sửa)
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Pin Indicator */}
                            {msg.pinned && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-[#F59E0B]">
                                <Pin className="h-2.5 w-2.5" />
                                <span>Đã ghim</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ATTACHMENTS (Images with Lightbox + File Cards) */}
                        {!isDeleted &&
                          Array.isArray(msg.attachments) &&
                          msg.attachments.length > 0 &&
                          !isMetric && (
                            <div className="mt-2 flex flex-wrap gap-2.5">
                              {msg.attachments.map((att) => {
                                const isImg =
                                  att.contentType?.startsWith('image/') ||
                                  /\.(png|jpe?g|gif|webp)$/i.test(att.filename);
                                const srcUrl = att.dataUrl || att.url;

                                if (isImg) {
                                  return (
                                    <button
                                      key={att.id}
                                      type="button"
                                      onClick={() => setLightboxAttachment(att)}
                                      className="group/img relative overflow-hidden rounded-2xl border border-[#CBD5E1] dark:border-[#334155]"
                                    >
                                      <img
                                        src={srcUrl}
                                        alt={att.filename}
                                        className="max-h-60 max-w-xs object-cover transition duration-200 group-hover/img:scale-[1.02]"
                                      />
                                      <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-lg bg-slate-950/70 px-2 py-1 text-[10px] font-bold text-white opacity-0 transition group-hover/img:opacity-100">
                                        <ZoomIn className="h-3 w-3" />
                                        Phóng to
                                      </span>
                                    </button>
                                  );
                                }

                                return (
                                  <a
                                    key={att.id}
                                    href={srcUrl}
                                    download={att.filename}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-xs transition ${
                                      isDark
                                        ? 'border-[#283830] bg-[#141C18] hover:border-[#10B981]'
                                        : 'border-[#E5EFE9] bg-[#F7FAF8] hover:border-[#10B981]'
                                    }`}
                                  >
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F5EE] text-[#059669]">
                                      <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="truncate font-bold">
                                        {att.filename}
                                      </div>
                                      <div className="font-mono text-[10px] text-[#64748B]">
                                        {(att.sizeBytes / 1024).toFixed(1)} KB •{' '}
                                        {att.contentType}
                                      </div>
                                    </div>
                                    <Download className="h-4 w-4 text-[#10B981]" />
                                  </a>
                                );
                              })}
                            </div>
                          )}

                        {/* REACTIONS BAR */}
                        {!isDeleted &&
                          Array.isArray(msg.reactions) &&
                          msg.reactions.length > 0 && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              {msg.reactions.map((rg: ReactionGroup) => {
                                const reactedByMe =
                                  rg.me ||
                                  Boolean(
                                    currentUser &&
                                      Array.isArray(rg.userIds) &&
                                      rg.userIds.includes(currentUser.id)
                                  );

                                return (
                                  <button
                                    key={rg.emoji}
                                    type="button"
                                    onClick={() =>
                                      toggleReaction(msg.id, rg.emoji)
                                    }
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold transition active:scale-95 ${
                                      reactedByMe
                                        ? 'border-[#10B981] bg-[#E8F5EE] text-[#059669] dark:bg-[#10B981]/20 dark:text-[#10B981]'
                                        : isDark
                                        ? 'border-[#283830] bg-[#141C18] text-[#CBD5E1] hover:border-[#64748B]'
                                        : 'border-[#E5EFE9] bg-[#F7FAF8] text-[#475569] hover:border-[#CBD5E1]'
                                    }`}
                                  >
                                    <span>{rg.emoji}</span>
                                    <span className="font-mono text-[11px]">
                                      {rg.count}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                        {/* Timestamp & Delivery status tick (from reference image) */}
                        {!isVoice && !isMetric && (
                          <div className={`flex items-center gap-1.5 mt-1 px-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500`}>
                            <span>{formatTime(msg.createdAt)}</span>
                            {isMe && <CheckCheck className="h-3.5 w-3.5 text-[#10B981]" />}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* HOVER FLOATING ACTION TOOLBAR */}
                  {!isDeleted && (
                    <div
                      className={`absolute -top-3 right-4 z-10 hidden items-center gap-0.5 rounded-xl border p-1 shadow-md group-hover:flex ${
                        isDark
                          ? 'border-[#334155] bg-[#0F172A]'
                          : 'border-[#E2E8F0] bg-white'
                      }`}
                    >
                      {/* Quick Emojis */}
                      {QUICK_REACTION_EMOJIS.slice(0, 3).map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => toggleReaction(msg.id, emoji)}
                          title={`Thả cảm xúc ${emoji}`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-sm transition hover:bg-[#EFF6FF] dark:hover:bg-[#1E293B]"
                        >
                          {emoji}
                        </button>
                      ))}

                      {/* More Reactions Picker Toggle */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenReactionPickerMsgId(
                              openReactionPickerMsgId === msg.id ? null : msg.id
                            )
                          }
                          title="Thêm biểu tượng cảm xúc"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#2563EB] dark:hover:bg-[#1E293B]"
                        >
                          <Smile className="h-4 w-4" />
                        </button>

                        {openReactionPickerMsgId === msg.id && (
                          <div
                            className={`absolute top-8 right-0 z-30 flex gap-1 rounded-xl border p-1.5 shadow-xl ${
                              isDark
                                ? 'border-[#334155] bg-[#1E293B]'
                                : 'border-[#E2E8F0] bg-white'
                            }`}
                          >
                            {QUICK_REACTION_EMOJIS.map((em) => (
                              <button
                                key={em}
                                type="button"
                                onClick={() => {
                                  toggleReaction(msg.id, em);
                                  setOpenReactionPickerMsgId(null);
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-base hover:bg-[#EFF6FF] dark:hover:bg-[#334155]"
                              >
                                {em}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Reply */}
                      <button
                        type="button"
                        onClick={() => setReplyingTo(msg)}
                        title="Trả lời (Reply)"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#2563EB] dark:hover:bg-[#1E293B]"
                      >
                        <Reply className="h-4 w-4" />
                      </button>

                      {/* Pin / Unpin */}
                      <button
                        type="button"
                        onClick={() => togglePinMessage(msg.id, !msg.pinned)}
                        title={msg.pinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg hover:bg-[#FEF3C7] ${
                          msg.pinned ? 'text-[#F59E0B]' : 'text-[#64748B]'
                        }`}
                      >
                        <Pin className="h-4 w-4" />
                      </button>

                      {/* Edit (Own message only) */}
                      {isOwnMessage && (
                        <button
                          type="button"
                          onClick={() => {
                            setInlineEditText(msg.content);
                            setEditingMessage(msg);
                          }}
                          title="Chỉnh sửa tin nhắn"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#2563EB] dark:hover:bg-[#1E293B]"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      )}

                      {/* Delete (Own message or Owner/Admin) */}
                      {(isOwnMessage || canModerate) && (
                        <button
                          type="button"
                          onClick={() => deleteMessage(msg.id)}
                          title="Xóa tin nhắn"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#FFE4E6] hover:text-[#F43F5E]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
          <div ref={streamEndRef} />
        </div>
      </div>

      {/* MESSAGE COMPOSER */}
      <MessageComposer mode="channel" />

      {/* IMAGE ZOOM LIGHTBOX MODAL */}
      {lightboxAttachment && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 p-6 backdrop-blur-xs"
          onClick={() => setLightboxAttachment(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[85vh] max-w-4xl overflow-hidden rounded-2xl border border-[#334155] bg-[#0F172A] p-2 shadow-2xl"
          >
            <img
              src={lightboxAttachment.dataUrl || lightboxAttachment.url}
              alt={lightboxAttachment.filename}
              className="max-h-[75vh] w-auto rounded-xl object-contain"
            />
            <div className="mt-2 flex items-center justify-between px-3 py-1 text-xs text-white">
              <div>
                <span className="font-bold">{lightboxAttachment.filename}</span>
                <span className="ml-2 font-mono text-[#94A3B8]">
                  ({(lightboxAttachment.sizeBytes / 1024).toFixed(1)} KB)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxAttachment.dataUrl || lightboxAttachment.url}
                  download={lightboxAttachment.filename}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg bg-[#2563EB] px-3 py-1.5 font-bold text-white hover:bg-[#1D4ED8]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Tải xuống</span>
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxAttachment(null)}
                  className="rounded-lg bg-[#334155] p-1.5 text-white hover:bg-[#475569]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ChatStage;
