import type { ChannelType } from '../types/chat';

export const CHANNEL_CUSTOM_STORAGE_KEY = 'discord_mini_channel_custom_v1';

export interface ChannelMeta {
  type?: ChannelType;
  isPrivate?: boolean;
}

export function getChannelMeta(channelId?: number, channelName?: string): ChannelMeta {
  try {
    const raw = localStorage.getItem(CHANNEL_CUSTOM_STORAGE_KEY);
    if (!raw) return {};
    const map = JSON.parse(raw) as Record<string, ChannelMeta>;
    if (channelId && map[`ch_${channelId}`]) return map[`ch_${channelId}`];
    if (channelName && map[`name_${channelName.trim().toLowerCase()}`]) {
      return map[`name_${channelName.trim().toLowerCase()}`];
    }
  } catch {
    // ignore
  }
  return {};
}

export function saveChannelMeta(channelId: number | undefined, channelName: string, meta: ChannelMeta): void {
  try {
    const raw = localStorage.getItem(CHANNEL_CUSTOM_STORAGE_KEY);
    const map: Record<string, ChannelMeta> = raw ? JSON.parse(raw) : {};
    if (channelId && channelId > 0) {
      map[`ch_${channelId}`] = { ...map[`ch_${channelId}`], ...meta };
    }
    if (channelName && channelName.trim()) {
      map[`name_${channelName.trim().toLowerCase()}`] = {
        ...map[`name_${channelName.trim().toLowerCase()}`],
        ...meta
      };
    }
    localStorage.setItem(CHANNEL_CUSTOM_STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('channel_custom_updated'));
  } catch {
    // ignore
  }
}
