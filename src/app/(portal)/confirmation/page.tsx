'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  Card,
  Table,
  Tabs,
  Tag,
  Button,
  Drawer,
  Form,
  Rate,
  Select,
  Input,
  InputNumber,
  Descriptions,
  Space,
  message,
} from 'antd';
import { UserSwitchOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import API from '@/services/api';
import {
  ProbationRecord,
  RatingItem,
  getProbationRecords,
  submitProbationEvaluation,
  submitProbationDecision,
} from '@/services/probationService';

const CRITERIA = ['Job knowledge', 'Quality of work', 'Reliability', 'Team fit', 'Initiative'];

const statusColor: Record<string, string> = {
  Upcoming: 'blue',
  'Manager Review': 'gold',
  Confirmed: 'green',
  'Probation Extended': 'orange',
  Terminated: 'red',
};

export default function ConfirmationPage() {
  const { roles } = useSelector((state: RootState) => state.auth);
  const isApprover = roles.includes('ROLE_HR') || roles.includes('ROLE_SUPER_ADMIN') || roles.includes('ROLE_MANAGER');

  const [records, setRecords] = useState<ProbationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const [selectedRecord, setSelectedRecord] = useState<ProbationRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [evaluationForm] = Form.useForm();
  const [decisionForm] = Form.useForm();

  const loadData = () => {
    setLoading(true);
    getProbationRecords()
      .then((res) => setRecords(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const today = useMemo(() => new Date(), []);
  const in30Days = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  }, []);

  const dueSoonRecords = records.filter((r) => {
    if (!r.confirmationDueDate || r.status === 'Confirmed' || r.status === 'Terminated') return false;
    const due = new Date(r.confirmationDueDate);
    return due >= today && due <= in30Days;
  });

  const overdueRecords = records.filter((r) => {
    if (!r.confirmationDueDate || r.status === 'Confirmed' || r.status === 'Terminated') return false;
    const due = new Date(r.confirmationDueDate);
    return due < today;
  });

  const openDrawer = (record: ProbationRecord) => {
    setSelectedRecord(record);
    evaluationForm.resetFields();
    decisionForm.resetFields();
    if (record.ratings && record.ratings.length > 0) {
      const values: Record<string, number> = {};
      record.ratings.forEach((r) => {
        values[r.criterion] = r.score;
      });
      evaluationForm.setFieldsValue(values);
    }
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedRecord(null);
  };

  const handleEvaluationSubmit = async (values: Record<string, number>) => {
    if (!selectedRecord) return;
    try {
      setSubmitting(true);
      const ratings: RatingItem[] = CRITERIA.map((criterion) => ({
        criterion,
        score: values[criterion] || 0,
      }));
      await submitProbationEvaluation(selectedRecord.id, ratings);
      message.success('Evaluation submitted');
      closeDrawer();
      loadData();
    } catch {
      // handled globally
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecisionSubmit = async (values: { decisionType: 'CONFIRM' | 'EXTEND' | 'TERMINATE'; extendByMonths?: number; remarks: string }) => {
    if (!selectedRecord) return;
    if (!values.remarks || !values.remarks.trim()) {
      message.error('Remarks are mandatory!');
      return;
    }
    try {
      setSubmitting(true);
      await submitProbationDecision(selectedRecord.id, {
        decisionType: values.decisionType,
        extendByMonths: values.decisionType === 'EXTEND' ? values.extendByMonths : undefined,
        remarks: values.remarks,
      });
      message.success('Decision recorded');
      closeDrawer();
      loadData();
    } catch {
      // handled globally
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: 'Employee', dataIndex: 'employeeName', key: 'employeeName' },
    { title: 'Designation', dataIndex: 'designation', key: 'designation' },
    { title: 'Joining Date', dataIndex: 'dateOfJoining', key: 'dateOfJoining' },
    { title: 'Due Date', dataIndex: 'confirmationDueDate', key: 'confirmationDueDate' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={statusColor[status] || 'default'}>{status}</Tag>,
    },
    {
      title: 'Payroll',
      dataIndex: 'payrollNotificationStatus',
      key: 'payrollNotificationStatus',
      render: (val: string, record: ProbationRecord) =>
        record.status === 'Confirmed' ? <Tag color="green">{val || 'Notified'}</Tag> : <span style={{ color: '#9ca3af' }}>-</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: ProbationRecord) => (
        <Button
          type="primary"
          size="small"
          disabled={!isApprover || record.status === 'Confirmed' || record.status === 'Terminated'}
          onClick={() => openDrawer(record)}
          style={{ borderRadius: '8px', background: '#0284c7' }}
        >
          Review
        </Button>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'all',
      label: (
        <span>
          <UserSwitchOutlined /> All ({records.length})
        </span>
      ),
      children: <Table size="small" rowKey="id" loading={loading} dataSource={records} columns={columns} pagination={{ pageSize: 10 }} />,
    },
    {
      key: 'due-soon',
      label: (
        <span>
          <ClockCircleOutlined /> Due Soon ({dueSoonRecords.length})
        </span>
      ),
      children: <Table size="small" rowKey="id" loading={loading} dataSource={dueSoonRecords} columns={columns} pagination={{ pageSize: 10 }} />,
    },
    {
      key: 'overdue',
      label: (
        <span>
          <WarningOutlined /> Overdue ({overdueRecords.length})
        </span>
      ),
      children: <Table size="small" rowKey="id" loading={loading} dataSource={overdueRecords} columns={columns} pagination={{ pageSize: 10 }} />,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card bordered={false} style={{ borderRadius: '24px' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} size="large" />
      </Card>

      <Drawer
        title={selectedRecord ? `Probation Review - ${selectedRecord.employeeName}` : 'Probation Review'}
        open={isDrawerOpen}
        onClose={closeDrawer}
        width={520}
        destroyOnClose
      >
        {selectedRecord && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Employee">{selectedRecord.employeeName} ({selectedRecord.employeeId})</Descriptions.Item>
              <Descriptions.Item label="Designation">{selectedRecord.designation || '-'}</Descriptions.Item>
              <Descriptions.Item label="Joining Date">{selectedRecord.dateOfJoining}</Descriptions.Item>
              <Descriptions.Item label="Confirmation Due Date">{selectedRecord.confirmationDueDate}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={statusColor[selectedRecord.status] || 'default'}>{selectedRecord.status}</Tag>
              </Descriptions.Item>
              {selectedRecord.status === 'Confirmed' && (
                <Descriptions.Item label="Payroll Notification">
                  <Tag color="green">{selectedRecord.payrollNotificationStatus || 'Notified'}</Tag>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Card title="Performance Evaluation" size="small" bordered style={{ borderRadius: '16px' }}>
              <Form form={evaluationForm} layout="vertical" onFinish={handleEvaluationSubmit}>
                {CRITERIA.map((criterion) => (
                  <Form.Item key={criterion} name={criterion} label={criterion} initialValue={0}>
                    <Rate count={5} />
                  </Form.Item>
                ))}
                <Button type="primary" htmlType="submit" loading={submitting} style={{ borderRadius: '8px', background: '#0284c7' }}>
                  Submit Evaluation
                </Button>
              </Form>
            </Card>

            <Card title="Decision" size="small" bordered style={{ borderRadius: '16px' }}>
              <Form form={decisionForm} layout="vertical" onFinish={handleDecisionSubmit}>
                <Form.Item name="decisionType" label="Decision" rules={[{ required: true, message: 'Decision is required' }]}>
                  <Select
                    placeholder="Select decision"
                    options={[
                      { value: 'CONFIRM', label: 'Confirm Employment' },
                      { value: 'EXTEND', label: 'Extend Probation' },
                      { value: 'TERMINATE', label: 'Terminate' },
                    ]}
                  />
                </Form.Item>
                <Form.Item shouldUpdate={(prev, cur) => prev.decisionType !== cur.decisionType} noStyle>
                  {({ getFieldValue }) =>
                    getFieldValue('decisionType') === 'EXTEND' ? (
                      <Form.Item
                        name="extendByMonths"
                        label="Extend By (Months)"
                        rules={[{ required: true, message: 'Number of months is required' }]}
                      >
                        <InputNumber min={1} max={12} style={{ width: '100%' }} />
                      </Form.Item>
                    ) : null
                  }
                </Form.Item>
                <Form.Item name="remarks" label="Remarks (mandatory)" rules={[{ required: true, message: 'Remarks are mandatory' }]}>
                  <Input.TextArea rows={3} placeholder="Enter decision remarks..." />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={submitting} style={{ borderRadius: '8px', background: '#0f172a' }}>
                  Submit Decision
                </Button>
              </Form>
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
}
