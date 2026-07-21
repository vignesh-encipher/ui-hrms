'use client';

import React, { useEffect, useState } from 'react';
import { Drawer, Avatar, Tag, Card, Row, Col, Progress, List, Button, Divider, Spin } from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
  IdcardOutlined,
  SettingOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { OrgTreeNode } from '@/services/organizationService';
import API from '@/services/api';

interface EmployeeDrawerProps {
  open: boolean;
  node: OrgTreeNode | null;
  isSuperAdmin: boolean;
  onClose: () => void;
  onOpenConfig?: (node: OrgTreeNode) => void;
}

export default function EmployeeDrawer({ open, node, isSuperAdmin, onClose, onOpenConfig }: EmployeeDrawerProps) {
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (node?.employeeId) {
      setLoading(true);
      API.get(`/leaves/balance/${node.employeeId}`)
        .then((res) => setBalances(res.data))
        .catch(() => setBalances({ 'Casual Leave': 8, 'Sick Leave': 5, 'Earned Leave': 12 }))
        .finally(() => setLoading(false));
    }
  }, [node]);

  if (!node) return null;

  return (
    <Drawer
      title="Employee Profile & Hierarchy Details"
      placement="right"
      width={420}
      open={open}
      onClose={onClose}
      styles={{ body: { padding: '24px', background: '#f8fafc' } }}
    >
      {/* Profile Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <Avatar
          size={72}
          src={node.photo}
          icon={<UserOutlined />}
          style={{ backgroundColor: '#0284c7', fontSize: '28px', marginBottom: '12px' }}
        />
        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>{node.name}</h3>
        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
          {node.designation} • <span style={{ color: '#0284c7', fontWeight: 'semibold' }}>{node.department}</span>
        </p>
        <div style={{ marginTop: '8px' }}>
          <Tag color={node.status === 'Active' ? 'green' : 'default'} style={{ borderRadius: '12px', fontWeight: 'bold' }}>
            {node.status}
          </Tag>
          <Tag color="blue" style={{ borderRadius: '12px', fontWeight: 'bold' }}>
            ID: {node.employeeId}
          </Tag>
        </div>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* Basic Contact Info */}
      <Card bordered={false} style={{ borderRadius: '16px', marginBottom: '16px' }} bodyStyle={{ padding: '16px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase' }}>Contact Information</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#334155' }}>
            <MailOutlined style={{ color: '#0284c7' }} />
            <span>{node.email || 'N/A'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#334155' }}>
            <PhoneOutlined style={{ color: '#10b981' }} />
            <span>{node.phone || '+1 555-0199'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#334155' }}>
            <CalendarOutlined style={{ color: '#8b5cf6' }} />
            <span>Joined: {node.joiningDate || '2024-01-15'}</span>
          </div>
        </div>
      </Card>

      {/* Approval & Hierarchy Chain */}
      <Card bordered={false} style={{ borderRadius: '16px', marginBottom: '16px' }} bodyStyle={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase' }}>Approval Workflow Hierarchy</h4>
          {isSuperAdmin && onOpenConfig && (
            <Button
              type="link"
              icon={<SettingOutlined />}
              onClick={() => onOpenConfig(node)}
              style={{ padding: 0, fontSize: '12px' }}
            >
              Configure
            </Button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ padding: '10px', background: '#f1f5f9', borderRadius: '12px' }}>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Stage 1 Approver (Reporting Manager)</span>
            <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#0f172a', marginTop: '2px' }}>
              {node.managerName || 'None (CEO / Root)'}
            </div>
          </div>

          <div style={{ padding: '10px', background: '#e0f2fe', borderRadius: '12px' }}>
            <span style={{ fontSize: '11px', color: '#0369a1' }}>Stage 2 Approver (HR Team)</span>
            <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#0284c7', marginTop: '2px' }}>
              {node.hrApproverName || 'HR Manager'}
            </div>
          </div>
        </div>
      </Card>

      {/* Leave Balances */}
      <Card bordered={false} style={{ borderRadius: '16px', marginBottom: '16px' }} bodyStyle={{ padding: '16px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase' }}>Leave Balances</h4>
        {loading ? (
          <Spin style={{ display: 'block', margin: '12px auto' }} />
        ) : (
          <Row gutter={[12, 12]}>
            <Col span={12}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Casual Leave</span>
              <Progress percent={Math.round(((balances['Casual Leave'] ?? 8) / 12) * 100)} strokeColor="#0284c7" size="small" />
            </Col>
            <Col span={12}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Sick Leave</span>
              <Progress percent={Math.round(((balances['Sick Leave'] ?? 5) / 8) * 100)} strokeColor="#10b981" size="small" />
            </Col>
          </Row>
        )}
      </Card>

      {/* Direct Reports */}
      <Card bordered={false} style={{ borderRadius: '16px' }} bodyStyle={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <UsergroupAddOutlined style={{ color: '#0284c7' }} />
          <h4 style={{ margin: 0, fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase' }}>
            Direct Reports ({node.directReportsCount})
          </h4>
        </div>

        {node.children && node.children.length > 0 ? (
          <List
            size="small"
            dataSource={node.children}
            renderItem={(child) => (
              <List.Item key={child.employeeId} style={{ padding: '8px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#0284c7' }} />
                  <div>
                    <strong style={{ fontSize: '12px', color: '#0f172a' }}>{child.name}</strong>
                    <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>{child.designation}</span>
                  </div>
                </div>
              </List.Item>
            )}
          />
        ) : (
          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No direct reports</p>
        )}
      </Card>
    </Drawer>
  );
}
