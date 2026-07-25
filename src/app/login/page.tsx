'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '@/store/authSlice';
import { RootState } from '@/store';
import { useRouter } from 'next/navigation';
import API from '@/services/api';
import { Card, Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

export default function LoginPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { isAuthenticated, isFirstLogin } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      if (isFirstLogin) {
        router.push('/change-password');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, isFirstLogin, router]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const response = await API.post('/auth/login', {
        username: values.username,
        password: values.password,
      });
      const payload = response.data;
      dispatch(setCredentials({
        token: payload.token,
        refreshToken: payload.refreshToken,
        username: payload.username,
        email: payload.email,
        roles: payload.roles,
        employeeId: payload.employeeId,
        id: payload.id,
        isFirstLogin: !!payload.isFirstLogin,
      }));
      message.success('Login successful! Redirecting...');
      if (payload.isFirstLogin) {
        router.push('/change-password');
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.response?.data || 'Invalid username or password';
      message.error(typeof msg === 'string' ? msg : 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/15 rounded-full blur-[80px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/15 rounded-full blur-[80px]" />

      <Card
        className="w-full max-w-[400px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl z-10"
        bodyStyle={{ padding: '32px' }}
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#0284c7] flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 shadow-lg shadow-[#0284c7]/30">
            H
          </div>
          <h2 className="text-white m-0 mb-1 text-2xl font-bold">Welcome Back</h2>
          <p className="text-slate-400 m-0 text-sm">Sign in to manage your HR account</p>
        </div>

        <Form
          name="login_form"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Please input your username!' }]}
          >
            <Input
              className="login-input rounded-xl"
              prefix={<UserOutlined className="text-white/65" />}
              placeholder="Username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password
              className="login-input rounded-xl"
              prefix={<LockOutlined className="text-white/65" />}
              placeholder="Password"
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className="w-full h-[46px] rounded-xl bg-[#0284c7] border-none font-bold shadow-lg shadow-[#0284c7]/30 mt-2"
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
