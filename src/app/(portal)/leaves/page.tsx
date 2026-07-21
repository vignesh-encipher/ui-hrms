'use client';

import React, { useEffect, useState } from 'react';
import API from '@/services/api';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Card, Row, Col, Button, Table, List, Space, Modal, Form, Input, Select, message, DatePicker, Tabs } from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined, CalendarOutlined, FileTextOutlined, ClockCircleOutlined, SettingOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import LeaveBalanceCards from '@/components/leaves/LeaveBalanceCards';
import CompOffManagement from '@/components/leaves/CompOffManagement';
import LeaveStructureSettings from '@/components/leaves/LeaveStructureSettings';
import { getCompOffSummary } from '@/services/leaveService';

interface ApprovalAuditLog {
  approverId?: string;
  approverName?: string;
  approverRole: string;
  action: string;
  timestamp: string;
  comments?: string;
  level: number;
}

interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  reason: string;
  status: string;
  totalLevels?: number;
  currentLevel?: number;
  level1ApproverId?: string;
  level1ApproverName?: string;
  level1Role?: string;
  level1Status?: string;
  level1Remarks?: string;
  level2ApproverId?: string;
  level2ApproverName?: string;
  level2Role?: string;
  level2Status?: string;
  level2Remarks?: string;
  auditLogs?: ApprovalAuditLog[];
}

export default function LeavesPage() {
  const { employeeId, roles } = useSelector((state: RootState) => state.auth);
  const isApprover = roles.includes('ROLE_HR') || roles.includes('ROLE_SUPER_ADMIN') || roles.includes('ROLE_MANAGER');
  const isSuperAdminOrHR = roles.includes('ROLE_SUPER_ADMIN') || roles.includes('ROLE_HR');
  const userRole = roles[0] || 'EMPLOYEE';

  const [balances, setBalances] = useState<Record<string, number>>({});
  const [compOffAvailable, setCompOffAvailable] = useState<number>(4);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [overallLeaves, setOverallLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [overallLoading, setOverallLoading] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const loadData = () => {
    if (employeeId) {
      API.get(`/leaves/balance/${employeeId}`)
        .then((res) => setBalances(res.data))
        .catch(() => {});

      setLoading(true);
      API.get(`/leaves/employee/${employeeId}`)
        .then((res) => setLeaves(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }

    getCompOffSummary(employeeId || undefined)
      .then((res) => setCompOffAvailable(res.available))
      .catch(() => {});

    if (isApprover) {
      setPendingLoading(true);
      API.get('/leaves/pending')
        .then((res) => setPendingRequests(res.data))
        .catch(() => {})
        .finally(() => setPendingLoading(false));
    }

    if (isSuperAdminOrHR) {
      setOverallLoading(true);
      API.get('/leaves')
        .then((res) => setOverallLeaves(res.data))
        .catch(() => {})
        .finally(() => setOverallLoading(false));
    }
  };

  useEffect(() => {
    loadData();
  }, [employeeId]);

  const handleApply = async (values: any) => {
    try {
      setSubmitting(true);
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
    } finally {
      setSubmitting(false);
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

  const tabItems = [
    {
      key: 'requests',
      label: (
        <span>
          <FileTextOutlined /> Leave Requests & Applications
        </span>
      ),
      children: (
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
            <Card title="Pending Approvals (Max 2-Level Workflow)" bordered={false} style={{ borderRadius: '24px', minHeight: '380px' }}>
              {!isApprover ? (
                <p style={{ textAlign: 'center', color: '#bfbfbf', paddingTop: '40px' }}>Access restricted to Managers and HR.</p>
              ) : (
                <List
                  itemLayout="vertical"
                  dataSource={pendingRequests}
                  loading={pendingLoading}
                  locale={{ emptyText: 'No pending approvals' }}
                  renderItem={(req) => {
                    const currentLvl = req.currentLevel || 1;
                    const isManagerUser = roles.includes('ROLE_MANAGER');
                    const isHRUser = roles.includes('ROLE_HR');

                    // Check if current logged in user can approve at this current stage
                    const canApproveCurrentStage =
                      (currentLvl === 1 && isManagerUser) ||
                      (currentLvl === 2 && isHRUser);

                    let waitingNotice = null;
                    if (currentLvl === 1 && isHRUser && !isManagerUser) {
                      waitingNotice = `Awaiting Level 1 Approval (${req.level1ApproverName || 'Reporting Manager'})`;
                    }

                    return (
                      <List.Item
                        key={req.id}
                        style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.06)', paddingBottom: '16px' }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Employee: {req.employeeId}</div>
                            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{req.leaveType} ({req.numberOfDays} Days)</div>
                            <div style={{ fontSize: '11px', color: '#8c8c8c' }}><CalendarOutlined /> {req.startDate} to {req.endDate}</div>
                          </div>

                          {/* Dynamic 2-Level Visual Stepper */}
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '10px' }}>
                            {req.totalLevels === 2 && (
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '8px',
                                fontWeight: 600,
                                background: req.level1Status === 'Approved' ? '#d1fae5' : req.level1Status === 'Rejected' ? '#ffe4e6' : '#fef3c7',
                                color: req.level1Status === 'Approved' ? '#065f46' : req.level1Status === 'Rejected' ? '#991b1b' : '#92400e',
                              }}>
                                L1 (Manager): {req.level1Status || 'Pending'}
                              </span>
                            )}
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '8px',
                              fontWeight: 600,
                              background: req.level2Status === 'Approved' ? '#d1fae5' : req.level2Status === 'Rejected' ? '#ffe4e6' : '#fef3c7',
                              color: req.level2Status === 'Approved' ? '#065f46' : req.level2Status === 'Rejected' ? '#991b1b' : '#92400e',
                            }}>
                              L2 (HR): {req.level2Status || 'Pending'}
                            </span>
                          </div>

                          <p style={{ margin: 0, fontStyle: 'italic', fontSize: '12px', color: '#595959' }}>"{req.reason}"</p>

                          {canApproveCurrentStage ? (
                            <Space style={{ display: 'flex', width: '100%', marginTop: '4px' }}>
                              <Input
                                placeholder="Remarks..."
                                value={remarksMap[req.id] || ''}
                                onChange={(e) => setRemarksMap(prev => ({ ...prev, [req.id]: e.target.value }))}
                                style={{ borderRadius: '8px', width: '120px' }}
                              />
                              <Button
                                type="primary"
                                icon={<CheckOutlined />}
                                onClick={() => handleApprove(req.id)}
                                style={{ background: '#10b981', borderColor: '#10b981', borderRadius: '8px' }}
                              >
                                Approve
                              </Button>
                              <Button
                                type="primary"
                                danger
                                icon={<CloseOutlined />}
                                onClick={() => handleReject(req.id)}
                                style={{ borderRadius: '8px' }}
                              >
                                Reject
                              </Button>
                            </Space>
                          ) : (
                            waitingNotice && (
                              <div style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: '#f3f4f6',
                                color: '#6b7280',
                                fontSize: '11px',
                                fontStyle: 'italic',
                                fontWeight: 500
                              }}>
                                ⏳ {waitingNotice}
                              </div>
                            )
                          )}
                        </div>
                      </List.Item>
                    );
                  }}
                />
              )}
            </Card>
          </Col>
        </Row>
      ),
    },
    ...(isSuperAdminOrHR ? [{
      key: 'overall',
      label: (
        <span>
          <FileTextOutlined /> Overall Leaves List (HR View)
        </span>
      ),
      children: (
        <Card title="Overall Organization Leave Requests" bordered={false} style={{ borderRadius: '24px' }}>
          <Table
            dataSource={overallLeaves}
            rowKey="id"
            loading={overallLoading}
            pagination={{ pageSize: 10 }}
            columns={[
              { title: 'Employee ID', dataIndex: 'employeeId', key: 'employeeId', width: 120 },
              { title: 'Type', dataIndex: 'leaveType', key: 'leaveType' },
              { title: 'Start Date', dataIndex: 'startDate', key: 'startDate' },
              { title: 'End Date', dataIndex: 'endDate', key: 'endDate' },
              { title: 'Days', dataIndex: 'numberOfDays', key: 'numberOfDays', width: 70 },
              { title: 'Reason', dataIndex: 'reason', key: 'reason', ellipsis: true },
              {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                render: (status: string, record: LeaveRequest) => (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      display: 'inline-block',
                      width: 'fit-content',
                      background: status === 'Approved' ? '#d1fae5' : status === 'Rejected' ? '#ffe4e6' : '#fef3c7',
                      color: status === 'Approved' ? '#065f46' : status === 'Rejected' ? '#991b1b' : '#92400e',
                    }}>
                      {status}
                    </span>
                    <div style={{ fontSize: '10px', color: '#6b7280' }}>
                      {record.level1Status && `L1: ${record.level1Status}`}
                      {record.level2Status && ` | L2: ${record.level2Status}`}
                    </div>
                  </div>
                )
              },
              {
                title: 'Actions',
                key: 'actions',
                align: 'right' as const,
                render: (_: any, record: LeaveRequest) => {
                  const isHRPendingStage = record.currentLevel === 2 && record.status === 'Pending Level 2 - HR Approval';
                  const isHRRole = roles.includes('ROLE_HR');

                  if (isHRPendingStage && isHRRole) {
                    return (
                      <Space size={6}>
                        <Input
                          placeholder="Remarks..."
                          value={remarksMap[record.id] || ''}
                          onChange={(e) => setRemarksMap(prev => ({ ...prev, [record.id]: e.target.value }))}
                          style={{ borderRadius: '6px', width: '110px', fontSize: '12px' }}
                        />
                        <Button
                          type="primary"
                          size="small"
                          icon={<CheckOutlined />}
                          onClick={() => handleApprove(record.id)}
                          style={{ background: '#10b981', borderColor: '#10b981', borderRadius: '6px' }}
                        >
                          Approve
                        </Button>
                        <Button
                          type="primary"
                          danger
                          size="small"
                          icon={<CloseOutlined />}
                          onClick={() => handleReject(record.id)}
                          style={{ borderRadius: '6px' }}
                        >
                          Reject
                        </Button>
                      </Space>
                    );
                  }

                  if (record.status?.startsWith('Pending Level 1')) {
                    return <span style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>Awaiting L1 Approval</span>;
                  }

                  return <span style={{ fontSize: '11px', color: '#9ca3af' }}>No Action Required</span>;
                }
              }
            ]}
          />
        </Card>
      ),
    }] : []),
    {
      key: 'compoff',
      label: (
        <span>
          <ClockCircleOutlined /> Comp Off Management
        </span>
      ),
      children: <CompOffManagement employeeId={employeeId} roles={roles} />,
    },
    ...(isSuperAdminOrHR ? [{
      key: 'structure',
      label: (
        <span>
          <SettingOutlined /> Leave Structure Settings
        </span>
      ),
      children: <LeaveStructureSettings roles={roles} />,
    }] : []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner: Leave Balance Cards with Progress Bars */}
      <LeaveBalanceCards balances={balances} compOffAvailable={compOffAvailable} />

      {/* Main Tabbed Layout */}
      <Card bordered={false} style={{ borderRadius: '24px' }}>
        <Tabs defaultActiveKey="requests" items={tabItems} size="large" />
      </Card>

      {/* Apply Leave Modal */}
      <Modal
        title="Apply for Leave"
        open={isOpen}
        onCancel={() => setIsOpen(false)}
        footer={null}
        destroyOnClose
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleApply}
          style={{ paddingRight: '10px' }}
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
            <Button type="primary" htmlType="submit" loading={submitting} disabled={submitting} style={{ borderRadius: '8px', background: '#0284c7' }}>Submit</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
