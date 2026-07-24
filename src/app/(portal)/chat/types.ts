export interface ChatUser {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  photo?: string;
  status: string; // online, offline, away, busy, dnd
  departmentId?: string;
  designationId?: string;
  phone?: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  description: string;
  type: "PUBLIC" | "PRIVATE";
  createdBy: string;
  createdAt: string;
  avatar?: string;
  isMember: boolean;
  memberCount: number;
  unreadCount?: number;
  lastMessage?: string;
  lastMessageTime?: string;
}

export interface Reaction {
  userId: string;
  emoji: string;
}

export interface MessageType {
  id: string;
  conversationId: string;
  senderId: string;
  message: string;
  messageType: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  replyTo?: string; // ID of message
  edited: boolean;
  deleted: boolean;
  pinned: boolean;
  reactions: Reaction[];
  starredBy: string[];
  readBy: string[];
  deliveredTo: string[];
  createdAt: string;
}
