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
    }
  };

  if (loading || !profile) {
    return (
      <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <Card bordered={false} style={{ borderRadius: '24px' }}>
          <Skeleton avatar active paragraph={{ rows: 1 }} />
        </Card>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={10}>
            <Card bordered={false} style={{ borderRadius: '24px' }}>
              <Skeleton active paragraph={{ rows: 4 }} />
            </Card>
          </Col>
          <Col xs={24} md={14}>
            <Card bordered={false} style={{ borderRadius: '24px' }}>
              <Skeleton active paragraph={{ rows: 4 }} />
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Profile Header */}
      <Card bordered={false} style={{ borderRadius: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <Avatar size={80} icon={<UserOutlined />} style={{ backgroundColor: '#0284c7' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold' }}>{profile.firstName} {profile.lastName}</h3>
            <p style={{ margin: 0, color: '#8c8c8c' }}>{profile.designationTitle || 'Designation not specified'}</p>
            <span style={{
              display: 'inline-block',
              alignSelf: 'start',
              padding: '2px 10px',
              borderRadius: '20px',
              background: '#f1f5f9',
              color: '#475569',
              fontSize: '11px',
              fontWeight: 'bold',
              marginTop: '4px',
            }}>
              {profile.employeeId} - {profile.employmentType}
            </span>
          </div>
        </div>
      </Card>

      <Row gutter={[24, 24]}>
        {/* Read Only Employment Details */}
        <Col xs={24} md={10}>
          <Card title="Employment Information" bordered={false} style={{ borderRadius: '24px' }}>
            <Descriptions column={1} size="small" layout="vertical" style={{ margin: 0 }}>
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
          <Card title="Contact Information" bordered={false} style={{ borderRadius: '24px' }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={onSubmit}
            >
              <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
                <Input prefix={<PhoneOutlined />} style={{ borderRadius: '8px' }} />
              </Form.Item>
              <Form.Item name="address" label="Address" rules={[{ required: true }]}>
                <Input.TextArea rows={2} style={{ borderRadius: '8px' }} />
              </Form.Item>
              <Form.Item name="emergencyContact" label="Emergency Contact" rules={[{ required: true }]}>
                <Input prefix={<MedicineBoxOutlined />} style={{ borderRadius: '8px' }} />
              </Form.Item>

              <div style={{ display: 'flex', justifyContent: 'end', marginTop: '24px' }}>
                <Button type="primary" htmlType="submit" style={{ borderRadius: '12px', background: '#0284c7', height: '40px', fontWeight: 'bold' }}>
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
