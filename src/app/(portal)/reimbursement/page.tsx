'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  Card,
  Button,
  Table,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  DatePicker,
  Tabs,
  Descriptions,
  Tag,
  Upload,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  UploadOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import dayjs from 'dayjs';

import {
  ExpenseClaim,
  EXPENSE_CATEGORIES,
  submitClaim,
  approveClaim,
  rejectClaim,
  markPaid,
  listClaims,
} from '@/services/reimbursementService';
import API from '@/services/api';

const statusColor = (status: string) => {
  switch (status) {
    case 'Approved':
      return 'green';
    case 'Rejected':
      return 'red';
    case 'Paid':
      return 'blue';
    default:
      if (status?.startsWith('Pending')) return 'gold';
      return 'default';
  }
};

export default function ReimbursementPage() {
  const { employeeId, roles, email } = useSelector((state: RootState) => state.auth);
  const isManager = roles.includes('ROLE_MANAGER');
  const isHR = roles.includes('ROLE_HR');
  const isFinance = roles.includes('ROLE_FINANCE');
  const isSuperAdmin = roles.includes('ROLE_SUPER_ADMIN');
  const isApprover = isManager || isHR || isFinance || isSuperAdmin;
  const userRole = roles[0] || 'EMPLOYEE';

  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [employeeList, setEmployeeList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [form] = Form.useForm();

  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  const getEmployeeName = (empId?: string) => {
    if (!empId) return '';
    const emp = employeeList.find(e => e.employeeId === empId || e.id === empId);
    return emp ? `${emp.firstName} ${emp.lastName}` : empId;
  };

  const loadData = () => {
    setLoading(true);
    listClaims()
      .then((res) => setClaims(res))
      .catch(() => {})
      .finally(() => setLoading(false));

    API.get('/employees/list')
      .then((res) => setEmployeeList(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, [employeeId]);

  const handleSubmitClaim = async (values: any) => {
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('employeeId', employeeId || '');
      formData.append('category', values.category);
      formData.append('amount', String(values.amount));
      formData.append('expenseDate', values.expenseDate ? values.expenseDate.format('YYYY-MM-DD') : '');
      if (values.costCentre) formData.append('costCentre', values.costCentre);
      if (values.description) formData.append('description', values.description);
      fileList.forEach((file) => {
        if (file.originFileObj) {
          formData.append('receipts', file.originFileObj);
        }
      });

      await submitClaim(formData);
      message.success('Expense claim submitted successfully');
      setIsOpen(false);
      form.resetFields();
      setFileList([]);
      loadData();
    } catch {
      // Handled globally
    } finally {
      setSubmitting(false);
    }
  };

  const openActionModal = (claim: ExpenseClaim) => {
    setSelectedClaim(claim);
    setActionRemarks('');
    setIsActionModalOpen(true);
  };

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedClaim) return;
    if (!actionRemarks.trim()) {
      message.error('Remarks/comments are mandatory!');
      return;
    }
    try {
      setActionLoading(true);
      if (action === 'approve') {
        await approveClaim(selectedClaim.id, userRole, actionRemarks);
        message.success('Claim approved');
      } else {
        await rejectClaim(selectedClaim.id, userRole, actionRemarks);
        message.success('Claim rejected');
      }
      setIsActionModalOpen(false);
      setSelectedClaim(null);
      setActionRemarks('');
      loadData();
    } catch {
      // Handled globally
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      setPayingId(id);
      await markPaid(id);
      message.success('Claim marked as paid');
      loadData();
    } catch {
      // Handled globally
    } finally {
      setPayingId(null);
    }
  };

  const myClaims = claims.filter(c => c.employeeId === employeeId);

  const myPendingApprovals = claims.filter(claim => {
    if (!isApprover) return false;
    if (isSuperAdmin || isHR) return true;
    const currentLvl = claim.currentLevel || 1;
    if (currentLvl === 1) {
      return claim.level1ApproverId === employeeId || claim.level1ApproverId === email;
    }
    if (currentLvl === 2) {
      return claim.level2ApproverId === employeeId || claim.level2ApproverId === email;
    }
    return false;
  }).filter(claim => claim.status?.startsWith('Pending'));

  const baseColumns = [
    { title: 'Category', dataIndex: 'category', key: 'category' },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (amount != null ? `₹${amount.toLocaleString()}` : '-'),
    },
    { title: 'Expense Date', dataIndex: 'expenseDate', key: 'expenseDate' },
    { title: 'Cost Centre', dataIndex: 'costCentre', key: 'costCentre' },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'Policy',
      key: 'policyBreach',
      render: (_: any, record: ExpenseClaim) =>
        record.policyBreach ? (
          <Tooltip title={record.policyBreachReason || 'Policy breach detected'}>
            <Tag color="orange" icon={<WarningOutlined />}>Breach</Tag>
          </Tooltip>
        ) : (
          <Tag color="green">OK</Tag>
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: ExpenseClaim) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Tag color={statusColor(status)}>{status}</Tag>
          <div style={{ fontSize: '10px', color: '#6b7280' }}>
            {record.level1Status && `L1: ${record.level1Status}`}
            {record.level2Status && ` | L2: ${record.level2Status}`}
          </div>
        </div>
      ),
    },
  ];

  const myClaimsColumns = [
    ...baseColumns,
  ];

  const pendingColumns = [
    {
      title: 'Employee',
      key: 'employeeName',
      render: (_: any, req: ExpenseClaim) => (
        <span>{req.employeeName || getEmployeeName(req.employeeId)} ({req.employeeId})</span>
      ),
    },
    ...baseColumns,
    {
      title: 'Action',
      key: 'action',
      align: 'right' as const,
      render: (_: any, req: ExpenseClaim) => (
        <Button
          type="primary"
          size="small"
          onClick={() => openActionModal(req)}
          style={{ borderRadius: '8px', background: '#0284c7' }}
        >
          Review
        </Button>
      ),
    },
  ];

  const overallColumns = [
    {
      title: 'Employee',
      key: 'employeeName',
      render: (_: any, req: ExpenseClaim) => (
        <span>{req.employeeName || getEmployeeName(req.employeeId)} ({req.employeeId})</span>
      ),
    },
    ...baseColumns,
    {
      title: 'Actions',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: ExpenseClaim) => {
        const currentLvl = record.currentLevel || 1;
        const canReview =
          record.status?.startsWith('Pending') &&
          (isSuperAdmin ||
            isHR ||
            (currentLvl === 1 && (record.level1ApproverId === employeeId || record.level1ApproverId === email)) ||
            (currentLvl === 2 && (record.level2ApproverId === employeeId || record.level2ApproverId === email)));

        if (canReview) {
          return (
            <Button
              type="primary"
              size="small"
              onClick={() => openActionModal(record)}
              style={{ borderRadius: '8px', background: '#0284c7' }}
            >
              Review
            </Button>
          );
        }

        if (isFinance && record.status === 'Approved') {
          return (
            <Button
              type="primary"
              size="small"
              loading={payingId === record.id}
              onClick={() => handleMarkPaid(record.id)}
              style={{ borderRadius: '8px', background: '#10b981', borderColor: '#10b981' }}
              icon={<DollarOutlined />}
            >
              Mark Paid
            </Button>
          );
        }

        return <span style={{ fontSize: '11px', color: '#9ca3af' }}>No Action Required</span>;
      },
    },
  ];

  const tabItems = [
    {
      key: 'my-claims',
      label: (
        <span>
          <FileTextOutlined /> My Expense Claims
        </span>
      ),
      children: (
        <Card
          title="My Expense Claims"
          bordered={false}
          style={{ borderRadius: '24px' }}
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsOpen(true)}
              style={{ borderRadius: '12px', background: '#0284c7' }}
            >
              New Claim
            </Button>
          }
          bodyStyle={{ padding: 0 }}
        >
          <Table
            size="small"
            dataSource={myClaims}
            columns={myClaimsColumns}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            style={{ borderRadius: '24px', overflow: 'hidden' }}
          />
        </Card>
      ),
    },
    ...(isApprover
      ? [
          {
            key: 'pending',
            label: (
              <span>
                <ClockCircleOutlined /> Pending Approvals ({myPendingApprovals.length})
              </span>
            ),
            children: (
              <Card bordered={false} style={{ borderRadius: '24px' }}>
                <Table
                  size="small"
                  dataSource={myPendingApprovals}
                  columns={pendingColumns}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
        ]
      : []),
    ...(isSuperAdmin || isHR || isFinance
      ? [
          {
            key: 'overall',
            label: (
              <span>
                <FileTextOutlined /> Overall Claims (Org View)
              </span>
            ),
            children: (
              <Card title="Overall Organization Expense Claims" bordered={false} style={{ borderRadius: '24px' }}>
                <Table
                  size="small"
                  dataSource={claims}
                  columns={overallColumns}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
        ]
      : []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card bordered={false} style={{ borderRadius: '24px' }}>
        <Tabs defaultActiveKey="my-claims" items={tabItems} size="large" />
      </Card>

      {/* New Claim Modal */}
      <Modal
        title="Submit Expense Claim"
        open={isOpen}
        onCancel={() => {
          setIsOpen(false);
          setFileList([]);
        }}
        footer={null}
        destroyOnClose
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitClaim}
          style={{ paddingRight: '10px' }}
        >
          <Form.Item name="category" label="Category" rules={[{ required: true }]}>
            <Select
              style={{ borderRadius: '8px' }}
              placeholder="Select category"
              options={EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }))}
            />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%', borderRadius: '8px' }} min={0} placeholder="0.00" />
            </Form.Item>
            <Form.Item name="expenseDate" label="Expense Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%', borderRadius: '8px' }} />
            </Form.Item>
          </div>
          <Form.Item name="costCentre" label="Cost Centre">
            <Input placeholder="Cost centre / project code" style={{ borderRadius: '8px' }} />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea placeholder="Describe the expense..." rows={3} style={{ borderRadius: '8px' }} />
          </Form.Item>
          <Form.Item label="Receipts">
            <Upload
              multiple
              fileList={fileList}
              beforeUpload={() => false}
              onChange={({ fileList: fl }) => setFileList(fl)}
              onRemove={(file) => setFileList(prev => prev.filter(f => f.uid !== file.uid))}
            >
              <Button icon={<UploadOutlined />} style={{ borderRadius: '8px' }}>Attach Receipt(s)</Button>
            </Upload>
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'end', gap: '12px', marginTop: '24px' }}>
            <Button onClick={() => { setIsOpen(false); setFileList([]); }} style={{ borderRadius: '8px' }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting} disabled={submitting} style={{ borderRadius: '8px', background: '#0284c7' }}>Submit</Button>
          </div>
        </Form>
      </Modal>

      {/* Approve/Reject Modal */}
      <Modal
        title="Review Expense Claim"
        open={isActionModalOpen}
        onCancel={() => {
          setIsActionModalOpen(false);
          setSelectedClaim(null);
          setActionRemarks('');
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setIsActionModalOpen(false);
              setSelectedClaim(null);
              setActionRemarks('');
            }}
          >
            Cancel
          </Button>,
          <Button
            key="reject"
            type="primary"
            danger
            loading={actionLoading}
            onClick={() => handleAction('reject')}
          >
            Reject
          </Button>,
          <Button
            key="approve"
            type="primary"
            loading={actionLoading}
            onClick={() => handleAction('approve')}
            style={{ background: '#10b981', borderColor: '#10b981' }}
          >
            Approve
          </Button>,
        ]}
      >
        {selectedClaim && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '16px 0' }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Employee">
                {selectedClaim.employeeName || getEmployeeName(selectedClaim.employeeId)} ({selectedClaim.employeeId})
              </Descriptions.Item>
              <Descriptions.Item label="Category">{selectedClaim.category}</Descriptions.Item>
              <Descriptions.Item label="Amount">₹{selectedClaim.amount?.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Expense Date">{selectedClaim.expenseDate}</Descriptions.Item>
              {selectedClaim.costCentre && (
                <Descriptions.Item label="Cost Centre">{selectedClaim.costCentre}</Descriptions.Item>
              )}
              <Descriptions.Item label="Description">"{selectedClaim.description}"</Descriptions.Item>
              {selectedClaim.policyBreach && (
                <Descriptions.Item label="Policy">
                  <Tag color="orange" icon={<WarningOutlined />}>
                    {selectedClaim.policyBreachReason || 'Policy breach detected'}
                  </Tag>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Form layout="vertical">
              <Form.Item label="Remarks / Comments *" required>
                <Input.TextArea
                  placeholder="Enter approval/rejection remarks (mandatory)..."
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
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
