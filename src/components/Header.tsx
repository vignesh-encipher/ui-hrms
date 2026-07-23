'use client';

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { toggleTheme } from '@/store/themeSlice';
import { Layout, Button, Badge, Avatar, Space } from 'antd';
import { SunOutlined, MoonOutlined, BellOutlined, UserOutlined } from '@ant-design/icons';
import { usePathname } from 'next/navigation';

const { Header: AntdHeader } = Layout;

export default function Header() {
  const dispatch = useDispatch();
  const pathname = usePathname() ?? "";
  const { username, roles } = useSelector((state: RootState) => state.auth);
  const themeMode = useSelector((state: RootState) => state.theme.mode);

  const getPageTitle = () => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) return 'Overview';
    const first = parts[0];
    return first.charAt(0).toUpperCase() + first.slice(1);
  };

  return (
    <AntdHeader
      style={{
        padding: '0 24px',
        background: themeMode === 'dark' ? '#141414' : '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'between',
        height: '64px',
        lineHeight: '64px',
        position: 'fixed',
        top: 0,
        right: 0,
        left: '256px',
        zIndex: 90,
        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        transition: 'background 0.2s',
      }}
    >
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{getPageTitle()}</h2>

        <Space size={16}>
          {/* Theme Toggle */}
          <Button
            type="text"
            shape="circle"
            icon={themeMode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
            onClick={() => dispatch(toggleTheme())}
            style={{ fontSize: '16px' }}
          />

          {/* Notifications */}
          <Badge dot>
            <Button
              type="text"
              shape="circle"
              icon={<BellOutlined />}
              style={{ fontSize: '16px' }}
            />
          </Badge>

          {/* User profile brief */}
          <Space size={8} style={{ borderLeft: '1px solid rgba(0, 0, 0, 0.06)', paddingLeft: '16px' }}>
            <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#0284c7' }} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
              <span style={{ fontSize: '14px', fontWeight: 'semibold' }}>{username || 'User'}</span>
              <span style={{ fontSize: '10px', color: '#8c8c8c', textTransform: 'uppercase' }}>
                {roles[0]?.replace('ROLE_', '') || 'Employee'}
              </span>
            </div>
          </Space>
        </Space>
      </div>
    </AntdHeader>
  );
}
