'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Layout, Spin } from 'antd';

const { Content } = Layout;

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isFirstLogin } = useSelector((state: RootState) => state.auth);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) {
      router.push('/login');
    } else if (isFirstLogin) {
      router.push('/change-password');
    }
  }, [isAuthenticated, isFirstLogin, router]);

  if (!mounted || !isAuthenticated || isFirstLogin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout className="!min-h-screen">
      <Sidebar />
      <Layout className="!ml-64 !transition-all !duration-200">
        <Header />
        <Content className="!mt-[88px] !mx-6 !mb-6 !min-h-[280px]">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
