import React, { useState, useRef, useEffect } from 'react';
import {
  Paperclip,
  Send,
  Smile,
  X,
  Reply,
  Edit3,
  FileText,
  Image as ImageIcon,
  Radio,
  AtSign,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '../../shared/state/appStore';
import type { Attachment } from '../../shared/types/api';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉', '👀', '🚀', '💯'];

export interface MessageComposerProps {
  mode?: 'channel' | 'dm';
  placeholder?: string;
}

interface PendingAttachmentItem {
  localId: string;
  file: File;
  previewUrl?: string;
  uploading: boolean;
  uploaded?: Attachment;
  error?: string;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  mode,
  placeholder,
}) => {
  const {
    currentUser,
    theme,
    viewMode,
    activeChannel,
    activeDmId,
    dmConversations,
    members,
    friends,
    typingUsers,
    replyingTo,
    editingMessage,
    setReplyingTo,
    setEditingMessage,
    sendMessage,
    sendDmMessage,
    editMessage,
    uploadFile,
    notifyTyping,
  } = useAppStore();

  const effectiveMode = mode || (viewMode === 'dm' ? 'dm' : 'channel');
  const isDark = theme === 'dark';

  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachmentItem[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  // @mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  // Focus textarea when editingMessage or replyingTo changes
  useEffect(() => {
    if (editingMessage || replyingTo) {
      textareaRef.current?.focus();
    }
  }, [editingMessage, replyingTo]);

  // Build mention candidates list (@all + channel members or friends)
  const mentionCandidates = React.useMemo(() => {
    const list: { username: string; displayName: string; role?: string }[] = [
      {
        username: 'all',
        displayName: 'Tất cả thành viên trong kênh (@all)',
        role: 'BROADCAST',
      },
    ];
    const seen = new Set<string>(['all']);

    if (Array.isArray(members)) {
      for (const m of members) {
        const uname = m.username;
        if (uname && !seen.has(uname)) {
          seen.add(uname);
          list.push({
            username: uname,
            displayName: m.displayName || uname,
            role: m.role,
          });
        }
      }
    }
    if (Array.isArray(friends)) {
      for (const f of friends) {
        if (f.username && !seen.has(f.username)) {
          seen.add(f.username);
          list.push({
            username: f.username,
            displayName: f.displayName || f.username,
          });
        }
      }
    }
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return list
      .filter(
        (item) =>
          item.username.toLowerCase().includes(q) ||
          item.displayName.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [members, friends, mentionQuery]);

  const triggerThrottledTyping = () => {
    const now = Date.now();
    if (now - lastTypingSentRef.current > 2200) {
      lastTypingSentRef.current = now;
      try {
        notifyTyping(true);
      } catch {
        // Ignore if socket not connected
      }
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    triggerThrottledTyping();

    // Detect @mention token right before cursor
    const cursor = e.target.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_.-]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (username: string) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart ?? content.length;
    const textBeforeCursor = content.slice(0, cursor);
    const textAfterCursor = content.slice(cursor);
    const replacedBefore = textBeforeCursor.replace(
      /(?:^|\s)@([a-zA-Z0-9_.-]*)$/,
      (full) => (full.startsWith(' ') ? ` @${username} ` : `@${username} `)
    );
    const nextValue = replacedBefore + textAfterCursor;
    setContent(nextValue);
    setMentionQuery(null);
    textareaRef.current.focus();
  };

  const processFiles = async (fileList: FileList | File[]) => {
    setFileError(null);
    const filesArray = Array.from(fileList);

    for (const file of filesArray) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileError(
          `Tệp "${file.name}" vượt quá giới hạn 5 MB (${(
            file.size /
            (1024 * 1024)
          ).toFixed(2)} MB).`
        );
        continue;
      }

      const localId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const isImage = file.type.startsWith('image/');
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;

      const newItem: PendingAttachmentItem = {
        localId,
        file,
        previewUrl,
        uploading: true,
      };

      setAttachments((prev) => [...prev, newItem]);

      try {
        const uploaded = await uploadFile(file);
        setAttachments((prev) =>
          prev.map((item) =>
            item.localId === localId
              ? {
                  ...item,
                  uploading: false,
                  uploaded:
                    uploaded || {
                      id: Date.now(),
                      filename: file.name,
                      contentType: file.type || 'application/octet-stream',
                      sizeBytes: file.size,
                      url: previewUrl || `/api/files/${Date.now()}`,
                    },
                }
              : item
          )
        );
      } catch (err) {
        setAttachments((prev) =>
          prev.map((item) =>
            item.localId === localId
              ? {
                  ...item,
                  uploading: false,
                  error:
                    err instanceof Error ? err.message : 'Lỗi tải tệp lên',
                }
              : item
          )
        );
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const f = item.getAsFile();
        if (f) pastedFiles.push(f);
      }
    }
    if (pastedFiles.length > 0) {
      e.preventDefault();
      processFiles(pastedFiles);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeAttachment = (localId: string) => {
    setAttachments((prev) => prev.filter((a) => a.localId !== localId));
  };

  const handleSend = async () => {
    const trimmed = content.trim();
    const readyAttachments: Attachment[] = attachments
      .filter((a) => !a.uploading && !a.error && a.uploaded)
      .map((a) => a.uploaded!);

    if (!trimmed && readyAttachments.length === 0) return;

    // If editing an existing message
    if (editingMessage) {
      if (trimmed) {
        await editMessage(editingMessage.id, trimmed);
      }
      setEditingMessage(null);
      setContent('');
      return;
    }

    setContent('');
    setAttachments([]);
    setMentionQuery(null);

    try {
      notifyTyping(false);
    } catch {
      // ignore
    }

    if (effectiveMode === 'dm') {
      await sendDmMessage(
        trimmed,
        readyAttachments.length > 0 ? readyAttachments : undefined
      );
    } else {
      await sendMessage(
        trimmed,
        readyAttachments.length > 0 ? readyAttachments : undefined
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && mentionCandidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % mentionCandidates.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(
          (prev) =>
            (prev - 1 + mentionCandidates.length) % mentionCandidates.length
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionCandidates[mentionIndex].username);
        return;
      }
      if (e.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape') {
      if (editingMessage) {
        setEditingMessage(null);
        setContent('');
      } else if (replyingTo) {
        setReplyingTo(null);
      }
    }
  };

  // Resolve active DM peer name if in DM mode
  const activeDmConv = Array.isArray(dmConversations)
    ? dmConversations.find((c) => c.id === activeDmId)
    : undefined;

  const defaultPlaceholder =
    placeholder ||
    (effectiveMode === 'dm'
      ? `Nhắn tin riêng tới @${
          activeDmConv?.peerUser?.displayName ||
          activeDmConv?.peerUser?.username ||
          'bạn bè'
        }...`
      : `Nhắn tin vào #${
          activeChannel?.name || 'general'
        } (Hỗ trợ Markdown, @mention, dán ảnh Ctrl+V ≤ 5MB)`);

  // Normalize typingUsers list
  const activeTypers: string[] = (Array.isArray(typingUsers)
    ? typingUsers
    : []
  )
    .filter((u) => !currentUser || u.userId !== currentUser.id)
    .map((u) => u.displayName)
    .filter(Boolean);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
      className="relative px-4 pt-1 pb-3 select-none"
    >
      {/* Drag & Drop Overlay */}
      {isDraggingOver && (
        <div className="pointer-events-none absolute inset-x-4 inset-y-1 z-30 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#2563EB] bg-[#EFF6FF]/95 text-sm font-bold text-[#2563EB] shadow-lg dark:bg-[#0F172A]/95 dark:text-[#3B82F6]">
          <Paperclip className="h-5 w-5 animate-bounce" />
          <span>
            Thả tệp hoặc hình ảnh (≤ 5 MB) vào đây để tải lên PostgreSQL bytea
          </span>
        </div>
      )}

      {/* @MENTION AUTOCOMPLETE POPUP */}
      {mentionQuery !== null && mentionCandidates.length > 0 && (
        <div
          className={`absolute bottom-full left-4 z-40 mb-1.5 w-72 overflow-hidden rounded-xl border shadow-xl ${
            isDark
              ? 'border-[#334155] bg-[#1E293B] text-[#F8FAFC]'
              : 'border-[#E2E8F0] bg-white text-[#0F172A]'
          }`}
        >
          <div className="border-b border-[#E2E8F0] px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase text-[#64748B] dark:border-[#334155]">
            Nhắc đến thành viên (@mention)
          </div>
          <div className="p-1">
            {mentionCandidates.map((cand, idx) => (
              <button
                key={cand.username}
                type="button"
                onClick={() => insertMention(cand.username)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                  idx === mentionIndex
                    ? 'bg-[#2563EB] text-white'
                    : isDark
                    ? 'hover:bg-[#334155]'
                    : 'hover:bg-[#F1F5F9]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <AtSign className="h-3.5 w-3.5 shrink-0 opacity-80" />
                  <span className="font-bold">@{cand.username}</span>
                  <span className="truncate opacity-80">
                    {cand.displayName}
                  </span>
                </div>
                {cand.role && (
                  <span className="ml-2 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase opacity-80">
                    {cand.role}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* COMPOSER CONTAINER */}
      <div
        className={`rounded-[12px] border transition-colors ${
          isDark
            ? 'border-[#334155] bg-[#0F172A] focus-within:border-[#3B82F6]'
            : 'border-[#CBD5E1] bg-[#F8FAFC] focus-within:border-[#2563EB] focus-within:bg-white'
        }`}
      >
        {/* REPLYING TO / EDITING MESSAGE BANNER */}
        {(replyingTo || editingMessage) && (
          <div
            className={`flex items-center justify-between border-b px-3.5 py-2 text-xs ${
              isDark
                ? 'border-[#334155] bg-[#1E293B]/70 text-[#CBD5E1]'
                : 'border-[#E2E8F0] bg-[#EFF6FF] text-[#1E40AF]'
            }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              {editingMessage ? (
                <>
                  <Edit3 className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]" />
                  <span className="font-bold">Đang chỉnh sửa tin nhắn:</span>
                  <span className="truncate opacity-85">
                    {editingMessage.content}
                  </span>
                </>
              ) : (
                replyingTo && (
                  <>
                    <Reply className="h-3.5 w-3.5 shrink-0 text-[#2563EB]" />
                    <span>
                      Đang trả lời{' '}
                      <strong className="font-bold text-[#2563EB] dark:text-[#3B82F6]">
                        @{replyingTo.senderName}
                      </strong>
                      :
                    </span>
                    <span className="truncate opacity-80">
                      {replyingTo.content}
                    </span>
                  </>
                )
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (editingMessage) {
                  setEditingMessage(null);
                  setContent('');
                } else {
                  setReplyingTo(null);
                }
              }}
              aria-label="Hủy trả lời hoặc chỉnh sửa"
              className="ml-2 rounded-md p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* FILE ERROR ALERT */}
        {fileError && (
          <div className="flex items-center justify-between border-b border-[#FFE4E6] bg-[#FFE4E6]/80 px-3.5 py-1.5 text-xs font-semibold text-[#F43F5E]">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{fileError}</span>
            </span>
            <button
              type="button"
              onClick={() => setFileError(null)}
              className="rounded p-0.5 hover:bg-[#F43F5E]/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ATTACHMENT THUMBNAIL STRIP */}
        {attachments.length > 0 && (
          <div
            className={`flex flex-wrap gap-2.5 border-b px-3.5 py-2.5 ${
              isDark ? 'border-[#334155]' : 'border-[#E2E8F0]'
            }`}
          >
            {attachments.map((item) => (
              <div
                key={item.localId}
                className={`group relative flex items-center gap-2.5 rounded-xl border p-2 pr-7 text-xs ${
                  isDark
                    ? 'border-[#334155] bg-[#1E293B]'
                    : 'border-[#CBD5E1] bg-white shadow-2xs'
                }`}
              >
                {item.previewUrl ? (
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E0F2FE] text-[#0284C7]">
                    <FileText className="h-6 w-6" />
                  </div>
                )}

                <div className="max-w-[140px] min-w-0">
                  <div className="truncate font-bold">{item.file.name}</div>
                  <div className="font-mono text-[10px] text-[#64748B]">
                    {(item.file.size / 1024).toFixed(1)} KB
                  </div>
                  {item.uploading && (
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
                      <div className="h-full w-2/3 animate-pulse bg-[#2563EB]" />
                    </div>
                  )}
                  {item.error && (
                    <div className="text-[10px] font-bold text-[#F43F5E]">
                      {item.error}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeAttachment(item.localId)}
                  aria-label="Xóa tệp đính kèm"
                  className="absolute top-1.5 right-1.5 rounded-full bg-[#F43F5E] p-0.5 text-white shadow-xs hover:bg-[#E11D48]"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* MAIN INPUT ROW */}
        <div className="flex items-end gap-2 px-3 py-2">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,application/zip,text/plain"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                processFiles(e.target.files);
                e.target.value = '';
              }
            }}
            className="hidden"
          />

          {/* Attachment Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Đính kèm tệp hoặc hình ảnh (Tối đa 5 MB)"
            aria-label="Đính kèm tệp hoặc hình ảnh"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
              isDark
                ? 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#3B82F6]'
                : 'text-[#475569] hover:bg-[#E2E8F0] hover:text-[#2563EB]'
            }`}
          >
            <Paperclip className="h-4 w-4" />
          </button>

          {/* Auto-expanding Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={defaultPlaceholder}
            className={`max-h-[160px] min-h-[36px] flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-relaxed font-medium outline-none ${
              isDark
                ? 'text-[#F8FAFC] placeholder-[#64748B]'
                : 'text-[#0F172A] placeholder-[#64748B]'
            }`}
          />

          {/* Quick Emoji Picker Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
              title="Chèn biểu tượng cảm xúc"
              aria-label="Chèn biểu tượng cảm xúc"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
                isDark
                  ? 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#F59E0B]'
                  : 'text-[#475569] hover:bg-[#E2E8F0] hover:text-[#F59E0B]'
              }`}
            >
              <Smile className="h-4 w-4" />
            </button>

            {isEmojiPickerOpen && (
              <div
                className={`absolute right-0 bottom-11 z-40 flex items-center gap-1 rounded-xl border p-1.5 shadow-xl ${
                  isDark
                    ? 'border-[#334155] bg-[#1E293B]'
                    : 'border-[#E2E8F0] bg-white'
                }`}
              >
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setContent((prev) => `${prev}${emoji}`);
                      setIsEmojiPickerOpen(false);
                      textareaRef.current?.focus();
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-base transition hover:scale-110 hover:bg-[#EFF6FF] dark:hover:bg-[#334155]"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ocean Blue Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={
              !content.trim() &&
              attachments.filter((a) => !a.uploading && a.uploaded).length === 0
            }
            aria-label="Gửi tin nhắn"
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 text-xs font-bold text-white shadow-2xs transition hover:bg-[#1D4ED8] active:translate-y-[1px] disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {editingMessage ? 'Lưu' : 'Gửi'}
            </span>
          </button>
        </div>
      </div>

      {/* LIVE UDP TYPING INDICATOR + FOOTER HINT */}
      <div className="mt-1 flex h-4 items-center justify-between px-1 text-[11px]">
        <div className="flex items-center gap-1.5">
          {activeTypers.length > 0 ? (
            <div className="flex items-center gap-1.5 font-semibold text-[#10B981]">
              <span className="inline-flex items-center gap-0.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#10B981]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#10B981] [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#10B981] [animation-delay:300ms]" />
              </span>
              <span>
                {activeTypers.join(', ')} đang nhập...{' '}
                <span className="font-mono text-[10px] opacity-90">
                  (qua UDP :5001)
                </span>
              </span>
            </div>
          ) : (
            <span
              className={`flex items-center gap-1 font-mono text-[10px] ${
                isDark ? 'text-[#64748B]' : 'text-[#94A3B8]'
              }`}
            >
              <Radio className="h-3 w-3 text-[#10B981]" />
              <span>UDP :5001 Typing • WS :8081 ↔ TCP :5000 Bridge</span>
            </span>
          )}
        </div>

        <div
          className={`hidden items-center gap-2 text-[10px] md:flex ${
            isDark ? 'text-[#64748B]' : 'text-[#94A3B8]'
          }`}
        >
          <span>
            <strong>Enter</strong> để gửi
          </span>
          <span>•</span>
          <span>
            <strong>Shift+Enter</strong> xuống dòng
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-0.5">
            <ImageIcon className="h-3 w-3" /> Dán ảnh <strong>Ctrl+V</strong>
          </span>
        </div>
      </div>
    </div>
  );
};

export default MessageComposer;
