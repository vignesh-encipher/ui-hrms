import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { logout } from './authSlice';

export interface ChatUser {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  photo?: string;
  status: string;
  departmentId?: string;
  designationId?: string;
  phone?: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  description: string;
  type: 'PUBLIC' | 'PRIVATE';
  createdBy: string;
  createdAt: string;
  avatar?: string;
  isMember: boolean;
  memberCount: number;
  unreadCount?: number;
  lastMessage?: string;
  lastMessageTime?: string;
}

export interface ActiveConversation {
  id: string;
  type: 'dm' | 'channel';
  name: string;
  avatar?: string;
  status?: string;
}

export interface NotificationSettings {
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
  mutedAll: boolean;
  mutedConversations: string[];
  playSoundForActiveConversation: boolean;
}

export interface ChatToast {
  id: string;
  conversationId: string;
  isDm: boolean;
  senderName: string;
  senderAvatar?: string;
  channelName?: string;
  preview: string;
  createdAt: string;
  targetUrl: string;
}

const MAX_CONCURRENT_TOASTS = 5;

interface ChatState {
  connectionStatus: 'idle' | 'connecting' | 'open' | 'closed';
  users: ChatUser[];
  channels: ChatChannel[];
  conversations: any[];
  activeConversation: ActiveConversation | null;
  typingUsers: { [conversationId: string]: string[] };
  onlineStatuses: { [userId: string]: string };
  notificationSettings: NotificationSettings;
  notifications: ChatToast[];
}

const initialState: ChatState = {
  connectionStatus: 'idle',
  users: [],
  channels: [],
  conversations: [],
  activeConversation: null,
  typingUsers: {},
  onlineStatuses: {},
  notificationSettings: {
    soundEnabled: true,
    browserNotificationsEnabled: false,
    mutedAll: false,
    mutedConversations: [],
    playSoundForActiveConversation: true,
  },
  notifications: [],
};

const isMuted = (settings: NotificationSettings, conversationId: string) =>
  settings.mutedAll || settings.mutedConversations.includes(conversationId);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setConnectionStatus: (state, action: PayloadAction<ChatState['connectionStatus']>) => {
      state.connectionStatus = action.payload;
    },
    setUsers: (state, action: PayloadAction<ChatUser[]>) => {
      state.users = action.payload;
    },
    setChannels: (state, action: PayloadAction<ChatChannel[]>) => {
      state.channels = action.payload;
    },
    setConversations: (state, action: PayloadAction<any[]>) => {
      state.conversations = action.payload;
    },
    setActiveConversation: (state, action: PayloadAction<ActiveConversation>) => {
      state.activeConversation = action.payload;
      const { id } = action.payload;
      const conv = state.conversations.find((c) => c.conversationId === id);
      if (conv) conv.unreadCount = 0;
      const channel = state.channels.find((c) => c.id === id);
      if (channel) channel.unreadCount = 0;
    },
    clearActiveConversation: (state) => {
      state.activeConversation = null;
    },
    setTypingUsers: (state, action: PayloadAction<ChatState['typingUsers']>) => {
      state.typingUsers = action.payload;
    },
    setTyping: (
      state,
      action: PayloadAction<{ conversationId: string; userName: string; isTyping: boolean }>
    ) => {
      const { conversationId, userName, isTyping } = action.payload;
      const list = state.typingUsers[conversationId] || [];
      if (isTyping) {
        if (!list.includes(userName)) {
          state.typingUsers[conversationId] = [...list, userName];
        }
      } else {
        state.typingUsers[conversationId] = list.filter((n) => n !== userName);
      }
    },
    setOnlineStatuses: (state, action: PayloadAction<ChatState['onlineStatuses']>) => {
      state.onlineStatuses = action.payload;
    },
    applyPresence: (state, action: PayloadAction<{ userId: string; status: string }>) => {
      state.onlineStatuses[action.payload.userId] = action.payload.status;
    },
    setNotificationSettings: (state, action: PayloadAction<NotificationSettings>) => {
      state.notificationSettings = action.payload;
    },
    upsertConversationOnIncomingMessage: (
      state,
      action: PayloadAction<{
        conversationId: string;
        message: string;
        createdAt: string;
        isDm: boolean;
        senderId?: string;
        senderName?: string;
        senderAvatar?: string;
      }>
    ) => {
      const { conversationId, message, createdAt, isDm, senderId, senderName, senderAvatar } = action.payload;
      if (isDm) {
        let conv = state.conversations.find((c) => c.conversationId === conversationId);
        if (!conv) {
          // First-ever message from a conversation not yet in the loaded list: create a
          // minimal placeholder immediately so the unread badge updates without waiting
          // on a network refetch. A background refetch (elsewhere) reconciles full fields.
          conv = {
            conversationId,
            otherUserId: senderId,
            name: senderName || 'Unknown',
            avatar: senderAvatar,
            unreadCount: 0,
          };
          state.conversations.unshift(conv);
        }
        conv.lastMessage = message;
        conv.lastMessageTime = createdAt;
        conv.unreadCount = (conv.unreadCount || 0) + 1;
        state.conversations.sort((c1, c2) => {
          const t1 = c1.lastMessageTime ? new Date(c1.lastMessageTime).getTime() : 0;
          const t2 = c2.lastMessageTime ? new Date(c2.lastMessageTime).getTime() : 0;
          return t2 - t1;
        });
      } else {
        const channel = state.channels.find((c) => c.id === conversationId);
        if (channel) {
          channel.lastMessage = message;
          channel.lastMessageTime = createdAt;
          channel.unreadCount = (channel.unreadCount || 0) + 1;
          state.channels.sort((c1, c2) => {
            const t1 = c1.lastMessageTime ? new Date(c1.lastMessageTime).getTime() : 0;
            const t2 = c2.lastMessageTime ? new Date(c2.lastMessageTime).getTime() : 0;
            return t2 - t1;
          });
        }
      }
    },
    markConversationReadLocal: (state, action: PayloadAction<string>) => {
      const conversationId = action.payload;
      const conv = state.conversations.find((c) => c.conversationId === conversationId);
      if (conv) conv.unreadCount = 0;
      const channel = state.channels.find((c) => c.id === conversationId);
      if (channel) channel.unreadCount = 0;
    },
    removeChannel: (state, action: PayloadAction<string>) => {
      state.channels = state.channels.filter((c) => c.id !== action.payload);
    },
    pushToast: (state, action: PayloadAction<ChatToast>) => {
      state.notifications.unshift(action.payload);
      if (state.notifications.length > MAX_CONCURRENT_TOASTS) {
        state.notifications.length = MAX_CONCURRENT_TOASTS;
      }
    },
    dismissToast: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logout, () => initialState);
  },
});

export const {
  setConnectionStatus,
  setUsers,
  setChannels,
  setConversations,
  setActiveConversation,
  clearActiveConversation,
  setTypingUsers,
  setTyping,
  setOnlineStatuses,
  applyPresence,
  setNotificationSettings,
  upsertConversationOnIncomingMessage,
  markConversationReadLocal,
  removeChannel,
  pushToast,
  dismissToast,
} = chatSlice.actions;

export const selectAggregateUnread = (state: { chat: ChatState }) => {
  const dmUnread = state.chat.conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const channelUnread = state.chat.channels.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  return dmUnread + channelUnread;
};

export const selectChatToasts = (state: { chat: ChatState }) => state.chat.notifications;

export const chatConversationIsMuted = isMuted;

export default chatSlice.reducer;
