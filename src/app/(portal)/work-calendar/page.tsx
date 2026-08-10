'use client';

import React, { useCallback, useEffect, useState } from 'react';
import API from '@/services/api';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  Card, Tabs, Select, DatePicker, Button, Table, Modal, Form, Input, Radio, Checkbox,
  message, Empty, Space, Row, Col, Switch, Tag,
} from 'antd';
import { PlusOutlined, SettingOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  WorkCalendarScope, WorkCalendarRule, SpecialDateOverride, WeekendWorkPolicy, WorkCalendarAuditLog,
  CalendarDayDto,
  getCalendarMonth, getRules, upsertRule, listSpecialDates, createSpecialDate,
  getWeekendPolicy, upsertWeekendPolicy, getHistory,
} from '@/services/workCalendarService';
import { getShifts, Shift } from '@/services/attendanceService';

const { Option } = Select;

interface Department {
  id: string;
  name: string;
  code: string;
}

const DAY_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  WORKING: { bg: '#d1fae5', color: '#065f46', label: 'W' },
  WEEKLY_OFF: { bg: '#e5e7eb', color: '#374151', label: 'O' },
  PUBLIC_HOLIDAY: { bg: '#dbeafe', color: '#1e40af', label: 'H' },
  SPECIAL_WORKING_DAY: { bg: '#fef3c7', color: '#92400e', label: 'S' },
  LEAVE: { bg: '#fce7f3', color: '#9d174d', label: 'L' },
};

function dayBadge(dayType: string) {
  const cfg = DAY_BADGE[dayType] || { bg: '#f3f4f6', color: '#374151', label: '?' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 24, height: 24, borderRadius: 6, fontSize: 12, fontWeight: 700,
      background: cfg.bg, color: cfg.color,
    }}>{cfg.label}</span>
  );
}

// UI shows Monday-first (0=Mon..6=Sun); API uses Sunday-first (0=Sun..6=Sat)
const UI_DAYS = [
  { uiIndex: 0, apiIndex: 1, label: 'Mon' },
  { uiIndex: 1, apiIndex: 2, label: 'Tue' },
  { uiIndex: 2, apiIndex: 3, label: 'Wed' },
  { uiIndex: 3, apiIndex: 4, label: 'Thu' },
  { uiIndex: 4, apiIndex: 5, label: 'Fri' },
  { uiIndex: 5, apiIndex: 6, label: 'Sat' },
  { uiIndex: 6, apiIndex: 0, label: 'Sun' },
];

const SATURDAY_PATTERN_OPTIONS = [
  { value: 'EVERY_WORKING', label: 'Every Saturday Working' },
  { value: 'EVERY_OFF', label: 'Every Saturday Off' },
  { value: 'FIRST_THIRD_WORKING', label: '1st & 3rd Saturday Working' },
  { value: 'SECOND_FOURTH_WORKING', label: '2nd & 4th Saturday Working' },
  { value: 'FIRST_THIRD_OFF', label: '1st & 3rd Saturday Off' },
];

const DEFAULT_WEEKLY_PATTERN: Record<number, 'WORKING' | 'OFF'> = {
  0: 'OFF', 1: 'WORKING', 2: 'WORKING', 3: 'WORKING', 4: 'WORKING', 5: 'WORKING', 6: 'WORKING',
};

export default function WorkCalendarPage() {
  const { roles } = useSelector((state: RootState) => state.auth);
  const isHrOrAdmin = roles.includes('ROLE_HR') || roles.includes('ROLE_SUPER_ADMIN');

  // ---------- Calendar preview ----------
  const [previewScope, setPreviewScope] = useState<WorkCalendarScope>('ORGANIZATION');
  const [previewScopeRefId, setPreviewScopeRefId] = useState<string | undefined>(undefined);
  const [previewMonth, setPreviewMonth] = useState(new Date().getMonth() + 1);
  const [previewYear, setPreviewYear] = useState(new Date().getFullYear());
  const [monthData, setMonthData] = useState<CalendarDayDto[]>([]);
  const [monthLoading, setMonthLoading] = useState(false);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  const loadDepartments = useCallback(() => {
    API.get('/departments').then((res) => setDepartments(res.data || [])).catch(() => setDepartments([]));
  }, []);
  const loadShifts = useCallback(() => {
    getShifts().then(setShifts).catch(() => setShifts([]));
  }, []);

  useEffect(() => {
    loadDepartments();
    loadShifts();
  }, [loadDepartments, loadShifts]);

  const loadMonth = useCallback(() => {
    setMonthLoading(true);
    getCalendarMonth(previewScope, previewMonth, previewYear, previewScopeRefId)
      .then(setMonthData)
      .catch(() => setMonthData([]))
      .finally(() => setMonthLoading(false));
  }, [previewScope, previewScopeRefId, previewMonth, previewYear]);

  useEffect(() => {
    if (isHrOrAdmin) loadMonth();
  }, [isHrOrAdmin, loadMonth]);

  // ---------- Weekly Schedule form ----------
  const [ruleScope, setRuleScope] = useState<WorkCalendarScope>('ORGANIZATION');
  const [ruleScopeRefId, setRuleScopeRefId] = useState<string | undefined>(undefined);
  const [weeklyPattern, setWeeklyPattern] = useState<Record<number, 'WORKING' | 'OFF'>>(DEFAULT_WEEKLY_PATTERN);
  const [saturdayPattern, setSaturdayPattern] = useState<string | undefined>(undefined);
  const [effectiveFrom, setEffectiveFrom] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [ruleSaving, setRuleSaving] = useState(false);

  const loadExistingRule = useCallback((scope: WorkCalendarScope, scopeRefId?: string | null) => {
    // Always reset to a clean slate first — a scope with no configured rule yet
    // (e.g. a department nobody has touched) must not keep showing whatever
    // pattern was left over from the previously viewed scope.
    setWeeklyPattern(DEFAULT_WEEKLY_PATTERN);
    setSaturdayPattern(undefined);
    setEffectiveFrom(dayjs().format('YYYY-MM-DD'));

    getRules(scope, scopeRefId ?? undefined, false)
      .then((rules) => {
        const active = rules.find((r) => r.active !== false) || rules[0];
        if (active) {
          const pattern: Record<number, 'WORKING' | 'OFF'> = { ...DEFAULT_WEEKLY_PATTERN };
          Object.entries(active.weeklyPattern || {}).forEach(([k, v]) => {
            pattern[Number(k)] = v as 'WORKING' | 'OFF';
          });
          setWeeklyPattern(pattern);
          setSaturdayPattern(active.saturdayPattern || undefined);
          setEffectiveFrom(active.effectiveFrom || dayjs().format('YYYY-MM-DD'));
        }
      })
      .catch(() => {
        // Fetch failed — defaults set above already stand; don't leave stale data displayed.
      });
  }, []);

  useEffect(() => {
    if (isHrOrAdmin) loadExistingRule(ruleScope, ruleScopeRefId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHrOrAdmin, ruleScope, ruleScopeRefId]);

  const toggleDay = (apiIndex: number) => {
    setWeeklyPattern((prev) => ({
      ...prev,
      [apiIndex]: prev[apiIndex] === 'WORKING' ? 'OFF' : 'WORKING',
    }));
  };

  const saveRule = async () => {
    if (ruleScope !== 'ORGANIZATION' && !ruleScopeRefId) {
      message.error(`Select a ${ruleScope.toLowerCase()} before saving — otherwise this rule won't apply to anyone.`);
      return;
    }
    try {
      setRuleSaving(true);
      const payload: WorkCalendarRule = {
        scope: ruleScope,
        scopeRefId: ruleScope === 'ORGANIZATION' ? null : ruleScopeRefId,
        weeklyPattern: Object.fromEntries(Object.entries(weeklyPattern).map(([k, v]) => [k, v])) as Record<string, 'WORKING' | 'OFF'>,
        saturdayPattern: (saturdayPattern as any) || null,
        effectiveFrom,
      };
      await upsertRule(payload);
      message.success('Weekly schedule saved');
      loadMonth();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save schedule');
    } finally {
      setRuleSaving(false);
    }
  };

  const renderWeeklyScheduleForm = (scopeLocked?: { scope: WorkCalendarScope; scopeRefId?: string }) => (
    <Card bordered={false} style={{ borderRadius: '24px' }}>
      <Row gutter={[16, 16]}>
        {!scopeLocked && (
          <>
            <Col xs={24} md={8}>
              <div style={{ marginBottom: 4, fontWeight: 600 }}>Scope</div>
              <Select
                value={ruleScope}
                style={{ width: '100%' }}
                onChange={(v) => {
                  setRuleScope(v);
                  setRuleScopeRefId(undefined);
                }}
                options={[
                  { value: 'ORGANIZATION', label: 'Organization' },
                  { value: 'DEPARTMENT', label: 'Department' },
                  { value: 'SHIFT', label: 'Shift' },
                  { value: 'EMPLOYEE', label: 'Employee' },
                ]}
              />
            </Col>
            {ruleScope === 'DEPARTMENT' && (
              <Col xs={24} md={8}>
                <div style={{ marginBottom: 4, fontWeight: 600 }}>Department</div>
                <Select
                  value={ruleScopeRefId}
                  style={{ width: '100%' }}
                  onChange={setRuleScopeRefId}
                  options={departments.map((d) => ({ value: d.id, label: d.name }))}
                  placeholder="Select department"
                />
              </Col>
            )}
            {ruleScope === 'SHIFT' && (
              <Col xs={24} md={8}>
                <div style={{ marginBottom: 4, fontWeight: 600 }}>Shift</div>
                <Select
                  value={ruleScopeRefId}
                  style={{ width: '100%' }}
                  onChange={setRuleScopeRefId}
                  options={shifts.map((s) => ({ value: s.id, label: s.name }))}
                  placeholder="Select shift"
                />
              </Col>
            )}
            {ruleScope === 'EMPLOYEE' && (
              <Col xs={24} md={8}>
                <div style={{ marginBottom: 4, fontWeight: 600 }}>Employee ID</div>
                <Input
                  value={ruleScopeRefId}
                  onChange={(e) => setRuleScopeRefId(e.target.value)}
                  placeholder="Employee ID"
                />
              </Col>
            )}
          </>
        )}
        <Col xs={24} md={8}>
          <div style={{ marginBottom: 4, fontWeight: 600 }}>Effective From</div>
          <DatePicker
            style={{ width: '100%' }}
            value={effectiveFrom ? dayjs(effectiveFrom) : undefined}
            onChange={(d) => setEffectiveFrom(d ? d.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'))}
          />
        </Col>
      </Row>

      <div style={{ marginTop: 24, marginBottom: 8, fontWeight: 600 }}>Weekly Pattern</div>
      <Space wrap>
        {UI_DAYS.map((d) => {
          const isWorking = weeklyPattern[d.apiIndex] === 'WORKING';
          const disabled = d.label === 'Sat' && !!saturdayPattern;
          return (
            <div key={d.uiIndex} style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: 4, fontSize: 12, color: '#6b7280' }}>{d.label}</div>
              <Switch
                checked={isWorking}
                disabled={disabled}
                onChange={() => toggleDay(d.apiIndex)}
                checkedChildren="W"
                unCheckedChildren="O"
              />
            </div>
          );
        })}
      </Space>

      <div style={{ marginTop: 24, marginBottom: 8, fontWeight: 600 }}>Saturday Pattern (overrides toggle above)</div>
      <Select
        allowClear
        style={{ width: 280 }}
        value={saturdayPattern}
        onChange={setSaturdayPattern}
        placeholder="No override (use toggle)"
        options={SATURDAY_PATTERN_OPTIONS}
      />
      <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
        Need an exception that doesn&apos;t fit one of these patterns (e.g. one specific Saturday)? Use the{' '}
        <strong>Special Working Days</strong> tab instead — a date override always takes priority over this weekly pattern.
      </div>

      <div style={{ marginTop: 24 }}>
        <Button type="primary" loading={ruleSaving} onClick={saveRule} style={{ borderRadius: '12px', background: '#0284c7' }}>
          Save Weekly Schedule
        </Button>
      </div>
    </Card>
  );

  // ---------- Special Working Days ----------
  const [specialDates, setSpecialDates] = useState<SpecialDateOverride[]>([]);
  const [specialLoading, setSpecialLoading] = useState(false);
  const [specialModalOpen, setSpecialModalOpen] = useState(false);
  const [specialForm] = Form.useForm();
  const [specialSaving, setSpecialSaving] = useState(false);

  const loadSpecialDates = useCallback(() => {
    setSpecialLoading(true);
    const from = dayjs().startOf('year').format('YYYY-MM-DD');
    const to = dayjs().endOf('year').format('YYYY-MM-DD');
    listSpecialDates(from, to)
      .then(setSpecialDates)
      .catch(() => setSpecialDates([]))
      .finally(() => setSpecialLoading(false));
  }, []);

  useEffect(() => {
    if (isHrOrAdmin) loadSpecialDates();
  }, [isHrOrAdmin, loadSpecialDates]);

  const openSpecialModal = (prefillDate?: string) => {
    specialForm.resetFields();
    specialForm.setFieldsValue({
      date: prefillDate ? dayjs(prefillDate) : undefined,
      dayType: 'HOLIDAY',
      appliesToScope: 'ORGANIZATION',
    });
    setSpecialModalOpen(true);
  };

  const submitSpecialDate = async (values: any) => {
    try {
      setSpecialSaving(true);
      const payload: SpecialDateOverride = {
        date: values.date.format('YYYY-MM-DD'),
        dayType: values.dayType,
        reason: values.reason,
        appliesToScope: values.appliesToScope,
        appliesToRefId: values.appliesToScope === 'ORGANIZATION' ? null : values.appliesToRefId,
      };
      await createSpecialDate(payload);
      message.success('Special date saved');
      setSpecialModalOpen(false);
      loadSpecialDates();
      loadMonth();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save special date');
    } finally {
      setSpecialSaving(false);
    }
  };

  const specialColumns = [
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Day Type', dataIndex: 'dayType', key: 'dayType', render: (t: string) => <Tag>{t}</Tag> },
    { title: 'Applies To', key: 'appliesTo', render: (_: any, r: SpecialDateOverride) => `${r.appliesToScope}${r.appliesToRefId ? ` (${r.appliesToRefId})` : ''}` },
    { title: 'Reason', dataIndex: 'reason', key: 'reason' },
  ];

  // ---------- Configuration History ----------
  const [historyScope, setHistoryScope] = useState<WorkCalendarScope>('ORGANIZATION');
  const [historyScopeRefId, setHistoryScopeRefId] = useState<string | undefined>(undefined);
  const [historyData, setHistoryData] = useState<WorkCalendarAuditLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistoryData = useCallback(() => {
    setHistoryLoading(true);
    getHistory(historyScope, historyScopeRefId)
      .then(setHistoryData)
      .catch(() => setHistoryData([]))
      .finally(() => setHistoryLoading(false));
  }, [historyScope, historyScopeRefId]);

  useEffect(() => {
    if (isHrOrAdmin) loadHistoryData();
  }, [isHrOrAdmin, loadHistoryData]);

  const historyColumns = [
    { title: 'Changed By', dataIndex: 'changedBy', key: 'changedBy' },
    { title: 'Changed Date', dataIndex: 'changedAt', key: 'changedAt', render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-' },
    { title: 'Entity', dataIndex: 'entityType', key: 'entityType' },
    { title: 'Action', dataIndex: 'action', key: 'action', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Old Configuration', dataIndex: 'previousValue', key: 'previousValue', render: (v: string) => v || '-' },
    { title: 'New Configuration', dataIndex: 'newValue', key: 'newValue', render: (v: string) => v || '-' },
    { title: 'Reason', dataIndex: 'reason', key: 'reason', render: (v: string) => v || '-' },
  ];

  // ---------- Weekend Work Policy ----------
  const [policy, setPolicy] = useState<WeekendWorkPolicy | null>(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policySaving, setPolicySaving] = useState(false);
  const [treatAs, setTreatAs] = useState<'OVERTIME' | 'NORMAL_HOURS' | 'COMPENSATORY_OFF'>('OVERTIME');
  const [requiresManagerApproval, setRequiresManagerApproval] = useState(false);
  const [requiresHrApproval, setRequiresHrApproval] = useState(false);

  const loadPolicy = useCallback(() => {
    setPolicyLoading(true);
    getWeekendPolicy()
      .then((p) => {
        setPolicy(p);
        setTreatAs(p.treatAs);
        setRequiresManagerApproval(p.requiresManagerApproval);
        setRequiresHrApproval(p.requiresHrApproval);
      })
      .catch(() => setPolicy(null))
      .finally(() => setPolicyLoading(false));
  }, []);

  useEffect(() => {
    if (isHrOrAdmin) loadPolicy();
  }, [isHrOrAdmin, loadPolicy]);

  const savePolicy = async () => {
    try {
      setPolicySaving(true);
      await upsertWeekendPolicy({
        treatAs,
        requiresManagerApproval,
        requiresHrApproval,
        effectiveFrom: dayjs().format('YYYY-MM-DD'),
      });
      message.success('Weekend work policy saved');
      loadPolicy();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save policy');
    } finally {
      setPolicySaving(false);
    }
  };

  // ---------- Department / Shift rules tabs state ----------
  const [configureTarget, setConfigureTarget] = useState<{ scope: WorkCalendarScope; scopeRefId: string; label: string } | null>(null);

  const openConfigure = (scope: WorkCalendarScope, scopeRefId: string, label: string) => {
    setRuleScope(scope);
    setRuleScopeRefId(scopeRefId);
    setConfigureTarget({ scope, scopeRefId, label });
  };

  if (!isHrOrAdmin) {
    return (
      <Card bordered={false} style={{ borderRadius: '24px' }}>
        <Empty description="HR / Super Admin access required to view Work Calendar configuration." />
      </Card>
    );
  }

  const daysInPreviewMonth = dayjs(`${previewYear}-${String(previewMonth).padStart(2, '0')}-01`).daysInMonth();
  const firstDayOfMonth = dayjs(`${previewYear}-${String(previewMonth).padStart(2, '0')}-01`);
  // Monday-first leading blanks: dayjs day() is 0=Sun..6=Sat
  const leadingBlanks = (firstDayOfMonth.day() + 6) % 7;

  const monthMap: Record<string, CalendarDayDto> = {};
  monthData.forEach((d) => {
    monthMap[dayjs(d.date).format('YYYY-MM-DD')] = d;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card
        title="Calendar Preview"
        bordered={false}
        style={{ borderRadius: '24px' }}
        loading={monthLoading}
        extra={
          <Space>
            <Select
              value={previewScope}
              style={{ width: 140 }}
              onChange={(v) => {
                setPreviewScope(v);
                setPreviewScopeRefId(undefined);
              }}
              options={[
                { value: 'ORGANIZATION', label: 'Organization' },
                { value: 'DEPARTMENT', label: 'Department' },
                { value: 'SHIFT', label: 'Shift' },
                { value: 'EMPLOYEE', label: 'Employee' },
              ]}
            />
            {previewScope === 'DEPARTMENT' && (
              <Select
                value={previewScopeRefId}
                style={{ width: 160 }}
                onChange={setPreviewScopeRefId}
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
                placeholder="Department"
              />
            )}
            {previewScope === 'SHIFT' && (
              <Select
                value={previewScopeRefId}
                style={{ width: 160 }}
                onChange={setPreviewScopeRefId}
                options={shifts.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Shift"
              />
            )}
            {previewScope === 'EMPLOYEE' && (
              <Input
                style={{ width: 160 }}
                value={previewScopeRefId}
                onChange={(e) => setPreviewScopeRefId(e.target.value)}
                placeholder="Employee ID"
              />
            )}
            <Select
              value={previewMonth}
              onChange={setPreviewMonth}
              style={{ width: 120 }}
              options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('en', { month: 'long' }) }))}
            />
            <Select
              value={previewYear}
              onChange={setPreviewYear}
              style={{ width: 90 }}
              options={[{ value: 2026, label: '2026' }, { value: 2025, label: '2025' }]}
            />
          </Space>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{d}</div>
          ))}
          {Array.from({ length: leadingBlanks }, (_, i) => <div key={`blank-${i}`} />)}
          {Array.from({ length: daysInPreviewMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = dayjs(`${previewYear}-${String(previewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`).format('YYYY-MM-DD');
            const cell = monthMap[dateStr];
            return (
              <div
                key={day}
                onClick={() => openSpecialModal(dateStr)}
                style={{
                  border: '1px solid #f0f0f0', borderRadius: 8, padding: 6, minHeight: 56, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}
              >
                <div style={{ fontSize: 12, color: '#6b7280' }}>{day}</div>
                {cell && dayBadge(cell.dayType)}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap', fontSize: 12, color: '#374151' }}>
          <Space size={6}>{dayBadge('WORKING')}<span>Working</span></Space>
          <Space size={6}>{dayBadge('WEEKLY_OFF')}<span>Weekly Off</span></Space>
          <Space size={6}>{dayBadge('PUBLIC_HOLIDAY')}<span>Public Holiday</span></Space>
          <Space size={6}>{dayBadge('SPECIAL_WORKING_DAY')}<span>Special Working Day</span></Space>
          <Space size={6}>{dayBadge('LEAVE')}<span>Leave</span></Space>
        </div>
      </Card>

      <Tabs
        defaultActiveKey="weekly"
        items={[
          {
            key: 'weekly',
            label: 'Weekly Schedule',
            children: <div style={{ marginTop: 12 }}>{renderWeeklyScheduleForm()}</div>,
          },
          {
            key: 'special',
            label: 'Special Working Days',
            children: (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Card bordered={false} style={{ borderRadius: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Special Working Days & Holidays</h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#8c8c8c' }}>Per-date overrides that take priority over the weekly pattern</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openSpecialModal()} style={{ borderRadius: '12px', background: '#0284c7' }}>
                      Add
                    </Button>
                  </div>
                </Card>
                <Card bordered={false} style={{ borderRadius: '24px' }} bodyStyle={{ padding: 0 }}>
                  <Table dataSource={specialDates} columns={specialColumns} rowKey={(r) => r.id || r.date} loading={specialLoading} pagination={{ pageSize: 10 }} size="small" />
                </Card>
              </div>
            ),
          },
          {
            key: 'departments',
            label: 'Department Rules',
            children: (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {configureTarget && configureTarget.scope === 'DEPARTMENT' ? (
                  <Card bordered={false} style={{ borderRadius: '24px' }} title={`Configure: ${configureTarget.label}`} extra={<Button onClick={() => setConfigureTarget(null)}>Back to list</Button>}>
                    {renderWeeklyScheduleForm({ scope: configureTarget.scope, scopeRefId: configureTarget.scopeRefId })}
                  </Card>
                ) : (
                  <Card bordered={false} style={{ borderRadius: '24px' }} bodyStyle={{ padding: 0 }}>
                    <Table
                      dataSource={departments}
                      rowKey="id"
                      pagination={false}
                      size="small"
                      columns={[
                        { title: 'Code', dataIndex: 'code', key: 'code', width: 150 },
                        { title: 'Department', dataIndex: 'name', key: 'name' },
                        {
                          title: 'Actions', key: 'actions', align: 'right' as const,
                          render: (_: any, r: Department) => (
                            <Button icon={<SettingOutlined />} onClick={() => openConfigure('DEPARTMENT', r.id, r.name)}>Configure</Button>
                          ),
                        },
                      ]}
                    />
                  </Card>
                )}
              </div>
            ),
          },
          {
            key: 'shifts',
            label: 'Shift Rules',
            children: (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {configureTarget && configureTarget.scope === 'SHIFT' ? (
                  <Card bordered={false} style={{ borderRadius: '24px' }} title={`Configure: ${configureTarget.label}`} extra={<Button onClick={() => setConfigureTarget(null)}>Back to list</Button>}>
                    {renderWeeklyScheduleForm({ scope: configureTarget.scope, scopeRefId: configureTarget.scopeRefId })}
                  </Card>
                ) : (
                  <Card bordered={false} style={{ borderRadius: '24px' }} bodyStyle={{ padding: 0 }}>
                    <Table
                      dataSource={shifts}
                      rowKey="id"
                      pagination={false}
                      size="small"
                      columns={[
                        { title: 'Shift', dataIndex: 'name', key: 'name' },
                        { title: 'Start', dataIndex: 'startTime', key: 'startTime' },
                        { title: 'End', dataIndex: 'endTime', key: 'endTime' },
                        {
                          title: 'Actions', key: 'actions', align: 'right' as const,
                          render: (_: any, r: Shift) => (
                            <Button icon={<SettingOutlined />} onClick={() => openConfigure('SHIFT', r.id || '', r.name)}>Configure</Button>
                          ),
                        },
                      ]}
                    />
                  </Card>
                )}
              </div>
            ),
          },
          {
            key: 'history',
            label: 'Configuration History',
            children: (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Card bordered={false} style={{ borderRadius: '24px' }}>
                  <Space>
                    <Select
                      value={historyScope}
                      style={{ width: 160 }}
                      onChange={(v) => {
                        setHistoryScope(v);
                        setHistoryScopeRefId(undefined);
                      }}
                      options={[
                        { value: 'ORGANIZATION', label: 'Organization' },
                        { value: 'DEPARTMENT', label: 'Department' },
                        { value: 'SHIFT', label: 'Shift' },
                        { value: 'EMPLOYEE', label: 'Employee' },
                      ]}
                    />
                    {historyScope === 'DEPARTMENT' && (
                      <Select value={historyScopeRefId} style={{ width: 180 }} onChange={setHistoryScopeRefId} options={departments.map((d) => ({ value: d.id, label: d.name }))} placeholder="Department" />
                    )}
                    {historyScope === 'SHIFT' && (
                      <Select value={historyScopeRefId} style={{ width: 180 }} onChange={setHistoryScopeRefId} options={shifts.map((s) => ({ value: s.id, label: s.name }))} placeholder="Shift" />
                    )}
                    {historyScope === 'EMPLOYEE' && (
                      <Input style={{ width: 180 }} value={historyScopeRefId} onChange={(e) => setHistoryScopeRefId(e.target.value)} placeholder="Employee ID" />
                    )}
                  </Space>
                </Card>
                <Card bordered={false} style={{ borderRadius: '24px' }} bodyStyle={{ padding: 0 }}>
                  <Table dataSource={historyData} columns={historyColumns} rowKey="id" loading={historyLoading} pagination={{ pageSize: 10 }} size="small" />
                </Card>
              </div>
            ),
          },
          {
            key: 'weekend-policy',
            label: 'Weekend Work Policy',
            children: (
              <div style={{ marginTop: 12 }}>
                <Card bordered={false} style={{ borderRadius: '24px' }} loading={policyLoading}>
                  <div style={{ marginBottom: 8, fontWeight: 600 }}>Treat weekend work as</div>
                  <Radio.Group value={treatAs} onChange={(e) => setTreatAs(e.target.value)}>
                    <Radio value="OVERTIME">Overtime</Radio>
                    <Radio value="NORMAL_HOURS">Normal Hours</Radio>
                    <Radio value="COMPENSATORY_OFF">Compensatory Off</Radio>
                  </Radio.Group>

                  <div style={{ marginTop: 24 }}>
                    <Checkbox checked={requiresManagerApproval} onChange={(e) => setRequiresManagerApproval(e.target.checked)}>
                      Requires Manager Approval
                    </Checkbox>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Checkbox checked={requiresHrApproval} onChange={(e) => setRequiresHrApproval(e.target.checked)}>
                      Requires HR Approval
                    </Checkbox>
                  </div>

                  <div style={{ marginTop: 24 }}>
                    <Button type="primary" loading={policySaving} onClick={savePolicy} style={{ borderRadius: '12px', background: '#0284c7' }}>
                      Save Policy
                    </Button>
                  </div>
                </Card>
              </div>
            ),
          },
        ]}
      />

      <Modal
        title="Special Working Day / Holiday"
        open={specialModalOpen}
        onCancel={() => setSpecialModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={specialForm} layout="vertical" onFinish={submitSpecialDate}>
          <Form.Item name="date" label="Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="dayType" label="Change To" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio value="WORKING">Working</Radio>
              <Radio value="OFF">Weekly Off</Radio>
              <Radio value="HOLIDAY">Holiday</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="reason" label="Reason">
            <Input.TextArea rows={3} placeholder="Reason for this override" />
          </Form.Item>
          <Form.Item name="appliesToScope" label="Applies To" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio value="ORGANIZATION">Organization</Radio>
              <Radio value="DEPARTMENT">Department</Radio>
              <Radio value="EMPLOYEE">Specific Employee</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => {
              const scope = getFieldValue('appliesToScope');
              if (scope === 'DEPARTMENT') {
                return (
                  <Form.Item name="appliesToRefId" label="Department" rules={[{ required: true }]}>
                    <Select options={departments.map((d) => ({ value: d.id, label: d.name }))} placeholder="Select department" />
                  </Form.Item>
                );
              }
              if (scope === 'EMPLOYEE') {
                return (
                  <Form.Item name="appliesToRefId" label="Employee ID" rules={[{ required: true }]}>
                    <Input placeholder="Employee ID" />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'end', gap: 12, marginTop: 24 }}>
            <Button onClick={() => setSpecialModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={specialSaving} style={{ background: '#0284c7' }}>Save</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
