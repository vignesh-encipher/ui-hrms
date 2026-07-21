'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Switch,
  InputNumber,
  Input,
  Space,
  Modal,
  Form,
  Popconfirm,
  message,
  Tag,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
  LeaveTypeConfig,
  getLeaveTypes,
  updateLeaveSettings,
  saveLeaveType,
  deleteLeaveType,
} from '@/services/leaveService';

interface LeaveStructureSettingsProps {
  roles: string[];
}

export default function LeaveStructureSettings({ roles }: LeaveStructureSettingsProps) {
  const isSuperAdmin = roles.includes('ROLE_SUPER_ADMIN');

  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<LeaveTypeConfig | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const [form] = Form.useForm();

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getLeaveTypes();
      setLeaveTypes(data);
    } catch (err) {
      message.error('Failed to load leave structure settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleFieldChange = (id: string, field: keyof LeaveTypeConfig, value: any) => {
    setLeaveTypes((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // Validation: if carryForward is disabled, set maxCarryForwardDays to 0
          if (field === 'carryForwardAllowed' && !value) {
            updated.maxCarryForwardDays = 0;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const validateSettings = (): boolean => {
    for (const item of leaveTypes) {
      if (item.totalDays < 0) {
        message.error(`Total leave days for "${item.name}" cannot be negative.`);
        return false;
      }
      if (item.carryForwardAllowed && item.maxCarryForwardDays > item.totalDays) {
        message.error(`Max carry forward days for "${item.name}" cannot exceed total leave days (${item.totalDays}).`);
        return false;
      }
    }
    return true;
  };

  const handleSaveAll = async () => {
    if (!validateSettings()) return;

    try {
      setSaving(true);
      await updateLeaveSettings(leaveTypes);
      message.success('Leave Structure Settings saved successfully!');
      loadSettings();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error saving leave settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = () => {
    Modal.confirm({
      title: 'Reset Leave Settings to Default?',
      icon: <ExclamationCircleOutlined />,
      content: 'This will reset all leave allocation days and carry forward rules back to default system values.',
      okText: 'Reset',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        loadSettings();
        message.info('Leave settings reset to default.');
      },
    });
  };

  const handleOpenAdd = () => {
    setEditingType(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (record: LeaveTypeConfig) => {
    setEditingType(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      totalDays: record.totalDays,
      monthlyAccrual: record.monthlyAccrual,
      carryForwardAllowed: record.carryForwardAllowed,
      maxCarryForwardDays: record.maxCarryForwardDays,
      encashmentAllowed: record.encashmentAllowed,
      maxPerRequest: record.maxPerRequest,
      active: record.active,
    });
    setIsModalOpen(true);
  };

  const onModalSubmit = async (values: any) => {
    if (values.carryForwardAllowed && values.maxCarryForwardDays > values.totalDays) {
      message.error('Max carry forward days cannot exceed total leave days');
      return;
    }

    try {
      setModalSubmitting(true);
      const payload: LeaveTypeConfig = {
        id: editingType ? editingType.id : undefined,
        ...values,
      };
      await saveLeaveType(payload);
      message.success(editingType ? 'Leave type updated!' : 'New leave type added!');
      setIsModalOpen(false);
      form.resetFields();
      loadSettings();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error saving leave type');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLeaveType(id);
      message.success('Leave type deleted!');
      loadSettings();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error deleting leave type');
    }
  };

  const columns = [
    {
      title: 'Leave Type Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: LeaveTypeConfig) => (
        <div>
          <strong style={{ fontSize: '14px', color: '#1e293b' }}>{name}</strong>
          <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Code: {record.code}</span>
        </div>
      ),
    },
    {
      title: 'Total Days / Yr',
      dataIndex: 'totalDays',
      key: 'totalDays',
      width: 140,
      render: (val: number, record: LeaveTypeConfig) => (
        isSuperAdmin && !record.readOnly ? (
          <InputNumber
            min={0}
            max={365}
            value={val}
            onChange={(v) => handleFieldChange(record.id!, 'totalDays', v || 0)}
            style={{ width: '90px', borderRadius: '8px' }}
          />
        ) : (
          <span>{val} Days {record.readOnly && <Tag color="default">Read Only</Tag>}</span>
        )
      ),
    },
    {
      title: 'Monthly Accrual',
      dataIndex: 'monthlyAccrual',
      key: 'monthlyAccrual',
      width: 130,
      render: (val: boolean, record: LeaveTypeConfig) => (
        <Switch
          checked={val}
          disabled={!isSuperAdmin || record.readOnly}
          onChange={(checked) => handleFieldChange(record.id!, 'monthlyAccrual', checked)}
        />
      ),
    },
    {
      title: 'Carry Forward',
      dataIndex: 'carryForwardAllowed',
      key: 'carryForwardAllowed',
      width: 130,
      render: (val: boolean, record: LeaveTypeConfig) => (
        <Switch
          checked={val}
          disabled={!isSuperAdmin || record.readOnly}
          onChange={(checked) => handleFieldChange(record.id!, 'carryForwardAllowed', checked)}
        />
      ),
    },
    {
      title: 'Max Carry Fwd Days',
      dataIndex: 'maxCarryForwardDays',
      key: 'maxCarryForwardDays',
      width: 150,
      render: (val: number, record: LeaveTypeConfig) => (
        isSuperAdmin && !record.readOnly && record.carryForwardAllowed ? (
          <InputNumber
            min={0}
            max={record.totalDays}
            value={val}
            onChange={(v) => handleFieldChange(record.id!, 'maxCarryForwardDays', v || 0)}
            style={{ width: '90px', borderRadius: '8px' }}
          />
        ) : (
          <span>{record.carryForwardAllowed ? `${val} Days` : '-'}</span>
        )
      ),
    },
    {
      title: 'Encashment Allowed',
      dataIndex: 'encashmentAllowed',
      key: 'encashmentAllowed',
      width: 150,
      render: (val: boolean, record: LeaveTypeConfig) => (
        <Switch
          checked={val}
          disabled={!isSuperAdmin || record.readOnly}
          onChange={(checked) => handleFieldChange(record.id!, 'encashmentAllowed', checked)}
        />
      ),
    },
    {
      title: 'Active / Enabled',
      dataIndex: 'active',
      key: 'active',
      width: 130,
      render: (val: boolean, record: LeaveTypeConfig) => (
        <Switch
          checked={val}
          disabled={!isSuperAdmin || record.readOnly}
          onChange={(checked) => handleFieldChange(record.id!, 'active', checked)}
        />
      ),
    },
    ...(isSuperAdmin ? [{
      title: 'Actions',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: LeaveTypeConfig) => (
        !record.readOnly ? (
          <Space size={8}>
            <Tooltip title="Edit Details">
              <Button
                type="text"
                icon={<EditOutlined style={{ color: '#d97706' }} />}
                onClick={() => handleOpenEdit(record)}
              />
            </Tooltip>
            <Tooltip title="Delete Type">
              <Popconfirm
                title="Delete Leave Type"
                description={`Delete ${record.name}?`}
                onConfirm={() => handleDelete(record.id!)}
                okText="Yes"
                cancelText="No"
              >
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Tooltip>
          </Space>
        ) : null
      ),
    }] : []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card bordered={false} style={{ borderRadius: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Leave Structure & Policy Settings</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Configure yearly leave counts, carry forward rules, accruals, and encashment policies
            </p>
          </div>

          {isSuperAdmin && (
            <Space size={12}>
              <Button icon={<ReloadOutlined />} onClick={handleResetToDefault} style={{ borderRadius: '12px' }}>
                Reset Defaults
              </Button>
              <Button icon={<PlusOutlined />} onClick={handleOpenAdd} style={{ borderRadius: '12px' }}>
                Add Leave Type
              </Button>
              <Popconfirm
                title="Save Leave Structure Settings?"
                description="This will apply updated leave quotas and policies across the organization."
                onConfirm={handleSaveAll}
                okText="Save Changes"
                cancelText="Cancel"
              >
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={saving}
                  style={{ borderRadius: '12px', background: '#0284c7', fontWeight: 'bold' }}
                >
                  Save Changes
                </Button>
              </Popconfirm>
            </Space>
          )}
        </div>
      </Card>

      {/* Leave Structure Table */}
      <Card bordered={false} style={{ borderRadius: '24px' }} bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={leaveTypes}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          style={{ borderRadius: '24px', overflow: 'hidden' }}
        />
      </Card>

      {/* Add / Edit Custom Leave Type Modal */}
      <Modal
        title={editingType ? 'Edit Leave Type Policy' : 'Create Custom Leave Type'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onModalSubmit}
          style={{ paddingRight: '10px' }}
          initialValues={{
            totalDays: 10,
            monthlyAccrual: false,
            carryForwardAllowed: false,
            maxCarryForwardDays: 0,
            encashmentAllowed: false,
            maxPerRequest: 5,
            active: true,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item name="name" label="Leave Type Name" rules={[{ required: true, message: 'Name is required' }]}>
              <Input placeholder="e.g. Sabbatical Leave" style={{ borderRadius: '8px' }} />
            </Form.Item>
            <Form.Item name="code" label="Leave Code" rules={[{ required: true, message: 'Code is required' }]}>
              <Input placeholder="e.g. SAB" style={{ borderRadius: '8px' }} />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item name="totalDays" label="Total Days Per Year" rules={[{ required: true }]}>
              <InputNumber min={0} max={365} style={{ width: '100%', borderRadius: '8px' }} />
            </Form.Item>
            <Form.Item name="maxPerRequest" label="Max Days Per Request" rules={[{ required: true }]}>
              <InputNumber min={1} max={365} style={{ width: '100%', borderRadius: '8px' }} />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item name="monthlyAccrual" label="Monthly Accrual" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="encashmentAllowed" label="Encashment Allowed" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item name="carryForwardAllowed" label="Carry Forward Allowed" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="maxCarryForwardDays" label="Max Carry Forward Days">
              <InputNumber min={0} max={365} style={{ width: '100%', borderRadius: '8px' }} />
            </Form.Item>
          </div>

          <Form.Item name="active" label="Active / Enabled" valuePropName="checked">
            <Switch />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'end', gap: '12px', marginTop: '24px' }}>
            <Button onClick={() => setIsModalOpen(false)} style={{ borderRadius: '8px' }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={modalSubmitting} disabled={modalSubmitting} style={{ borderRadius: '8px', background: '#0284c7' }}>
              Save Leave Type
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
