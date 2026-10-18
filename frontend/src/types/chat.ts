export interface User {
  id: number;
  username: string;
  displayName: string;
  role?: string;
  online?: boolean;
}

export interface Room {
  id: number;
  name: string;
  description?: string;
  inviteCode?: string;
  role?: string;
  unreadCount?: number;
  memberCount?: number;
}

export interface Channel {
  id: number;
  roomId: number;
  name: string;
  createdAt?: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  me?: boolean;
}

export interface MessageItem {
  id: number;
  roomId?: number;
  channelId?: number;
  senderId: number;
  senderName: string;
  avatar?: string;
  content: string;
  timestamp: string;
  date?: string;
  isMe?: boolean;
  isEdited?: boolean;
  isDirect?: boolean;
  targetId?: number;
  status?: 'sending' | 'sent' | 'failed';
  reactions?: Reaction[];
  attachment?: {
    name: string;
    size: string;
    url?: string;
  };
}

export interface Friend {
  id: number;
  username: string;
  displayName: string;
  online: boolean;
}

export interface PendingFriendRequest {
  requestId: number;
  senderId: number;
  senderUsername: string;
  senderDisplayName: string;
  time: string;
}

export interface SearchUserResult {
  id: number;
  username: string;
  displayName: string;
  isFriend: boolean;
  online: boolean;
}
