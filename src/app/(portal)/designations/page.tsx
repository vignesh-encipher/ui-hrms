'use client';

import React, { useEffect, useState } from 'react';
import API from '@/services/api';
import { Card, Table, Button, Space, Modal, Form, Input, Select, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

const { Option } = Select;

interface Designation {
  id: string;
  title: string;
  departmentId: string;
  description: string;
}

export default function DesignationsPage() {
  const { roles } = useSelector((state: RootState) => state.auth);
  const isHR = roles.includes('ROLE_HR') || roles.includes('ROLE_SUPER_ADMIN');

  const [designations, setDesignations] = useState<Designation[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingDesg, setEditingDesg] = useState<Designation | null>(null);

  const [form] = Form.useForm();

  const loadData = () => {
    setLoading(true);
    API.get('/designations')
      .then((res) => setDesignations(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    API.get('/departments')
      .then((res) => setDepartments(res.data))
      .catch(() => {});
  }, []);

  const handleOpenAdd = () => {
    setEditingDesg(null);
    form.resetFields();
    setIsOpen(true);
  };

  const handleOpenEdit = (desg: Designation) => {
    setEditingDesg(desg);
    form.setFieldsValue({
      title: desg.title,
      departmentId: desg.departmentId,
      description: desg.description,
    });
    setIsOpen(true);
  };

  const onSubmit = async (values: any) => {
    try {
      if (editingDesg) {
        await API.put(`/designations/${editingDesg.id}`, values);
        message.success('Designation updated successfully!');
      } else {
        await API.post('/designations', values);
        message.success('Designation created successfully!');
      }
      setIsOpen(false);
      form.resetFields();
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error processing request');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await API.delete(`/designations/${id}`);
      message.success('Designation deleted successfully!');
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error deleting designation');
    }
  };

  const getDeptName = (id: string) => {
    const dept = departments.find((d) => d.id === id);
    return dept ? dept.name : '-';
  };

  const columns = [
    { title: 'Job Title', dataIndex: 'title', key: 'title', width: 220 },
    { title: 'Department', dataIndex: 'departmentId', key: 'departmentId', render: (deptId: string) => getDeptName(deptId) },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    ...(isHR ? [{
      title: 'Actions',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: Designation) => (
        <Space size={8}>
          <Button
            type="text"
            icon={<EditOutlined style={{ color: '#d97706' }} />}
            onClick={() => handleOpenEdit(record)}
          />
          <Popconfirm
            title="Delete Designation"
            description="Are you sure you want to delete this designation?"
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
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Designations</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#8c8c8c' }}>Manage company job roles</p>
          </div>
          {isHR && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenAdd}
              style={{ borderRadius: '12px', background: '#0284c7' }}
            >
              Add Designation
            </Button>
          )}
        </div>
      </Card>

      <Card bordered={false} style={{ borderRadius: '24px' }} bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={designations}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          style={{ borderRadius: '24px', overflow: 'hidden' }}
        />
      </Card>

      <Modal
        title={editingDesg ? 'Edit Designation' : 'Create Designation'}
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
          <Form.Item name="title" label="Job Title" rules={[{ required: true }]}>
            <Input placeholder="e.g. Software Engineer" style={{ borderRadius: '8px' }} />
          </Form.Item>
          <Form.Item name="departmentId" label="Department" rules={[{ required: true }]}>
            <Select
              placeholder="Select Department"
              style={{ borderRadius: '8px' }}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
            />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Describe job duties..." rows={3} style={{ borderRadius: '8px' }} />
          </Form.Item>
          
          <div style={{ display: 'flex', justifyContent: 'end', gap: '12px', marginTop: '24px' }}>
            <Button onClick={() => setIsOpen(false)} style={{ borderRadius: '8px' }}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ borderRadius: '8px', background: '#0284c7' }}>Save</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
