'use client';

import React, { useEffect, useState } from 'react';
import API from '@/services/api';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Card, Row, Col, Descriptions, Form, Input, Button, Avatar, message, Skeleton } from 'antd';
import { UserOutlined, PhoneOutlined, EnvironmentOutlined, MedicineBoxOutlined } from '@ant-design/icons';

interface EmployeeProfile {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gender: string;
  dob?: string;
  bloodGroup?: string;
  departmentName?: string;
  designationTitle?: string;
  managerName?: string;
  joiningDate?: string;
  employmentType: string;
  salary: number;
  address?: string;
  emergencyContact?: string;
  status: string;
  photo?: string;
}

export default function ProfilePage() {
  const { id: userId } = useSelector((state: RootState) => state.auth);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const loadProfile = () => {
    if (!userId) return;
    API.get(`/employees/userId/${userId}`)
      .then((res) => {
        setProfile(res.data);
        form.setFieldsValue({
          phone: res.data.phone || '',
          address: res.data.address || '',
          emergencyContact: res.data.emergencyContact || '',
          photo: res.data.photo || '',
        });
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const onSubmit = async (values: any) => {
    if (!profile) return;
    try {
      setSubmitting(true);
      await API.put(`/employees/${profile.id}`, {
        ...profile,
        phone: values.phone,
        address: values.address,
        emergencyContact: values.emergencyContact,
        photo: values.photo,
      });
      message.success('Profile updated successfully!');
      loadProfile();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error updating profile');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="max-w-[960px] mx-auto flex flex-col gap-6">
        <Card bordered={false} className="rounded-3xl">
          <Skeleton avatar active paragraph={{ rows: 1 }} />
        </Card>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={10}>
            <Card bordered={false} className="rounded-3xl">
              <Skeleton active paragraph={{ rows: 4 }} />
            </Card>
          </Col>
          <Col xs={24} md={14}>
            <Card bordered={false} className="rounded-3xl">
              <Skeleton active paragraph={{ rows: 4 }} />
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <div className="max-w-[960px] mx-auto flex flex-col gap-6">
      {/* Profile Header */}
      <Card bordered={false} className="rounded-3xl">
        <div className="flex items-center gap-6 flex-wrap">
          <Avatar size={80} icon={<UserOutlined />} className="bg-[#0284c7]" />
          <div className="flex flex-col gap-1">
            <h3 className="m-0 text-2xl font-bold text-slate-800">{profile.firstName} {profile.lastName}</h3>
            <p className="m-0 text-slate-400">{profile.designationTitle || 'Designation not specified'}</p>
            <span className="inline-block self-start px-2.5 py-0.5 rounded-[20px] bg-slate-100 text-slate-600 text-[11px] font-bold mt-1">
              {profile.employeeId} - {profile.employmentType}
            </span>
          </div>
        </div>
      </Card>

      <Row gutter={[24, 24]}>
        {/* Read Only Employment Details */}
        <Col xs={24} md={10}>
          <Card title="Employment Information" bordered={false} className="rounded-3xl">
            <Descriptions column={1} size="small" layout="vertical" className="m-0">
              <Descriptions.Item label="Department"><strong>{profile.departmentName || '-'}</strong></Descriptions.Item>
              <Descriptions.Item label="Manager"><strong>{profile.managerName || 'None'}</strong></Descriptions.Item>
              <Descriptions.Item label="Joining Date"><strong>{profile.joiningDate || '-'}</strong></Descriptions.Item>
              <Descriptions.Item label="Status"><strong>{profile.status}</strong></Descriptions.Item>
              <Descriptions.Item label="Blood Group"><strong>{profile.bloodGroup || '-'}</strong></Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Editable Contacts Form */}
        <Col xs={24} md={14}>
          <Card title="Contact Information" bordered={false} className="rounded-3xl">
            <Form
              form={form}
              layout="vertical"
              onFinish={onSubmit}
            >
              <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
                <Input prefix={<PhoneOutlined />} className="rounded-lg" />
              </Form.Item>
              <Form.Item name="address" label="Address" rules={[{ required: true }]}>
                <Input.TextArea rows={2} className="rounded-lg" />
              </Form.Item>
              <Form.Item name="emergencyContact" label="Emergency Contact" rules={[{ required: true }]}>
                <Input prefix={<MedicineBoxOutlined />} className="rounded-lg" />
              </Form.Item>

              <div className="flex justify-end mt-6">
                <Button type="primary" htmlType="submit" loading={submitting} disabled={submitting} className="rounded-xl bg-[#0284c7] h-10 font-bold">
                  Update Profile
                </Button>
              </div>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
