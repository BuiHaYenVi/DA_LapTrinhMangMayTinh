export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[]; // Tên những người đã react
}

export type ReactionsMap = Record<number, MessageReaction[]>;

const STORAGE_KEY = 'huddle_discord_message_reactions';

export function loadReactionsMap(): ReactionsMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveReactionsMap(map: ReactionsMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('message_reactions_updated', { detail: map }));
  } catch {
    // ignore
  }
}

export function getMessageReactions(messageId: number): MessageReaction[] {
  const map = loadReactionsMap();
  return map[messageId] || [];
}

export function toggleMessageReaction(
  messageId: number,
  emoji: string,
  userName: string
): MessageReaction[] {
  const map = loadReactionsMap();
  const currentList = map[messageId] ? [...map[messageId]] : [];
  const normalizedUser = (userName || 'Tôi').trim();

  const existingIdx = currentList.findIndex((r) => r.emoji === emoji);

  if (existingIdx >= 0) {
    const existing = { ...currentList[existingIdx] };
    const userIndex = existing.users.indexOf(normalizedUser);

    if (userIndex >= 0) {
      // Đã react -> Bỏ react
      existing.users.splice(userIndex, 1);
      existing.count = Math.max(0, existing.count - 1);
      if (existing.count === 0) {
        currentList.splice(existingIdx, 1);
      } else {
        currentList[existingIdx] = existing;
      }
    } else {
      // Chưa react -> Thêm react
      existing.users.push(normalizedUser);
      existing.count += 1;
      currentList[existingIdx] = existing;
    }
  } else {
    // Chưa có emoji này trên tin nhắn -> Tạo mới
    currentList.push({
      emoji,
      count: 1,
      users: [normalizedUser],
    });
  }

  map[messageId] = currentList;
  saveReactionsMap(map);
  return currentList;
}
