'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { logout } from '@/store/authSlice';
import { Layout, Menu, Button } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  ApartmentOutlined,
  SolutionOutlined,
  CalendarOutlined,
  CarryOutOutlined,
  ClusterOutlined,
  DollarOutlined,
  LogoutOutlined,
  MessageOutlined
} from '@ant-design/icons';

const { Sider } = Layout;

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const { roles } = useSelector((state: RootState) => state.auth);

  const hasRole = (allowed: string[]) => {
    return roles.some((r) => allowed.includes(r));
  };

  const handleLogout = () => {
    dispatch(logout());
    router.push('/login');
  };

  const menuItems = [
    { key: '/dashboard', label: 'Dashboard', icon: <DashboardOutlined />, roles: ['ROLE_EMPLOYEE', 'ROLE_MANAGER', 'ROLE_HR', 'ROLE_SUPER_ADMIN'] },
    { key: '/employees', label: 'Employees', icon: <UserOutlined />, roles: ['ROLE_HR', 'ROLE_SUPER_ADMIN', 'ROLE_MANAGER'] },
    { key: '/organization-chart', label: 'Org Chart', icon: <ClusterOutlined />, roles: ['ROLE_EMPLOYEE', 'ROLE_MANAGER', 'ROLE_HR', 'ROLE_SUPER_ADMIN'] },
    { key: '/departments', label: 'Departments', icon: <ApartmentOutlined />, roles: ['ROLE_HR', 'ROLE_SUPER_ADMIN'] },
    { key: '/designations', label: 'Designations', icon: <SolutionOutlined />, roles: ['ROLE_HR', 'ROLE_SUPER_ADMIN'] },
    { key: '/attendance', label: 'Attendance', icon: <CalendarOutlined />, roles: ['ROLE_EMPLOYEE', 'ROLE_MANAGER', 'ROLE_HR', 'ROLE_SUPER_ADMIN'] },
    { key: '/leaves', label: 'Leaves', icon: <CarryOutOutlined />, roles: ['ROLE_EMPLOYEE', 'ROLE_MANAGER', 'ROLE_HR', 'ROLE_SUPER_ADMIN'] },
    { key: '/payroll', label: 'Payroll', icon: <DollarOutlined />, roles: ['ROLE_EMPLOYEE', 'ROLE_HR', 'ROLE_SUPER_ADMIN'] },
    { key: '/chat', label: 'Chat & Comm', icon: <MessageOutlined />, roles: ['ROLE_EMPLOYEE', 'ROLE_MANAGER', 'ROLE_HR', 'ROLE_SUPER_ADMIN'] },
    { key: '/profile', label: 'My Profile', icon: <UserOutlined />, roles: ['ROLE_EMPLOYEE', 'ROLE_MANAGER', 'ROLE_HR', 'ROLE_SUPER_ADMIN'] },
  ];

  const filteredItems = menuItems
    .filter((item) => hasRole(item.roles))
    .map((item) => ({
      key: item.key,
      label: item.label,
      icon: item.icon,
    }));

  const getSelectedKey = () => {
    const matched = filteredItems.find(item => pathname.startsWith(item.key));
    return matched ? [matched.key] : ['/dashboard'];
  };

  return (
    <Sider
      breakpoint="lg"
      collapsedWidth="0"
      width={256}
      style={{
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        borderRight: '1px solid rgba(0, 0, 0, 0.06)',
      }}
      theme="light"
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(0, 0, 0, 0.06)' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '18px',
          }}>
            H
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', lineHeight: '1.2' }}>HRMS Portal</h1>
            <span style={{ fontSize: '12px', color: '#8c8c8c' }}>Enterprise Suite</span>
          </div>
        </div>

        <Menu
          mode="inline"
          selectedKeys={getSelectedKey()}
          items={filteredItems}
          onClick={({ key }) => router.push(key)}
          style={{ flex: 1, paddingTop: '16px', borderRight: 0 }}
        />

        <div style={{ padding: '16px', borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}>
          <Button
            type="text"
            danger
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', height: '40px', borderRadius: '8px' }}
          >
            Logout
          </Button>
        </div>
      </div>
    </Sider>
  );
}
