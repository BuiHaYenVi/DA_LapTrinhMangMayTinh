import type { MessageItem } from '../../types/chat';
import { extractStickerFromContent } from './stickerData';

/**
 * Phân tích an toàn mốc thời gian từ epoch ms (số hoặc chuỗi) hoặc chuỗi legacy.
 * Hỗ trợ chuỗi cũ: "YYYY-MM-DD HH:mm:ss.ffffff" -> thay " " bằng "T", cắt microseconds về milliseconds.
 */
export function parseDate(raw?: string | number | null): Date {
  if (raw === null || raw === undefined || raw === '') return new Date(NaN);
  if (typeof raw === 'number') return new Date(raw);

  const trimmed = String(raw).trim();
  // Nếu là số nguyên epoch (10 số giây hoặc 13 số mili giây)
  if (/^\d{10,13}$/.test(trimmed)) {
    const ms = Number(trimmed);
    return new Date(trimmed.length === 10 ? ms * 1000 : ms);
  }

  // Chuỗi dạng "YYYY-MM-DD HH:mm:ss.ffffff"
  let normalized = trimmed.replace(' ', 'T');
  normalized = normalized.replace(/\.(\d{3})\d+/, '.$1');

  return new Date(normalized);
}

/**
 * Định dạng mốc thời gian hiển thị:
 * - Hôm nay: "HH:mm"
 * - Hôm qua: "Hôm qua HH:mm"
 * - Ngày khác: ngày đầy đủ "DD/MM/YYYY HH:mm"
 */
export function formatTime(raw?: string | number | null): string {
  if (raw === null || raw === undefined || raw === '') return '';
  const d = parseDate(raw);

  if (isNaN(d.getTime())) {
    // Fallback nếu chuỗi đã là dạng HH:mm
    const match = String(raw).match(/(\d{1,2}:\d{2})/);
    return match ? match[1] : String(raw);
  }

  const now = new Date();
  const isToday = d.getDate() === now.getDate() &&
                  d.getMonth() === now.getMonth() &&
                  d.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.getDate() === yesterday.getDate() &&
                      d.getMonth() === yesterday.getMonth() &&
                      d.getFullYear() === yesterday.getFullYear();

  let is12h = false;
  try {
    const rawSettings = localStorage.getItem('discord_mini_user_settings_v2') || localStorage.getItem('huddle_user_settings');
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      if (parsed.timeFormat === '12h') {
        is12h = true;
      }
    }
  } catch {
    // fallback 24h
  }

  const minutes = String(d.getMinutes()).padStart(2, '0');
  let timeStr = '';
  if (is12h) {
    const h = d.getHours();
    const period = h >= 12 ? 'CH' : 'SA';
    const h12 = h % 12 || 12;
    timeStr = `${String(h12).padStart(2, '0')}:${minutes} ${period}`;
  } else {
    const hours = String(d.getHours()).padStart(2, '0');
    timeStr = `${hours}:${minutes}`;
  }

  if (isToday) {
    return timeStr;
  }
  if (isYesterday) {
    return `Hôm qua ${timeStr}`;
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year} ${timeStr}`;
}

/**
 * Lấy khóa ngày YYYY-MM-DD để xác định thời điểm chuyển ngày
 */
export function getDateKey(rawTime?: string | number | null): string {
  if (!rawTime) return '';
  const d = parseDate(rawTime);
  if (isNaN(d.getTime())) {
    const m = String(rawTime).match(/^\d{4}-\d{2}-\d{2}/);
    return m ? m[0] : '';
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Hiển thị nhãn ngăn cách ngày: "Hôm nay", "Hôm qua", hoặc "DD/MM/YYYY"
 */
export function formatDateLabel(rawTime?: string | number | null): string {
  if (!rawTime) return 'Hôm nay';
  const date = parseDate(rawTime);

  if (isNaN(date.getTime())) {
    return 'Hôm nay';
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Hôm nay';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Hôm qua';
  }

  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Kiểm tra xem 2 tin nhắn liên tiếp có thể gộp hay không:
 * - Cùng người gửi
 * - Cùng ngày
 * - Khoảng cách thời gian không quá 5 phút (300.000 ms)
 * - Không phải tin nhắn nhãn dán Sticker
 */
export function shouldGroupWithPrevious(
  current: MessageItem,
  previous: MessageItem | undefined,
  curDateKey: string,
  prevDateKey: string
): boolean {
  if (!previous) return false;
  if (current.senderId !== previous.senderId) return false;
  if (current.senderId === -1 || previous.senderId === -1) return false;
  if (curDateKey !== prevDateKey) return false;

  // Nhãn dán (Sticker) luôn là khối media độc lập, không gộp thu gọn để tránh đè chữ
  if (extractStickerFromContent(current.content).sticker || extractStickerFromContent(previous.content).sticker) {
    return false;
  }

  const tCur = parseDate(current.timestamp).getTime();
  const tPrev = parseDate(previous.timestamp).getTime();
  if (!isNaN(tCur) && !isNaN(tPrev)) {
    const diffMs = Math.abs(tCur - tPrev);
    return diffMs <= 5 * 60 * 1000;
  }

  return current.timestamp === previous.timestamp;
}
