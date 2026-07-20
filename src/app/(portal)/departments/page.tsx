'use client';

import React, { useEffect, useState } from 'react';
import API from '@/services/api';
import { Card, Table, Button, Space, Modal, Form, Input, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
}

export default function DepartmentsPage() {
  const { roles } = useSelector((state: RootState) => state.auth);
  const isHR = roles.includes('ROLE_HR') || roles.includes('ROLE_SUPER_ADMIN');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form] = Form.useForm();

  const loadData = () => {
    setLoading(true);
    API.get('/departments')
      .then((res) => setDepartments(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingDept(null);
    form.resetFields();
    setIsOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    form.setFieldsValue({
      name: dept.name,
      code: dept.code,
      description: dept.description,
    });
    setIsOpen(true);
  };

  const onSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      if (editingDept) {
        await API.put(`/departments/${editingDept.id}`, values);
        message.success('Department updated successfully!');
      } else {
        await API.post('/departments', values);
        message.success('Department created successfully!');
      }
      setIsOpen(false);
      form.resetFields();
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error processing request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await API.delete(`/departments/${id}`);
      message.success('Department deleted successfully!');
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error deleting department');
    }
  };

  const columns = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 150 },
    { title: 'Department Name', dataIndex: 'name', key: 'name' },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    ...(isHR ? [{
      title: 'Actions',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: Department) => (
        <Space size={8}>
          <Button
            type="text"
            icon={<EditOutlined style={{ color: '#d97706' }} />}
            onClick={() => handleOpenEdit(record)}
          />
          <Popconfirm
            title="Delete Department"
            description="Are you sure you want to delete this department?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      )
    }] : [])
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card bordered={false} style={{ borderRadius: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Departments</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#8c8c8c' }}>Manage company organizational units</p>
          </div>
          {isHR && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenAdd}
              style={{ borderRadius: '12px', background: '#0284c7' }}
            >
              Add Department
            </Button>
          )}
        </div>
      </Card>

      <Card bordered={false} style={{ borderRadius: '24px' }} bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={departments}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          style={{ borderRadius: '24px', overflow: 'hidden' }}
        />
      </Card>

      <Modal
        title={editingDept ? 'Edit Department' : 'Create Department'}
        open={isOpen}
        onCancel={() => setIsOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          style={{ marginTop: '20px' }}
        >
          <Form.Item name="code" label="Code" rules={[{ required: true }]}>
            <Input placeholder="e.g. ENG" style={{ borderRadius: '8px' }} />
          </Form.Item>
          <Form.Item name="name" label="Department Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Engineering" style={{ borderRadius: '8px' }} />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Describe department function..." rows={3} style={{ borderRadius: '8px' }} />
          </Form.Item>
          
          <div style={{ display: 'flex', justifyContent: 'end', gap: '12px', marginTop: '24px' }}>
            <Button onClick={() => setIsOpen(false)} style={{ borderRadius: '8px' }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting} disabled={submitting} style={{ borderRadius: '8px', background: '#0284c7' }}>Save</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
