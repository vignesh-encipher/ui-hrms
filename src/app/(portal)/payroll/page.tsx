'use client';

import React, { useEffect, useState } from 'react';
import API from '@/services/api';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Card, Table, Button, Space, Modal, Form, Input, Select, message, Tabs } from 'antd';
import { PlusOutlined, DownloadOutlined } from '@ant-design/icons';
import SalaryStructureTab from './components/SalaryStructureTab';
import RevisionsTab from './components/RevisionsTab';
import LoansTab from './components/LoansTab';
import BankAdviceTab from './components/BankAdviceTab';

const { Option } = Select;

interface Payroll {
  id: string;
  employeeId: string;
  month: string;
  year: number;
  basic: number;
  hra: number;
  allowance: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  status: string;
}

export default function PayrollPage() {
  const { employeeId, roles } = useSelector((state: RootState) => state.auth);
  const isHR = roles.includes('ROLE_HR') || roles.includes('ROLE_SUPER_ADMIN');

  const [history, setHistory] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form] = Form.useForm();

  const loadData = () => {
    setLoading(true);
    if (isHR) {
      API.get('/payroll')
        .then((res) => setHistory(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
      
      API.get('/employees/list')
        .then((res) => setEmployees(res.data))
        .catch(() => {});
    } else if (employeeId) {
      API.get(`/payroll/history/${employeeId}`)
        .then((res) => setHistory(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    loadData();
  }, [employeeId, isHR]);

  const handleGenerate = async (values: any) => {
    try {
      setSubmitting(true);
      await API.post('/payroll/generate', values);
      message.success('Salary generated successfully!');
      setIsOpen(false);
      form.resetFields();
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error generating salary');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      message.loading({ content: 'Generating PDF payslip...', key: 'payslip' });
      const response = await API.get(`/payroll/payslip/${id}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `payslip-${id}.pdf`;
      link.click();
      message.success({ content: 'Payslip downloaded successfully!', key: 'payslip' });
    } catch (err) {
      message.error({ content: 'Error downloading payslip', key: 'payslip' });
    }
  };

  const columns = [
    { title: 'Period', key: 'period', render: (_: any, record: Payroll) => `${record.month} ${record.year}` },
    ...(isHR ? [{ title: 'Employee ID', dataIndex: 'employeeId', key: 'employeeId' }] : []),
    { title: 'Basic Salary', dataIndex: 'basic', key: 'basic', render: (val: number) => `$${val.toLocaleString()}` },
    { title: 'Deductions', dataIndex: 'deductions', key: 'deductions', render: (val: number) => `$${val.toLocaleString()}` },
    { title: 'Net Salary', dataIndex: 'netSalary', key: 'netSalary', render: (val: number) => <strong>${val.toLocaleString()}</strong> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (val: string) => (
      <span className="!px-2 !py-0.5 !rounded-xl !text-[11px] !font-bold !bg-emerald-100 !text-emerald-800">{val}</span>
    )},
    {
      title: 'Payslip',
      key: 'download',
      align: 'right' as const,
      render: (_: any, record: Payroll) => (
        <Button
          type="text"
          icon={<DownloadOutlined />}
          onClick={() => handleDownload(record.id)}
        />
      )
    }
  ];

  const payslipsTabContent = (
    <div className="flex flex-col gap-5">
      <Card bordered={false} className="!rounded-3xl">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="m-0 text-lg font-bold text-slate-800">Payroll & Payslips</h3>
            <p className="mt-1 m-0 text-xs text-slate-400">View salary breakdowns and download payslips</p>
          </div>
          {isHR && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsOpen(true)}
              className="!rounded-xl !bg-[#0284c7]"
            >
              Run Payroll
            </Button>
          )}
        </div>
      </Card>

      <Card bordered={false} className="!rounded-3xl" bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={history}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 5 }}
          className="!rounded-3xl !overflow-hidden"
        />
      </Card>

      {/* Run Payroll Modal */}
      <Modal
        title="Generate Payroll Record"
        open={isOpen}
        onCancel={() => setIsOpen(false)}
        footer={null}
        destroyOnClose
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleGenerate}
          className="pr-2.5"
          initialValues={{ month: 'January', year: 2026, basic: 0, hra: 0, allowance: 0, bonus: 0, deductions: 0 }}
        >
          <Form.Item name="employeeId" label="Employee" rules={[{ required: true }]}>
            <Select
              placeholder="Choose Employee"
              className="!rounded-lg"
              options={employees.map((emp) => ({ value: emp.employeeId, label: `${emp.firstName} ${emp.lastName} (${emp.employeeId})` }))}
            />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="month" label="Month">
              <Select
                className="!rounded-lg"
                options={['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => ({ value: m, label: m }))}
              />
            </Form.Item>
            <Form.Item name="year" label="Year">
              <Select
                className="!rounded-lg"
                options={[
                  { value: 2026, label: '2026' },
                  { value: 2025, label: '2025' }
                ]}
              />
            </Form.Item>
            <Form.Item name="basic" label="Basic Salary">
              <Input type="number" className="!rounded-lg" />
            </Form.Item>
            <Form.Item name="hra" label="HRA">
              <Input type="number" className="!rounded-lg" />
            </Form.Item>
            <Form.Item name="allowance" label="Allowance">
              <Input type="number" className="!rounded-lg" />
            </Form.Item>
            <Form.Item name="bonus" label="Bonus">
              <Input type="number" className="!rounded-lg" />
            </Form.Item>
          </div>
          <Form.Item name="deductions" label="Deductions">
            <Input type="number" className="!rounded-lg" />
          </Form.Item>

          <div className="flex justify-end gap-3 mt-6">
            <Button onClick={() => setIsOpen(false)} className="!rounded-lg">Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting} disabled={submitting} className="!rounded-lg !bg-[#0284c7]">Generate</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );

  return (
    <Tabs
      defaultActiveKey="payslips"
      items={[
        { key: 'payslips', label: 'Payroll & Payslips', children: payslipsTabContent },
        { key: 'structure', label: 'Salary Structure', children: <SalaryStructureTab /> },
        { key: 'revisions', label: 'Revisions & Arrears', children: <RevisionsTab /> },
        { key: 'loans', label: 'Loans & Advances', children: <LoansTab /> },
        { key: 'bankAdvice', label: 'Bank Advice', children: <BankAdviceTab /> },
      ]}
    />
  );
}
