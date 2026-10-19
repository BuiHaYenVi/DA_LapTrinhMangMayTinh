import { useState, useCallback } from 'react';

const MUTED_STORAGE_KEY = 'discordmini_muted_rooms';

function loadMutedRoomsFromStorage(): Set<number> {
  try {
    const raw = localStorage.getItem(MUTED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.map(Number));
    }
  } catch (err) {
    console.warn('Không thể đọc danh sách phòng tắt âm từ localStorage:', err);
  }
  return new Set();
}

function saveMutedRoomsToStorage(mutedSet: Set<number>) {
  try {
    localStorage.setItem(MUTED_STORAGE_KEY, JSON.stringify(Array.from(mutedSet)));
  } catch (err) {
    console.warn('Không thể lưu danh sách phòng tắt âm vào localStorage:', err);
  }
}

/**
 * Hook quản lý số lượng tin nhắn chưa đọc theo từng phòng và trạng thái tắt âm (mute).
 * - unreadMap: đếm trong bộ nhớ (client memory), reset về 0 khi mở phòng
 * - mutedRooms: lưu trong localStorage có bọc try/catch
 */
export function useRoomUnread() {
  const [unreadMap, setUnreadMap] = useState<Record<number, number>>({});
  const [mutedRooms, setMutedRooms] = useState<Set<number>>(() => loadMutedRoomsFromStorage());

  const isRoomMuted = useCallback((roomId: number): boolean => {
    return mutedRooms.has(roomId);
  }, [mutedRooms]);

  const toggleMuteRoom = useCallback((roomId: number) => {
    setMutedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      saveMutedRoomsToStorage(next);
      return next;
    });
  }, []);

  const incrementUnread = useCallback((roomId: number) => {
    setMutedRooms((currentMuted) => {
      // Nếu phòng bị tắt âm -> không tăng huy hiệu số
      if (currentMuted.has(roomId)) {
        return currentMuted;
      }
      setUnreadMap((prev) => ({
        ...prev,
        [roomId]: (prev[roomId] || 0) + 1,
      }));
      return currentMuted;
    });
  }, []);

  const clearUnread = useCallback((roomId: number) => {
    setUnreadMap((prev) => {
      if (!prev[roomId]) return prev;
      const next = { ...prev };
      delete next[roomId];
      return next;
    });
  }, []);

  const getUnreadCount = useCallback((roomId: number): number => {
    if (mutedRooms.has(roomId)) return 0;
    return unreadMap[roomId] || 0;
  }, [mutedRooms, unreadMap]);

  return {
    unreadMap,
    mutedRooms,
    isRoomMuted,
    toggleMuteRoom,
    incrementUnread,
    clearUnread,
    getUnreadCount,
  };
}
