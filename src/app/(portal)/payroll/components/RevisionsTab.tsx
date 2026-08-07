'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, DatePicker, Select, message, Tag, Popconfirm } from 'antd';
import { PlusOutlined, CheckOutlined } from '@ant-design/icons';
import API from '@/services/api';
import {
  SalaryRevision,
  listSalaryRevisions,
  createSalaryRevision,
  approveSalaryRevision,
} from '@/services/payrollExpansionService';

export default function RevisionsTab() {
  const [revisions, setRevisions] = useState<SalaryRevision[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const loadData = () => {
    setLoading(true);
    listSalaryRevisions()
      .then((res) => setRevisions(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));

    API.get('/employees/list')
      .then((res) => setEmployees(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (values: any) => {
    try {
      setSubmitting(true);
      await createSalaryRevision({
        ...values,
        effectiveDate: values.effectiveDate ? values.effectiveDate.format('YYYY-MM-DD') : undefined,
      });
      message.success('Salary revision created — arrears computed automatically');
      setIsOpen(false);
      form.resetFields();
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error creating salary revision');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveSalaryRevision(id);
      message.success('Salary revision approved');
      loadData();
    } catch {
      message.error('Error approving salary revision');
    }
  };

  const columns = [
    { title: 'Employee ID', dataIndex: 'employeeId', key: 'employeeId' },
    { title: 'From CTC', dataIndex: 'fromCtc', key: 'fromCtc', render: (v: number) => `$${v?.toLocaleString?.() ?? v}` },
    { title: 'To CTC', dataIndex: 'toCtc', key: 'toCtc', render: (v: number) => `$${v?.toLocaleString?.() ?? v}` },
    { title: 'Effective Date', dataIndex: 'effectiveDate', key: 'effectiveDate' },
    { title: 'Reason', dataIndex: 'reason', key: 'reason' },
    {
      title: 'Arrears', dataIndex: 'arrearsAmount', key: 'arrearsAmount',
      render: (v: number) => <strong>${v?.toLocaleString?.() ?? v}</strong>,
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (val: string) => <Tag color={val === 'Approved' ? 'green' : 'orange'}>{val}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: SalaryRevision) =>
        record.status !== 'Approved' ? (
          <Popconfirm title="Approve this revision?" onConfirm={() => handleApprove(record.id)}>
            <Button type="text" icon={<CheckOutlined />} />
          </Popconfirm>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Card bordered={false} className="!rounded-3xl">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="m-0 text-lg font-bold text-slate-800">Revisions & Arrears</h3>
            <p className="mt-1 m-0 text-xs text-slate-400">Track salary revisions and automatically computed arrears</p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsOpen(true)} className="!rounded-xl !bg-[#0284c7]">
            New Revision
          </Button>
        </div>
      </Card>

      <Card bordered={false} className="!rounded-3xl" bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={revisions}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 5 }}
          className="!rounded-3xl !overflow-hidden"
        />
      </Card>

      <Modal
        title="Create Salary Revision"
        open={isOpen}
        onCancel={() => setIsOpen(false)}
        footer={null}
        destroyOnClose
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} className="pr-2.5">
          <Form.Item name="employeeId" label="Employee" rules={[{ required: true }]}>
            <Select
              placeholder="Choose Employee"
              className="!rounded-lg"
              options={employees.map((emp) => ({ value: emp.employeeId, label: `${emp.firstName} ${emp.lastName} (${emp.employeeId})` }))}
            />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="fromCtc" label="From CTC" rules={[{ required: true }]}>
              <InputNumber className="!rounded-lg w-full" min={0} />
            </Form.Item>
            <Form.Item name="toCtc" label="To CTC" rules={[{ required: true }]}>
              <InputNumber className="!rounded-lg w-full" min={0} />
            </Form.Item>
          </div>
          <Form.Item name="effectiveDate" label="Effective Date" rules={[{ required: true }]}>
            <DatePicker className="!rounded-lg w-full" />
          </Form.Item>
          <Form.Item name="reason" label="Reason">
            <Input.TextArea className="!rounded-lg" rows={2} placeholder="e.g. Annual appraisal" />
          </Form.Item>
          <div className="flex justify-end gap-3 mt-6">
            <Button onClick={() => setIsOpen(false)} className="!rounded-lg">Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting} disabled={submitting} className="!rounded-lg !bg-[#0284c7]">
              Create
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
