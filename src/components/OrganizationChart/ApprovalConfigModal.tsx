'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, Button, message } from 'antd';
import { OrgTreeNode, updateApprovalConfig } from '@/services/organizationService';

interface ApprovalConfigModalProps {
  open: boolean;
  node: OrgTreeNode | null;
  allEmployees: OrgTreeNode[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ApprovalConfigModal({ open, node, allEmployees, onClose, onSuccess }: ApprovalConfigModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (node) {
      form.setFieldsValue({
        managerId: node.managerId || undefined,
        hrApproverId: node.hrApproverId || 'EMP-002',
      });
    }
  }, [node, form]);

  if (!node) return null;

  const handleSubmit = async (values: any) => {
    if (values.managerId === node.employeeId) {
      message.error('An employee cannot be assigned as their own reporting manager.');
      return;
    }

    try {
      setSubmitting(true);
      await updateApprovalConfig(node.employeeId, values.managerId, values.hrApproverId);
      message.success(`Approval configuration updated for ${node.name}!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update approval config');
    } finally {
      setSubmitting(false);
    }
  };

  const eligibleManagers = allEmployees.filter((e) => e.employeeId !== node.employeeId);
  const hrEmployees = allEmployees.filter((e) => e.department === 'Human Resources' || e.employeeId === 'EMP-002');

  return (
    <Modal
      title={`Configure Approval Workflow: ${node.name}`}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      styles={{ body: { padding: '20px' } }}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="managerId"
          label="Stage 1: Reporting Manager Approval"
          rules={[{ required: true, message: 'Reporting manager is required' }]}
        >
          <Select
            placeholder="Select Reporting Manager"
            style={{ width: '100%', borderRadius: '8px' }}
            showSearch
            optionFilterProp="children"
          >
            {eligibleManagers.map((m) => (
              <Select.Option key={m.employeeId} value={m.employeeId}>
                {m.name} ({m.designation})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="hrApproverId"
          label="Stage 2: HR Team Approval"
          rules={[{ required: true, message: 'HR approver is required' }]}
        >
          <Select
            placeholder="Select HR Approver"
            style={{ width: '100%', borderRadius: '8px' }}
            showSearch
            optionFilterProp="children"
          >
            {hrEmployees.map((h) => (
              <Select.Option key={h.employeeId} value={h.employeeId}>
                {h.name} ({h.designation})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <div style={{ display: 'flex', justifyContent: 'end', gap: '12px', marginTop: '24px' }}>
          <Button onClick={onClose} style={{ borderRadius: '8px' }}>
            Cancel
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            disabled={submitting}
            style={{ borderRadius: '8px', background: '#0284c7' }}
          >
            Save Approval Config
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
