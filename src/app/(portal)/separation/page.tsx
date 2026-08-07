'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  Card,
  Table,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Modal,
  message,
  Tag,
  Descriptions,
  List,
  Checkbox,
  Space,
  Divider,
  Typography,
} from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import {
  SeparationRequest,
  submitResignation,
  getAllSeparations,
  toggleClearance,
  toggleAssetReturn,
  generateFullAndFinal,
  approveSeparation,
  rejectSeparation,
} from '@/services/separationService';

const { Text } = Typography;

const statusColor = (status: string) => {
  switch (status) {
    case 'Closed':
      return 'green';
    case 'Rejected':
      return 'red';
    case 'F&F Pending':
      return 'gold';
    default:
      return 'blue';
  }
};

export default function SeparationPage() {
  const { employeeId, roles } = useSelector((state: RootState) => state.auth);
  const userRole = roles[0] || 'EMPLOYEE';
  const isApprover =
    roles.includes('ROLE_HR') ||
    roles.includes('ROLE_SUPER_ADMIN') ||
    roles.includes('ROLE_MANAGER') ||
    roles.includes('ROLE_FINANCE');
  const isFinanceOrHR = roles.includes('ROLE_FINANCE') || roles.includes('ROLE_HR') || roles.includes('ROLE_SUPER_ADMIN');

  const [requests, setRequests] = useState<SeparationRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const [isResignOpen, setIsResignOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const [selected, setSelected] = useState<SeparationRequest | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [remarksModalOpen, setRemarksModalOpen] = useState(false);
  const [remarksAction, setRemarksAction] = useState<'approve' | 'reject'>('approve');
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [ffForm] = Form.useForm();

  const loadData = () => {
    setLoading(true);
    getAllSeparations()
      .then((data) => setRequests(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const openDrawer = (request: SeparationRequest) => {
    setSelected(request);
    setDrawerOpen(true);
    ffForm.setFieldsValue({
      salaryTillLwd: request.fullAndFinal?.salaryTillLwd,
      leaveEncashment: request.fullAndFinal?.leaveEncashment,
      gratuity: request.fullAndFinal?.gratuity,
      recoveries: request.fullAndFinal?.recoveries,
    });
  };

  const refreshSelected = (updated: SeparationRequest) => {
    setSelected(updated);
    setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleResign = async (values: any) => {
    try {
      setSubmitting(true);
      await submitResignation({
        employeeId: employeeId || undefined,
        resignationDate: values.resignationDate ? values.resignationDate.format('YYYY-MM-DD') : undefined,
        lastWorkingDay: values.lastWorkingDay ? values.lastWorkingDay.format('YYYY-MM-DD') : undefined,
        noticePeriod: values.noticePeriod,
        reason: values.reason,
      });
      setIsResignOpen(false);
      form.resetFields();
      loadData();
    } catch {
      // Handled globally
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleClearance = async (department: string, done: boolean) => {
    if (!selected) return;
    try {
      const updated = await toggleClearance(selected.id, department, done);
      refreshSelected(updated);
      loadData();
    } catch {
      // Handled globally
    }
  };

  const handleToggleAsset = async (assetTag: string, returned: boolean) => {
    if (!selected) return;
    try {
      const updated = await toggleAssetReturn(selected.id, assetTag, returned);
      refreshSelected(updated);
      loadData();
    } catch {
      // Handled globally
    }
  };

  const handleGenerateFF = async () => {
    if (!selected) return;
    try {
      const values = await ffForm.validateFields();
      const updated = await generateFullAndFinal(selected.id, values);
      message.success('Full & Final settlement generated');
      refreshSelected(updated);
      loadData();
    } catch (err: any) {
      // Field validation errors won't have a response; API errors are handled globally
    }
  };

  const openRemarksModal = (action: 'approve' | 'reject') => {
    setRemarksAction(action);
    setRemarks('');
    setRemarksModalOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selected) return;
    try {
      setActionLoading(true);
      const updated =
        remarksAction === 'approve'
          ? await approveSeparation(selected.id, userRole, remarks)
          : await rejectSeparation(selected.id, userRole, remarks);
      message.success(`Request ${remarksAction === 'approve' ? 'approved' : 'rejected'}`);
      refreshSelected(updated);
      setRemarksModalOpen(false);
      loadData();
    } catch {
      // Handled globally
    } finally {
      setActionLoading(false);
    }
  };

  const allClearancesDone = (request: SeparationRequest | null) =>
    !!request && request.clearances?.length > 0 && request.clearances.every((c) => c.done);

  const columns = [
    { title: 'Employee', dataIndex: 'employeeName', key: 'employeeName' },
    { title: 'Resignation Date', dataIndex: 'resignationDate', key: 'resignationDate' },
    { title: 'Last Working Day', dataIndex: 'lastWorkingDay', key: 'lastWorkingDay' },
    { title: 'Notice Period (days)', dataIndex: 'noticePeriod', key: 'noticePeriod' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={statusColor(status)}>{status}</Tag>,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: SeparationRequest) => (
        <Button size="small" onClick={() => openDrawer(record)}>
          View
        </Button>
      ),
    },
  ];

  const canActOnSelected =
    isApprover && selected && selected.status !== 'Closed' && selected.status !== 'Rejected';

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="Separation & Exit"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsResignOpen(true)}>
            Submit Resignation
          </Button>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={requests}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="Submit Resignation"
        open={isResignOpen}
        onCancel={() => setIsResignOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        okText="Submit"
      >
        <Form form={form} layout="vertical" onFinish={handleResign}>
          <Form.Item
            name="resignationDate"
            label="Resignation Date"
            rules={[{ required: true, message: 'Please select resignation date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="lastWorkingDay"
            label="Last Working Day"
            rules={[{ required: true, message: 'Please select last working day' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="noticePeriod" label="Notice Period (days)">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, message: 'Please provide a reason' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="Separation Request Details"
        width={520}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {selected && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Employee">{selected.employeeName}</Descriptions.Item>
              <Descriptions.Item label="Department">{selected.department}</Descriptions.Item>
              <Descriptions.Item label="Resignation Date">{selected.resignationDate}</Descriptions.Item>
              <Descriptions.Item label="Last Working Day">{selected.lastWorkingDay}</Descriptions.Item>
              <Descriptions.Item label="Notice Period">{selected.noticePeriod} days</Descriptions.Item>
              <Descriptions.Item label="Reason">{selected.reason}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={statusColor(selected.status)}>{selected.status}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">Clearance Checklist</Divider>
            <List
              size="small"
              dataSource={selected.clearances}
              renderItem={(item) => (
                <List.Item>
                  <Checkbox
                    checked={item.done}
                    disabled={!isApprover}
                    onChange={(e) => handleToggleClearance(item.department, e.target.checked)}
                  >
                    {item.department}
                  </Checkbox>
                  {item.notes && <Text type="secondary"> — {item.notes}</Text>}
                </List.Item>
              )}
            />

            <Divider orientation="left">Asset Return Checklist</Divider>
            {selected.assetReturns?.length ? (
              <List
                size="small"
                dataSource={selected.assetReturns}
                renderItem={(item) => (
                  <List.Item>
                    <Checkbox
                      checked={item.returned}
                      disabled={!isApprover}
                      onChange={(e) => handleToggleAsset(item.assetTag, e.target.checked)}
                    >
                      {item.assetTag} — {item.description}
                    </Checkbox>
                  </List.Item>
                )}
              />
            ) : (
              <Text type="secondary">No assets tracked for this employee.</Text>
            )}

            <Divider orientation="left">Full &amp; Final Settlement</Divider>
            {isFinanceOrHR ? (
              <Form form={ffForm} layout="vertical">
                <Form.Item name="salaryTillLwd" label="Salary Till Last Working Day">
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
                <Form.Item name="leaveEncashment" label="Leave Encashment">
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
                <Form.Item name="gratuity" label="Gratuity">
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
                <Form.Item name="recoveries" label="Recoveries">
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
                <Button
                  type="primary"
                  disabled={!allClearancesDone(selected)}
                  onClick={handleGenerateFF}
                >
                  Generate Full &amp; Final
                </Button>
                {!allClearancesDone(selected) && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">All clearances must be completed before generating F&amp;F.</Text>
                  </div>
                )}
              </Form>
            ) : (
              <Text type="secondary">Only Finance/HR can generate the Full &amp; Final settlement.</Text>
            )}

            {selected.fullAndFinal && (
              <Descriptions column={1} size="small" bordered style={{ marginTop: 16 }}>
                <Descriptions.Item label="Salary Till LWD">{selected.fullAndFinal.salaryTillLwd}</Descriptions.Item>
                <Descriptions.Item label="Leave Encashment">{selected.fullAndFinal.leaveEncashment}</Descriptions.Item>
                <Descriptions.Item label="Gratuity">{selected.fullAndFinal.gratuity}</Descriptions.Item>
                <Descriptions.Item label="Recoveries">{selected.fullAndFinal.recoveries}</Descriptions.Item>
                <Descriptions.Item label="Net Payable">
                  <b>{selected.fullAndFinal.netPayable}</b>
                </Descriptions.Item>
              </Descriptions>
            )}

            {canActOnSelected && (
              <Space style={{ marginTop: 24 }}>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => openRemarksModal('approve')}
                >
                  Approve
                </Button>
                <Button danger icon={<CloseOutlined />} onClick={() => openRemarksModal('reject')}>
                  Reject
                </Button>
              </Space>
            )}

            <Divider orientation="left">Audit Trail</Divider>
            <List
              size="small"
              dataSource={selected.auditLogs || []}
              renderItem={(log) => (
                <List.Item>
                  <Text>
                    [{log.timestamp ? dayjs(log.timestamp).format('YYYY-MM-DD HH:mm') : ''}] {log.approverRole} —{' '}
                    {log.action}: {log.comments}
                  </Text>
                </List.Item>
              )}
            />
          </>
        )}
      </Drawer>

      <Modal
        title={remarksAction === 'approve' ? 'Approve Separation Request' : 'Reject Separation Request'}
        open={remarksModalOpen}
        onCancel={() => setRemarksModalOpen(false)}
        onOk={handleConfirmAction}
        confirmLoading={actionLoading}
        okText={remarksAction === 'approve' ? 'Approve' : 'Reject'}
      >
        <Input.TextArea
          rows={3}
          placeholder="Remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </Modal>
    </div>
  );
}
