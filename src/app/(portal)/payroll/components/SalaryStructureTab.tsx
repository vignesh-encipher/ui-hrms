'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Switch, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  SalaryComponent,
  listSalaryComponents,
  createSalaryComponent,
  updateSalaryComponent,
  deleteSalaryComponent,
} from '@/services/payrollExpansionService';

const { Option } = Select;

export default function SalaryStructureTab() {
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<SalaryComponent | null>(null);
  const [form] = Form.useForm();

  const loadData = () => {
    setLoading(true);
    listSalaryComponents()
      .then((res) => setComponents(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setIsOpen(true);
  };

  const openEdit = (record: SalaryComponent) => {
    setEditing(record);
    form.setFieldsValue(record);
    setIsOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      if (editing) {
        await updateSalaryComponent(editing.id, values);
        message.success('Salary component updated');
      } else {
        await createSalaryComponent(values);
        message.success('Salary component created');
      }
      setIsOpen(false);
      form.resetFields();
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error saving salary component');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSalaryComponent(id);
      message.success('Salary component deleted');
      loadData();
    } catch {
      message.error('Error deleting salary component');
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Type', dataIndex: 'type', key: 'type',
      render: (val: string) => <Tag color={val === 'Earning' ? 'green' : 'red'}>{val}</Tag>,
    },
    { title: 'Calculation', dataIndex: 'calculationDescription', key: 'calculationDescription' },
    { title: 'Applies To', dataIndex: 'appliesTo', key: 'appliesTo' },
    {
      title: 'Statutory', dataIndex: 'isStatutory', key: 'isStatutory',
      render: (val: boolean) => (val ? <Tag color="blue">Yes</Tag> : <Tag>No</Tag>),
    },
    {
      title: 'Part of CTC', dataIndex: 'isPartOfCtc', key: 'isPartOfCtc',
      render: (val: boolean) => (val ? <Tag color="blue">Yes</Tag> : <Tag>No</Tag>),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: SalaryComponent) => (
        <div className="flex justify-end gap-2">
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Delete this component?" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Card bordered={false} className="!rounded-3xl">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="m-0 text-lg font-bold text-slate-800">Salary Structure</h3>
            <p className="mt-1 m-0 text-xs text-slate-400">Configure salary components used across payroll</p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} className="!rounded-xl !bg-[#0284c7]">
            Add Component
          </Button>
        </div>
      </Card>

      <Card bordered={false} className="!rounded-3xl" bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={components}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 5 }}
          className="!rounded-3xl !overflow-hidden"
        />
      </Card>

      <Modal
        title={editing ? 'Edit Salary Component' : 'Add Salary Component'}
        open={isOpen}
        onCancel={() => setIsOpen(false)}
        footer={null}
        destroyOnClose
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="pr-2.5"
          initialValues={{ type: 'Earning', isStatutory: false, isPartOfCtc: true }}
        >
          <Form.Item name="name" label="Component Name" rules={[{ required: true }]}>
            <Input className="!rounded-lg" placeholder="e.g. HRA" />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select className="!rounded-lg">
              <Option value="Earning">Earning</Option>
              <Option value="Deduction">Deduction</Option>
            </Select>
          </Form.Item>
          <Form.Item name="calculationDescription" label="Calculation">
            <Input.TextArea className="!rounded-lg" placeholder="e.g. 12% of Basic capped at 15000" rows={2} />
          </Form.Item>
          <Form.Item name="appliesTo" label="Applies To">
            <Input className="!rounded-lg" placeholder="e.g. All Employees" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="isStatutory" label="Statutory" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="isPartOfCtc" label="Part of CTC" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button onClick={() => setIsOpen(false)} className="!rounded-lg">Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting} disabled={submitting} className="!rounded-lg !bg-[#0284c7]">
              Save
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
