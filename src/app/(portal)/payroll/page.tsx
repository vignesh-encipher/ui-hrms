'use client';

import React, { useEffect, useState } from 'react';
import API from '@/services/api';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Card, Table, Button, Space, Modal, Form, Input, Select, message } from 'antd';
import { PlusOutlined, DownloadOutlined } from '@ant-design/icons';

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
      await API.post('/payroll/generate', values);
      message.success('Salary generated successfully!');
      setIsOpen(false);
      form.resetFields();
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error generating salary');
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
      <span style={{
        padding: '3px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 'bold',
        background: '#d1fae5',
        color: '#065f46',
      }}>{val}</span>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card bordered={false} style={{ borderRadius: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Payroll & Payslips</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#8c8c8c' }}>View salary breakdowns and download payslips</p>
          </div>
          {isHR && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsOpen(true)}
              style={{ borderRadius: '12px', background: '#0284c7' }}
            >
              Run Payroll
            </Button>
          )}
        </div>
      </Card>

      <Card bordered={false} style={{ borderRadius: '24px' }} bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={history}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 5 }}
          style={{ borderRadius: '24px', overflow: 'hidden' }}
        />
      </Card>

      {/* Run Payroll Modal */}
      <Modal
        title="Generate Payroll Record"
        open={isOpen}
        onCancel={() => setIsOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleGenerate}
          style={{ marginTop: '20px' }}
          initialValues={{ month: 'January', year: 2026, basic: 0, hra: 0, allowance: 0, bonus: 0, deductions: 0 }}
        >
          <Form.Item name="employeeId" label="Employee" rules={[{ required: true }]}>
            <Select
              placeholder="Choose Employee"
              style={{ borderRadius: '8px' }}
              options={employees.map((emp) => ({ value: emp.employeeId, label: `${emp.firstName} ${emp.lastName} (${emp.employeeId})` }))}
            />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item name="month" label="Month">
              <Select
                style={{ borderRadius: '8px' }}
                options={['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => ({ value: m, label: m }))}
              />
            </Form.Item>
            <Form.Item name="year" label="Year">
              <Select
                style={{ borderRadius: '8px' }}
                options={[
                  { value: 2026, label: '2026' },
                  { value: 2025, label: '2025' }
                ]}
              />
            </Form.Item>
            <Form.Item name="basic" label="Basic Salary">
              <Input type="number" style={{ borderRadius: '8px' }} />
            </Form.Item>
            <Form.Item name="hra" label="HRA">
              <Input type="number" style={{ borderRadius: '8px' }} />
            </Form.Item>
            <Form.Item name="allowance" label="Allowance">
              <Input type="number" style={{ borderRadius: '8px' }} />
            </Form.Item>
            <Form.Item name="bonus" label="Bonus">
              <Input type="number" style={{ borderRadius: '8px' }} />
            </Form.Item>
          </div>
          <Form.Item name="deductions" label="Deductions">
            <Input type="number" style={{ borderRadius: '8px' }} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'end', gap: '12px', marginTop: '24px' }}>
            <Button onClick={() => setIsOpen(false)} style={{ borderRadius: '8px' }}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ borderRadius: '8px', background: '#0284c7' }}>Generate</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
