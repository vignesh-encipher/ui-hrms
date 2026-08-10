'use client';

import React, { useEffect, useState } from 'react';
import API from '@/services/api';
import { Card, Row, Col, Statistic, List, Avatar, Spin, Skeleton, Button, message } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  UserOutlined,
  CalendarOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  GiftOutlined,
  ProfileOutlined
} from '@ant-design/icons';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface DashboardData {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  pendingLeaves: number;
  departmentsCount: number;
  upcomingBirthdays: Array<{ name: string; dob: string; employeeId: string; photo?: string }>;
  attendanceTrend: Array<{ date: string; Present: number; Absent: number }>;
  leaveStatistics: Array<{ type: string; count: number }>;
  departmentWiseEmployees: Array<{ department: string; count: number }>;
  recentActivities: Array<{ id: string; activity: string; time: string }>;
}

const COLORS = ['#0ea5e9', '#6366f1', '#ec4899', '#f59e0b', '#10b981'];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { employeeId } = useSelector((state: RootState) => state.auth);
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [secondsToday, setSecondsToday] = useState<number>(0);
  const [clockInLoading, setClockInLoading] = useState(false);
  const [clockOutLoading, setClockOutLoading] = useState(false);

  const loadToday = () => {
    if (!employeeId) return;
    API.get('/attendance/today')
      .then((res) => {
        setTodayStatus(res.data);
        setSecondsToday((res.data?.workingMinutesSoFar || 0) * 60);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadToday();
    // Re-sync with the server every 60s rather than trusting a client-only tick indefinitely
    const resync = setInterval(loadToday, 60000);
    return () => clearInterval(resync);
  }, [employeeId]);

  const handleClockIn = async () => {
    if (!employeeId) return;
    try {
      setClockInLoading(true);
      await API.post('/attendance/check-in');
      message.success('Checked In successfully!');
      loadToday();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error checking in');
    } finally {
      setClockInLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!employeeId) return;
    try {
      setClockOutLoading(true);
      await API.post('/attendance/check-out');
      message.success('Checked Out successfully!');
      loadToday();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error checking out');
    } finally {
      setClockOutLoading(false);
    }
  };

  useEffect(() => {
    if (!todayStatus?.checkedIn || todayStatus?.onBreak) return;
    const interval = setInterval(() => {
      setSecondsToday((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [todayStatus?.checkedIn, todayStatus?.onBreak]);

  const formatSeconds = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = Math.floor(totalSecs % 60);
    return `${hrs}h ${mins}m ${secs}s`;
  };

  const formatTime = (iso?: string) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  const lastSession = todayStatus?.attendance?.sessions?.[todayStatus.attendance.sessions.length - 1];

  useEffect(() => {
    API.get('/dashboard/stats')
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <Row gutter={[24, 24]}>
          {Array.from({ length: 5 }).map((_, idx) => (
            <Col key={idx} xs={24} sm={12} lg={4} className="grow">
              <Card bordered={false} className="rounded-[20px]">
                <Skeleton active paragraph={{ rows: 1 }} title={false} />
              </Card>
            </Col>
          ))}
        </Row>
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <Card bordered={false} className="rounded-3xl">
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card bordered={false} className="rounded-3xl">
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  const cards = [
    { title: 'Total Employees', value: data.totalEmployees, icon: <UserOutlined className="text-sky-400" />, bgClass: 'bg-sky-100' },
    { title: 'Present Today', value: data.presentToday, icon: <CalendarOutlined className="text-emerald-500" />, bgClass: 'bg-emerald-100' },
    { title: 'Absent Today', value: data.absentToday, icon: <WarningOutlined className="text-rose-500" />, bgClass: 'bg-rose-100' },
    { title: 'Pending Leaves', value: data.pendingLeaves, icon: <ClockCircleOutlined className="text-amber-500" />, bgClass: 'bg-amber-100' },
    { title: 'Departments', value: data.departmentsCount, icon: <ProfileOutlined className="text-indigo-500" />, bgClass: 'bg-indigo-100' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Attendance Logger Row */}
      {employeeId && (
        <Card bordered={false} className="!rounded-3xl !shadow-sm">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <ClockCircleOutlined className="text-2xl text-[#0284c7]" />
              <div>
                <h4 className="m-0 text-base font-bold text-slate-800">Attendance Logger</h4>
                <p className="m-0 text-xs text-slate-400">
                  {todayStatus?.onBreak
                    ? 'On break'
                    : todayStatus?.checkedIn
                    ? `Active session: checked in at ${formatTime(lastSession?.checkIn)}`
                    : lastSession?.checkOut
                    ? `Last session: checked out at ${formatTime(lastSession.checkOut)}`
                    : 'Not checked in yet today'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-xs text-slate-400">Working Hours Today</span>
                <h3 className="m-0 text-xl font-bold text-[#0284c7] min-w-[100px]">
                  {formatSeconds(secondsToday)}
                </h3>
              </div>
              <div className="flex gap-3">
                <Button
                  type="primary"
                  onClick={handleClockIn}
                  loading={clockInLoading}
                  disabled={clockInLoading || !!todayStatus?.checkedIn}
                  className="!bg-emerald-500 !border-emerald-500 !rounded-xl !font-bold text-white hover:!bg-emerald-600 hover:!border-emerald-600"
                >
                  Clock In
                </Button>
                <Button
                  type="primary"
                  danger
                  onClick={handleClockOut}
                  loading={clockOutLoading}
                  disabled={clockOutLoading || !todayStatus?.checkedIn}
                  className="!rounded-xl !font-bold"
                >
                  Clock Out
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Metric Cards Row */}
      <Row gutter={[24, 24]}>
        {cards.map((card, idx) => (
          <Col key={idx} xs={24} sm={12} lg={4} className="grow">
            <Card bordered={false} className="!rounded-[20px] !shadow-sm">
              <Statistic
                title={<span className="text-slate-400 text-sm">{card.title}</span>}
                value={card.value}
                prefix={
                  <div className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center mr-2 text-lg ${card.bgClass}`}>
                    {card.icon}
                  </div>
                }
                valueStyle={{ fontWeight: 'bold', fontSize: '24px' }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Main Charts Row */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card title="Attendance Trend (Last 5 Days)" bordered={false} className="!rounded-3xl">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.attendanceTrend}>
                  <defs>
                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="Present" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorPresent)" />
                  <Area type="monotone" dataKey="Absent" stroke="#f43f5e" strokeWidth={2} fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Department Distribution" bordered={false} className="!rounded-3xl">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.departmentWiseEmployees}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="department"
                  >
                    {data.departmentWiseEmployees.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Birthdays & Activities Row */}
      <Row gutter={[24, 24]}>
        <Col xs={24} md={12} lg={8}>
          <Card title="Leave Statistics by Type" bordered={false} className="!rounded-3xl">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.leaveStatistics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="type" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => v.split(' ')[0]} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12} lg={8}>
          <Card title="Upcoming Birthdays" bordered={false} className="!rounded-3xl !min-h-[328px]">
            <List
              itemLayout="horizontal"
              dataSource={data.upcomingBirthdays}
              locale={{ emptyText: 'No birthdays this month' }}
              renderItem={(bday) => (
                <List.Item actions={[<GiftOutlined className="text-pink-500 text-lg" />]}>
                  <List.Item.Meta
                    avatar={<Avatar className="bg-[#0284c7]">{bday.name.charAt(0)}</Avatar>}
                    title={<span className="font-semibold text-slate-700">{bday.name}</span>}
                    description={`Born: ${bday.dob}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Recent Activity" bordered={false} className="!rounded-3xl !min-h-[328px]">
            <List
              itemLayout="horizontal"
              dataSource={data.recentActivities}
              renderItem={(act) => (
                <List.Item>
                  <List.Item.Meta
                    title={<span className="text-xs font-medium text-slate-700">{act.activity}</span>}
                    description={act.time}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
