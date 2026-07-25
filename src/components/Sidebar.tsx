'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { logout } from '@/store/authSlice';
import { selectAggregateUnread } from '@/store/chatSlice';
import { Layout, Menu, Button, Badge } from 'antd';
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
  const chatUnread = useSelector(selectAggregateUnread);

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
    {
      key: '/chat',
      label: (
        <span className="flex justify-between items-center w-full">
          Chat & Comm
          {chatUnread > 0 && <Badge count={chatUnread} size="small" overflowCount={99} />}
        </span>
      ),
      icon: <MessageOutlined />,
      roles: ['ROLE_EMPLOYEE', 'ROLE_MANAGER', 'ROLE_HR', 'ROLE_SUPER_ADMIN'],
    },
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
    const matched = filteredItems.find(item => pathname && pathname.startsWith(item.key));
    return matched ? [matched.key] : ['/dashboard'];
  };

  return (
    <Sider
      breakpoint="lg"
      collapsedWidth="0"
      width={256}
      className="h-screen fixed left-0 top-0 bottom-0 z-[100] border-r border-slate-100"
      theme="light"
    >
      <div className="flex flex-col h-full">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            H
          </div>
          <div>
            <h1 className="m-0 text-base font-bold leading-snug text-slate-800">HRMS Portal</h1>
            <span className="text-xs text-slate-400">Enterprise Suite</span>
          </div>
        </div>

        <Menu
          mode="inline"
          selectedKeys={getSelectedKey()}
          items={filteredItems}
          onClick={({ key }) => router.push(key)}
          className="flex-1 pt-4 border-r-0"
        />

        <div className="p-4 border-t border-slate-100">
          <Button
            type="text"
            danger
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            className="w-full flex items-center gap-2 h-10 rounded-lg"
          >
            Logout
          </Button>
        </div>
      </div>
    </Sider>
  );
}
