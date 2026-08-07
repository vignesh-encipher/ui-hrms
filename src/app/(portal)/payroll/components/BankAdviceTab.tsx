'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Tag, Space } from 'antd';
import { PlusOutlined, RightOutlined, DownloadOutlined } from '@ant-design/icons';
import {
  PayrollRun,
  BankAdviceRow,
  listPayrollRuns,
  createPayrollRun,
  advancePayrollRunStage,
  getBankAdvice,
} from '@/services/payrollExpansionService';

const STAGE_LABELS = ['Input lock', 'Computed', 'Finance review', 'HR approved', 'Bank advice', 'Paid'];

export default function BankAdviceTab() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [adviceRows, setAdviceRows] = useState<BankAdviceRow[]>([]);
  const [adviceLoading, setAdviceLoading] = useState(false);

  const loadRuns = () => {
    setLoading(true);
    listPayrollRuns()
      .then((res) => setRuns(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRuns();
  }, []);

  const handleCreate = async (values: any) => {
    try {
      setSubmitting(true);
      await createPayrollRun(values);
      message.success('Payroll run created');
      setIsOpen(false);
      form.resetFields();
      loadRuns();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error creating payroll run');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdvance = async (id: string) => {
    try {
      await advancePayrollRunStage(id);
      message.success('Stage advanced');
      loadRuns();
    } catch {
      message.error('Error advancing stage');
    }
  };

  const fetchBankAdvice = async (period: string) => {
    setSelectedPeriod(period);
    setAdviceLoading(true);
    try {
      const res = await getBankAdvice(period);
      setAdviceRows(res.data);
    } catch {
      message.error('Error fetching bank advice');
      setAdviceRows([]);
    } finally {
      setAdviceLoading(false);
    }
  };

  const exportCsv = () => {
    if (!adviceRows.length) {
      message.warning('No bank advice rows to export');
      return;
    }
    const header = ['Employee Name', 'Bank Account', 'Net Pay', 'Reference'];
    const rows = adviceRows.map((r) => [r.employeeName, r.bankAccount, r.netPay, r.reference]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `bank-advice-${selectedPeriod}.csv`;
    link.click();
  };

  const runColumns = [
    { title: 'Period', dataIndex: 'period', key: 'period' },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (val: string) => <Tag color={val === 'Paid' ? 'green' : val === 'Approved' ? 'blue' : 'orange'}>{val}</Tag>,
    },
    {
      title: 'Stage',
      key: 'stage',
      render: (_: any, r: PayrollRun) => (
        <span className="text-xs">{STAGE_LABELS[r.stage] || r.stage} ({r.stage}/{STAGE_LABELS.length - 1})</span>
      ),
    },
    { title: 'Processed Date', dataIndex: 'processedDate', key: 'processedDate' },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: PayrollRun) => (
        <Space>
          {record.stage < STAGE_LABELS.length - 1 && (
            <Button type="text" icon={<RightOutlined />} onClick={() => handleAdvance(record.id)}>
              Advance
            </Button>
          )}
          <Button type="text" icon={<DownloadOutlined />} onClick={() => fetchBankAdvice(record.period)}>
            Bank Advice
          </Button>
        </Space>
      ),
    },
  ];

  const adviceColumns = [
    { title: 'Employee Name', dataIndex: 'employeeName', key: 'employeeName' },
    { title: 'Bank Account', dataIndex: 'bankAccount', key: 'bankAccount' },
    { title: 'Net Pay', dataIndex: 'netPay', key: 'netPay', render: (v: number) => `$${v?.toLocaleString?.() ?? v}` },
    { title: 'Reference', dataIndex: 'reference', key: 'reference' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Card bordered={false} className="!rounded-3xl">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="m-0 text-lg font-bold text-slate-800">Payroll Cycle & Bank Advice</h3>
            <p className="mt-1 m-0 text-xs text-slate-400">Manage the monthly payroll cycle and export bank advice</p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsOpen(true)} className="!rounded-xl !bg-[#0284c7]">
            New Run
          </Button>
        </div>
      </Card>

      <Card bordered={false} className="!rounded-3xl" bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={runs}
          columns={runColumns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 5 }}
          className="!rounded-3xl !overflow-hidden"
        />
      </Card>

      {selectedPeriod && (
        <Card bordered={false} className="!rounded-3xl" bodyStyle={{ padding: 0 }}>
          <div className="flex justify-between items-center p-4">
            <h4 className="m-0 text-sm font-bold text-slate-700">Bank Advice — {selectedPeriod}</h4>
            <Button icon={<DownloadOutlined />} onClick={exportCsv} className="!rounded-lg">
              Export CSV
            </Button>
          </div>
          <Table
            dataSource={adviceRows}
            columns={adviceColumns}
            rowKey="reference"
            loading={adviceLoading}
            pagination={{ pageSize: 5 }}
            className="!rounded-3xl !overflow-hidden"
          />
        </Card>
      )}

      <Modal
        title="Create Payroll Run"
        open={isOpen}
        onCancel={() => setIsOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} className="pr-2.5">
          <Form.Item name="period" label="Period" rules={[{ required: true }]}>
            <Input className="!rounded-lg" placeholder="e.g. 2026-08" />
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
