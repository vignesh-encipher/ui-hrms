'use client';

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '@/store/authSlice';
import { RootState } from '@/store';
import { useRouter } from 'next/navigation';
import API from '@/services/api';
import { Card, Form, Input, Button, message, Alert, Typography, Result } from 'antd';
import { LockOutlined, ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function ChangePasswordPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { isAuthenticated, username } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCancel = () => {
    dispatch(logout());
    router.push('/login');
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await API.post('/auth/change-password', {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });

      setSuccess(true);
      // Invalidate the session
      dispatch(logout());
    } catch (error: any) {
      const msg = error.response?.data?.message || error.response?.data || 'Failed to change password. Please verify your current password.';
      message.error(typeof msg === 'string' ? msg : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        position: 'relative',
        overflow: 'hidden',
        padding: '24px',
      }}>
        <div style={{
          position: 'absolute',
          top: '25%',
          left: '25%',
          width: '384px',
          height: '384px',
          background: 'rgba(14, 165, 233, 0.15)',
          borderRadius: '50%',
          filter: 'blur(80px)',
        }} />
        <Card
          style={{
            width: '100%',
            maxWidth: '500px',
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            zIndex: 10,
            textAlign: 'center',
          }}
          bodyStyle={{ padding: '40px 32px' }}
        >
          <Result
            status="success"
            title={<span style={{ color: '#fff', fontSize: '22px', fontWeight: 'bold' }}>Password Updated!</span>}
            subTitle={
              <Text style={{ color: '#94a3b8', fontSize: '15px', display: 'block', margin: '16px 0 24px 0' }}>
                Your password has been changed successfully. Please log in again using your new password.
              </Text>
            }
            extra={[
              <Button
                type="primary"
                key="login"
                onClick={() => router.push('/login')}
                style={{
                  height: '46px',
                  borderRadius: '12px',
                  background: '#0284c7',
                  border: 'none',
                  fontWeight: 'bold',
                  boxShadow: '0 10px 15px -3px rgba(2, 132, 199, 0.3)',
                  padding: '0 32px',
                }}
              >
                Go to Login
              </Button>
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f172a',
      position: 'relative',
      overflow: 'hidden',
      padding: '24px',
    }}>
      {/* Decorative Blur Blobs */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '20%',
        width: '400px',
        height: '400px',
        background: 'rgba(14, 165, 233, 0.15)',
        borderRadius: '50%',
        filter: 'blur(100px)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '20%',
        width: '400px',
        height: '400px',
        background: 'rgba(99, 102, 241, 0.15)',
        borderRadius: '50%',
        filter: 'blur(100px)',
      }} />

      <Card
        style={{
          width: '100%',
          maxWidth: '450px',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          zIndex: 10,
        }}
        bodyStyle={{ padding: '32px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '16px',
            backgroundColor: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '20px',
            margin: '0 auto 16px auto',
            boxShadow: '0 10px 15px -3px rgba(2, 132, 199, 0.3)',
          }}>
            P
          </div>
          <h2 style={{ color: '#fff', margin: '0 0 4px 0', fontSize: '24px', fontWeight: 'bold' }}>Secure Your Account</h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px' }}>Please update your password to continue</p>
        </div>

        <Alert
          message="Temporary Password Detected"
          description="Since this is your first login, a password update is mandatory for security purposes."
          type="info"
          showIcon
          style={{
            marginBottom: '24px',
            background: 'rgba(14, 165, 233, 0.1)',
            border: '1px solid rgba(14, 165, 233, 0.2)',
            color: '#e0f2fe',
            borderRadius: '12px',
          }}
        />

        <Form
          name="change_password_form"
          onFinish={onFinish}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="oldPassword"
            label={<span style={{ color: '#cbd5e1' }}>Current Password</span>}
            rules={[{ required: true, message: 'Please enter your current temporary password' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'rgba(255,255,255,0.65)' }} />}
              placeholder="Current Password"
              style={{ borderRadius: '12px' }}
            />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label={<span style={{ color: '#cbd5e1' }}>New Password</span>}
            rules={[
              { required: true, message: 'Please enter your new password' },
              { min: 8, message: 'Password must be at least 8 characters long' },
              {
                pattern: /[A-Z]/,
                message: 'Password must contain at least one uppercase letter',
              },
              {
                pattern: /[a-z]/,
                message: 'Password must contain at least one lowercase letter',
              },
              {
                pattern: /[0-9]/,
                message: 'Password must contain at least one number',
              },
              {
                pattern: /[!@#$%^&*(),.?":{}|<>]/,
                message: 'Password must contain at least one special character',
              },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('oldPassword') !== value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('New password cannot be the same as the old password'));
                },
              }),
            ]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'rgba(255,255,255,0.65)' }} />}
              placeholder="New Password"
              style={{ borderRadius: '12px' }}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label={<span style={{ color: '#cbd5e1' }}>Confirm New Password</span>}
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Please confirm your new password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Confirm password must match the new password'));
                },
              }),
            ]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'rgba(255,255,255,0.65)' }} />}
              placeholder="Confirm New Password"
              style={{ borderRadius: '12px' }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '12px',
                background: '#0284c7',
                border: 'none',
                fontWeight: 'bold',
                boxShadow: '0 10px 15px -3px rgba(2, 132, 199, 0.3)',
                marginBottom: '12px',
              }}
            >
              Update Password
            </Button>
            
            <Button
              type="text"
              onClick={handleCancel}
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '12px',
                color: '#94a3b8',
                fontWeight: 'medium',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <ArrowLeftOutlined /> Back to Login
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
