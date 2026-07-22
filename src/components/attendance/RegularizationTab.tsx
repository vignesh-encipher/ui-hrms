'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, DatePicker, TimePicker, Select, Input, Tag, Space, Row, Col, Tabs, Segmented } from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import API from '@/services/api';

const { TextArea } = Input;

interface RegularizationItem {
  id: string;
  employeeId: string;
  attendanceDate: string;
  requestType: string;
  checkInTime: string;
  checkOutTime: string;
  reason: string;
  status: string;
  managerId: string;
  remarks?: string;
  submittedOn?: string;
  approverName?: string;
  approvedOrRejectedOn?: string;
}

interface RegularizationTabProps {
  employeeId: string;
  email: string;
  roles: string[];
}

export default function RegularizationTab({ employeeId, email, roles }: RegularizationTabProps) {
  const [requests, setRequests] = useState<RegularizationItem[]>([]);
  const [approvals, setApprovals] = useState<RegularizationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'my-regularization' | 'peer-regularization'>('my-regularization');
  
  // Review Action State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RegularizationItem | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [form] = Form.useForm();
  
  const isManagerOrHR = roles.includes('ROLE_MANAGER') || roles.includes('ROLE_HR') || roles.includes('ROLE_SUPER_ADMIN');

  const loadRequests = () => {
    if (!employeeId) return;
    setLoading(true);
    API.get(`/regularizations/employee/${employeeId}`)
      .then((res) => {
        setRequests(res.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadApprovals = () => {
    if (!isManagerOrHR) return;
    setApprovalsLoading(true);
    API.get(`/regularizations/manager/${employeeId}`)
      .then((res) => {
        setApprovals(res.data || []);
      })
      .catch(() => {})
      .finally(() => setApprovalsLoading(false));
  };

  useEffect(() => {
    loadRequests();
    loadApprovals();
  }, [employeeId]);

  const handleApply = async (values: any) => {
    try {
      setLoading(true);
      const payload = {
        employeeId,
        attendanceDate: values.attendanceDate.format('YYYY-MM-DD'),
        requestType: values.requestType,
        checkInTime: values.checkInTime ? values.checkInTime.format('HH:mm:ss') : null,
        checkOutTime: values.checkOutTime ? values.checkOutTime.format('HH:mm:ss') : null,
        reason: values.reason,
      };

      await API.post('/regularizations/apply', payload);
      setIsApplyModalOpen(false);
      form.resetFields();
      loadRequests();
    } catch {
      // Handled globally
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async (action: 'approve' | 'reject') => {
    if (!selectedRequest) return;
    try {
      setActionLoading(true);
      const endpoint = `/regularizations/${action}/${selectedRequest.id}`;
      await API.post(endpoint, null, {
        params: { remarks: reviewRemarks },
      });
      setIsReviewModalOpen(false);
      setSelectedRequest(null);
      setReviewRemarks('');
      loadRequests();
      loadApprovals();
    } catch {
      // Handled globally
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    let color = 'gold';
    if (status === 'Approved') color = 'green';
    if (status === 'Rejected') color = 'red';
    return <Tag color={color} style={{ fontWeight: 'bold' }}>{status}</Tag>;
  };

  const columns = [
    { title: 'Date', dataIndex: 'attendanceDate', key: 'attendanceDate' },
    { title: 'Request Type', dataIndex: 'requestType', key: 'requestType' },
    { 
      title: 'Time Change', 
      key: 'times', 
      render: (_: any, record: RegularizationItem) => (
        <span>{record.checkInTime || '-'} to {record.checkOutTime || '-'}</span>
      )
    },
    { title: 'Reason', dataIndex: 'reason', key: 'reason', ellipsis: true },
    { title: 'Status', dataIndex: 'status', key: 'status', render: getStatusTag },
    { title: 'Approver Name', dataIndex: 'approverName', key: 'approverName', render: (val: any) => val || '-' },
    { title: 'Remarks', dataIndex: 'remarks', key: 'remarks', render: (val: any) => val || '-' },
  ];

  const approvalColumns = [
    { title: 'Employee ID', dataIndex: 'employeeId', key: 'employeeId' },
    { title: 'Date', dataIndex: 'attendanceDate', key: 'attendanceDate' },
    { title: 'Request Type', dataIndex: 'requestType', key: 'requestType' },
    { 
      title: 'Requested Times', 
      key: 'times', 
      render: (_: any, record: RegularizationItem) => (
        <span>{record.checkInTime || '-'} to {record.checkOutTime || '-'}</span>
      )
    },
    { title: 'Reason', dataIndex: 'reason', key: 'reason', ellipsis: true },
    { title: 'Status', dataIndex: 'status', key: 'status', render: getStatusTag },
    { 
      title: 'Action', 
      key: 'action', 
      align: 'right' as const,
      render: (_: any, record: RegularizationItem) => {
        if (record.status === 'Pending') {
          return (
            <Button 
              type="primary" 
              size="small" 
              onClick={() => {
                setSelectedRequest(record);
                setReviewRemarks('');
                setIsReviewModalOpen(true);
              }}
              style={{ background: '#0284c7', borderColor: '#0284c7', borderRadius: '8px' }}
            >
              Review
            </Button>
          );
        }
        return <span style={{ fontSize: '11px', color: '#9ca3af' }}>Processed</span>;
      }
    },
  ];

  const myTotal = requests.length;
  const myPending = requests.filter(r => r.status === 'Pending').length;
  const myApproved = requests.filter(r => r.status === 'Approved').length;
  const peerPending = approvals.filter(r => r.status === 'Pending').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Stats Cards Row */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: '16px', background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', boxShadow: '0 4px 12px rgba(3, 105, 161, 0.08)' }}>
            <div style={{ color: '#0369a1', fontSize: '13px', fontWeight: '500' }}>My Total Requests</div>
            <div style={{ color: '#0c4a6e', fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>{myTotal}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: '16px', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', boxShadow: '0 4px 12px rgba(180, 83, 9, 0.08)' }}>
            <div style={{ color: '#b45309', fontSize: '13px', fontWeight: '500' }}>My Pending Requests</div>
            <div style={{ color: '#78350f', fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>{myPending}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: '16px', background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', boxShadow: '0 4px 12px rgba(4, 120, 87, 0.08)' }}>
            <div style={{ color: '#047857', fontSize: '13px', fontWeight: '500' }}>My Approved Requests</div>
            <div style={{ color: '#064e3b', fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>{myApproved}</div>
          </Card>
        </Col>
        {isManagerOrHR && (
          <Col xs={12} sm={6}>
            <Card bordered={false} style={{ borderRadius: '16px', background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)', boxShadow: '0 4px 12px rgba(109, 40, 217, 0.08)' }}>
              <div style={{ color: '#6d28d9', fontSize: '13px', fontWeight: '500' }}>Pending Peer Approvals</div>
              <div style={{ color: '#4c1d95', fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>{peerPending}</div>
            </Card>
          </Col>
        )}
      </Row>

      {isManagerOrHR && (
        <span style={{ gap: '12px', margin: '16px 0', border: '1px solid #e5e7eb', borderRadius: '24px' }}>
          <Button
            onClick={() => setActiveTab('my-regularization')}
            style={{
              borderRadius: '24px',
              height: '40px',
              padding: '0 24px',
              fontWeight: '600',
              border: 'none',
              background: activeTab === 'my-regularization' 
                ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' 
                : '#f3f4f6',
              color: activeTab === 'my-regularization' ? '#ffffff' : '#4b5563',
              boxShadow: activeTab === 'my-regularization' ? '0 4px 12px rgba(2, 132, 199, 0.2)' : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            <UserOutlined style={{ marginRight: '6px' }} />
            My Regularization
          </Button>
          <Button
            onClick={() => setActiveTab('peer-regularization')}
            style={{
              borderRadius: '24px',
              height: '40px',
              padding: '0 24px',
              fontWeight: '600',
              border: 'none',
              background: activeTab === 'peer-regularization' 
                ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' 
                : '#f3f4f6',
              color: activeTab === 'peer-regularization' ? '#ffffff' : '#4b5563',
              boxShadow: activeTab === 'peer-regularization' ? '0 4px 12px rgba(2, 132, 199, 0.2)' : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            <TeamOutlined style={{ marginRight: '6px' }} />
            Peer Regularization
          </Button>
        </span>
      )}

      <div>
        {activeTab === 'my-regularization' ? (
          <Card 
            title="My Regularization Requests" 
            bordered={false} 
            style={{ borderRadius: '24px' }}
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => setIsApplyModalOpen(true)}
                style={{ borderRadius: '12px', background: '#0284c7' }}
              >
                Apply Regularization
              </Button>
            }
          >
            <Table 
              dataSource={requests} 
              columns={columns} 
              rowKey="id" 
              loading={loading} 
              pagination={{ pageSize: 5 }}
              size="small"
            />
          </Card>
        ) : (
          isManagerOrHR && (
            <Card title="Regularization Approvals" bordered={false} style={{ borderRadius: '24px' }}>
              <Table 
                dataSource={approvals} 
                columns={approvalColumns} 
                rowKey="id" 
                loading={approvalsLoading} 
                pagination={{ pageSize: 5 }}
                size="small"
              />
            </Card>
          )
        )}
      </div>

      {/* Request Apply Modal */}
      <Modal
        title="Apply Attendance Regularization"
        open={isApplyModalOpen}
        onCancel={() => {
          setIsApplyModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleApply}>
          <Form.Item 
            name="attendanceDate" 
            label="Attendance Date" 
            rules={[{ required: true, message: 'Please select a date' }]}
          >
            <DatePicker style={{ width: '100%', borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item 
            name="requestType" 
            label="Request Type" 
            rules={[{ required: true, message: 'Please select request type' }]}
          >
            <Select style={{ borderRadius: '8px' }}>
              <Select.Option value="Missed Check-In">Missed Check-In</Select.Option>
              <Select.Option value="Missed Check-Out">Missed Check-Out</Select.Option>
              <Select.Option value="Incorrect Punch">Incorrect Punch</Select.Option>
              <Select.Option value="Full Day Regularization">Full Day Regularization</Select.Option>
              <Select.Option value="Half Day Regularization">Half Day Regularization</Select.Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="checkInTime" label="Correct Check-In Time">
                <TimePicker style={{ width: '100%', borderRadius: '8px' }} format="HH:mm" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="checkOutTime" label="Correct Check-Out Time">
                <TimePicker style={{ width: '100%', borderRadius: '8px' }} format="HH:mm" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item 
            name="reason" 
            label="Reason" 
            rules={[{ required: true, message: 'Please specify the reason' }]}
          >
            <TextArea rows={3} style={{ borderRadius: '8px' }} placeholder="Provide brief reason for correction..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button style={{ borderRadius: '8px' }} onClick={() => setIsApplyModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={loading} style={{ borderRadius: '8px', background: '#0284c7' }}>
                Submit Request
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Review Modal (Approve/Reject remarks) */}
      <Modal
        title="Review Attendance Regularization"
        open={isReviewModalOpen}
        onCancel={() => setIsReviewModalOpen(false)}
        footer={[
          <Button key="cancel" style={{ borderRadius: '8px' }} onClick={() => setIsReviewModalOpen(false)}>
            Cancel
          </Button>,
          <Button 
            key="reject" 
            danger 
            loading={actionLoading}
            style={{ borderRadius: '8px' }} 
            onClick={() => handleReviewSubmit('reject')}
          >
            Reject
          </Button>,
          <Button 
            key="approve" 
            type="primary" 
            loading={actionLoading}
            style={{ borderRadius: '8px', background: '#10b981', borderColor: '#10b981' }} 
            onClick={() => handleReviewSubmit('approve')}
          >
            Approve
          </Button>
        ]}
      >
        {selectedRequest && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '16px 0' }}>
            <div><strong>Employee ID:</strong> {selectedRequest.employeeId}</div>
            <div><strong>Attendance Date:</strong> {selectedRequest.attendanceDate}</div>
            <div><strong>Request Type:</strong> {selectedRequest.requestType}</div>
            <div><strong>Proposed Times:</strong> {selectedRequest.checkInTime || '-'} to {selectedRequest.checkOutTime || '-'}</div>
            <div style={{ background: '#f3f4f6', padding: '10px', borderRadius: '8px', borderLeft: '4px solid #0284c7' }}>
              <strong>Reason:</strong> {selectedRequest.reason}
            </div>
            <div style={{ marginTop: '8px' }}>
              <strong>Comments/Remarks:</strong>
              <Input 
                placeholder="Add comments/remarks (optional)..." 
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                style={{ borderRadius: '8px', marginTop: '4px' }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
