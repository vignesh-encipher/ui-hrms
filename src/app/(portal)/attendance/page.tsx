'use client';

import React, { useEffect, useState } from 'react';
import API from '@/services/api';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Card, Row, Col, Button, Table, Space, Select, DatePicker, message } from 'antd';
import { LoginOutlined, LogoutOutlined, CheckCircleOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Option } = Select;

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  status: string;
  remarks?: string;
}

export default function AttendancePage() {
  const { employeeId, roles } = useSelector((state: RootState) => state.auth);
  const isHR = roles.includes('ROLE_HR') || roles.includes('ROLE_SUPER_ADMIN');

  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [masterLoading, setMasterLoading] = useState(false);
  
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // Master date view for HR
  const [searchDate, setSearchDate] = useState(new Date().toISOString().split('T')[0]);
  const [masterRecords, setMasterRecords] = useState<AttendanceRecord[]>([]);

  const [todayRecords, setTodayRecords] = useState<any[]>([]);
  const [secondsToday, setSecondsToday] = useState<number>(0);

  const loadTodayRecords = () => {
    if (!employeeId) return;
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
      })
      .catch((err) => console.error(err));
  };

  const loadToday = () => {
    if (!employeeId) return;
    API.get('/attendance/today', { params: { employeeId } })
      .then((res) => setTodayRecord(res.data))
      .catch(() => {});
    loadTodayRecords();
  };

  const loadHistory = () => {
    if (!employeeId) return;
    setLoading(true);
    API.get('/attendance/monthly', { params: { employeeId, month, year } })
      .then((res) => setHistory(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadMasterRecords = () => {
    if (!isHR) return;
    setMasterLoading(true);
    API.get('/attendance/date', { params: { date: searchDate } })
      .then((res) => setMasterRecords(res.data))
      .catch(() => {})
      .finally(() => setMasterLoading(false));
  };

  useEffect(() => {
    loadToday();
    loadHistory();
  }, [employeeId, month, year]);

  useEffect(() => {
    loadMasterRecords();
  }, [searchDate]);

  const handleClockIn = async () => {
    if (!employeeId) return;
    try {
      await API.post('/attendance/clock-in', null, {
        params: { employeeId, status: 'Present', remarks: 'Web Portal' },
      });
      message.success('Clocked In successfully!');
      loadToday();
      loadHistory();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error clocking in');
    }
  };

  const handleClockOut = async () => {
    if (!employeeId) return;
    try {
      await API.post('/attendance/clock-out', null, { params: { employeeId } });
      message.success('Clocked Out successfully!');
      loadToday();
      loadHistory();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error clocking out');
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

  interface GroupedAttendance {
    key: string;
    date: string;
    clockIn: string;
    clockOut: string;
    status: string;
    workingHours: string;
    sessions: number;
    employeeId?: string;
    remarks?: string;
  }

  const getGroupedHistory = (): GroupedAttendance[] => {
    const map: Record<string, AttendanceRecord[]> = {};
    history.forEach((rec) => {
      if (!map[rec.date]) {
        map[rec.date] = [];
      }
      map[rec.date].push(rec);
    });

    return Object.entries(map).map(([date, recs]) => {
      recs.sort((a, b) => a.clockIn.localeCompare(b.clockIn));
      const firstClockIn = recs[0].clockIn;
      const lastClockOut = recs[recs.length - 1].clockOut || 'Active';
      
      let totalMinutes = 0;
      recs.forEach(rec => {
        if (rec.clockIn && rec.clockOut) {
          const [inH, inM] = rec.clockIn.split(':').map(Number);
          const [outH, outM] = rec.clockOut.split(':').map(Number);
          const diff = (outH * 60 + outM) - (inH * 60 + inM);
          if (diff > 0) totalMinutes += diff;
        }
      });
      const hrs = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;

      return {
        key: date,
        date,
        clockIn: firstClockIn,
        clockOut: lastClockOut,
        status: recs[0].status,
        workingHours: `${hrs}h ${mins}m`,
        sessions: recs.length,
      };
    });
  };

  const getGroupedMaster = (): GroupedAttendance[] => {
    const map: Record<string, AttendanceRecord[]> = {};
    masterRecords.forEach((rec) => {
      if (!map[rec.employeeId]) {
        map[rec.employeeId] = [];
      }
      map[rec.employeeId].push(rec);
    });

    return Object.entries(map).map(([empId, recs]) => {
      recs.sort((a, b) => a.clockIn.localeCompare(b.clockIn));
      const firstClockIn = recs[0].clockIn;
      const lastClockOut = recs[recs.length - 1].clockOut || 'Active';
      
      let totalMinutes = 0;
      recs.forEach(rec => {
        if (rec.clockIn && rec.clockOut) {
          const [inH, inM] = rec.clockIn.split(':').map(Number);
          const [outH, outM] = rec.clockOut.split(':').map(Number);
          const diff = (outH * 60 + outM) - (inH * 60 + inM);
          if (diff > 0) totalMinutes += diff;
        }
      });
      const hrs = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;

      return {
        key: empId,
        date: searchDate,
        employeeId: empId,
        clockIn: firstClockIn,
        clockOut: lastClockOut,
        status: recs[0].status,
        workingHours: `${hrs}h ${mins}m`,
        sessions: recs.length,
        remarks: recs.map(r => r.remarks).filter(Boolean).join(', '),
      };
    });
  };

  const historyColumns = [
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'First In', dataIndex: 'clockIn', key: 'clockIn' },
    { title: 'Last Out', dataIndex: 'clockOut', key: 'clockOut' },
    { title: 'Sessions', dataIndex: 'sessions', key: 'sessions', width: 90 },
    { title: 'Working Hours', dataIndex: 'workingHours', key: 'workingHours' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => (
      <span style={{
        padding: '3px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 'bold',
        background: status === 'Present' ? '#d1fae5' : '#ffe4e6',
        color: status === 'Present' ? '#065f46' : '#991b1b',
      }}>{status}</span>
    )},
  ];

  const masterColumns = [
    { title: 'Employee ID', dataIndex: 'employeeId', key: 'employeeId' },
    { title: 'First In', dataIndex: 'clockIn', key: 'clockIn' },
    { title: 'Last Out', dataIndex: 'clockOut', key: 'clockOut' },
    { title: 'Sessions', dataIndex: 'sessions', key: 'sessions', width: 90 },
    { title: 'Working Hours', dataIndex: 'workingHours', key: 'workingHours' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    { title: 'Remarks', dataIndex: 'remarks', key: 'remarks', render: (val: any) => val || '-' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Row gutter={[24, 24]}>
        {/* Clock Card */}
        <Col xs={24} lg={8}>
          <Card title="Attendance Logger" bordered={false} style={{ borderRadius: '24px', minHeight: '240px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0' }}>
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '12px', color: '#8c8c8c' }}>Working Hours Today</span>
                <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#0284c7' }}>
                  {formatSeconds(secondsToday)}
                </h3>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '16px', margin: '16px 0' }}>
              <Button
                type="primary"
                icon={<LoginOutlined />}
                onClick={handleClockIn}
                disabled={!!(todayRecord && !todayRecord.clockOut)}
                style={{ flex: 1, height: '44px', background: '#10b981', borderColor: '#10b981', borderRadius: '12px', fontWeight: 'semibold' }}
              >
                Clock In
              </Button>
              <Button
                type="primary"
                danger
                icon={<LogoutOutlined />}
                onClick={handleClockOut}
                disabled={!todayRecord || !!todayRecord.clockOut}
                style={{ flex: 1, height: '44px', borderRadius: '12px', fontWeight: 'semibold' }}
              >
                Clock Out
              </Button>
            </div>
            <div style={{ fontSize: '12px', color: '#8c8c8c', textAlign: 'center' }}>
              {todayRecord ? (
                todayRecord.clockOut 
                  ? `Last session: clocked out at ${todayRecord.clockOut}`
                  : `Active session: clocked in at ${todayRecord.clockIn}`
              ) : 'Not clocked in yet today'}
            </div>
          </Card>
        </Col>

        {/* Monthly Logs Card */}
        <Col xs={24} lg={16}>
          <Card
            title="My Monthly Attendance"
            bordered={false}
            style={{ borderRadius: '24px', minHeight: '240px' }}
            extra={
              <Space>
                <Select
                  value={month}
                  onChange={(v) => setMonth(v)}
                  style={{ width: 120 }}
                  options={Array.from({ length: 12 }, (_, i) => ({
                    value: i + 1,
                    label: new Date(0, i).toLocaleString('en', { month: 'long' })
                  }))}
                />
                <Select
                  value={year}
                  onChange={(v) => setYear(v)}
                  style={{ width: 90 }}
                  options={[
                    { value: 2026, label: '2026' },
                    { value: 2025, label: '2025' }
                  ]}
                />
              </Space>
            }
          >
            <Table
              dataSource={getGroupedHistory()}
              columns={historyColumns}
              rowKey="key"
              loading={loading}
              pagination={{ pageSize: 3 }}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* HR Master Logger View */}
      {isHR && (
        <Card
          title="Date-wise Master logs (HR View)"
          bordered={false}
          style={{ borderRadius: '24px' }}
          extra={
            <DatePicker
              value={searchDate ? dayjs(searchDate) : undefined}
              onChange={(date) => setSearchDate(date ? date.format('YYYY-MM-DD') : '')}
              style={{ borderRadius: '8px' }}
            />
          }
        >
          <Table
            dataSource={getGroupedMaster()}
            columns={masterColumns}
            rowKey="key"
            loading={masterLoading}
            pagination={{ pageSize: 5 }}
            size="small"
          />
        </Card>
      )}
    </div>
  );
}
