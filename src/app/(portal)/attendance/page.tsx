'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import API from '@/services/api';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  Card, Button, Table, Space, Select, DatePicker, message, Tabs, Row, Col, Tag,
  Statistic, Drawer, Timeline, Empty, Spin, Segmented, Tooltip,
} from 'antd';
import {
  ClockCircleOutlined, CoffeeOutlined, LogoutOutlined, LoginOutlined, CheckCircleOutlined,
  DownloadOutlined, SyncOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import RegularizationTab from '@/components/attendance/RegularizationTab';
import {
  Attendance, AttendanceStatusDto, MonthlyAttendanceSummaryDto, TeamAttendanceDto,
  MonthlyRegisterRowDto,
  checkIn, checkOut, startBreak, endBreak, getToday, getHistory, getDayDetail,
  getMonthlySummary, getTeamAttendance, getMonthlyRegister,
} from '@/services/attendanceService';
import { getDayType, DayTypeResultDto } from '@/services/workCalendarService';

const { Option } = Select;

interface LegacyAttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  status: string;
  remarks?: string;
}

const STATUS_COLORS: Record<string, string> = {
  Present: 'green',
  FullDay: 'green',
  Absent: 'red',
  Late: 'orange',
  EarlyCheckout: 'orange',
  HalfDay: 'gold',
  ShortHours: 'gold',
  Overtime: 'blue',
  OnBreak: 'cyan',
  Working: 'processing',
  CheckedOut: 'default',
  MissingCheckIn: 'red',
  MissingCheckOut: 'red',
  Holiday: 'purple',
  WeeklyOff: 'purple',
  Leave: 'purple',
};

function statusTag(status?: string) {
  if (!status) return <Tag>-</Tag>;
  return <Tag color={STATUS_COLORS[status] || 'default'}>{status}</Tag>;
}

function fmtTime(iso?: string | null) {
  if (!iso) return '-';
  const d = dayjs(iso);
  return d.isValid() ? d.format('HH:mm:ss') : '-';
}

function fmtMinutes(mins?: number | null) {
  if (mins === undefined || mins === null) return '-';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
}

export default function AttendancePage() {
  const { employeeId, email, roles } = useSelector((state: RootState) => state.auth);
  const isHR = roles.includes('ROLE_HR') || roles.includes('ROLE_SUPER_ADMIN');
  const isManagerOrHR = roles.includes('ROLE_MANAGER') || roles.includes('ROLE_HR') || roles.includes('ROLE_SUPER_ADMIN');

  // ---------- Today's status ----------
  const [todayStatus, setTodayStatus] = useState<AttendanceStatusDto | null>(null);
  const [todayLoading, setTodayLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [liveWorkingSeconds, setLiveWorkingSeconds] = useState(0);
  const [liveBreakSeconds, setLiveBreakSeconds] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadToday = useCallback(() => {
    if (!employeeId) return;
    setTodayLoading(true);
    getToday()
      .then((dto) => {
        setTodayStatus(dto);
        setLiveWorkingSeconds(dto.workingMinutesSoFar * 60);
        setLiveBreakSeconds(dto.breakMinutesSoFar * 60);
      })
      .catch(() => {})
      .finally(() => setTodayLoading(false));
  }, [employeeId]);

  useEffect(() => {
    loadToday();
    pollRef.current = setInterval(loadToday, 60000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadToday]);

  // ---------- Today's work-calendar day type (read-only banner) ----------
  const [todayDayType, setTodayDayType] = useState<DayTypeResultDto | null>(null);

  useEffect(() => {
    if (!employeeId) return;
    getDayType(dayjs().format('YYYY-MM-DD'), employeeId)
      .then(setTodayDayType)
      .catch(() => setTodayDayType(null));
  }, [employeeId]);

  const renderDayTypeBanner = () => {
    if (!todayDayType) return null;
    let text: string | null = null;
    let color = '#0284c7';
    if (todayDayType.dayType === 'WEEKLY_OFF') {
      text = 'Weekly Off — No attendance required';
      color = '#6b7280';
    } else if (todayDayType.dayType === 'SPECIAL_WORKING_DAY') {
      text = 'Special Working Day — Attendance Required';
      color = '#92400e';
    } else if (todayDayType.dayType === 'PUBLIC_HOLIDAY') {
      text = 'Public Holiday';
      color = '#1e40af';
    }
    if (!text) return null;
    return (
      <div style={{ fontSize: 13, color, fontWeight: 600, marginTop: 4 }}>
        {text}
      </div>
    );
  };

  // Client-side live ticking seeded from server truth
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (!todayStatus) return;
    if (todayStatus.currentStatus === 'Working') {
      tickRef.current = setInterval(() => setLiveWorkingSeconds((s) => s + 1), 1000);
    } else if (todayStatus.currentStatus === 'OnBreak') {
      tickRef.current = setInterval(() => setLiveBreakSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayStatus?.currentStatus]);

  const runAction = async (fn: () => Promise<Attendance>, successMsg: string) => {
    try {
      setActionLoading(true);
      await fn();
      message.success(successMsg);
      loadToday();
      loadHistory();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const formatSeconds = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = Math.floor(totalSecs % 60);
    return `${hrs}h ${mins}m ${secs}s`;
  };

  // ---------- Monthly summary ----------
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState<MonthlyAttendanceSummaryDto | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const loadSummary = useCallback(() => {
    if (!employeeId) return;
    setSummaryLoading(true);
    getMonthlySummary(month, year)
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false));
  }, [employeeId, month, year]);

  // ---------- History ----------
  const [history, setHistory] = useState<Attendance[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = useCallback(() => {
    if (!employeeId) return;
    setHistoryLoading(true);
    const from = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).startOf('month').format('YYYY-MM-DD');
    const to = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD');
    getHistory(from, to)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [employeeId, month, year]);

  useEffect(() => {
    loadSummary();
    loadHistory();
  }, [loadSummary, loadHistory]);

  // ---------- Day timeline drawer ----------
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerDate, setDrawerDate] = useState<string | null>(null);
  const [dayDetail, setDayDetail] = useState<Attendance | null>(null);
  const [dayDetailLoading, setDayDetailLoading] = useState(false);

  const openDayDetail = (date: string) => {
    setDrawerDate(date);
    setDrawerOpen(true);
    setDayDetailLoading(true);
    getDayDetail(date)
      .then(setDayDetail)
      .catch(() => setDayDetail(null))
      .finally(() => setDayDetailLoading(false));
  };

  const buildTimelineItems = (att: Attendance | null) => {
    if (!att) return [];
    type Ev = { time: string; label: string; color: string };
    const events: Ev[] = [];
    (att.sessions || []).forEach((s) => {
      if (s.checkIn) events.push({ time: s.checkIn, label: 'Check In', color: 'green' });
      if (s.checkOut) events.push({ time: s.checkOut, label: 'Check Out', color: 'red' });
    });
    (att.breaks || []).forEach((b) => {
      if (b.startTime) events.push({ time: b.startTime, label: 'Break Started', color: 'orange' });
      if (b.endTime) events.push({ time: b.endTime, label: 'Break Ended', color: 'blue' });
    });
    events.sort((a, b) => dayjs(a.time).valueOf() - dayjs(b.time).valueOf());
    return events.map((e) => ({
      color: e.color,
      children: (
        <span>
          <strong>{e.label}</strong> — {fmtTime(e.time)}
        </span>
      ),
    }));
  };

  // ---------- Team view (manager/HR) ----------
  const [teamDate, setTeamDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [teamData, setTeamData] = useState<TeamAttendanceDto[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);

  const loadTeam = useCallback(() => {
    if (!isManagerOrHR) return;
    setTeamLoading(true);
    getTeamAttendance(teamDate)
      .then(setTeamData)
      .catch(() => setTeamData([]))
      .finally(() => setTeamLoading(false));
  }, [isManagerOrHR, teamDate]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  // ---------- Legacy Master logs (HR date-wise, unchanged behavior) ----------
  const [searchDate, setSearchDate] = useState(new Date().toISOString().split('T')[0]);
  const [masterRecords, setMasterRecords] = useState<LegacyAttendanceRecord[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);

  const loadMasterRecords = () => {
    if (!isHR) return;
    setMasterLoading(true);
    API.get('/attendance/date', { params: { date: searchDate } })
      .then((res) => setMasterRecords(res.data))
      .catch(() => {})
      .finally(() => setMasterLoading(false));
  };

  useEffect(() => {
    loadMasterRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDate]);

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

  const getGroupedMaster = (): GroupedAttendance[] => {
    const map: Record<string, LegacyAttendanceRecord[]> = {};
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
      recs.forEach((rec) => {
        if (rec.clockIn && rec.clockOut) {
          const [inH, inM] = rec.clockIn.split(':').map(Number);
          const [outH, outM] = rec.clockOut.split(':').map(Number);
          const diff = (outH * 60 + outM) - (inH * 60 + inM);
          if (diff > 0) totalMinutes += diff;
        }
      });
      const hrs = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;

      let computedStatus = totalMinutes >= 420 ? 'Present' : 'Absent';
      if (lastClockOut === 'Active') {
        computedStatus = 'Clocked In';
      }

      return {
        key: empId,
        date: searchDate,
        employeeId: empId,
        clockIn: firstClockIn,
        clockOut: lastClockOut,
        status: computedStatus,
        workingHours: `${hrs}h ${mins}m`,
        sessions: recs.length,
        remarks: recs.map((r) => r.remarks).filter(Boolean).join(', '),
      };
    });
  };

  // ---------- Monthly Register (HR biometric-register-style grid) ----------
  const [logsView, setLogsView] = useState<'date' | 'register'>('date');
  const [registerMonth, setRegisterMonth] = useState(new Date().getMonth() + 1);
  const [registerYear, setRegisterYear] = useState(new Date().getFullYear());
  const [registerData, setRegisterData] = useState<MonthlyRegisterRowDto[]>([]);
  const [registerLoading, setRegisterLoading] = useState(false);

  const loadRegister = useCallback(() => {
    if (!isHR) return;
    setRegisterLoading(true);
    getMonthlyRegister(registerMonth, registerYear)
      .then(setRegisterData)
      .catch(() => setRegisterData([]))
      .finally(() => setRegisterLoading(false));
  }, [isHR, registerMonth, registerYear]);

  useEffect(() => {
    if (logsView === 'register') loadRegister();
  }, [logsView, loadRegister]);

  const registerDaysInMonth = dayjs(`${registerYear}-${String(registerMonth).padStart(2, '0')}-01`).daysInMonth();

  const REGISTER_BADGE: Record<string, { bg: string; color: string; label: string }> = {
    P: { bg: '#d1fae5', color: '#065f46', label: 'P' },
    L: { bg: '#fef3c7', color: '#92400e', label: 'L' },
    A: { bg: '#fee2e2', color: '#991b1b', label: 'A' },
    H: { bg: '#dbeafe', color: '#1e40af', label: 'H' },
  };

  function renderRegisterBadge(letter: string) {
    if (!letter) {
      return <span style={{ color: '#d1d5db' }}>-</span>;
    }
    if (letter === '·') {
      return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#9ca3af' }} />;
    }
    const cfg = REGISTER_BADGE[letter] || { bg: '#f3f4f6', color: '#374151', label: letter };
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 22, height: 22, borderRadius: 6, fontSize: 12, fontWeight: 700,
        background: cfg.bg, color: cfg.color,
      }}>{cfg.label}</span>
    );
  }

  const registerColumns = [
    {
      title: 'Employee',
      key: 'employee',
      fixed: 'left' as const,
      width: 200,
      render: (_: any, r: MonthlyRegisterRowDto) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.name}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{r.employeeCode}</div>
        </div>
      ),
    },
    ...Array.from({ length: registerDaysInMonth }, (_, i) => {
      const day = i + 1;
      return {
        title: String(day),
        key: `day-${day}`,
        width: 42,
        align: 'center' as const,
        render: (_: any, r: MonthlyRegisterRowDto) => renderRegisterBadge(r.days?.[String(day)] ?? ''),
      };
    }),
    {
      title: 'P',
      key: 'presentCount',
      fixed: 'right' as const,
      width: 56,
      align: 'right' as const,
      render: (_: any, r: MonthlyRegisterRowDto) => <strong>{r.presentCount}</strong>,
    },
  ];

  const exportRegisterCsv = () => {
    if (!registerData.length) {
      message.info('Nothing to export');
      return;
    }
    const header = ['Employee', 'Code', ...Array.from({ length: registerDaysInMonth }, (_, i) => String(i + 1)), 'Present'];
    const rows = registerData.map((r) => [
      r.name,
      r.employeeCode,
      ...Array.from({ length: registerDaysInMonth }, (_, i) => r.days?.[String(i + 1)] ?? ''),
      String(r.presentCount),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-register-${registerYear}-${String(registerMonth).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const masterColumns = [
    { title: 'Employee ID', dataIndex: 'employeeId', key: 'employeeId' },
    { title: 'First In', dataIndex: 'clockIn', key: 'clockIn' },
    { title: 'Last Out', dataIndex: 'clockOut', key: 'clockOut' },
    { title: 'Sessions', dataIndex: 'sessions', key: 'sessions', width: 90 },
    { title: 'Working Hours', dataIndex: 'workingHours', key: 'workingHours' },
    {
      title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => {
        let bg = '#ffe4e6';
        let color = '#991b1b';
        if (status === 'Present') {
          bg = '#d1fae5';
          color = '#065f46';
        } else if (status === 'Clocked In') {
          bg = '#e0f2fe';
          color = '#0369a1';
        }
        return (
          <span style={{
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 'bold',
            background: bg,
            color,
          }}>{status}</span>
        );
      },
    },
    { title: 'Remarks', dataIndex: 'remarks', key: 'remarks', render: (val: any) => val || '-' },
  ];

  // ---------- History table columns ----------
  const historyColumns = [
    { title: 'Date', dataIndex: 'date', key: 'date' },
    {
      title: 'Check-In', key: 'checkIn',
      render: (_: any, rec: Attendance) => fmtTime(rec.sessions?.[0]?.checkIn),
    },
    {
      title: 'Check-Out', key: 'checkOut',
      render: (_: any, rec: Attendance) => {
        const last = rec.sessions?.[rec.sessions.length - 1];
        return fmtTime(last?.checkOut);
      },
    },
    {
      title: 'Break', key: 'break',
      render: (_: any, rec: Attendance) => fmtMinutes(rec.totalBreakMinutes),
    },
    {
      title: 'Working Hours', key: 'workingHours',
      render: (_: any, rec: Attendance) => fmtMinutes(rec.effectiveWorkingMinutes),
    },
    {
      title: 'Late By', key: 'lateBy',
      render: (_: any, rec: Attendance) => (rec.lateMinutes ? fmtMinutes(rec.lateMinutes) : '-'),
    },
    {
      title: 'Early By', key: 'earlyBy',
      render: (_: any, rec: Attendance) => (rec.earlyCheckoutMinutes ? fmtMinutes(rec.earlyCheckoutMinutes) : '-'),
    },
    {
      title: 'Overtime', key: 'overtime',
      render: (_: any, rec: Attendance) => (rec.overtimeMinutes ? fmtMinutes(rec.overtimeMinutes) : '-'),
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (status: string) => statusTag(status),
    },
  ];

  const teamColumns = [
    { title: 'Employee', key: 'employee', render: (_: any, r: TeamAttendanceDto) => `${r.employeeName} (${r.employeeId})` },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => statusTag(s) },
    { title: 'Check-In', key: 'checkIn', render: (_: any, r: TeamAttendanceDto) => fmtTime(r.checkIn) },
    { title: 'Working Hours', key: 'workingHours', render: (_: any, r: TeamAttendanceDto) => fmtMinutes(r.workingMinutes ?? undefined) },
  ];

  // ---------- Today card render ----------
  const renderTodayCard = () => {
    if (todayLoading && !todayStatus) {
      return <Card bordered={false} style={{ borderRadius: '24px', minHeight: 200 }}><Spin /></Card>;
    }
    if (!todayStatus) {
      return (
        <Card bordered={false} style={{ borderRadius: '24px' }}>
          <Empty description="Unable to load attendance status" />
        </Card>
      );
    }

    const status = todayStatus.currentStatus;
    const att = todayStatus.attendance;
    const lastSession = att?.sessions?.[att.sessions.length - 1];
    const lastBreak = att?.breaks?.[att.breaks.length - 1];

    if (status === 'NotCheckedIn') {
      return (
        <Card bordered={false} style={{ borderRadius: '24px', textAlign: 'center', padding: '24px 0' }}>
          <ClockCircleOutlined style={{ fontSize: 48, color: '#0284c7', marginBottom: 16 }} />
          <h2 style={{ marginBottom: 8 }}>Good {dayjs().hour() < 12 ? 'Morning' : dayjs().hour() < 17 ? 'Afternoon' : 'Evening'}!</h2>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>You haven&apos;t checked in yet.</p>
          <Button
            type="primary"
            size="large"
            loading={actionLoading}
            icon={<LoginOutlined />}
            onClick={() => runAction(checkIn, 'Checked in successfully!')}
            style={{ borderRadius: '12px', background: '#0284c7', height: 48, padding: '0 32px', fontWeight: 600 }}
          >
            CHECK IN
          </Button>
        </Card>
      );
    }

    if (status === 'Working') {
      return (
        <Card bordered={false} style={{ borderRadius: '24px' }}>
          <Row gutter={[24, 16]} align="middle">
            <Col xs={24} md={8}>
              <Statistic title="Checked In At" value={fmtTime(lastSession?.checkIn)} />
            </Col>
            <Col xs={24} md={8}>
              <Statistic title="Working Time" value={formatSeconds(liveWorkingSeconds)} valueStyle={{ color: '#0284c7' }} />
            </Col>
            <Col xs={24} md={8}>
              <Statistic
                title="Remaining"
                value={fmtMinutes(todayStatus.remainingMinutes)}
                suffix={`/ ${fmtMinutes(todayStatus.requiredWorkingMinutes)} required`}
              />
            </Col>
          </Row>
          <Space style={{ marginTop: 24 }}>
            <Button
              icon={<CoffeeOutlined />}
              loading={actionLoading}
              onClick={() => runAction(startBreak, 'Break started')}
              style={{ borderRadius: '12px', height: 44, padding: '0 24px' }}
            >
              START BREAK
            </Button>
            <Button
              danger
              type="primary"
              icon={<LogoutOutlined />}
              loading={actionLoading}
              onClick={() => runAction(checkOut, 'Checked out successfully!')}
              style={{ borderRadius: '12px', height: 44, padding: '0 24px' }}
            >
              CHECK OUT
            </Button>
          </Space>
        </Card>
      );
    }

    if (status === 'OnBreak') {
      return (
        <Card bordered={false} style={{ borderRadius: '24px' }}>
          <Row gutter={[24, 16]} align="middle">
            <Col xs={24} md={12}>
              <Statistic title="Break Started At" value={fmtTime(lastBreak?.startTime)} />
            </Col>
            <Col xs={24} md={12}>
              <Statistic title="Break Duration" value={formatSeconds(liveBreakSeconds)} valueStyle={{ color: '#d97706' }} />
            </Col>
          </Row>
          <Space style={{ marginTop: 24 }}>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={actionLoading}
              onClick={() => runAction(endBreak, 'Break ended')}
              style={{ borderRadius: '12px', background: '#0284c7', height: 44, padding: '0 24px' }}
            >
              END BREAK
            </Button>
          </Space>
        </Card>
      );
    }

    if (status === 'CheckedOut') {
      return (
        <Card bordered={false} style={{ borderRadius: '24px' }}>
          <Row gutter={[16, 16]}>
            <Col xs={12} md={6}>
              <Statistic title="Check-In" value={fmtTime(att?.sessions?.[0]?.checkIn)} />
            </Col>
            <Col xs={12} md={6}>
              <Statistic title="Check-Out" value={fmtTime(lastSession?.checkOut)} />
            </Col>
            <Col xs={12} md={6}>
              <Statistic title="Total Working" value={fmtMinutes(att?.effectiveWorkingMinutes)} />
            </Col>
            <Col xs={12} md={6}>
              <Statistic title="Break Time" value={fmtMinutes(att?.totalBreakMinutes)} />
            </Col>
          </Row>
          <div style={{ marginTop: 16 }}>{statusTag(att?.status)}</div>
        </Card>
      );
    }

    // Fallback / Missing check-out or unknown state
    return (
      <Card bordered={false} style={{ borderRadius: '24px' }}>
        <p style={{ marginBottom: 16 }}>{statusTag(status)} Please raise a correction request if this looks wrong.</p>
        <Button
          onClick={() => message.info('Switch to the Attendance Regularization tab to submit a correction.')}
          style={{ borderRadius: '12px' }}
        >
          Request Correction
        </Button>
      </Card>
    );
  };

  return (
    <>
      <Tabs
        defaultActiveKey="my"
        items={[
          {
            key: 'my',
            label: 'My Attendance',
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '12px' }}>
                {renderTodayCard()}
                {renderDayTypeBanner()}

                <Card
                  title="Monthly Summary"
                  bordered={false}
                  style={{ borderRadius: '24px' }}
                  loading={summaryLoading}
                  extra={
                    <Space>
                      <Select
                        value={month}
                        onChange={(v) => setMonth(v)}
                        style={{ width: 120 }}
                        options={Array.from({ length: 12 }, (_, i) => ({
                          value: i + 1,
                          label: new Date(0, i).toLocaleString('en', { month: 'long' }),
                        }))}
                      />
                      <Select
                        value={year}
                        onChange={(v) => setYear(v)}
                        style={{ width: 90 }}
                        options={[
                          { value: 2026, label: '2026' },
                          { value: 2025, label: '2025' },
                        ]}
                      />
                    </Space>
                  }
                >
                  <Row gutter={[16, 16]}>
                    <Col xs={12} sm={6}><Statistic title="Working Days" value={summary?.workingDays ?? '-'} /></Col>
                    <Col xs={12} sm={6}><Statistic title="Present" value={summary?.present ?? '-'} /></Col>
                    <Col xs={12} sm={6}><Statistic title="Absent" value={summary?.absent ?? '-'} /></Col>
                    <Col xs={12} sm={6}><Statistic title="Leave" value={summary?.leave ?? '-'} /></Col>
                    <Col xs={12} sm={6}><Statistic title="Late Count" value={summary?.lateCount ?? '-'} /></Col>
                    <Col xs={12} sm={6}><Statistic title="Early Checkout" value={summary?.earlyCheckoutCount ?? '-'} /></Col>
                    <Col xs={12} sm={6}><Statistic title="Overtime" value={fmtMinutes(summary?.totalOvertimeMinutes)} /></Col>
                    <Col xs={12} sm={6}><Statistic title="Average Hours" value={fmtMinutes(summary?.averageEffectiveWorkingMinutes)} /></Col>
                  </Row>
                </Card>

                <Card title="Attendance History" bordered={false} style={{ borderRadius: '24px' }}>
                  <Table
                    dataSource={history}
                    columns={historyColumns}
                    rowKey={(r) => r.id || r.date}
                    loading={historyLoading}
                    pagination={{ pageSize: 10 }}
                    size="small"
                    onRow={(rec) => ({
                      onClick: () => openDayDetail(rec.date),
                      style: { cursor: 'pointer' },
                    })}
                  />
                </Card>

                {isManagerOrHR && (
                  <Card
                    title="Team Attendance"
                    bordered={false}
                    style={{ borderRadius: '24px' }}
                    extra={
                      <DatePicker
                        value={teamDate ? dayjs(teamDate) : undefined}
                        onChange={(date) => setTeamDate(date ? date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'))}
                      />
                    }
                  >
                    <Table
                      dataSource={teamData}
                      columns={teamColumns}
                      rowKey="employeeId"
                      loading={teamLoading}
                      pagination={{ pageSize: 10 }}
                      size="small"
                    />
                  </Card>
                )}
              </div>
            ),
          },
          {
            key: 'logs',
            label: 'Master Logs',
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '12px' }}>
                {isHR && (
                  <Segmented
                    value={logsView}
                    onChange={(v) => setLogsView(v as 'date' | 'register')}
                    options={[
                      { label: 'Date-wise', value: 'date' },
                      { label: 'Monthly Register', value: 'register' },
                    ]}
                  />
                )}
                {isHR && logsView === 'date' && (
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
                {isHR && logsView === 'register' && (
                  <Card
                    title="Monthly Attendance Register"
                    bordered={false}
                    style={{ borderRadius: '24px' }}
                    extra={
                      <Space>
                        <Select
                          value={registerMonth}
                          onChange={(v) => setRegisterMonth(v)}
                          style={{ width: 120 }}
                          options={Array.from({ length: 12 }, (_, i) => ({
                            value: i + 1,
                            label: new Date(0, i).toLocaleString('en', { month: 'long' }),
                          }))}
                        />
                        <Select
                          value={registerYear}
                          onChange={(v) => setRegisterYear(v)}
                          style={{ width: 90 }}
                          options={[
                            { value: 2026, label: '2026' },
                            { value: 2025, label: '2025' },
                          ]}
                        />
                        <Button icon={<DownloadOutlined />} onClick={exportRegisterCsv}>
                          Export
                        </Button>
                        <Tooltip title="Biometric device sync isn't configured yet">
                          <Button icon={<SyncOutlined />} disabled onClick={() => message.info("Biometric sync isn't configured yet.")}>
                            Sync devices
                          </Button>
                        </Tooltip>
                      </Space>
                    }
                  >
                    <Table
                      dataSource={registerData}
                      columns={registerColumns}
                      rowKey="employeeId"
                      loading={registerLoading}
                      pagination={false}
                      size="small"
                      bordered
                      scroll={{ x: registerDaysInMonth * 42 + 260 }}
                    />
                    <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap', fontSize: 12, color: '#374151' }}>
                      <Space size={6}>{renderRegisterBadge('P')}<span>Present</span></Space>
                      <Space size={6}>{renderRegisterBadge('L')}<span>Leave</span></Space>
                      <Space size={6}>{renderRegisterBadge('A')}<span>Absent / missing punch</span></Space>
                      <Space size={6}>{renderRegisterBadge('H')}<span>Holiday</span></Space>
                      <Space size={6}>{renderRegisterBadge('·')}<span>Weekly off</span></Space>
                    </div>
                  </Card>
                )}
                {!isHR && <Empty description="HR access required" />}
              </div>
            ),
          },
          {
            key: 'regularization',
            label: 'Attendance Regularization',
            children: (
              <div style={{ marginTop: '12px' }}>
                <RegularizationTab employeeId={employeeId || ''} email={email || ''} roles={roles} />
              </div>
            ),
          },
        ]}
      />

      <Drawer
        title={`Timeline for ${drawerDate ?? ''}`}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={420}
      >
        {dayDetailLoading ? (
          <Spin />
        ) : dayDetail ? (
          <>
            <div style={{ marginBottom: 16 }}>{statusTag(dayDetail.status)}</div>
            <Timeline items={buildTimelineItems(dayDetail)} />
          </>
        ) : (
          <Empty description="No data for this day" />
        )}
      </Drawer>
    </>
  );
}
