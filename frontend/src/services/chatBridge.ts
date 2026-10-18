import type { Room, Channel, MessageItem, User, Friend, PendingFriendRequest } from '../types/chat';

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
        this.emit('STREAM_STATUS', { streamConnected: true });
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
        this.emit('STREAM_STATUS', { 
          streamConnected: false, 
          reason: 'Mất kết nối luồng sự kiện tới dịch vụ Web cầu nối. Trình duyệt đang tự động kết nối lại...' 
        });
        // Trình duyệt tự động thử kết nối lại (auto-reconnect), không gọi tạo new EventSource lặp
      };
    } catch (e) {
      this.isConnectingStream = false;
      this.emit('STREAM_STATUS', { streamConnected: false, reason: 'Không thể mở kết nối luồng sự kiện.' });
      console.warn('[SSE] Trình duyệt không thể mở kết nối EventSource:', e);
    }
  }

  public isStreamActive(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
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

  /**
   * Thực hiện gửi HTTP request với cookie xác thực.
   * Tham số requiresAuth (mặc định = true): Chỉ khi API được bảo vệ nhận mã HTTP 401
   * thì mới phát sự kiện UNAUTHORIZED để điều hướng về màn hình đăng nhập.
   * Các API công khai (login, register, status, session check) khi trả về 401 sẽ không làm mất phiên.
   */
  private async fetchWithAuth(url: string, options: RequestInit = {}, requiresAuth = true): Promise<Response> {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const response = await fetch(url, {
      ...options,
      headers: defaultHeaders,
      credentials: 'include' // Bắt buộc gửi và lưu cookie HttpOnly DISCORD_SESSION
    });

    if (requiresAuth && response.status === 401) {
      this.stopEventStream();
      this.emit('UNAUTHORIZED', { message: 'Phiên đăng nhập đã hết hạn hoặc mất kết nối tới ChatServer. Vui lòng đăng nhập lại.' });
    }

    return response;
  }

  /**
   * Kiểm tra trạng thái máy chủ ChatServer TCP (Public API).
   */
  public async getStatus(): Promise<ServerStatusResponse> {
    try {
      const res = await this.fetchWithAuth(`${this.baseUrl}/status`, { method: 'GET' }, false);
      return await res.json();
    } catch {
      return { serverOnline: false, host: '127.0.0.1', port: 5000 };
    }
  }

  /**
   * Kiểm tra phiên đăng nhập hiện tại từ cookie (Public API - kiểm tra phiên nhưng không kích hoạt UNAUTHORIZED).
   */
  public async getSession(): Promise<SessionResponse> {
    try {
      const res = await this.fetchWithAuth(`${this.baseUrl}/session`, { method: 'GET' }, false);
      if (!res.ok) return { authenticated: false };
      return await res.json();
    } catch {
      return { authenticated: false };
    }
  }

  /**
   * Đăng nhập tài khoản (Public API).
   */
  public async login(username: string, pass: string): Promise<AuthResponse> {
    try {
      const res = await this.fetchWithAuth(`${this.baseUrl}/login`, {
        method: 'POST',
        body: JSON.stringify({ username, password: pass })
      }, false);
      const data = await res.json();
      return {
        success: data.success === true,
        message: data.message,
        user: data.user
      };
    } catch (e: any) {
      return {
        success: false,
        message: 'Lỗi kết nối mạng: ' + (e?.message || 'Không xác định')
      };
    }
  }

  /**
   * Đăng ký tài khoản mới (Public API).
   */
  public async register(username: string, pass: string, displayName: string): Promise<AuthResponse> {
    try {
      const res = await this.fetchWithAuth(`${this.baseUrl}/register`, {
        method: 'POST',
        body: JSON.stringify({ username, password: pass, displayName })
      }, false);
      const data = await res.json();
      return {
        success: data.success === true,
        message: data.message
      };
    } catch (e: any) {
      return {
        success: false,
        message: 'Lỗi kết nối mạng: ' + (e?.message || 'Không xác định')
      };
    }
  }

  /**
   * Đăng xuất tài khoản và xóa phiên an toàn.
   */
  public async logout(): Promise<{ success: boolean; networkError?: boolean; message?: string }> {
    try {
      const res = await this.fetchWithAuth(`${this.baseUrl}/logout`, { method: 'POST' });
      if (res.ok) {
        this.stopEventStream();
        return { success: true };
      }
      return { 
        success: false, 
        networkError: false, 
        message: 'Phản hồi không thành công khi đăng xuất (HTTP ' + res.status + ').' 
      };
    } catch (e: any) {
      return { 
        success: false, 
        networkError: true, 
        message: 'Lỗi kết nối mạng: ' + (e?.message || 'Không thể liên lạc với hệ thống.') 
      };
    }
  }

  /**
   * Tải trạng thái ban đầu của phòng chat, kênh, tin nhắn, bạn bè sau khi đăng nhập.
   */
  public async getInitialState(): Promise<{
    user: User;
    rooms: Room[];
    currentRoom: Room | null;
    channels: Channel[];
    currentChannel: Channel | null;
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
    const res = await this.fetchWithAuth(`${this.baseUrl}/rooms/create`, {
      method: 'POST',
      body: JSON.stringify({ name })
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
  }

  public async leaveRoom(): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/rooms/leave`, { method: 'POST' });
  }

  public async getChannels(roomId: number): Promise<Channel[]> {
    const res = await this.fetchWithAuth(`${this.baseUrl}/channels?roomId=${roomId}`, { method: 'GET' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.channels || [];
  }

  public async createChannel(roomId: number, name: string): Promise<void> {
    const res = await this.fetchWithAuth(`${this.baseUrl}/channels/create`, {
      method: 'POST',
      body: JSON.stringify({ roomId, name })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
  }

  public async joinChannel(roomId: number, channelId: number): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/channels/join`, {
      method: 'POST',
      body: JSON.stringify({ roomId, channelId })
    });
  }

  public async sendMessage(content: string, channelId?: number): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/messages/send`, {
      method: 'POST',
      body: JSON.stringify({ content, channelId })
    });
  }

  public async sendPrivateMessage(targetId: number, content: string): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/messages/private`, {
      method: 'POST',
      body: JSON.stringify({ targetId, content })
    });
  }

  public async getDirectHistory(targetUserId: number, limit = 50): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/messages/direct-history`, {
      method: 'POST',
      body: JSON.stringify({ targetUserId, limit })
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

  public async removeFriend(friendId: number): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/friends/remove`, {
      method: 'POST',
      body: JSON.stringify({ friendId })
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

  public async updateProfile(displayName: string, bio: string = '', avatarColor: string = ''): Promise<{ success: boolean; message?: string; notSupported?: boolean; displayName?: string }> {
    try {
      const res = await this.fetchWithAuth(`${this.baseUrl}/user/profile`, {
        method: 'POST',
        body: JSON.stringify({ displayName, bio, avatarColor })
      });
      if (res.status === 404 || res.status === 501) {
        return { success: false, notSupported: true, message: 'Tính năng đang phát triển' };
      }
      const data = await res.json();
      return {
        success: data.success === true,
        displayName: data.displayName || displayName,
        message: data.message
      };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi mạng khi cập nhật hồ sơ' };
    }
  }

  public async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message?: string; notSupported?: boolean }> {
    try {
      const res = await this.fetchWithAuth(`${this.baseUrl}/user/password`, {
        method: 'POST',
        body: JSON.stringify({ oldPassword, newPassword })
      });
      if (res.status === 404 || res.status === 501) {
        return { success: false, notSupported: true, message: 'Tính năng đang phát triển' };
      }
      const data = await res.json();
      return {
        success: data.success === true,
        message: data.message
      };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Lỗi mạng khi đổi mật khẩu' };
    }
  }
}

export const chatBridge = new ChatBridgeService();
