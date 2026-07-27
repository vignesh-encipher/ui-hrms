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
      <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden p-6">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/15 rounded-full blur-[80px]" />
        <Card
          className="!w-full !max-w-[500px] !bg-white/5 !backdrop-blur-xl !border !border-white/10 !rounded-3xl !shadow-2xl !z-10 !text-center"
          bodyStyle={{ padding: '40px 32px' }}
        >
          <Result
            status="success"
            title={<span className="text-white text-2xl font-bold">Password Updated!</span>}
            subTitle={
              <Text className="text-slate-400 text-[15px] block my-5">
                Your password has been changed successfully. Please log in again using your new password.
              </Text>
            }
            extra={[
              <Button
                type="primary"
                key="login"
                onClick={() => router.push('/login')}
                className="!h-[46px] !rounded-xl !bg-[#0284c7] !border-none !font-bold !shadow-lg !shadow-[#0284c7]/30 !px-8"
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
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden p-6">
      {/* Decorative Blur Blobs */}
      <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] bg-sky-500/15 rounded-full blur-[100px]" />
      <div className="absolute bottom-[20%] right-[20%] w-[400px] h-[400px] bg-indigo-500/15 rounded-full blur-[100px]" />

      <Card
        className="!w-full !max-w-[450px] !bg-white/5 !backdrop-blur-xl !border !border-white/10 !rounded-3xl !shadow-2xl !z-10"
        bodyStyle={{ padding: '32px' }}
      >
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#0284c7] flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 shadow-lg shadow-[#0284c7]/30">
            P
          </div>
          <h2 className="text-white m-0 mb-1 text-2xl font-bold">Secure Your Account</h2>
          <p className="text-slate-400 m-0 text-sm">Please update your password to continue</p>
        </div>

        <Alert
          message={<span className="!text-white !font-semibold">Temporary Password Detected</span>}
          description={<span className="!text-slate-300">Since this is your first login, a password update is mandatory for security purposes.</span>}
          type="info"
          showIcon
          className="!mb-6 !bg-sky-500/10 !border !border-sky-500/20 !rounded-xl"
        />

        <Form
          name="change_password_form"
          onFinish={onFinish}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="oldPassword"
            label={<span className="text-slate-300">Current Password</span>}
            rules={[{ required: true, message: 'Please enter your current temporary password' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-white/65" />}
              placeholder="Current Password"
              className="!rounded-xl"
            />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label={<span className="text-slate-300">New Password</span>}
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
              prefix={<LockOutlined className="text-white/65" />}
              placeholder="New Password"
              className="!rounded-xl"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label={<span className="text-slate-300">Confirm New Password</span>}
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
              prefix={<LockOutlined className="text-white/65" />}
              placeholder="Confirm New Password"
              className="!rounded-xl"
            />
          </Form.Item>

          <Form.Item className="!mb-0 !mt-6">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className="!w-full !h-[46px] !rounded-xl !bg-[#0284c7] !border-none !font-bold !shadow-lg !shadow-[#0284c7]/30 !mb-3"
            >
              Update Password
            </Button>
            
            <Button
              type="text"
              onClick={handleCancel}
              className="!w-full !h-[46px] !rounded-xl !text-slate-400 !font-medium !flex !items-center !justify-center !gap-2 hover:!text-slate-300"
            >
              <ArrowLeftOutlined /> Back to Login
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
