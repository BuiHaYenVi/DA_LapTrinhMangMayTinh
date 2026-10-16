import type { Room, MessageItem, User, Friend, PendingFriendRequest } from '../types/chat';

type Listener = (event: string, data: any) => void;

class ChatBridgeService {
  private listeners: Listener[] = [];
  private eventSource: EventSource | null = null;
  private baseUrl = typeof window !== 'undefined' && window.location && window.location.port
    ? `${window.location.origin}/api`
    : 'http://localhost:8080/api';

  constructor() {
    this.connectEventSource();
  }

  private connectEventSource() {
    try {
      this.eventSource = new EventSource(`${this.baseUrl}/events`);
      this.eventSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          this.emit(payload.event, payload.data);
        } catch (err) {
          console.error("SSE parse error", err);
        }
      };
      this.eventSource.onerror = () => {
        this.emit('STATUS', { connected: false });
        setTimeout(() => this.connectEventSource(), 3000);
      };
      this.eventSource.onopen = () => {
        this.emit('STATUS', { connected: true });
      };
    } catch (e) {
      console.warn("EventSource fallback mode");
    }
  }

  public subscribe(listener: Listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(event: string, data: any) {
    this.listeners.forEach(l => l(event, data));
  }

  public async getInitialState(): Promise<{
    user: User;
    rooms: Room[];
    currentRoom: Room | null;
    messages: MessageItem[];
    members: User[];
    friends: Friend[];
    pendingRequests: PendingFriendRequest[];
  }> {
    const res = await fetch(`${this.baseUrl}/state`);
    return await res.json();
  }

  public async login(username: string, pass: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pass })
    });
    return (await res.json()).success;
  }

  public async register(username: string, pass: string, displayName: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pass, displayName })
    });
    return (await res.json()).success;
  }

  public async joinRoom(roomId: number): Promise<void> {
    await fetch(`${this.baseUrl}/rooms/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId })
    });
  }

  public async createRoom(name: string): Promise<void> {
    await fetch(`${this.baseUrl}/rooms/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
  }

  public async leaveRoom(): Promise<void> {
    await fetch(`${this.baseUrl}/rooms/leave`, { method: 'POST' });
  }

  public async sendMessage(content: string): Promise<void> {
    await fetch(`${this.baseUrl}/messages/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
  }

  public async sendPrivateMessage(targetId: number, content: string): Promise<void> {
    await fetch(`${this.baseUrl}/messages/private`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId, content })
    });
  }

  public async inviteMember(roomId: number, targetUserId: number): Promise<void> {
    await fetch(`${this.baseUrl}/rooms/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, targetUserId })
    });
  }

  public async kickMember(roomId: number, targetUserId: number): Promise<void> {
    await fetch(`${this.baseUrl}/rooms/kick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, targetUserId })
    });
  }

  public async sendFriendRequest(targetUserId: number): Promise<void> {
    await fetch(`${this.baseUrl}/friends/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId })
    });
  }

  public async acceptFriendRequest(requestId: number): Promise<void> {
    await fetch(`${this.baseUrl}/friends/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId })
    });
  }

  public async rejectFriendRequest(requestId: number): Promise<void> {
    await fetch(`${this.baseUrl}/friends/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId })
    });
  }

  public async refreshFriends(): Promise<void> {
    await fetch(`${this.baseUrl}/friends/refresh`, {
      method: 'POST'
    });
  }

  public async searchFriends(query: string): Promise<void> {
    await fetch(`${this.baseUrl}/friends/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
  }
}

export const chatBridge = new ChatBridgeService();
