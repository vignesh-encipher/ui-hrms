'use client';

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { toggleTheme } from '@/store/themeSlice';
import { selectAggregateUnread } from '@/store/chatSlice';
import { Layout, Button, Badge, Avatar, Space } from 'antd';
import { SunOutlined, MoonOutlined, BellOutlined, UserOutlined } from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';

const { Header: AntdHeader } = Layout;

export default function Header() {
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { username, roles } = useSelector((state: RootState) => state.auth);
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const chatUnread = useSelector(selectAggregateUnread);

  const getPageTitle = () => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) return 'Overview';
    const first = parts[0];
    return first.charAt(0).toUpperCase() + first.slice(1);
  };

  return (
    <AntdHeader
      className={`!px-6 !flex !items-center !justify-between !h-16 !fixed !top-0 !right-0 !left-[256px] !z-[90] !border-b !border-slate-100/50 !transition-colors !duration-200 !leading-[4rem] ${
        themeMode === 'dark' ? '!bg-[#141414]' : '!bg-white'
      }`}
    >
      <div className="flex w-full justify-between items-center">
        <h2 className="m-0 text-lg font-bold text-slate-800">{getPageTitle()}</h2>

        <Space size={16}>
          {/* Theme Toggle */}
          <Button
            type="text"
            shape="circle"
            icon={themeMode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
            onClick={() => dispatch(toggleTheme())}
            className="!text-base"
          />

          {/* Notifications */}
          <Badge count={chatUnread} size="small" overflowCount={99}>
            <Button
              type="text"
              shape="circle"
              icon={<BellOutlined />}
              onClick={() => router.push('/chat')}
              className="!text-base"
            />
          </Badge>

          {/* User profile brief */}
          <Space size={8} className="!border-l !border-slate-100 !pl-4">
            <Avatar icon={<UserOutlined />} className="!bg-[#0284c7]" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-slate-700">{username || 'User'}</span>
              <span className="text-[10px] text-slate-400 uppercase">
                {roles[0]?.replace('ROLE_', '') || 'Employee'}
              </span>
            </div>
          </Space>
        </Space>
      </div>
    </AntdHeader>
  );
}
