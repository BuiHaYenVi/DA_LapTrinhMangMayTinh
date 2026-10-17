import type { Room, MessageItem, User, Friend, PendingFriendRequest } from '../types/chat';

type Listener = (event: string, data: any) => void;

export interface SessionResponse {
  authenticated: boolean;
  user?: User;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
}

export interface ServerStatusResponse {
  serverOnline: boolean;
  host: string;
  port: number;
}

class ChatBridgeService {
  private listeners: Listener[] = [];
  private eventSource: EventSource | null = null;
  private isConnectingStream = false;

  private baseUrl = typeof window !== 'undefined' && window.location
    ? `${window.location.origin}/api`
    : 'http://localhost:8080/api';

  constructor() {
    // Không tự động kết nối EventSource khi chưa xác thực đăng nhập
  }

  /**
   * Bắt đầu luồng Server-Sent Events (SSE) khi người dùng đã đăng nhập thành công.
   * Ngăn chặn việc tạo kết nối trùng lặp.
   */
  public startEventStream(): void {
    if (this.eventSource || this.isConnectingStream) {
      return;
    }
    this.isConnectingStream = true;

    try {
      // EventSource tự động mang cookie trong cùng origin (hoặc qua Vite proxy)
      const es = new EventSource(`${this.baseUrl}/events`, { withCredentials: true });
      this.eventSource = es;

      es.onopen = () => {
        this.isConnectingStream = false;
        this.emit('STATUS', { connected: true });
      };

      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          this.emit(payload.event, payload.data);
        } catch (err) {
          console.error('[SSE] Lỗi phân tích cú pháp gói tin SSE:', err);
        }
      };

      es.onerror = () => {
        this.isConnectingStream = false;
        this.emit('STATUS', { connected: false });
        // Trình duyệt tự động thử kết nối lại (auto-reconnect), không gọi tạo new EventSource lặp
      };
    } catch (e) {
      this.isConnectingStream = false;
      console.warn('[SSE] Trình duyệt không thể mở kết nối EventSource:', e);
    }
  }

  /**
   * Đóng và dọn dẹp kết nối SSE khi đăng xuất hoặc rời màn hình.
   */
  public stopEventStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnectingStream = false;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(event: string, data: any) {
    this.listeners.forEach(l => {
      try {
        l(event, data);
      } catch (e) {
        console.error('[Bridge] Lỗi trong listener:', e);
      }
    });
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const response = await fetch(url, {
      ...options,
      headers: defaultHeaders,
      credentials: 'include' // Bắt buộc gửi và lưu cookie HttpOnly DISCORD_SESSION
    });

    if (response.status === 401) {
      this.stopEventStream();
      this.emit('UNAUTHORIZED', { message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
    }

    return response;
  }

  /**
   * Kiểm tra trạng thái máy chủ ChatServer TCP.
   */
  public async getStatus(): Promise<ServerStatusResponse> {
    try {
      const res = await this.fetchWithAuth(`${this.baseUrl}/status`, { method: 'GET' });
      return await res.json();
    } catch {
      return { serverOnline: false, host: '127.0.0.1', port: 5000 };
    }
  }

  /**
   * Kiểm tra phiên đăng nhập hiện tại từ cookie.
   */
  public async getSession(): Promise<SessionResponse> {
    try {
      const res = await this.fetchWithAuth(`${this.baseUrl}/session`, { method: 'GET' });
      if (!res.ok) return { authenticated: false };
      return await res.json();
    } catch {
      return { authenticated: false };
    }
  }

  /**
   * Đăng nhập tài khoản.
   */
  public async login(username: string, pass: string): Promise<AuthResponse> {
    try {
      const res = await this.fetchWithAuth(`${this.baseUrl}/login`, {
        method: 'POST',
        body: JSON.stringify({ username, password: pass })
      });
      const data = await res.json();
      return {
        success: data.success === true,
        message: data.message,
        user: data.user
      };
    } catch (e: any) {
      return {
        success: false,
        message: 'Lỗi kết nối tới máy chủ cầu nối: ' + (e?.message || 'Không xác định')
      };
    }
  }

  /**
   * Đăng ký tài khoản mới.
   */
  public async register(username: string, pass: string, displayName: string): Promise<AuthResponse> {
    try {
      const res = await this.fetchWithAuth(`${this.baseUrl}/register`, {
        method: 'POST',
        body: JSON.stringify({ username, password: pass, displayName })
      });
      const data = await res.json();
      return {
        success: data.success === true,
        message: data.message
      };
    } catch (e: any) {
      return {
        success: false,
        message: 'Lỗi kết nối tới máy chủ cầu nối: ' + (e?.message || 'Không xác định')
      };
    }
  }

  /**
   * Đăng xuất tài khoản và xóa phiên.
   */
  public async logout(): Promise<boolean> {
    try {
      this.stopEventStream();
      const res = await this.fetchWithAuth(`${this.baseUrl}/logout`, { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Tải trạng thái ban đầu của phòng chat, tin nhắn, bạn bè sau khi đăng nhập.
   */
  public async getInitialState(): Promise<{
    user: User;
    rooms: Room[];
    currentRoom: Room | null;
    messages: MessageItem[];
    members: User[];
    friends: Friend[];
    pendingRequests: PendingFriendRequest[];
  } | null> {
    const res = await this.fetchWithAuth(`${this.baseUrl}/state`, { method: 'GET' });
    if (!res.ok) return null;
    return await res.json();
  }

  public async joinRoom(roomId: number): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/rooms/join`, {
      method: 'POST',
      body: JSON.stringify({ roomId })
    });
  }

  public async createRoom(name: string): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/rooms/create`, {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  }

  public async leaveRoom(): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/rooms/leave`, { method: 'POST' });
  }

  public async sendMessage(content: string): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/messages/send`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }

  public async sendPrivateMessage(targetId: number, content: string): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/messages/private`, {
      method: 'POST',
      body: JSON.stringify({ targetId, content })
    });
  }

  public async inviteMember(roomId: number, targetUserId: number): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/rooms/invite`, {
      method: 'POST',
      body: JSON.stringify({ roomId, targetUserId })
    });
  }

  public async kickMember(roomId: number, targetUserId: number): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/rooms/kick`, {
      method: 'POST',
      body: JSON.stringify({ roomId, targetUserId })
    });
  }

  public async sendFriendRequest(targetUserId: number): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/friends/request`, {
      method: 'POST',
      body: JSON.stringify({ targetUserId })
    });
  }

  public async acceptFriendRequest(requestId: number): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/friends/accept`, {
      method: 'POST',
      body: JSON.stringify({ requestId })
    });
  }

  public async rejectFriendRequest(requestId: number): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/friends/reject`, {
      method: 'POST',
      body: JSON.stringify({ requestId })
    });
  }

  public async refreshFriends(): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/friends/refresh`, { method: 'POST' });
  }

  public async searchFriends(query: string): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/friends/search`, {
      method: 'POST',
      body: JSON.stringify({ query })
    });
  }

  public async editMessage(messageId: number, content: string): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/messages/edit`, {
      method: 'POST',
      body: JSON.stringify({ messageId, content })
    });
  }

  public async deleteMessage(messageId: number): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/messages/delete`, {
      method: 'POST',
      body: JSON.stringify({ messageId })
    });
  }

  public async loadMoreHistory(roomId: number, beforeId: number, limit = 25): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/messages/history`, {
      method: 'POST',
      body: JSON.stringify({ roomId, beforeId, limit })
    });
  }

  public async renameRoom(roomId: number, name: string): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/rooms/rename`, {
      method: 'POST',
      body: JSON.stringify({ roomId, name })
    });
  }

  public async deleteRoom(roomId: number): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/rooms/delete`, {
      method: 'POST',
      body: JSON.stringify({ roomId })
    });
  }

  public async setRoomDesc(roomId: number, description: string): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/rooms/desc`, {
      method: 'POST',
      body: JSON.stringify({ roomId, description })
    });
  }

  public async transferOwner(roomId: number, targetUserId: number): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/rooms/transfer`, {
      method: 'POST',
      body: JSON.stringify({ roomId, targetUserId })
    });
  }

  public async setMemberRole(roomId: number, targetUserId: number, role: string): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/rooms/role`, {
      method: 'POST',
      body: JSON.stringify({ roomId, targetUserId, role })
    });
  }
}

export const chatBridge = new ChatBridgeService();
