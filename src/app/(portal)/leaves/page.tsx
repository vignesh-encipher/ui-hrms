'use client';

import React, { useEffect, useState } from 'react';
import API from '@/services/api';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Card, Row, Col, Button, Table, List, Space, Modal, Form, Input, Select, message, DatePicker, Tabs, Descriptions, Tag } from 'antd';
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
  const { employeeId, roles, email } = useSelector((state: RootState) => state.auth);
  const isApprover = roles.includes('ROLE_HR') || roles.includes('ROLE_SUPER_ADMIN') || roles.includes('ROLE_MANAGER');
  const isSuperAdminOrHR = roles.includes('ROLE_SUPER_ADMIN') || roles.includes('ROLE_HR');
  const userRole = roles[0] || 'EMPLOYEE';

  const [balances, setBalances] = useState<Record<string, number>>({});
  const [compOffAvailable, setCompOffAvailable] = useState<number>(4);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [overallLeaves, setOverallLeaves] = useState<LeaveRequest[]>([]);
  const [employeeList, setEmployeeList] = useState<any[]>([]);
  const [compOffRequests, setCompOffRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [overallLoading, setOverallLoading] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [isHrActionModalOpen, setIsHrActionModalOpen] = useState(false);
  const [selectedHrRequest, setSelectedHrRequest] = useState<any | null>(null);
  const [selectedRequestType, setSelectedRequestType] = useState<'leave' | 'compoff'>('leave');
  const [hrRemarks, setHrRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [form] = Form.useForm();

  const handleHrAction = async (action: 'approve' | 'reject') => {
    if (!selectedHrRequest) return;
    if (!hrRemarks.trim()) {
      message.error('Remarks/comments are mandatory!');
      return;
    }
    
    try {
      setActionLoading(true);
      if (selectedRequestType === 'compoff') {
        if (action === 'approve') {
          await API.post(`/compoff/approve/${selectedHrRequest.id}`, null, {
            params: { approvedBy: employeeId, remarks: hrRemarks },
          });
        } else {
          await API.post(`/compoff/reject/${selectedHrRequest.id}`, null, {
            params: { approvedBy: employeeId, remarks: hrRemarks },
          });
        }
      } else {
        if (action === 'approve') {
          await API.post(`/leaves/approve/${selectedHrRequest.id}`, null, {
            params: { role: userRole, remarks: hrRemarks },
          });
        } else {
          await API.post(`/leaves/reject/${selectedHrRequest.id}`, null, {
            params: { role: userRole, remarks: hrRemarks },
          });
        }
      }
      setIsHrActionModalOpen(false);
      setSelectedHrRequest(null);
      setHrRemarks('');
      loadData();
    } catch (err: any) {
      // Handled globally
    } finally {
      setActionLoading(false);
    }
  };

  const getEmployeeName = (empId?: string) => {
    if (!empId) return '';
    const emp = employeeList.find(e => e.employeeId === empId || e.id === empId);
    return emp ? `${emp.firstName} ${emp.lastName}` : empId;
  };

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

    setPendingLoading(true);
    API.get('/leaves/pending')
      .then((res) => setPendingRequests(res.data))
      .catch(() => {})
      .finally(() => setPendingLoading(false));

    API.get('/employees/list')
      .then((res) => setEmployeeList(res.data))
      .catch(() => {});

    API.get('/compoff/history')
      .then((res) => {
        setCompOffRequests(res.data);
      })
      .catch(() => {});

    setOverallLoading(true);
    API.get('/leaves')
      .then((res) => setOverallLeaves(res.data))
      .catch(() => {})
      .finally(() => setOverallLoading(false));
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
      setIsOpen(false);
      form.resetFields();
      loadData();
    } catch (err: any) {
      // Handled globally
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
      setRemarksMap(prev => ({ ...prev, [id]: '' }));
      loadData();
    } catch (err: any) {
      // Handled globally
    }
  };

  const handleReject = async (id: string) => {
    const rem = remarksMap[id] || 'Rejected';
    try {
      await API.post(`/leaves/reject/${id}`, null, {
        params: { role: userRole, remarks: rem },
      });
      setRemarksMap(prev => ({ ...prev, [id]: '' }));
      loadData();
    } catch (err: any) {
      // Handled globally
    }
  };

  const columns = [
    { title: 'Type', dataIndex: 'leaveType', key: 'leaveType' },
    { title: 'Start Date', dataIndex: 'startDate', key: 'startDate' },
    { title: 'End Date', dataIndex: 'endDate', key: 'endDate' },
    { title: 'Days', dataIndex: 'numberOfDays', key: 'numberOfDays', width: 80 },
    { title: 'Reason', dataIndex: 'reason', key: 'reason', ellipsis: true },
    {
      title: 'Approved By',
      key: 'approvedBy',
      render: (_: any, req: LeaveRequest) => (
        <span>{req.level1ApproverName || getEmployeeName(req.level1ApproverId) || req.level1ApproverId || '-'}</span>
      )
    },
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

  const myPendingLeaves = pendingRequests.filter(req => {
    const currentLvl = req.currentLevel || 1;
    const isManagerUser = roles.includes('ROLE_MANAGER');
    const isHRUser = roles.includes('ROLE_HR');
    const isSuperAdmin = roles.includes('ROLE_SUPER_ADMIN');

    if (isSuperAdmin || isHRUser) {
      return true; // HR/Admin can see all pending requests
    }
    if (currentLvl === 1) {
      return req.level1ApproverId === employeeId;
    }
    return false;
  });

  const myPendingCompOffs = compOffRequests.filter(req => {
    if (req.status !== 'Pending') return false;

    const isHRUser = roles.includes('ROLE_HR');
    const isSuperAdmin = roles.includes('ROLE_SUPER_ADMIN');

    if (isSuperAdmin || isHRUser) {
      return true; // HR/Admin see all pending comp-offs
    }

    // Match direct reporting manager mapping
    const requester = employeeList.find(e => e.employeeId === req.employeeId || e.id === req.employeeId);
    const isMySubordinate = requester && (
      requester.managerId === employeeId || 
      (requester.managerId && requester.managerId === email) ||
      requester.managerName === employeeId
    );

    return isMySubordinate;
  });

  const processedLeaves = overallLeaves
    .filter(req => req.status === 'Approved' || req.status === 'Rejected')
    .filter(req => {
      return req.level1ApproverId === employeeId || 
             req.level1ApproverId === email || 
             req.level2ApproverId === employeeId || 
             req.level2ApproverId === email;
    })
    .map(req => ({
      id: req.id,
      employeeId: req.employeeId,
      category: 'Leave',
      type: req.leaveType,
      details: `${req.startDate} to ${req.endDate}`,
      amount: `${req.numberOfDays} Days`,
      reason: req.reason,
      status: req.status,
      remarks: req.level1Remarks || req.level2Remarks || '-',
      approver: req.level1ApproverName || getEmployeeName(req.level1ApproverId) || req.level1ApproverId || '-',
      date: req.endDate || ''
    }));

  const processedCompOffs = compOffRequests
    .filter(req => req.status === 'Approved' || req.status === 'Rejected')
    .filter(req => {
      const isHRUser = roles.includes('ROLE_HR');
      const isSuperAdmin = roles.includes('ROLE_SUPER_ADMIN');
      const isManager = roles.includes('ROLE_MANAGER');

      return req.approvedBy === employeeId ||
             req.approvedBy === email ||
             (req.approvedBy === 'MANAGER' && isManager) ||
             (req.approvedBy === 'HR' && isHRUser) ||
             (req.approvedBy === 'Admin' && (isHRUser || isSuperAdmin));
    })
    .map(req => ({
      id: req.id,
      employeeId: req.employeeId,
      category: 'Comp-Off',
      type: 'Comp-Off Request',
      details: `Worked on ${req.workedDate}`,
      amount: `${req.earnedDays} Day (${req.hoursWorked} hrs)`,
      reason: req.reason,
      status: req.status,
      remarks: req.remarks || '-',
      approver: getEmployeeName(req.approvedBy) || req.approvedBy || '-',
      date: req.workedDate || ''
    }));

  const processedHistory = [...processedLeaves, ...processedCompOffs].sort((a, b) => b.date.localeCompare(a.date));

  const tabItems = [
    {
      key: 'history',
      label: (
        <span>
          <FileTextOutlined /> My Leave History
        </span>
      ),
      children: (
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
            size="small"
            dataSource={leaves}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            style={{ borderRadius: '24px', overflow: 'hidden' }}
          />
        </Card>
      ),
    },
    {
      key: 'pending',
      label: (
        <span>
          <ClockCircleOutlined /> Pending Approvals ({myPendingLeaves.length + myPendingCompOffs.length})
        </span>
      ),
      children: (
        <Card bordered={false} style={{ borderRadius: '24px' }} bodyStyle={{ padding: '8px 24px' }}>
          <Tabs
            type="card"
            items={[
              {
                key: 'pending-leaves',
                label: `Pending Leaves (${myPendingLeaves.length})`,
                children: (
                  <Table
                    size="small"
                    dataSource={myPendingLeaves}
                    rowKey="id"
                    loading={pendingLoading}
                    pagination={{ pageSize: 10 }}
                    columns={[
                      { 
                        title: 'Employee', 
                        key: 'employeeName',
                        render: (_: any, req: LeaveRequest) => (
                          <span>{getEmployeeName(req.employeeId)} ({req.employeeId})</span>
                        )
                      },
                      { title: 'Type', dataIndex: 'leaveType', key: 'leaveType' },
                      { title: 'Start Date', dataIndex: 'startDate', key: 'startDate' },
                      { title: 'End Date', dataIndex: 'endDate', key: 'endDate' },
                      { title: 'Days', dataIndex: 'numberOfDays', key: 'numberOfDays', width: 80 },
                      { title: 'Reason', dataIndex: 'reason', key: 'reason', ellipsis: true },
                      {
                        title: 'Status',
                        key: 'status',
                        render: (_: any, req: LeaveRequest) => {
                          const status = req.level1Status || 'Pending';
                          return (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '8px',
                              fontWeight: 600,
                              background: status === 'Approved' ? '#d1fae5' : status === 'Rejected' ? '#ffe4e6' : '#fef3c7',
                              color: status === 'Approved' ? '#065f46' : status === 'Rejected' ? '#991b1b' : '#92400e',
                            }}>
                              {status}
                            </span>
                          );
                        }
                      },
                      {
                        title: 'Action',
                        key: 'action',
                        align: 'right' as const,
                        render: (_: any, req: LeaveRequest) => {
                          const currentLvl = req.currentLevel || 1;
                          const isManagerUser = roles.includes('ROLE_MANAGER');
                          const isHRUser = roles.includes('ROLE_HR');

                          const canApproveCurrentStage =
                            req.level1ApproverId === employeeId ||
                            req.level1ApproverId === email ||
                            isHRUser ||
                            roles.includes('ROLE_SUPER_ADMIN');

                          if (canApproveCurrentStage) {
                            return (
                              <Button
                                type="primary"
                                size="small"
                                onClick={() => {
                                  setSelectedHrRequest(req);
                                  setSelectedRequestType('leave');
                                  setHrRemarks('');
                                  setIsHrActionModalOpen(true);
                                }}
                                style={{ borderRadius: '8px', background: '#0284c7' }}
                              >
                                Review
                              </Button>
                            );
                          }
                          
                          const waitingNotice = currentLvl === 1 && isHRUser && !isManagerUser
                            ? `Awaiting L1 (${req.level1ApproverName || 'Manager'})`
                            : 'Awaiting Action';

                          return <span style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>{waitingNotice}</span>;
                        }
                      }
                    ]}
                  />
                )
              },
              {
                key: 'pending-compoffs',
                label: `Pending Comp-Offs (${myPendingCompOffs.length})`,
                children: (
                  <Table
                    size="small"
                    dataSource={myPendingCompOffs}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    columns={[
                      {
                        title: 'Employee',
                        key: 'employee',
                        render: (_: any, req: any) => (
                          <span>{getEmployeeName(req.employeeId)} ({req.employeeId})</span>
                        )
                      },
                      { title: 'Worked Date', dataIndex: 'workedDate', key: 'workedDate' },
                      { title: 'Hours Worked', dataIndex: 'hoursWorked', key: 'hoursWorked', render: (val: any) => `${val} hrs` },
                      { title: 'Earned Days', dataIndex: 'earnedDays', key: 'earnedDays', render: (val: any) => `${val} Day` },
                      { title: 'Reason', dataIndex: 'reason', key: 'reason', ellipsis: true },
                      {
                        title: 'Action',
                        key: 'action',
                        align: 'right' as const,
                        render: (_: any, req: any) => (
                          <Button
                            type="primary"
                            size="small"
                            onClick={() => {
                              setSelectedHrRequest(req);
                              setSelectedRequestType('compoff');
                              setHrRemarks('');
                              setIsHrActionModalOpen(true);
                            }}
                            style={{ borderRadius: '8px', background: '#0284c7' }}
                          >
                            Review
                          </Button>
                        )
                      }
                    ]}
                  />
                )
              },
              {
                key: 'processed-history',
                label: `Processed History (${processedHistory.length})`,
                children: (
                  <Table
                    size="small"
                    dataSource={processedHistory}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    columns={[
                      {
                        title: 'Employee',
                        key: 'employee',
                        render: (_: any, req: any) => (
                          <span>{getEmployeeName(req.employeeId)} ({req.employeeId})</span>
                        )
                      },
                      { 
                        title: 'Category', 
                        dataIndex: 'category', 
                        key: 'category',
                        render: (cat: string) => (
                          <Tag color={cat === 'Leave' ? 'purple' : 'cyan'}>{cat}</Tag>
                        )
                      },
                      { title: 'Type', dataIndex: 'type', key: 'type' },
                      { title: 'Details', dataIndex: 'details', key: 'details' },
                      { title: 'Duration / Amount', dataIndex: 'amount', key: 'amount' },
                      { title: 'Reason', dataIndex: 'reason', key: 'reason', ellipsis: true },
                      { title: 'Remarks', dataIndex: 'remarks', key: 'remarks', ellipsis: true },
                      { title: 'Approved By', dataIndex: 'approver', key: 'approver' },
                      {
                        title: 'Status',
                        dataIndex: 'status',
                        key: 'status',
                        render: (status: string) => (
                          <Tag color={status === 'Approved' ? 'green' : 'red'}>{status}</Tag>
                        )
                      }
                    ]}
                  />
                )
              }
            ]}
          />
        </Card>
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
            size="small"
            dataSource={overallLeaves}
            rowKey="id"
            loading={overallLoading}
            pagination={{ pageSize: 10 }}
            columns={[
              { 
                title: 'Employee', 
                key: 'employeeName',
                width: 150,
                render: (_: any, record: LeaveRequest) => (
                  <span>{getEmployeeName(record.employeeId)} ({record.employeeId})</span>
                )
              },
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
                  const isHRRole = roles.includes('ROLE_HR') || roles.includes('ROLE_SUPER_ADMIN');

                  if (isHRPendingStage && isHRRole) {
                    return (
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => {
                          setSelectedHrRequest(record);
                          setHrRemarks('');
                          setIsHrActionModalOpen(true);
                        }}
                        style={{ borderRadius: '8px', background: '#0284c7' }}
                      >
                        Review
                      </Button>
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
                { value: 'Comp Off', label: 'Comp Off' },
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

      {/* HR Action Modal */}
      <Modal
        title={selectedRequestType === 'compoff' ? 'Review Comp-Off Request' : 'Review Leave Request'}
        open={isHrActionModalOpen}
        onCancel={() => {
          setIsHrActionModalOpen(false);
          setSelectedHrRequest(null);
          setHrRemarks('');
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setIsHrActionModalOpen(false);
              setSelectedHrRequest(null);
              setHrRemarks('');
            }}
          >
            Cancel
          </Button>,
          <Button
            key="reject"
            type="primary"
            danger
            loading={actionLoading}
            onClick={() => handleHrAction('reject')}
          >
            Reject
          </Button>,
          <Button
            key="approve"
            type="primary"
            loading={actionLoading}
            onClick={() => handleHrAction('approve')}
            style={{ background: '#10b981', borderColor: '#10b981' }}
          >
            Approve
          </Button>
        ]}
      >
        {selectedHrRequest && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '16px 0' }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Employee">{getEmployeeName(selectedHrRequest.employeeId)} ({selectedHrRequest.employeeId})</Descriptions.Item>
              {selectedRequestType === 'compoff' ? (
                <>
                  <Descriptions.Item label="Type">Comp-Off Request</Descriptions.Item>
                  <Descriptions.Item label="Worked Date">{selectedHrRequest.workedDate}</Descriptions.Item>
                  <Descriptions.Item label="Hours / Earned Days">{selectedHrRequest.hoursWorked} hrs ({selectedHrRequest.earnedDays} Day)</Descriptions.Item>
                </>
              ) : (
                <>
                  <Descriptions.Item label="Leave Type">{selectedHrRequest.leaveType}</Descriptions.Item>
                  <Descriptions.Item label="Dates">{selectedHrRequest.startDate} to {selectedHrRequest.endDate} ({selectedHrRequest.numberOfDays} Days)</Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="Reason">"{selectedHrRequest.reason}"</Descriptions.Item>
            </Descriptions>
            
            <Form layout="vertical">
              <Form.Item label="Remarks / Comments *" required>
                <Input.TextArea
                  placeholder="Enter approval/rejection remarks (mandatory)..."
                  value={hrRemarks}
                  onChange={(e) => setHrRemarks(e.target.value)}
                  rows={3}
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
}
