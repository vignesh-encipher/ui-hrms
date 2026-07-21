'use client';

import React, { useEffect, useState } from 'react';
import API from '@/services/api';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Modal,
  Form,
  Card,
  Descriptions,
  message,
  Popconfirm,
  DatePicker
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import dayjs from 'dayjs';

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gender: string;
  dob?: string;
  bloodGroup?: string;
  departmentId?: string;
  departmentName?: string;
  designationId?: string;
  designationTitle?: string;
  managerId?: string;
  managerName?: string;
  joiningDate?: string;
  resignationDate?: string;
  employmentType: string;
  salary: number;
  address?: string;
  emergencyContact?: string;
  status: string;
  photo?: string;
}

export default function EmployeesPage() {
  const { roles } = useSelector((state: RootState) => state.auth);
  const isHR = roles.includes('ROLE_HR') || roles.includes('ROLE_SUPER_ADMIN');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form] = Form.useForm();

  const loadData = () => {
    setLoading(true);
    API.get('/employees', {
      params: { search, page, size: pageSize },
    })
      .then((res) => {
        setEmployees(res.data.content);
        setTotalElements(res.data.totalElements);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [search, page, pageSize]);

  useEffect(() => {
    API.get('/departments').then((res) => setDepartments(res.data)).catch(() => {});
    API.get('/designations').then((res) => setDesignations(res.data)).catch(() => {});
    API.get('/employees/list').then((res) => setManagers(res.data)).catch(() => {});
  }, []);

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    form.setFieldsValue({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone,
      gender: emp.gender,
      dob: emp.dob ? dayjs(emp.dob) : null,
      bloodGroup: emp.bloodGroup,
      departmentId: emp.departmentId,
      designationId: emp.designationId,
      managerId: emp.managerId,
      joiningDate: emp.joiningDate ? dayjs(emp.joiningDate) : null,
      resignationDate: emp.resignationDate ? dayjs(emp.resignationDate) : null,
      employmentType: emp.employmentType,
      salary: emp.salary,
      address: emp.address,
      emergencyContact: emp.emergencyContact,
      status: emp.status || 'Active',
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (values: any) => {
    const payload = {
      ...values,
      dob: values.dob ? values.dob.format('YYYY-MM-DD') : null,
      joiningDate: values.joiningDate ? values.joiningDate.format('YYYY-MM-DD') : null,
      resignationDate: values.resignationDate ? values.resignationDate.format('YYYY-MM-DD') : null,
    };
    try {
      setSubmitting(true);
      if (editingEmployee) {
        await API.put(`/employees/${editingEmployee.id}`, payload);
        message.success('Employee updated successfully!');
      } else {
        await API.post('/employees', payload);
        message.success({
          content: 'Employee account created successfully. The employee can now log in using their email address and the assigned password.',
          duration: 6,
        });
      }
      setIsModalOpen(false);
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
      await API.delete(`/employees/${id}`);
      message.success('Employee deleted successfully!');
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error deleting employee');
    }
  };

  const exportCSV = () => {
    const headers = ['Employee ID', 'Name', 'Email', 'Phone', 'Department', 'Designation', 'Joining Date', 'Type', 'Status'];
    const rows = employees.map((emp) => [
      emp.employeeId,
      `${emp.firstName} ${emp.lastName}`,
      emp.email,
      emp.phone || '',
      emp.departmentName || '',
      emp.designationTitle || '',
      emp.joiningDate || '',
      emp.employmentType,
      emp.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map(val => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'employees_list.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    { title: 'ID', dataIndex: 'employeeId', key: 'employeeId', width: 120 },
    { title: 'Name', key: 'name', render: (_: any, record: Employee) => `${record.firstName} ${record.lastName}` },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Department', dataIndex: 'departmentName', key: 'departmentName' },
    { title: 'Designation', dataIndex: 'designationTitle', key: 'designationTitle' },
    { title: 'Type', dataIndex: 'employmentType', key: 'employmentType' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => (
      <span style={{
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 'bold',
        background: status === 'Active' ? '#d1fae5' : '#ffe4e6',
        color: status === 'Active' ? '#065f46' : '#991b1b',
      }}>{status}</span>
    )},
    {
      title: 'Actions',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: Employee) => (
        <Space size={8}>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => setViewingEmployee(record)}
          />
          {isHR && (
            <>
              <Button
                type="text"
                icon={<EditOutlined style={{ color: '#d97706' }} />}
                onClick={() => handleOpenEdit(record)}
              />
              <Popconfirm
                title="Delete Employee"
                description="Are you sure you want to delete this employee?"
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
            </>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card bordered={false} style={{ borderRadius: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <Input
            placeholder="Search employees..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            style={{ width: '280px', borderRadius: '12px' }}
          />

          <Space size={12}>
            <Button
              icon={<DownloadOutlined />}
              onClick={exportCSV}
              style={{ borderRadius: '12px' }}
            >
              Export CSV
            </Button>
            {isHR && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleOpenAdd}
                style={{ borderRadius: '12px', background: '#0284c7' }}
              >
                Add Employee
              </Button>
            )}
          </Space>
        </div>
      </Card>

      <Card bordered={false} style={{ borderRadius: '24px' }} bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={employees}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page + 1,
            pageSize: pageSize,
            total: totalElements,
            onChange: (p, ps) => { setPage(p - 1); setPageSize(ps); },
            showSizeChanger: true,
          }}
          style={{ borderRadius: '24px', overflow: 'hidden' }}
        />
      </Card>

      <Modal
        title={editingEmployee ? 'Edit Employee Details' : 'Add New Employee'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={"80%"}
        destroyOnClose
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          style={{ paddingRight: '10px' }}
          initialValues={{ gender: 'Male', employmentType: 'Full Time', status: 'Active', role: 'Employee' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
              <Input style={{ borderRadius: '8px' }} />
            </Form.Item>
            <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
              <Input style={{ borderRadius: '8px' }} />
            </Form.Item>
            <Form.Item name="email" label="Email / Username" rules={[{ required: true, type: 'email' }]}>
              <Input style={{ borderRadius: '8px' }} />
            </Form.Item>

            {!editingEmployee && (
              <Form.Item
                name="password"
                label="Initial Password"
                rules={[
                  { required: true, message: 'Password is required' },
                  { min: 8, message: 'Password must be at least 8 characters' },
                  { pattern: /(?=.*[A-Z])/, message: 'Must contain at least one uppercase letter' },
                  { pattern: /(?=.*[a-z])/, message: 'Must contain at least one lowercase letter' },
                  { pattern: /(?=.*[0-9])/, message: 'Must contain at least one number' },
                  { pattern: /(?=.*[!@#$%^&*(),.?":{}|<>])/, message: 'Must contain at least one special character' },
                ]}
              >
                <Input.Password placeholder="Set login password" style={{ borderRadius: '8px' }} />
              </Form.Item>
            )}

            <Form.Item name="role" label="Account Role" rules={[{ required: true }]}>
              <Select
                style={{ borderRadius: '8px' }}
                options={[
                  { value: 'Employee', label: 'Employee' },
                  { value: 'Manager', label: 'Manager' },
                  { value: 'HR', label: 'HR' },
                  { value: 'Admin', label: 'Admin' },
                  { value: 'Super Admin', label: 'Super Admin' },
                ]}
              />
            </Form.Item>

            <Form.Item name="phone" label="Phone">
              <Input style={{ borderRadius: '8px' }} />
            </Form.Item>
            <Form.Item name="gender" label="Gender">
              <Select
                style={{ borderRadius: '8px' }}
                options={[
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                  { value: 'Other', label: 'Other' },
                ]}
              />
            </Form.Item>
            <Form.Item name="dob" label="Date of Birth">
              <DatePicker style={{ width: '100%', borderRadius: '8px' }} />
            </Form.Item>
            <Form.Item name="joiningDate" label="Joining Date">
              <DatePicker style={{ width: '100%', borderRadius: '8px' }} />
            </Form.Item>
            <Form.Item name="departmentId" label="Department" rules={[{ required: true }]}>
              <Select
                placeholder="Select Department"
                style={{ borderRadius: '8px' }}
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
              />
            </Form.Item>
            <Form.Item name="designationId" label="Designation" rules={[{ required: true }]}>
              <Select
                placeholder="Select Designation"
                style={{ borderRadius: '8px' }}
                options={designations.map((d) => ({ value: d.id, label: d.title }))}
              />
            </Form.Item>
            <Form.Item name="managerId" label="Reporting Manager">
              <Select
                showSearch
                placeholder="Search Reporting Manager by Name, ID, or Designation..."
                style={{ borderRadius: '8px' }}
                optionFilterProp="children"
                filterOption={(input, option) => {
                  const label = String(option?.label || '').toLowerCase();
                  const val = String(option?.value || '').toLowerCase();
                  const searchKey = input.toLowerCase();
                  return label.includes(searchKey) || val.includes(searchKey);
                }}
                options={[
                  { value: '', label: 'No Manager (Top-Level Employee / CEO / Head)' },
                  ...managers.map((m) => {
                    const desigTitle = designations.find((d) => d.id === m.designationId)?.title || 'Manager';
                    return {
                      value: m.employeeId,
                      label: `${m.firstName} ${m.lastName} (${m.employeeId} - ${desigTitle})`,
                    };
                  }),
                ]}
              />
            </Form.Item>
            <Form.Item name="employmentType" label="Employment Type">
              <Select
                style={{ borderRadius: '8px' }}
                options={[
                  { value: 'Full Time', label: 'Full Time' },
                  { value: 'Part Time', label: 'Part Time' },
                  { value: 'Contract', label: 'Contract' },
                  { value: 'Intern', label: 'Intern' },
                ]}
              />
            </Form.Item>
            <Form.Item name="salary" label="Salary" rules={[{ required: false }]}>
              <Input type="number" style={{ borderRadius: '8px' }} />
            </Form.Item>
            <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Status is required' }]}>
              <Select
                style={{ borderRadius: '8px' }}
                options={[
                  { value: 'Active', label: 'Active' },
                  { value: 'Terminated', label: 'Terminated' },
                  { value: 'Resigned', label: 'Resigned' },
                  { value: 'On Leave', label: 'On Leave' },
                ]}
              />
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.status !== currentValues.status}>
              {({ getFieldValue }) => {
                const currentStatus = getFieldValue('status');
                return currentStatus && currentStatus !== 'Active' ? (
                  <Form.Item
                    name="resignationDate"
                    label="Resignation / End Date"
                    rules={[{ required: true, message: 'Please select the resignation / exit date!' }]}
                  >
                    <DatePicker style={{ width: '100%', borderRadius: '8px' }} format="YYYY-MM-DD" placeholder="Select Resignation Date" />
                  </Form.Item>
                ) : null;
              }}
            </Form.Item>
          </div>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} style={{ borderRadius: '8px' }} />
          </Form.Item>
          <Form.Item name="emergencyContact" label="Emergency Contact">
            <Input style={{ borderRadius: '8px' }} />
          </Form.Item>
          
          <div style={{ display: 'flex', justifyContent: 'end', gap: '12px', marginTop: '24px' }}>
            <Button onClick={() => setIsModalOpen(false)} style={{ borderRadius: '8px' }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting} disabled={submitting} style={{ borderRadius: '8px', background: '#0284c7' }}>Save</Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Employee Details"
        open={!!viewingEmployee}
        onCancel={() => setViewingEmployee(null)}
        footer={null}
        width={600}
        styles={{ body: { maxHeight: '80vh', overflowY: 'auto' } }}
      >
        {viewingEmployee && (
          <Descriptions bordered column={1} size="small" style={{ marginTop: '20px' }}>
            <Descriptions.Item label="Employee ID">{viewingEmployee.employeeId}</Descriptions.Item>
            <Descriptions.Item label="Name">{viewingEmployee.firstName} {viewingEmployee.lastName}</Descriptions.Item>
            <Descriptions.Item label="Email">{viewingEmployee.email}</Descriptions.Item>
            <Descriptions.Item label="Phone">{viewingEmployee.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="Gender">{viewingEmployee.gender}</Descriptions.Item>
            <Descriptions.Item label="Department">{viewingEmployee.departmentName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Designation">{viewingEmployee.designationTitle || '-'}</Descriptions.Item>
            <Descriptions.Item label="Manager">{viewingEmployee.managerName || 'None'}</Descriptions.Item>
            <Descriptions.Item label="Employment Type">{viewingEmployee.employmentType}</Descriptions.Item>
            <Descriptions.Item label="Salary">{viewingEmployee.salary.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="Status">{viewingEmployee.status}</Descriptions.Item>
            {viewingEmployee.resignationDate && (
              <Descriptions.Item label="Resignation / Exit Date">{viewingEmployee.resignationDate}</Descriptions.Item>
            )}
            <Descriptions.Item label="Address">{viewingEmployee.address || '-'}</Descriptions.Item>
            <Descriptions.Item label="Emergency Contact">{viewingEmployee.emergencyContact || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}

const { Option } = Select;
