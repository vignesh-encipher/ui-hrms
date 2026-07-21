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
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [todayRecords, setTodayRecords] = useState<any[]>([]);
  const [secondsToday, setSecondsToday] = useState<number>(0);
  const [clockInLoading, setClockInLoading] = useState(false);
  const [clockOutLoading, setClockOutLoading] = useState(false);

  const loadToday = () => {
    if (!employeeId) return;
    
    // Fetch today's records by loading the current month's history and filtering for today
    const now = new Date();
    API.get('/attendance/monthly', {
      params: {
        employeeId,
        month: now.getMonth() + 1,
        year: now.getFullYear()
      }
    })
      .then((res) => {
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const localTodayStr = `${year}-${month}-${day}`;
        
        const filtered = res.data.filter((r: any) => r.date === localTodayStr);
        setTodayRecords(filtered);
        
        // Also set todayRecord to the active session or the last session
        const active = filtered.find((r: any) => !r.clockOut);
        if (active) {
          setTodayRecord(active);
        } else if (filtered.length > 0) {
          setTodayRecord(filtered[filtered.length - 1]);
        } else {
          setTodayRecord(null);
        }
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadToday();
  }, [employeeId]);

  const handleClockIn = async () => {
    if (!employeeId) return;
    try {
      setClockInLoading(true);
      await API.post('/attendance/clock-in', null, {
        params: { employeeId, status: 'Present', remarks: 'Web Portal' },
      });
      message.success('Clocked In successfully!');
      loadToday();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error clocking in');
    } finally {
      setClockInLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!employeeId) return;
    try {
      setClockOutLoading(true);
      await API.post('/attendance/clock-out', null, { params: { employeeId } });
      message.success('Clocked Out successfully!');
      loadToday();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error clocking out');
    } finally {
      setClockOutLoading(false);
    }
  };

  useEffect(() => {
    let interval: any;
    const activeSession = todayRecords.find((r: any) => !r.clockOut);
    
    if (activeSession) {
      const updateTimer = () => {
        let completedSeconds = 0;
        todayRecords.forEach((rec) => {
          if (rec.clockIn && rec.clockOut) {
            const [inH, inM, inS = 0] = rec.clockIn.split(':').map(Number);
            const [outH, outM, outS = 0] = rec.clockOut.split(':').map(Number);
            completedSeconds += (outH * 3600 + outM * 60 + outS) - (inH * 3600 + inM * 60 + inS);
          }
        });

        const [inH, inM, inS = 0] = activeSession.clockIn.split(':').map(Number);
        const now = new Date();
        const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        const activeSeconds = nowSeconds - (inH * 3600 + inM * 60 + inS);
        
        setSecondsToday(completedSeconds + (activeSeconds > 0 ? activeSeconds : 0));
      };
      
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      let completedSeconds = 0;
      todayRecords.forEach((rec) => {
        if (rec.clockIn && rec.clockOut) {
          const [inH, inM, inS = 0] = rec.clockIn.split(':').map(Number);
          const [outH, outM, outS = 0] = rec.clockOut.split(':').map(Number);
          completedSeconds += (outH * 3600 + outM * 60 + outS) - (inH * 3600 + inM * 60 + inS);
        }
      });
      setSecondsToday(completedSeconds);
    }
    
    return () => clearInterval(interval);
  }, [todayRecords]);

  const formatSeconds = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = Math.floor(totalSecs % 60);
    return `${hrs}h ${mins}m ${secs}s`;
  };

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <Row gutter={[24, 24]}>
          {Array.from({ length: 5 }).map((_, idx) => (
            <Col key={idx} xs={24} sm={12} lg={4} style={{ flexGrow: 1 }}>
              <Card bordered={false} style={{ borderRadius: '20px' }}>
                <Skeleton active paragraph={{ rows: 1 }} title={false} />
              </Card>
            </Col>
          ))}
        </Row>
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <Card bordered={false} style={{ borderRadius: '24px' }}>
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card bordered={false} style={{ borderRadius: '24px' }}>
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  const cards = [
    { title: 'Total Employees', value: data.totalEmployees, icon: <UserOutlined style={{ color: '#38bdf8' }} />, bg: '#e0f2fe' },
    { title: 'Present Today', value: data.presentToday, icon: <CalendarOutlined style={{ color: '#10b981' }} />, bg: '#d1fae5' },
    { title: 'Absent Today', value: data.absentToday, icon: <WarningOutlined style={{ color: '#f43f5e' }} />, bg: '#ffe4e6' },
    { title: 'Pending Leaves', value: data.pendingLeaves, icon: <ClockCircleOutlined style={{ color: '#f59e0b' }} />, bg: '#fef3c7' },
    { title: 'Departments', value: data.departmentsCount, icon: <ProfileOutlined style={{ color: '#6366f1' }} />, bg: '#e0e7ff' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Attendance Logger Row */}
      {employeeId && (
        <Card bordered={false} style={{ borderRadius: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ClockCircleOutlined style={{ fontSize: '24px', color: '#0284c7' }} />
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Attendance Logger</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#8c8c8c' }}>
                  {todayRecord ? (
                    todayRecord.clockOut 
                      ? `Last session: clocked out at ${todayRecord.clockOut}`
                      : `Active session: clocked in at ${todayRecord.clockIn}`
                  ) : 'Not clocked in yet today'}
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', color: '#8c8c8c' }}>Working Hours Today</span>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#0284c7', minWidth: '100px' }}>
                  {formatSeconds(secondsToday)}
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button
                  type="primary"
                  onClick={handleClockIn}
                  loading={clockInLoading}
                  disabled={clockInLoading || !!(todayRecord && !todayRecord.clockOut)}
                  style={{ background: '#10b981', borderColor: '#10b981', borderRadius: '12px', fontWeight: 'bold' }}
                >
                  Clock In
                </Button>
                <Button
                  type="primary"
                  danger
                  onClick={handleClockOut}
                  loading={clockOutLoading}
                  disabled={clockOutLoading || !todayRecord || !!todayRecord.clockOut}
                  style={{ borderRadius: '12px', fontWeight: 'bold' }}
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
          <Col key={idx} xs={24} sm={12} lg={4} style={{ flexGrow: 1 }}>
            <Card bordered={false} style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <Statistic
                title={<span style={{ color: '#8c8c8c', fontSize: '14px' }}>{card.title}</span>}
                value={card.value}
                prefix={
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    background: card.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '8px',
                    fontSize: '18px',
                  }}>
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
          <Card title="Attendance Trend (Last 5 Days)" bordered={false} style={{ borderRadius: '24px' }}>
            <div style={{ height: '320px' }}>
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
          <Card title="Department Distribution" bordered={false} style={{ borderRadius: '24px' }}>
            <div style={{ height: '320px' }}>
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
          <Card title="Leave Statistics by Type" bordered={false} style={{ borderRadius: '24px' }}>
            <div style={{ height: '280px' }}>
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
          <Card title="Upcoming Birthdays" bordered={false} style={{ borderRadius: '24px', minHeight: '328px' }}>
            <List
              itemLayout="horizontal"
              dataSource={data.upcomingBirthdays}
              locale={{ emptyText: 'No birthdays this month' }}
              renderItem={(bday) => (
                <List.Item actions={[<GiftOutlined style={{ color: '#ec4899', fontSize: '18px' }} />]}>
                  <List.Item.Meta
                    avatar={<Avatar style={{ backgroundColor: '#0284c7' }}>{bday.name.charAt(0)}</Avatar>}
                    title={<span style={{ fontWeight: 'semibold' }}>{bday.name}</span>}
                    description={`Born: ${bday.dob}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Recent Activity" bordered={false} style={{ borderRadius: '24px', minHeight: '328px' }}>
            <List
              itemLayout="horizontal"
              dataSource={data.recentActivities}
              renderItem={(act) => (
                <List.Item>
                  <List.Item.Meta
                    title={<span style={{ fontSize: '13px', fontWeight: 'medium' }}>{act.activity}</span>}
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
