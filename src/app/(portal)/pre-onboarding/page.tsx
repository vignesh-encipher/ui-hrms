'use client';

import React, { useEffect, useState } from 'react';
import API from '@/services/api';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  Card,
  Table,
  Button,
  Tag,
  Progress,
  Drawer,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Space,
  Checkbox,
  Descriptions,
  message,
  Divider,
  Typography,
} from 'antd';
import { PlusOutlined, UserAddOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  PreOnboardingCandidate,
  createPreOnboardingCandidate,
  getPreOnboardingCandidates,
  toggleChecklistItem,
  updateBgvStatus,
  convertToEmployee,
  STAGE_LABELS,
} from '@/services/preOnboardingService';

const { Text } = Typography;

const BGV_STATUSES = ['Not Started', 'In Progress', 'Cleared'];

export default function PreOnboardingPage() {
  const { roles } = useSelector((state: RootState) => state.auth);
  const canManage =
    roles.includes('ROLE_HR') ||
    roles.includes('ROLE_SUPER_ADMIN') ||
    roles.includes('ROLE_RECRUITER') ||
    roles.includes('ROLE_IT_ADMIN');
  const canConvert = roles.includes('ROLE_HR') || roles.includes('ROLE_SUPER_ADMIN');

  const [candidates, setCandidates] = useState<PreOnboardingCandidate[]>([]);
  const [loading, setLoading] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm();

  const [drawerCandidate, setDrawerCandidate] = useState<PreOnboardingCandidate | null>(null);

  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [convertCandidate, setConvertCandidate] = useState<PreOnboardingCandidate | null>(null);
  const [converting, setConverting] = useState(false);
  const [convertForm] = Form.useForm();

  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);

  const loadData = () => {
    setLoading(true);
    getPreOnboardingCandidates()
      .then((data) => setCandidates(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    API.get('/departments').then((res) => setDepartments(res.data)).catch(() => {});
    API.get('/designations').then((res) => setDesignations(res.data)).catch(() => {});
  }, []);

  const refreshDrawer = (updated: PreOnboardingCandidate) => {
    setDrawerCandidate(updated);
    setCandidates((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleCreate = async (values: any) => {
    try {
      setCreating(true);
      await createPreOnboardingCandidate({
        name: values.name,
        email: values.email,
        phone: values.phone,
        designation: values.designation,
        dateOfJoining: values.dateOfJoining ? values.dateOfJoining.format('YYYY-MM-DD') : undefined,
        reportingManagerId: values.reportingManagerId,
        workLocation: values.workLocation,
        shift: values.shift,
      });
      message.success('Candidate added to pre-onboarding.');
      setIsCreateOpen(false);
      createForm.resetFields();
      loadData();
    } catch {
      // handled globally
    } finally {
      setCreating(false);
    }
  };

  const handleToggleItem = async (
    candidate: PreOnboardingCandidate,
    checklistType: 'documents' | 'itAdmin' | 'hr',
    item: string,
    done: boolean
  ) => {
    try {
      const updated = await toggleChecklistItem(candidate.id!, checklistType, item, done);
      refreshDrawer(updated);
    } catch {
      // handled globally
    }
  };

  const handleBgvChange = async (candidate: PreOnboardingCandidate, bgvStatus: string) => {
    try {
      const updated = await updateBgvStatus(candidate.id!, bgvStatus);
      refreshDrawer(updated);
    } catch {
      // handled globally
    }
  };

  const openConvertModal = (candidate: PreOnboardingCandidate) => {
    setConvertCandidate(candidate);
    const [firstName, ...rest] = (candidate.name || '').split(' ');
    convertForm.setFieldsValue({
      firstName,
      lastName: rest.join(' '),
      email: candidate.email,
      phone: candidate.phone,
      managerId: candidate.reportingManagerId,
      joiningDate: candidate.dateOfJoining ? dayjs(candidate.dateOfJoining) : undefined,
      role: 'EMPLOYEE',
    });
    setIsConvertOpen(true);
  };

  const handleConvert = async (values: any) => {
    if (!convertCandidate) return;
    try {
      setConverting(true);
      await convertToEmployee(convertCandidate.id!, {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        departmentId: values.departmentId,
        designationId: values.designationId,
        managerId: values.managerId,
        joiningDate: values.joiningDate ? values.joiningDate.format('YYYY-MM-DD') : undefined,
        employmentType: values.employmentType || 'Full Time',
        password: values.password,
        role: values.role || 'EMPLOYEE',
      });
      message.success('Employee record created successfully.');
      setIsConvertOpen(false);
      setDrawerCandidate(null);
      convertForm.resetFields();
      loadData();
    } catch {
      // handled globally
    } finally {
      setConverting(false);
    }
  };

  const computeProgress = (candidate: PreOnboardingCandidate) => {
    const stage = candidate.stage ?? 0;
    return Math.round(((stage + 1) / STAGE_LABELS.length) * 100);
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Designation', dataIndex: 'designation', key: 'designation' },
    { title: 'Date of Joining', dataIndex: 'dateOfJoining', key: 'dateOfJoining' },
    { title: 'Work Location', dataIndex: 'workLocation', key: 'workLocation' },
    {
      title: 'BGV Status',
      dataIndex: 'bgvStatus',
      key: 'bgvStatus',
      render: (status: string) => (
        <Tag color={status === 'Cleared' ? 'green' : status === 'In Progress' ? 'orange' : 'default'}>
          {status || 'Not Started'}
        </Tag>
      ),
    },
    {
      title: 'Stage',
      key: 'stage',
      render: (_: any, record: PreOnboardingCandidate) => (
        <div style={{ minWidth: 160 }}>
          <Progress percent={computeProgress(record)} size="small" />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {STAGE_LABELS[record.stage ?? 0]}
          </Text>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'Converted' ? 'blue' : 'processing'}>{status || 'In Progress'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: PreOnboardingCandidate) => (
        <Space>
          <Button size="small" onClick={() => setDrawerCandidate(record)}>
            View
          </Button>
          {canConvert && record.status !== 'Converted' && (
            <Button size="small" type="primary" icon={<UserAddOutlined />} onClick={() => openConvertModal(record)}>
              Convert to Employee
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const renderChecklist = (
    title: string,
    items: { item: string; done: boolean }[] | undefined,
    checklistType: 'documents' | 'itAdmin' | 'hr'
  ) => (
    <div style={{ marginBottom: 16 }}>
      <Divider orientation="left" plain>
        {title}
      </Divider>
      <Space direction="vertical">
        {(items || []).map((ci) => (
          <Checkbox
            key={ci.item}
            checked={ci.done}
            disabled={!canManage}
            onChange={(e) => drawerCandidate && handleToggleItem(drawerCandidate, checklistType, ci.item, e.target.checked)}
          >
            {ci.item}
          </Checkbox>
        ))}
      </Space>
    </div>
  );

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="Pre-Onboarding"
        extra={
          canManage && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateOpen(true)}>
              Add Candidate
            </Button>
          )
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          columns={columns as any}
          dataSource={candidates}
          scroll={{ x: true }}
        />
      </Card>

      {/* Create Candidate Modal */}
      <Modal
        title="Add Pre-Onboarding Candidate"
        open={isCreateOpen}
        onCancel={() => setIsCreateOpen(false)}
        onOk={() => createForm.submit()}
        confirmLoading={creating}
        destroyOnClose
      >
        <Form layout="vertical" form={createForm} onFinish={handleCreate}>
          <Form.Item name="name" label="Candidate Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item name="designation" label="Role / Designation">
            <Input />
          </Form.Item>
          <Form.Item name="dateOfJoining" label="Date of Joining">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reportingManagerId" label="Reporting Manager (Employee ID)">
            <Input placeholder="e.g. EMP-001" />
          </Form.Item>
          <Form.Item name="workLocation" label="Work Location">
            <Input />
          </Form.Item>
          <Form.Item name="shift" label="Shift">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Candidate Detail Drawer */}
      <Drawer
        title={drawerCandidate?.name}
        open={!!drawerCandidate}
        onClose={() => setDrawerCandidate(null)}
        width={480}
      >
        {drawerCandidate && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Designation">{drawerCandidate.designation || '-'}</Descriptions.Item>
              <Descriptions.Item label="Date of Joining">{drawerCandidate.dateOfJoining || '-'}</Descriptions.Item>
              <Descriptions.Item label="Reporting Manager">{drawerCandidate.reportingManagerId || '-'}</Descriptions.Item>
              <Descriptions.Item label="Work Location">{drawerCandidate.workLocation || '-'}</Descriptions.Item>
              <Descriptions.Item label="Shift">{drawerCandidate.shift || '-'}</Descriptions.Item>
              <Descriptions.Item label="Stage">
                {STAGE_LABELS[drawerCandidate.stage ?? 0]} ({computeProgress(drawerCandidate)}%)
              </Descriptions.Item>
              <Descriptions.Item label="BGV Status">
                <Select
                  size="small"
                  style={{ width: 160 }}
                  value={drawerCandidate.bgvStatus || 'Not Started'}
                  disabled={!canManage}
                  onChange={(val) => handleBgvChange(drawerCandidate, val)}
                  options={BGV_STATUSES.map((s) => ({ label: s, value: s }))}
                />
              </Descriptions.Item>
            </Descriptions>

            {renderChecklist('HR Checklist', drawerCandidate.hrChecklist, 'hr')}
            {renderChecklist('Documents Checklist', drawerCandidate.documentsChecklist, 'documents')}
            {renderChecklist('IT & Admin Checklist', drawerCandidate.itAdminChecklist, 'itAdmin')}

            {canConvert && drawerCandidate.status !== 'Converted' && (
              <Button type="primary" icon={<UserAddOutlined />} block onClick={() => openConvertModal(drawerCandidate)}>
                Convert to Employee
              </Button>
            )}
            {drawerCandidate.status === 'Converted' && (
              <Tag color="blue">Converted to Employee: {drawerCandidate.convertedEmployeeId}</Tag>
            )}
          </>
        )}
      </Drawer>

      {/* Convert to Employee Modal */}
      <Modal
        title="Create Employee Record"
        open={isConvertOpen}
        onCancel={() => setIsConvertOpen(false)}
        onOk={() => convertForm.submit()}
        confirmLoading={converting}
        destroyOnClose
      >
        <Form layout="vertical" form={convertForm} onFinish={handleConvert}>
          <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="lastName" label="Last Name">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item name="departmentId" label="Department">
            <Select
              allowClear
              options={departments.map((d) => ({ label: d.name, value: d.id }))}
            />
          </Form.Item>
          <Form.Item name="designationId" label="Designation">
            <Select
              allowClear
              options={designations.map((d) => ({ label: d.title, value: d.id }))}
            />
          </Form.Item>
          <Form.Item name="managerId" label="Manager (Employee ID)">
            <Input />
          </Form.Item>
          <Form.Item name="joiningDate" label="Joining Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="employmentType" label="Employment Type" initialValue="Full Time">
            <Select
              options={['Full Time', 'Part Time', 'Contract', 'Intern'].map((t) => ({ label: t, value: t }))}
            />
          </Form.Item>
          <Form.Item name="role" label="Role" initialValue="EMPLOYEE">
            <Select options={['EMPLOYEE', 'MANAGER', 'HR'].map((r) => ({ label: r, value: r }))} />
          </Form.Item>
          <Form.Item
            name="password"
            label="Initial Password"
            rules={[{ required: true, message: 'Initial password is required' }]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
