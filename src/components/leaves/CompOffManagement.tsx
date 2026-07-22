'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Table,
  Tag,
  Modal,
  Form,
  DatePicker,
  TimePicker,
  InputNumber,
  Input,
  Upload,
  message,
  Space,
  Popconfirm,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  UploadOutlined,
  CheckOutlined,
  CloseOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  CompOffSummaryData,
  CompOffItem,
  getCompOffSummary,
  getCompOffHistory,
  submitCompOffRequest,
  approveCompOffRequest,
  rejectCompOffRequest,
} from '@/services/leaveService';

interface CompOffManagementProps {
  employeeId?: string | null;
  roles: string[];
}

export default function CompOffManagement({ employeeId, roles }: CompOffManagementProps) {
  const isApprover = roles.includes('ROLE_HR') || roles.includes('ROLE_SUPER_ADMIN') || roles.includes('ROLE_MANAGER');
  const userRole = roles[0] || 'EMPLOYEE';

  const [summary, setSummary] = useState<CompOffSummaryData>({ available: 4, used: 3, pending: 1, expired: 2 });
  const [history, setHistory] = useState<CompOffItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, histRes] = await Promise.all([
        getCompOffSummary(employeeId || undefined),
        getCompOffHistory(employeeId || undefined),
      ]);
      setSummary(sumRes);
      setHistory(histRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [employeeId]);

  const handleTimeChange = () => {
    const startTime = form.getFieldValue('startTime');
    const endTime = form.getFieldValue('endTime');
    if (startTime && endTime) {
      const diffMinutes = endTime.diff(startTime, 'minute');
      if (diffMinutes > 0) {
        const hours = parseFloat((diffMinutes / 60).toFixed(1));
        form.setFieldsValue({ hoursWorked: hours });
      }
    }
  };

  const onSubmit = async (values: any) => {
    if (values.hoursWorked < 4) {
      message.error('Minimum working hours for Comp Off request is 4 hours');
      return;
    }

    try {
      setSubmitting(true);
      const payload: Partial<CompOffItem> = {
        employeeId: employeeId || 'EMP-001',
        workedDate: values.workedDate ? values.workedDate.format('YYYY-MM-DD') : undefined,
        startTime: values.startTime ? values.startTime.format('HH:mm') : undefined,
        endTime: values.endTime ? values.endTime.format('HH:mm') : undefined,
        hoursWorked: values.hoursWorked,
        reason: values.reason,
      };

      await submitCompOffRequest(payload);
      setIsModalOpen(false);
      form.resetFields();
      loadData();
    } catch (err: any) {
      // Handled globally
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveCompOffRequest(id, userRole, 'Approved');
      loadData();
    } catch (err: any) {
      // Handled globally
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectCompOffRequest(id, userRole, 'Rejected');
      loadData();
    } catch (err: any) {
      // Handled globally
    }
  };

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      item.reason.toLowerCase().includes(search.toLowerCase()) ||
      item.workedDate.includes(search) ||
      item.employeeId.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    { title: 'Request Date', dataIndex: 'requestDate', key: 'requestDate', sorter: (a: CompOffItem, b: CompOffItem) => a.requestDate.localeCompare(b.requestDate) },
    { title: 'Worked Date', dataIndex: 'workedDate', key: 'workedDate', sorter: (a: CompOffItem, b: CompOffItem) => a.workedDate.localeCompare(b.workedDate) },
    { title: 'Hours Worked', dataIndex: 'hoursWorked', key: 'hoursWorked', render: (val: number) => `${val} hrs` },
    { title: 'Earned Days', dataIndex: 'earnedDays', key: 'earnedDays', render: (val: number) => `${val} Day` },
    { title: 'Expiry Date', dataIndex: 'expiryDate', key: 'expiryDate', render: (val?: string) => val || '-' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'gold';
        if (status === 'Approved') color = 'green';
        if (status === 'Used') color = 'blue';
        if (status === 'Rejected') color = 'red';
        if (status === 'Expired') color = 'default';
        return <Tag color={color} style={{ borderRadius: '12px', fontWeight: 'bold' }}>{status}</Tag>;
      },
    },
    { title: 'Approved By', dataIndex: 'approvedBy', key: 'approvedBy', render: (val?: string) => val || '-' },
    ...(isApprover ? [{
      title: 'Actions',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: CompOffItem) => (
        record.status === 'Pending' ? (
          <Space size={8}>
            <Tooltip title="Approve">
              <Button
                type="text"
                icon={<CheckOutlined style={{ color: '#10b981' }} />}
                onClick={() => handleApprove(record.id)}
              />
            </Tooltip>
            <Tooltip title="Reject">
              <Popconfirm
                title="Reject Comp Off"
                description="Are you sure you want to reject this request?"
                onConfirm={() => handleReject(record.id)}
                okText="Yes"
                cancelText="No"
              >
                <Button type="text" danger icon={<CloseOutlined />} />
              </Popconfirm>
            </Tooltip>
          </Space>
        ) : null
      )
    }] : []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Comp Off Dashboard Summary Cards */}
      <Row gutter={[20, 20]}>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: '13px' }}>Available Comp Off</span>}
              value={summary.available}
              suffix="Days"
              prefix={<CheckCircleOutlined style={{ color: '#10b981', marginRight: '6px' }} />}
              valueStyle={{ color: '#10b981', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: '13px' }}>Used Comp Off</span>}
              value={summary.used}
              suffix="Days"
              prefix={<ClockCircleOutlined style={{ color: '#0284c7', marginRight: '6px' }} />}
              valueStyle={{ color: '#0284c7', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: '13px' }}>Pending Requests</span>}
              value={summary.pending}
              prefix={<ExclamationCircleOutlined style={{ color: '#f59e0b', marginRight: '6px' }} />}
              valueStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: '13px' }}>Expired Comp Off</span>}
              value={summary.expired}
              suffix="Days"
              prefix={<StopOutlined style={{ color: '#94a3b8', marginRight: '6px' }} />}
              valueStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      {/* History Header & Action Row */}
      <Card bordered={false} style={{ borderRadius: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Input
              placeholder="Search history..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '240px', borderRadius: '12px' }}
            />
            <Space size={8}>
              {['ALL', 'Pending', 'Approved', 'Used', 'Rejected', 'Expired'].map((st) => (
                <Button
                  key={st}
                  type={statusFilter === st ? 'primary' : 'default'}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    borderRadius: '20px',
                    fontSize: '12px',
                    background: statusFilter === st ? '#0284c7' : '#f8fafc',
                  }}
                >
                  {st}
                </Button>
              ))}
            </Space>
          </div>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
            style={{ borderRadius: '12px', background: '#0284c7', fontWeight: 'bold' }}
          >
            Request Comp Off
          </Button>
        </div>
      </Card>

      {/* History Table */}
      <Card bordered={false} style={{ borderRadius: '24px' }} bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={filteredHistory}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 5 }}
          style={{ borderRadius: '24px', overflow: 'hidden' }}
        />
      </Card>

      {/* Request Comp Off Modal */}
      <Modal
        title="Request Comp Off Credit"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          style={{ paddingRight: '10px' }}
          initialValues={{ hoursWorked: 8 }}
        >
          <Form.Item name="workedDate" label="Date Worked" rules={[{ required: true, message: 'Worked date is required' }]}>
            <DatePicker style={{ width: '100%', borderRadius: '8px' }} />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item name="startTime" label="Start Time">
              <TimePicker format="HH:mm" style={{ width: '100%', borderRadius: '8px' }} onChange={handleTimeChange} />
            </Form.Item>
            <Form.Item name="endTime" label="End Time">
              <TimePicker format="HH:mm" style={{ width: '100%', borderRadius: '8px' }} onChange={handleTimeChange} />
            </Form.Item>
          </div>

          <Form.Item
            name="hoursWorked"
            label="Total Hours Worked"
            rules={[
              { required: true, message: 'Hours worked is required' },
              { type: 'number', min: 4, message: 'Minimum working hours for Comp Off is 4 hours' },
            ]}
          >
            <InputNumber style={{ width: '100%', borderRadius: '8px' }} precision={1} step={0.5} />
          </Form.Item>

          <Form.Item name="reason" label="Reason / Deliverables" rules={[{ required: true, message: 'Reason is required' }]}>
            <Input.TextArea rows={3} placeholder="Describe the weekend/overtime work performed..." style={{ borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item name="attachment" label="Attachment (Optional)">
            <Upload maxCount={1} beforeUpload={() => false}>
              <Button icon={<UploadOutlined />} style={{ borderRadius: '8px' }}>Attach Evidence / Email</Button>
            </Upload>
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'end', gap: '12px', marginTop: '24px' }}>
            <Button onClick={() => setIsModalOpen(false)} style={{ borderRadius: '8px' }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting} disabled={submitting} style={{ borderRadius: '8px', background: '#0284c7' }}>
              Submit Request
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
