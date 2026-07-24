'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { RootState } from '@/store';
import API from '@/services/api';
import { getStorage, setStorage } from '@/utils/storages';
import { chatSocket } from '@/lib/chatSocket';
import {
  setUsers,
  setOnlineStatuses,
  setChannels,
  setConversations,
  setNotificationSettings,
  NotificationSettings,
} from '@/store/chatSlice';

const DEFAULT_SETTINGS: NotificationSettings = {
  soundEnabled: true,
  browserNotificationsEnabled: false,
  mutedAll: false,
  mutedConversations: [],
  playSoundForActiveConversation: true,
};

export default function GlobalChatProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, token, id: reduxUserId } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    chatSocket.setNavigator(router.push);
  }, [router]);

  useEffect(() => {
    const resumeAudio = () => chatSocket.unlockAudio();
    window.addEventListener('click', resumeAudio);
    window.addEventListener('keydown', resumeAudio);
    return () => {
      window.removeEventListener('click', resumeAudio);
      window.removeEventListener('keydown', resumeAudio);
    };
  }, []);

  // Socket lifecycle: connect on login, disconnect on logout/token change.
  useEffect(() => {
    if (!isAuthenticated || !token) {
      chatSocket.disconnect();
      return;
    }
    chatSocket.connect(token);
    return () => {
      chatSocket.disconnect();
    };
  }, [isAuthenticated, token]);

  // Initial data + notification settings/permission: once per login, not per token refresh.
  useEffect(() => {
    if (!isAuthenticated) return;

    const currentUserId = reduxUserId || getStorage('userId');

    API.get('/chat/users')
      .then((res) => {
        dispatch(setUsers(res.data));
        const statusMap: { [userId: string]: string } = {};
        res.data.forEach((u: any) => {
          statusMap[u.id] = u.status || 'offline';
        });
        dispatch(setOnlineStatuses(statusMap));
      })
      .catch(() => {});

    API.get('/chat/channels')
      .then((res) => dispatch(setChannels(res.data)))
      .catch(() => {});

    API.get('/chat/conversations')
      .then((res) => dispatch(setConversations(res.data || [])))
      .catch(() => {});

    if (!currentUserId) return;

    let settings = DEFAULT_SETTINGS;
    const stored = getStorage(`chat_settings_${currentUserId}`);
    if (stored) {
      try {
        settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      } catch (e) {}
    }
    dispatch(setNotificationSettings(settings));

    const persistSettings = (next: NotificationSettings) => {
      dispatch(setNotificationSettings(next));
      setStorage(`chat_settings_${currentUserId}`, JSON.stringify(next));
    };

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            persistSettings({ ...settings, browserNotificationsEnabled: true });
          }
        });
      } else if (Notification.permission === 'granted' && !settings.browserNotificationsEnabled) {
        persistSettings({ ...settings, browserNotificationsEnabled: true });
      }
    }
  }, [isAuthenticated, reduxUserId, dispatch]);

  return <>{children}</>;
}
