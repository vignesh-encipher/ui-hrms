'use client';

import React, { useEffect } from 'react';
import { Provider, useSelector } from 'react-redux';
import { store, RootState } from '@/store';
import { ConfigProvider, App, theme as antdTheme } from 'antd';

import { AntdStaticHelper } from '@/utils/antdStatic';
import GlobalChatProvider from '@/providers/GlobalChatProvider';
import ChatToastStack from '@/components/ChatToastStack';

function AntdConfigWrapper({ children }: { children: React.ReactNode }) {
  const mode = useSelector((state: RootState) => state.theme.mode);

  useEffect(() => {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mode]);

  return (
    <ConfigProvider
      theme={{
        algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#0284c7', // Sky-600 primary color
          borderRadius: 12,
        },
      }}
    >
      <App>
        <AntdStaticHelper />
        <GlobalChatProvider>{children}</GlobalChatProvider>
        <ChatToastStack />
      </App>
    </ConfigProvider>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AntdConfigWrapper>{children}</AntdConfigWrapper>
    </Provider>
  );
}
