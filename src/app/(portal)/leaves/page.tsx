'use client';

import React, { useEffect, useState } from 'react';
import API from '@/services/api';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Card, Row, Col, Button, Table, List, Space, Modal, Form, Input, Select, message, DatePicker } from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Option } = Select;

interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  reason: string;
  status: string;
  managerStatus: string;
  hrStatus: string;
  managerRemarks?: string;
  hrRemarks?: string;
}

export default function LeavesPage() {
  const { employeeId, roles } = useSelector((state: RootState) => state.auth);
  const isApprover = roles.includes('ROLE_HR') || roles.includes('ROLE_SUPER_ADMIN') || roles.includes('ROLE_MANAGER');
  const userRole = roles[0];

  const [balances, setBalances] = useState<Record<string, number>>({});
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});
  const [form] = Form.useForm();

  const loadData = () => {
    if (!employeeId) return;

    API.get(`/leaves/balance/${employeeId}`)
      .then((res) => setBalances(res.data))
      .catch(() => {});

    setLoading(true);
    API.get(`/leaves/employee/${employeeId}`)
      .then((res) => setLeaves(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));

    if (isApprover) {
      setPendingLoading(true);
      API.get('/leaves/pending')
        .then((res) => setPendingRequests(res.data))
        .catch(() => {})
        .finally(() => setPendingLoading(false));
    }
  };

  useEffect(() => {
    loadData();
  }, [employeeId]);

  const handleApply = async (values: any) => {
    try {
      await API.post('/leaves/apply', {
        employeeId,
        leaveType: values.leaveType,
        startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : null,
        endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : null,
        reason: values.reason,
      });
      message.success('Leave applied successfully!');
      setIsOpen(false);
      form.resetFields();
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error applying leave');
    }
  };

  const handleApprove = async (id: string) => {
    const rem = remarksMap[id] || 'Approved';
    try {
      await API.post(`/leaves/approve/${id}`, null, {
        params: { role: userRole, remarks: rem },
      });
      message.success('Leave approved successfully!');
      setRemarksMap(prev => ({ ...prev, [id]: '' }));
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error processing request');
    }
  };

  const handleReject = async (id: string) => {
    const rem = remarksMap[id] || 'Rejected';
    try {
      await API.post(`/leaves/reject/${id}`, null, {
        params: { role: userRole, remarks: rem },
      });
      message.success('Leave rejected!');
      setRemarksMap(prev => ({ ...prev, [id]: '' }));
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error processing request');
    }
  };

  const columns = [
    { title: 'Type', dataIndex: 'leaveType', key: 'leaveType' },
    { title: 'Start Date', dataIndex: 'startDate', key: 'startDate' },
    { title: 'End Date', dataIndex: 'endDate', key: 'endDate' },
    { title: 'Days', dataIndex: 'numberOfDays', key: 'numberOfDays', width: 80 },
    { title: 'Reason', dataIndex: 'reason', key: 'reason', ellipsis: true },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => (
      <span style={{
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 'bold',
        background: status === 'Approved' ? '#d1fae5' : status === 'Rejected' ? '#ffe4e6' : '#fef3c7',
        color: status === 'Approved' ? '#065f46' : status === 'Rejected' ? '#991b1b' : '#92400e',
      }}>{status}</span>
    )},
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Leave Balances */}
      <Row gutter={[24, 24]}>
        {Object.entries(balances).map(([type, bal]) => (
          <Col key={type} xs={12} md={4} style={{ flexGrow: 1 }}>
            <Card bordered={false} style={{ borderRadius: '20px' }}>
              <span style={{ fontSize: '11px', color: '#8c8c8c', textTransform: 'uppercase', fontWeight: 'bold' }}>{type.split(' ')[0]}</span>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '22px', fontWeight: 'bold' }}>{bal} Days</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#bfbfbf' }}>Remaining</p>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[24, 24]}>
        {/* Leave History Table */}
        <Col xs={24} lg={16}>
          <Card
            title="My Leave History"
            bordered={false}
            style={{ borderRadius: '24px' }}
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsOpen(true)}
                style={{ borderRadius: '12px', background: '#0284c7' }}
              >
                Apply Leave
              </Button>
            }
            bodyStyle={{ padding: 0 }}
          >
            <Table
              dataSource={leaves}
              columns={columns}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 5 }}
              style={{ borderRadius: '24px', overflow: 'hidden' }}
            />
          </Card>
        </Col>

        {/* Pending Approvals Workflow list */}
        <Col xs={24} lg={8}>
          <Card title="Pending Approvals" bordered={false} style={{ borderRadius: '24px', minHeight: '380px' }}>
            {!isApprover ? (
              <p style={{ textAlign: 'center', color: '#bfbfbf', paddingTop: '40px' }}>Access restricted to managers.</p>
            ) : (
              <List
                itemLayout="vertical"
                dataSource={pendingRequests}
                loading={pendingLoading}
                locale={{ emptyText: 'No pending approvals' }}
                renderItem={(req) => (
                  <List.Item
                    key={req.id}
                    style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.06)', paddingBottom: '16px' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Employee: {req.employeeId}</div>
                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{req.leaveType} ({req.numberOfDays} Days)</div>
                        <div style={{ fontSize: '11px', color: '#bfbfbf' }}><CalendarOutlined /> {req.startDate} to {req.endDate}</div>
                      </div>
                      <p style={{ margin: 0, fontStyle: 'italic', fontSize: '12px', color: '#595959' }}>"{req.reason}"</p>

                      <Space style={{ display: 'flex', width: '100%', marginTop: '4px' }}>
                        <Input
                          placeholder="Remarks..."
                          value={remarksMap[req.id] || ''}
                          onChange={(e) => setRemarksMap(prev => ({ ...prev, [req.id]: e.target.value }))}
                          style={{ borderRadius: '8px', width: '140px' }}
                        />
                        <Button
                          type="primary"
                          icon={<CheckOutlined />}
                          onClick={() => handleApprove(req.id)}
                          style={{ background: '#10b981', borderColor: '#10b981', borderRadius: '8px' }}
                        />
                        <Button
                          type="primary"
                          danger
                          icon={<CloseOutlined />}
                          onClick={() => handleReject(req.id)}
                          style={{ borderRadius: '8px' }}
                        />
                      </Space>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Apply Leave Modal */}
      <Modal
        title="Apply for Leave"
        open={isOpen}
        onCancel={() => setIsOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleApply}
          style={{ marginTop: '20px' }}
          initialValues={{ leaveType: 'Casual Leave' }}
        >
          <Form.Item name="leaveType" label="Leave Type">
            <Select
              style={{ borderRadius: '8px' }}
              options={[
                { value: 'Casual Leave', label: 'Casual Leave' },
                { value: 'Sick Leave', label: 'Sick Leave' },
                { value: 'Paid Leave', label: 'Paid Leave' },
                { value: 'Maternity Leave', label: 'Maternity Leave' },
                { value: 'Loss of Pay', label: 'Loss of Pay' },
              ]}
            />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item name="startDate" label="Start Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%', borderRadius: '8px' }} />
            </Form.Item>
            <Form.Item name="endDate" label="End Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%', borderRadius: '8px' }} />
            </Form.Item>
          </div>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
            <Input.TextArea placeholder="Describe reason for leave request..." rows={3} style={{ borderRadius: '8px' }} />
          </Form.Item>
          
          <div style={{ display: 'flex', justifyContent: 'end', gap: '12px', marginTop: '24px' }}>
            <Button onClick={() => setIsOpen(false)} style={{ borderRadius: '8px' }}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ borderRadius: '8px', background: '#0284c7' }}>Submit</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
