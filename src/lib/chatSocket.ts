import { store } from '@/store';
import API from '@/services/api';
import { getStorage } from '@/utils/storages';
import {
  setConnectionStatus,
  setUsers,
  setChannels,
  setConversations,
  clearActiveConversation,
  setTyping,
  applyPresence,
  upsertConversationOnIncomingMessage,
  markConversationReadLocal,
  removeChannel,
  pushToast,
  chatConversationIsMuted,
} from '@/store/chatSlice';
import { message as antdMessage } from '@/utils/antdStatic';

type ChatSocketEvent = any;
type Listener = (event: ChatSocketEvent) => void;

const NOTIFICATION_SOUND_URL = '/fahhhhh.mp3';
const SOUND_THROTTLE_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

const truncate = (text: string, max = 120) => {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

class ChatSocketManager {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private lastPlayTime = 0;
  private audioCtx: AudioContext | null = null;
  private notificationAudio: HTMLAudioElement | null = null;
  private audioUnlocked = false;
  private navigate: ((url: string) => void) | null = null;
  private listeners: Set<Listener> = new Set();

  setNavigator(fn: (url: string) => void) {
    this.navigate = fn;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private getAudioElement(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (!this.notificationAudio) {
      this.notificationAudio = new Audio(NOTIFICATION_SOUND_URL);
      this.notificationAudio.volume = 0.4;
    }
    return this.notificationAudio;
  }

  // Browsers block programmatic audio playback until the page has seen a real user
  // gesture. Re-use (rather than recreate) the same <audio> element for the initial
  // silent unlock play and every subsequent notification play, since some autoplay
  // policies key the "allowed to play" flag off the specific element that was
  // successfully played during the gesture.
  unlockAudio() {
    if (typeof window === 'undefined' || this.audioUnlocked) return;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    const audio = this.getAudioElement();
    if (!audio) return;
    audio.muted = true;
    audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
        this.audioUnlocked = true;
      })
      .catch(() => {
        audio.muted = false;
      });
  }

  connect(token: string) {
    if (this.ws && this.token === token && this.ws.readyState === WebSocket.OPEN) return;
    this.disconnect();
    this.intentionalClose = false;
    this.token = token;
    this.openSocket();
  }

  private openSocket() {
    if (!this.token) return;
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://be-hrms-x40s.onrender.com';
    const wsHost = apiBaseUrl.replace(/^http/, 'ws');
    const wsUrl = `${wsHost}/ws-chat?token=${this.token}`;

    store.dispatch(setConnectionStatus('connecting'));
    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectAttempt = 0;
      store.dispatch(setConnectionStatus('open'));
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        this.handleEvent(payload);
      } catch (err) {
        console.error('Failed to parse WebSocket event', err);
      }
    };

    ws.onerror = (err) => {
      console.error('Chat WebSocket error', err);
    };

    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      store.dispatch(setConnectionStatus('closed'));
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempt, MAX_RECONNECT_DELAY_MS);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.intentionalClose && this.token) {
        this.openSocket();
      }
    }, delay);
  }

  disconnect() {
    this.intentionalClose = true;
    this.token = null;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempt = 0;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    store.dispatch(setConnectionStatus('idle'));
  }

  send(payload: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private getCurrentUserId(): string | null {
    const authState = store.getState().auth;
    return authState.id || getStorage('userId');
  }

  private refetchChannels() {
    API.get('/chat/channels')
      .then((res) => store.dispatch(setChannels(res.data)))
      .catch(() => {});
  }

  private refetchConversations() {
    API.get('/chat/conversations')
      .then((res) => store.dispatch(setConversations(res.data || [])))
      .catch(() => {});
  }

  private computeTargetUrl(conversationId: string, isDm: boolean): string {
    if (isDm) {
      const currentUserId = this.getCurrentUserId();
      const parts = conversationId.split('_');
      const targetId = parts[0] === currentUserId ? parts[1] : parts[0];
      return `/chat?user=${targetId}`;
    }
    return `/chat?channel=${conversationId}`;
  }

  private navigateToConversation(conversationId: string, isDm: boolean) {
    this.navigate?.(this.computeTargetUrl(conversationId, isDm));
  }

  private handleEvent(event: ChatSocketEvent) {
    const { type } = event;
    const state = store.getState();
    const currentUserId = this.getCurrentUserId();

    switch (type) {
      case 'CHAT_MESSAGE': {
        const msg = event.message;
        const isFromSelf = msg.senderId === currentUserId;
        const isDm = msg.conversationId.includes('_');
        const isViewing = state.chat.activeConversation?.id === msg.conversationId;
        const muted = chatConversationIsMuted(state.chat.notificationSettings, msg.conversationId);
        const sender = state.chat.users.find((u) => u.id === msg.senderId);

        if (!isFromSelf) {
          if (isViewing) {
            store.dispatch(markConversationReadLocal(msg.conversationId));
            API.post(`/chat/conversations/${msg.conversationId}/read`).catch(() => {});
          } else if (isDm) {
            // Always update directly and immediately — never wait on a network refetch
            // for the unread badge to move, even for a brand-new conversation.
            store.dispatch(
              upsertConversationOnIncomingMessage({
                conversationId: msg.conversationId,
                message: msg.message,
                createdAt: msg.createdAt,
                isDm: true,
                senderId: msg.senderId,
                senderName: sender?.name,
                senderAvatar: sender?.photo,
              })
            );
          } else {
            const exists = state.chat.channels.some((c) => c.id === msg.conversationId);
            if (exists) {
              store.dispatch(
                upsertConversationOnIncomingMessage({
                  conversationId: msg.conversationId,
                  message: msg.message,
                  createdAt: msg.createdAt,
                  isDm: false,
                })
              );
            } else {
              this.refetchChannels();
            }
          }

          if (!muted) {
            const shouldPlaySound =
              state.chat.notificationSettings.soundEnabled &&
              (!isViewing || state.chat.notificationSettings.playSoundForActiveConversation);
            if (shouldPlaySound) this.playSoundThrottled();

            if (!isViewing) {
              const senderName = sender ? sender.name : 'Unknown Colleague';
              this.showToast(msg, senderName, sender?.photo, isDm, msg.conversationId);
              this.showBrowserNotification(senderName, msg.message, msg.conversationId, isDm);
            }
          }
        }
        this.emit(event);
        break;
      }

      case 'TYPING': {
        const { conversationId, senderId, isTyping } = event;
        const sender = state.chat.users.find((u) => u.id === senderId);
        if (sender) {
          store.dispatch(setTyping({ conversationId, userName: sender.name, isTyping }));
        }
        break;
      }

      case 'PRESENCE': {
        store.dispatch(applyPresence({ userId: event.userId, status: event.status }));
        break;
      }

      case 'CONVERSATION_READ': {
        if (event.readerId === currentUserId) {
          store.dispatch(markConversationReadLocal(event.conversationId));
        }
        this.emit(event);
        break;
      }

      case 'CHANNEL_CREATED':
      case 'CHANNEL_INVITATION':
      case 'CHANNEL_UPDATED': {
        this.refetchChannels();
        break;
      }

      case 'REMOVED_FROM_CHANNEL': {
        store.dispatch(removeChannel(event.channelId));
        if (state.chat.activeConversation?.id === event.channelId) {
          store.dispatch(clearActiveConversation());
          antdMessage.info('You have been removed from this channel');
        }
        break;
      }

      case 'READ_RECEIPT':
      case 'MESSAGE_EDITED':
      case 'MESSAGE_DELETED':
      case 'MESSAGE_PINNED_TOGGLE':
      case 'MESSAGE_REACTION': {
        this.emit(event);
        break;
      }

      default:
        break;
    }
  }

  private emit(event: ChatSocketEvent) {
    this.listeners.forEach((fn) => fn(event));
  }

  private playSoundThrottled() {
    const now = Date.now();
    if (now - this.lastPlayTime < SOUND_THROTTLE_MS) return;
    this.lastPlayTime = now;
    const audio = this.getAudioElement();
    if (!audio) return;
    try {
      audio.currentTime = 0;
      audio.play().catch((err) => console.warn('Failed to play notification audio file', err));
    } catch (err) {
      console.error('Audio playback error', err);
    }
  }

  // Dispatches into chatSlice rather than any shared/imperative toast API - rendered by
  // ChatToastStack, a dedicated component with its own isolated queue. This keeps chat
  // toasts immune to unrelated notification traffic elsewhere in the app (see the
  // chat performance/reliability plan for why sharing antd's App-level notification
  // instance made this render unreliably).
  private showToast(msg: any, senderName: string, senderAvatar: string | undefined, isDm: boolean, conversationId: string) {
    const channel = !isDm ? store.getState().chat.channels.find((c) => c.id === conversationId) : null;

    store.dispatch(
      pushToast({
        id: `toast-${msg.id}`,
        conversationId,
        isDm,
        senderName,
        senderAvatar,
        channelName: !isDm ? channel?.name : undefined,
        preview: truncate(msg.message),
        createdAt: msg.createdAt,
        targetUrl: this.computeTargetUrl(conversationId, isDm),
      })
    );
  }

  private showBrowserNotification(senderName: string, messageText: string, conversationId: string, isDm: boolean) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const settings = store.getState().chat.notificationSettings;
    if (Notification.permission !== 'granted' || !settings.browserNotificationsEnabled) return;

    let title = senderName;
    let body = messageText;
    if (!isDm) {
      const channel = store.getState().chat.channels.find((c) => c.id === conversationId);
      title = channel ? `# ${channel.name}` : 'Group Chat';
      body = `${senderName}: ${messageText}`;
    }

    const notification = new Notification(title, { body, icon: '/logo.png' });

    notification.onclick = () => {
      window.focus();
      this.navigateToConversation(conversationId, isDm);
      notification.close();
    };
  }
}

export const chatSocket = new ChatSocketManager();
