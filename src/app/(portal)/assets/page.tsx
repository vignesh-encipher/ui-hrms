'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Tag,
  Row,
  Col,
  message,
} from 'antd';
import { PlusOutlined, UserAddOutlined, RollbackOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import {
  Asset,
  ASSET_KINDS,
  ASSET_STATUSES,
  getAssets,
  createAsset,
  assignAsset,
  returnAsset,
  markRecoveryDue,
} from '@/services/assetService';

const statusColor = (status: string) => {
  switch (status) {
    case 'In stock':
      return 'blue';
    case 'Assigned':
      return 'green';
    case 'Recovery due':
      return 'orange';
    case 'Retired':
      return 'default';
    default:
      return 'default';
  }
};

export default function AssetsPage() {
  const { roles } = useSelector((state: RootState) => state.auth);
  const isAdmin = roles?.some((r) => ['ROLE_SUPER_ADMIN', 'ROLE_HR', 'ROLE_IT_ADMIN'].includes(r));

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [kindFilter, setKindFilter] = useState<string | undefined>();
  const [holderFilter, setHolderFilter] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [creating, setCreating] = useState(false);

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignForm] = Form.useForm();
  const [assigning, setAssigning] = useState(false);

  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [returnForm] = Form.useForm();
  const [returning, setReturning] = useState(false);

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const data = await getAssets({
        status: statusFilter,
        kind: kindFilter,
        employeeId: holderFilter || undefined,
      });
      setAssets(data);
    } catch {
      // handled globally
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, kindFilter, holderFilter]);

  const filteredAssets = useMemo(() => {
    if (!searchText.trim()) return assets;
    const t = searchText.toLowerCase();
    return assets.filter(
      (a) =>
        a.assetTag?.toLowerCase().includes(t) ||
        a.model?.toLowerCase().includes(t) ||
        a.kind?.toLowerCase().includes(t)
    );
  }, [assets, searchText]);

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setCreating(true);
      await createAsset({
        assetTag: values.assetTag,
        kind: values.kind,
        model: values.model,
        amcVendor: values.amcVendor,
        warrantyTill: values.warrantyTill ? dayjs(values.warrantyTill).format('YYYY-MM-DD') : undefined,
        status: 'In stock',
      });
      message.success('Asset created');
      setIsCreateOpen(false);
      createForm.resetFields();
      loadAssets();
    } catch (err: any) {
      if (err?.errorFields) return;
    } finally {
      setCreating(false);
    }
  };

  const openAssignModal = (asset: Asset) => {
    setSelectedAsset(asset);
    assignForm.resetFields();
    setIsAssignOpen(true);
  };

  const handleAssign = async () => {
    if (!selectedAsset) return;
    try {
      const values = await assignForm.validateFields();
      setAssigning(true);
      await assignAsset(selectedAsset.id, values.employeeId, values.conditionNotes);
      message.success('Asset assigned');
      setIsAssignOpen(false);
      setSelectedAsset(null);
      loadAssets();
    } catch (err: any) {
      if (err?.errorFields) return;
    } finally {
      setAssigning(false);
    }
  };

  const openReturnModal = (asset: Asset) => {
    setSelectedAsset(asset);
    returnForm.resetFields();
    setIsReturnOpen(true);
  };

  const handleReturn = async () => {
    if (!selectedAsset) return;
    try {
      const values = await returnForm.validateFields();
      setReturning(true);
      await returnAsset(selectedAsset.id, values.conditionNotes);
      message.success('Asset returned');
      setIsReturnOpen(false);
      setSelectedAsset(null);
      loadAssets();
    } catch (err: any) {
      if (err?.errorFields) return;
    } finally {
      setReturning(false);
    }
  };

  const handleMarkRecoveryDue = async (asset: Asset) => {
    try {
      await markRecoveryDue(asset.id);
      message.success('Marked recovery due');
      loadAssets();
    } catch {
      // handled globally
    }
  };

  const columns = [
    { title: 'Asset Tag', dataIndex: 'assetTag', key: 'assetTag' },
    { title: 'Kind', dataIndex: 'kind', key: 'kind' },
    { title: 'Model', dataIndex: 'model', key: 'model' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={statusColor(status)}>{status}</Tag>,
    },
    {
      title: 'Assigned To',
      dataIndex: 'assignedToEmployeeId',
      key: 'assignedToEmployeeId',
      render: (val?: string) => val || '-',
    },
    {
      title: 'Assigned Since',
      dataIndex: 'assignedSince',
      key: 'assignedSince',
      render: (val?: string) => (val ? dayjs(val).format('DD MMM YYYY') : '-'),
    },
    {
      title: 'Warranty Till',
      dataIndex: 'warrantyTill',
      key: 'warrantyTill',
      render: (val?: string) => (val ? dayjs(val).format('DD MMM YYYY') : '-'),
    },
    { title: 'AMC Vendor', dataIndex: 'amcVendor', key: 'amcVendor', render: (v?: string) => v || '-' },
    ...(isAdmin
      ? [
          {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: Asset) => (
              <Space>
                {record.status !== 'Assigned' && record.status !== 'Retired' && (
                  <Button size="small" icon={<UserAddOutlined />} onClick={() => openAssignModal(record)}>
                    Assign
                  </Button>
                )}
                {(record.status === 'Assigned' || record.status === 'Recovery due') && (
                  <Button size="small" icon={<RollbackOutlined />} onClick={() => openReturnModal(record)}>
                    Return
                  </Button>
                )}
                {record.status === 'Assigned' && (
                  <Button
                    size="small"
                    danger
                    icon={<ExclamationCircleOutlined />}
                    onClick={() => handleMarkRecoveryDue(record)}
                  >
                    Recovery Due
                  </Button>
                )}
              </Space>
            ),
          },
        ]
      : []),
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="Asset Management"
        extra={
          isAdmin && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateOpen(true)}>
              Add Asset
            </Button>
          )
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder="Search by tag, model, kind"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8} md={5}>
            <Select
              placeholder="Filter by status"
              style={{ width: '100%' }}
              allowClear
              options={ASSET_STATUSES.map((s) => ({ label: s, value: s }))}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </Col>
          <Col xs={24} sm={8} md={5}>
            <Select
              placeholder="Filter by type"
              style={{ width: '100%' }}
              allowClear
              options={ASSET_KINDS.map((k) => ({ label: k, value: k }))}
              value={kindFilter}
              onChange={setKindFilter}
            />
          </Col>
          <Col xs={24} sm={8} md={5}>
            <Input
              placeholder="Filter by holder (employee id)"
              value={holderFilter}
              onChange={(e) => setHolderFilter(e.target.value)}
              allowClear
            />
          </Col>
        </Row>

        <Table
          rowKey="id"
          columns={columns as any}
          dataSource={filteredAssets}
          loading={loading}
          expandable={{
            expandedRowRender: (record: Asset) => (
              <Table
                rowKey={(r, idx) => `${record.id}-hist-${idx}`}
                pagination={false}
                columns={[
                  { title: 'Employee ID', dataIndex: 'employeeId', key: 'employeeId' },
                  {
                    title: 'Assigned On',
                    dataIndex: 'assignedOn',
                    key: 'assignedOn',
                    render: (v?: string) => (v ? dayjs(v).format('DD MMM YYYY') : '-'),
                  },
                  {
                    title: 'Returned On',
                    dataIndex: 'returnedOn',
                    key: 'returnedOn',
                    render: (v?: string) => (v ? dayjs(v).format('DD MMM YYYY') : '-'),
                  },
                  { title: 'Condition Notes', dataIndex: 'conditionNotes', key: 'conditionNotes', render: (v?: string) => v || '-' },
                ]}
                dataSource={record.history || []}
              />
            ),
          }}
        />
      </Card>

      <Modal
        title="Add Asset"
        open={isCreateOpen}
        onOk={handleCreate}
        onCancel={() => setIsCreateOpen(false)}
        confirmLoading={creating}
        okText="Create"
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="assetTag" label="Asset Tag" rules={[{ required: true, message: 'Asset tag is required' }]}>
            <Input placeholder="e.g. AST-0001" />
          </Form.Item>
          <Form.Item name="kind" label="Kind" rules={[{ required: true, message: 'Kind is required' }]}>
            <Select options={ASSET_KINDS.map((k) => ({ label: k, value: k }))} />
          </Form.Item>
          <Form.Item name="model" label="Model" rules={[{ required: true, message: 'Model is required' }]}>
            <Input placeholder="e.g. Dell Latitude 5420" />
          </Form.Item>
          <Form.Item name="amcVendor" label="AMC Vendor">
            <Input placeholder="Optional" />
          </Form.Item>
          <Form.Item name="warrantyTill" label="Warranty Till">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Assign Asset ${selectedAsset?.assetTag || ''}`}
        open={isAssignOpen}
        onOk={handleAssign}
        onCancel={() => setIsAssignOpen(false)}
        confirmLoading={assigning}
        okText="Assign"
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item name="employeeId" label="Employee ID" rules={[{ required: true, message: 'Employee ID is required' }]}>
            <Input placeholder="e.g. EMP-001" />
          </Form.Item>
          <Form.Item name="conditionNotes" label="Condition Notes">
            <Input.TextArea rows={3} placeholder="Optional notes about condition at handover" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Return Asset ${selectedAsset?.assetTag || ''}`}
        open={isReturnOpen}
        onOk={handleReturn}
        onCancel={() => setIsReturnOpen(false)}
        confirmLoading={returning}
        okText="Return"
      >
        <Form form={returnForm} layout="vertical">
          <Form.Item name="conditionNotes" label="Condition Notes">
            <Input.TextArea rows={3} placeholder="Optional notes about condition at return" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
