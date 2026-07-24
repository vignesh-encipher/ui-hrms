'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { selectChatToasts, dismissToast, ChatToast } from '@/store/chatSlice';

const TOAST_DURATION_MS = 6000;

const formatRelativeTime = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(iso).toLocaleDateString();
};

function ToastCard({ toast }: { toast: ChatToast }) {
  const dispatch = useDispatch();
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => dispatch(dismissToast(toast.id)), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast.id, dispatch]);

  const handleClick = () => {
    router.push(toast.targetUrl);
    dispatch(dismissToast(toast.id));
  };

  return (
    <div
      onClick={handleClick}
      style={{
        display: 'flex',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 12,
        background: 'var(--ant-color-bg-elevated, #fff)',
        boxShadow: '0 6px 24px rgba(0,0,0,0.16)',
        cursor: 'pointer',
        width: 320,
        pointerEvents: 'auto',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Avatar src={toast.senderAvatar} icon={<UserOutlined />} size={40} />
        <span
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#10b981',
            border: '2px solid #fff',
          }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{toast.senderName}</div>
        {!toast.isDm && toast.channelName && (
          <div style={{ fontSize: 12, color: '#8c8c8c' }}># {toast.channelName}</div>
        )}
        <div
          style={{
            fontSize: 13,
            marginTop: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
          }}
        >
          {toast.preview}
        </div>
        <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 4 }}>{formatRelativeTime(toast.createdAt)}</div>
      </div>
    </div>
  );
}

export default function ChatToastStack() {
  const toasts = useSelector(selectChatToasts);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
