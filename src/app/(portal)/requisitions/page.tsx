'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import API from '@/services/api';
import { Card, Table, Button, Modal, Form, Input, Select, InputNumber, DatePicker, Tabs, Descriptions, Tag, Space, Row, Col } from 'antd';
import { PlusOutlined, FileTextOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  Requisition,
  raiseRequisition,
  approveRequisition,
  rejectRequisition,
  getAllRequisitions,
  getRequisitionsByRequester,
} from '@/services/requisitionService';

const REQUEST_TYPES = ['New Position', 'Replacement', 'Contract', 'Intern', 'Consultant'];

const LEVEL_TITLES = ['Reporting Manager', 'Department Head', 'Finance', 'HR', 'Management'];

function statusTagColor(status: string) {
  if (status === 'Approved') return 'green';
  if (status === 'Rejected') return 'red';
  return 'orange';
}

export default function RequisitionsPage() {
  const { employeeId, roles } = useSelector((state: RootState) => state.auth);
  const isApprover =
    roles.includes('ROLE_HR') ||
    roles.includes('ROLE_SUPER_ADMIN') ||
    roles.includes('ROLE_MANAGER') ||
    roles.includes('ROLE_FINANCE') ||
    roles.includes('ROLE_RECRUITER');
  const userRole = roles[0] || 'EMPLOYEE';

  const [myRequisitions, setMyRequisitions] = useState<Requisition[]>([]);
  const [allRequisitions, setAllRequisitions] = useState<Requisition[]>([]);
  const [employeeList, setEmployeeList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [allLoading, setAllLoading] = useState(false);

  const [isRaiseOpen, setIsRaiseOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const [isActionOpen, setIsActionOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [departmentFilter, setDepartmentFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const getEmployeeName = (empId?: string) => {
    if (!empId) return '';
    const emp = employeeList.find((e) => e.employeeId === empId || e.id === empId);
    return emp ? `${emp.firstName} ${emp.lastName}` : empId;
  };

  const loadData = () => {
    if (employeeId) {
      setLoading(true);
      getRequisitionsByRequester(employeeId)
        .then((data) => setMyRequisitions(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }

    if (isApprover) {
      setAllLoading(true);
      getAllRequisitions()
        .then((data) => setAllRequisitions(data))
        .catch(() => {})
        .finally(() => setAllLoading(false));
    }

    API.get('/employees/list')
      .then((res) => setEmployeeList(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const handleRaise = async (values: any) => {
    try {
      setSubmitting(true);
      await raiseRequisition({
        roleTitle: values.roleTitle,
        department: values.department,
        requestType: values.requestType,
        numberOfPositions: values.numberOfPositions,
        budgetedCtcMin: values.budgetedCtcMin,
        budgetedCtcMax: values.budgetedCtcMax,
        businessUnit: values.businessUnit,
        workLocation: values.workLocation,
        grade: values.grade,
        minimumExperience: values.minimumExperience,
        requiredSkills: values.requiredSkills
          ? String(values.requiredSkills)
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [],
        businessJustification: values.businessJustification,
        raisedByEmployeeId: employeeId || '',
        targetJoiningDate: values.targetJoiningDate ? values.targetJoiningDate.format('YYYY-MM-DD') : undefined,
      });
      setIsRaiseOpen(false);
      form.resetFields();
      loadData();
    } catch {
      // Handled globally by API interceptor
    } finally {
      setSubmitting(false);
    }
  };

  const openAction = (req: Requisition) => {
    setSelectedReq(req);
    setRemarks('');
    setIsActionOpen(true);
  };

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedReq) return;
    if (!remarks.trim()) {
      Modal.warning({ title: 'Remarks required', content: 'Please enter remarks/comments before proceeding.' });
      return;
    }
    try {
      setActionLoading(true);
      if (action === 'approve') {
        await approveRequisition(selectedReq.id, userRole, remarks);
      } else {
        await rejectRequisition(selectedReq.id, userRole, remarks);
      }
      setIsActionOpen(false);
      setSelectedReq(null);
      setRemarks('');
      loadData();
    } catch {
      // Handled globally
    } finally {
      setActionLoading(false);
    }
  };

  const canActOnLevel = (req: Requisition) => {
    const currentLvl = req.currentLevel || 1;
    if (roles.includes('ROLE_SUPER_ADMIN')) return true;
    const levelRole = (req as any)[`level${currentLvl}Role`];
    if (!levelRole) return false;
    return roles.includes(`ROLE_${levelRole}`);
  };

  const pendingForMe = allRequisitions.filter(
    (req) => req.status !== 'Approved' && req.status !== 'Rejected' && canActOnLevel(req)
  );

  const departments = Array.from(new Set(allRequisitions.map((r) => r.department).filter(Boolean)));

  const filteredAll = allRequisitions.filter((req) => {
    if (departmentFilter && req.department !== departmentFilter) return false;
    if (statusFilter === 'Approved' && req.status !== 'Approved') return false;
    if (statusFilter === 'Rejected' && req.status !== 'Rejected') return false;
    if (statusFilter === 'Pending' && !req.status?.startsWith('Pending')) return false;
    return true;
  });

  const baseColumns = [
    { title: 'Role / Designation', dataIndex: 'roleTitle', key: 'roleTitle' },
    { title: 'Department', dataIndex: 'department', key: 'department' },
    { title: 'Type', dataIndex: 'requestType', key: 'requestType' },
    { title: 'Positions', dataIndex: 'numberOfPositions', key: 'numberOfPositions', width: 90 },
    { title: 'Target Joining', dataIndex: 'targetJoiningDate', key: 'targetJoiningDate' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={statusTagColor(status)}>{status}</Tag>,
    },
  ];

  const myColumns = [
    ...baseColumns,
    { title: 'Raised Date', dataIndex: 'raisedDate', key: 'raisedDate' },
  ];

  const pendingColumns = [
    {
      title: 'Raised By',
      key: 'raisedBy',
      render: (_: any, req: Requisition) => (
        <span>
          {req.raisedByName || getEmployeeName(req.raisedByEmployeeId)} ({req.raisedByEmployeeId})
        </span>
      ),
    },
    ...baseColumns,
    {
      title: 'Approval Level',
      key: 'level',
      render: (_: any, req: Requisition) => (
        <span>
          L{req.currentLevel || 1} - {LEVEL_TITLES[(req.currentLevel || 1) - 1]}
        </span>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right' as const,
      render: (_: any, req: Requisition) => (
        <Button type="primary" size="small" style={{ borderRadius: 8, background: '#0284c7' }} onClick={() => openAction(req)}>
          Review
        </Button>
      ),
    },
  ];

  const allColumns = [
    {
      title: 'Raised By',
      key: 'raisedBy',
      render: (_: any, req: Requisition) => (
        <span>
          {req.raisedByName || getEmployeeName(req.raisedByEmployeeId)} ({req.raisedByEmployeeId})
        </span>
      ),
    },
    ...baseColumns,
    { title: 'Raised Date', dataIndex: 'raisedDate', key: 'raisedDate' },
  ];

  const tabItems = [
    {
      key: 'my-requisitions',
      label: (
        <span>
          <FileTextOutlined /> My Requisitions
        </span>
      ),
      children: (
        <Card
          title="My Raised Requisitions"
          bordered={false}
          style={{ borderRadius: 24 }}
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsRaiseOpen(true)} style={{ borderRadius: 12, background: '#0284c7' }}>
              Raise Requisition
            </Button>
          }
          bodyStyle={{ padding: 0 }}
        >
          <Table size="small" dataSource={myRequisitions} columns={myColumns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
        </Card>
      ),
    },
    ...(isApprover
      ? [
          {
            key: 'pending-approvals',
            label: (
              <span>
                <ClockCircleOutlined /> Pending Approvals ({pendingForMe.length})
              </span>
            ),
            children: (
              <Card bordered={false} style={{ borderRadius: 24 }} bodyStyle={{ padding: 0 }}>
                <Table size="small" dataSource={pendingForMe} columns={pendingColumns} rowKey="id" loading={allLoading} pagination={{ pageSize: 10 }} />
              </Card>
            ),
          },
          {
            key: 'all-requisitions',
            label: (
              <span>
                <FileTextOutlined /> Overall Requisitions
              </span>
            ),
            children: (
              <Card bordered={false} style={{ borderRadius: 24 }} bodyStyle={{ padding: '8px 24px' }}>
                <Space style={{ marginBottom: 16 }}>
                  <Select
                    allowClear
                    placeholder="Filter by Department"
                    style={{ width: 220 }}
                    options={departments.map((d) => ({ value: d, label: d }))}
                    onChange={(v) => setDepartmentFilter(v)}
                  />
                  <Select
                    allowClear
                    placeholder="Filter by Status"
                    style={{ width: 180 }}
                    options={[
                      { value: 'Pending', label: 'Pending' },
                      { value: 'Approved', label: 'Approved' },
                      { value: 'Rejected', label: 'Rejected' },
                    ]}
                    onChange={(v) => setStatusFilter(v)}
                  />
                </Space>
                <Table size="small" dataSource={filteredAll} columns={allColumns} rowKey="id" loading={allLoading} pagination={{ pageSize: 10 }} />
              </Card>
            ),
          },
        ]
      : []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card bordered={false} style={{ borderRadius: 24 }}>
        <Tabs defaultActiveKey="my-requisitions" items={tabItems} size="large" />
      </Card>

      {/* Raise Requisition Modal */}
      <Modal
        title="Raise Resource Requisition"
        open={isRaiseOpen}
        onCancel={() => setIsRaiseOpen(false)}
        footer={null}
        destroyOnClose
        width={640}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Form form={form} layout="vertical" onFinish={handleRaise} style={{ paddingRight: 10 }} initialValues={{ requestType: 'New Position', numberOfPositions: 1 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="roleTitle" label="Role / Designation Title" rules={[{ required: true }]}>
                <Input placeholder="e.g. Senior Software Engineer" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="department" label="Department" rules={[{ required: true }]}>
                <Input placeholder="e.g. Engineering" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="requestType" label="Request Type" rules={[{ required: true }]}>
                <Select options={REQUEST_TYPES.map((t) => ({ value: t, label: t }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="numberOfPositions" label="Number of Positions" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%', borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="budgetedCtcMin" label="Budgeted CTC (Min)">
                <Input placeholder="e.g. 12 LPA" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="budgetedCtcMax" label="Budgeted CTC (Max)">
                <Input placeholder="e.g. 18 LPA" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="businessUnit" label="Business Unit">
                <Input style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="workLocation" label="Work Location">
                <Input style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="grade" label="Grade">
                <Input style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="minimumExperience" label="Minimum Experience">
                <Input placeholder="e.g. 4-6 years" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="requiredSkills" label="Required Skills (comma-separated)">
            <Input placeholder="e.g. Java, Spring Boot, MongoDB" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item name="targetJoiningDate" label="Target Joining Date">
            <DatePicker style={{ width: '100%', borderRadius: 8 }} />
          </Form.Item>
          <Form.Item name="businessJustification" label="Business Justification" rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder="Explain the business need for this requisition..." style={{ borderRadius: 8 }} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'end', gap: 12, marginTop: 24 }}>
            <Button onClick={() => setIsRaiseOpen(false)} style={{ borderRadius: 8 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting} disabled={submitting} style={{ borderRadius: 8, background: '#0284c7' }}>
              Submit
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Approve / Reject Modal */}
      <Modal
        title="Review Requisition"
        open={isActionOpen}
        onCancel={() => {
          setIsActionOpen(false);
          setSelectedReq(null);
          setRemarks('');
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setIsActionOpen(false);
              setSelectedReq(null);
              setRemarks('');
            }}
          >
            Cancel
          </Button>,
          <Button key="reject" type="primary" danger loading={actionLoading} onClick={() => handleAction('reject')}>
            Reject
          </Button>,
          <Button key="approve" type="primary" loading={actionLoading} onClick={() => handleAction('approve')} style={{ background: '#10b981', borderColor: '#10b981' }}>
            Approve
          </Button>,
        ]}
      >
        {selectedReq && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, margin: '16px 0' }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Raised By">
                {selectedReq.raisedByName || getEmployeeName(selectedReq.raisedByEmployeeId)} ({selectedReq.raisedByEmployeeId})
              </Descriptions.Item>
              <Descriptions.Item label="Role / Designation">{selectedReq.roleTitle}</Descriptions.Item>
              <Descriptions.Item label="Department">{selectedReq.department}</Descriptions.Item>
              <Descriptions.Item label="Request Type">{selectedReq.requestType}</Descriptions.Item>
              <Descriptions.Item label="Positions">{selectedReq.numberOfPositions}</Descriptions.Item>
              <Descriptions.Item label="Budgeted CTC">
                {selectedReq.budgetedCtcMin || '-'} to {selectedReq.budgetedCtcMax || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Business Justification">{selectedReq.businessJustification}</Descriptions.Item>
              <Descriptions.Item label="Approval Level">
                Level {selectedReq.currentLevel || 1} - {LEVEL_TITLES[(selectedReq.currentLevel || 1) - 1]}
              </Descriptions.Item>
            </Descriptions>

            <Form layout="vertical">
              <Form.Item label="Remarks / Comments *" required>
                <Input.TextArea placeholder="Enter approval/rejection remarks (mandatory)..." value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} style={{ borderRadius: 8 }} />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
}
