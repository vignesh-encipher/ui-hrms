'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, message, Tag, Popconfirm } from 'antd';
import { PlusOutlined, CheckOutlined, PlusCircleOutlined } from '@ant-design/icons';
import API from '@/services/api';
import {
  LoanAdvance,
  listLoanAdvances,
  createLoanAdvance,
  approveLoanAdvance,
  recordLoanInstalment,
} from '@/services/payrollExpansionService';

const { Option } = Select;

export default function LoansTab() {
  const [loans, setLoans] = useState<LoanAdvance[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const loadData = () => {
    setLoading(true);
    listLoanAdvances()
      .then((res) => setLoans(res.data))
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
      await createLoanAdvance(values);
      message.success('Loan/advance request created');
      setIsOpen(false);
      form.resetFields();
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error creating loan/advance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveLoanAdvance(id);
      message.success('Loan/advance approved — recovery started');
      loadData();
    } catch {
      message.error('Error approving loan/advance');
    }
  };

  const handleRecordInstalment = async (id: string) => {
    try {
      await recordLoanInstalment(id);
      message.success('Instalment recorded');
      loadData();
    } catch {
      message.error('Error recording instalment');
    }
  };

  const statusColor: Record<string, string> = {
    'Pending approval': 'orange',
    Recovering: 'blue',
    Closed: 'green',
  };

  const columns = [
    { title: 'Employee ID', dataIndex: 'employeeId', key: 'employeeId' },
    { title: 'Kind', dataIndex: 'kind', key: 'kind' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (v: number) => `$${v?.toLocaleString?.() ?? v}` },
    { title: 'EMI', dataIndex: 'emi', key: 'emi', render: (v: number) => `$${v?.toLocaleString?.() ?? v}` },
    { title: 'Instalments', key: 'instalments', render: (_: any, r: LoanAdvance) => `${r.instalmentsPaid}/${r.totalInstalments}` },
    { title: 'Outstanding', dataIndex: 'outstanding', key: 'outstanding', render: (v: number) => <strong>${v?.toLocaleString?.() ?? v}</strong> },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (val: string) => <Tag color={statusColor[val] || 'default'}>{val}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: LoanAdvance) => (
        <div className="flex justify-end gap-2">
          {record.status === 'Pending approval' && (
            <Popconfirm title="Approve this loan/advance?" onConfirm={() => handleApprove(record.id)}>
              <Button type="text" icon={<CheckOutlined />} />
            </Popconfirm>
          )}
          {record.status === 'Recovering' && (
            <Popconfirm title="Record one instalment paid?" onConfirm={() => handleRecordInstalment(record.id)}>
              <Button type="text" icon={<PlusCircleOutlined />} />
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Card bordered={false} className="!rounded-3xl">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="m-0 text-lg font-bold text-slate-800">Loans & Advances</h3>
            <p className="mt-1 m-0 text-xs text-slate-400">Manage employee loans, salary advances and recovery</p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsOpen(true)} className="!rounded-xl !bg-[#0284c7]">
            New Request
          </Button>
        </div>
      </Card>

      <Card bordered={false} className="!rounded-3xl" bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={loans}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 5 }}
          className="!rounded-3xl !overflow-hidden"
        />
      </Card>

      <Modal
        title="New Loan / Advance Request"
        open={isOpen}
        onCancel={() => setIsOpen(false)}
        footer={null}
        destroyOnClose
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} className="pr-2.5" initialValues={{ kind: 'Salary advance' }}>
          <Form.Item name="employeeId" label="Employee" rules={[{ required: true }]}>
            <Select
              placeholder="Choose Employee"
              className="!rounded-lg"
              options={employees.map((emp) => ({ value: emp.employeeId, label: `${emp.firstName} ${emp.lastName} (${emp.employeeId})` }))}
            />
          </Form.Item>
          <Form.Item name="kind" label="Kind" rules={[{ required: true }]}>
            <Select className="!rounded-lg">
              <Option value="Salary advance">Salary advance</Option>
              <Option value="Personal loan">Personal loan</Option>
            </Select>
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
              <InputNumber className="!rounded-lg w-full" min={0} />
            </Form.Item>
            <Form.Item name="emi" label="EMI" rules={[{ required: true }]}>
              <InputNumber className="!rounded-lg w-full" min={0} />
            </Form.Item>
          </div>
          <Form.Item name="totalInstalments" label="Total Instalments" rules={[{ required: true }]}>
            <InputNumber className="!rounded-lg w-full" min={1} />
          </Form.Item>
          <div className="flex justify-end gap-3 mt-6">
            <Button onClick={() => setIsOpen(false)} className="!rounded-lg">Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting} disabled={submitting} className="!rounded-lg !bg-[#0284c7]">
              Submit
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
