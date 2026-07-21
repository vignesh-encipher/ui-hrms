'use client';

import React from 'react';
import { Card, Row, Col, Progress, Tag } from 'antd';
import { CalendarOutlined, SafetyOutlined, ClockCircleOutlined, StarOutlined } from '@ant-design/icons';

interface LeaveBalanceCardsProps {
  balances?: Record<string, number>;
  compOffAvailable?: number;
}

export default function LeaveBalanceCards({ balances = {}, compOffAvailable = 4 }: LeaveBalanceCardsProps) {
  const clAllocated = 12;
  const clRemaining = balances['Casual Leave'] !== undefined ? balances['Casual Leave'] : 8;

  const slAllocated = 8;
  const slRemaining = balances['Sick Leave'] !== undefined ? balances['Sick Leave'] : 5;

  const elAllocated = 15;
  const elRemaining = balances['Earned Leave'] !== undefined ? balances['Earned Leave'] : 12;

  const compOffAllocated = 8;
  const compOffCount = compOffAvailable !== undefined ? compOffAvailable : 4;

  const cards = [
    {
      title: 'Casual Leave (CL)',
      remaining: clRemaining,
      total: clAllocated,
      icon: <CalendarOutlined style={{ color: '#0284c7', fontSize: '20px' }} />,
      color: '#0284c7',
      percent: Math.round((clRemaining / clAllocated) * 100),
    },
    {
      title: 'Sick Leave (SL)',
      remaining: slRemaining,
      total: slAllocated,
      icon: <SafetyOutlined style={{ color: '#10b981', fontSize: '20px' }} />,
      color: '#10b981',
      percent: Math.round((slRemaining / slAllocated) * 100),
    },
    {
      title: 'Earned Leave (EL)',
      remaining: elRemaining,
      total: elAllocated,
      icon: <StarOutlined style={{ color: '#8b5cf6', fontSize: '20px' }} />,
      color: '#8b5cf6',
      percent: Math.round((elRemaining / elAllocated) * 100),
    },
    {
      title: 'Comp Off',
      remaining: compOffCount,
      total: compOffAllocated,
      icon: <ClockCircleOutlined style={{ color: '#f59e0b', fontSize: '20px' }} />,
      color: '#f59e0b',
      percent: Math.round((compOffCount / compOffAllocated) * 100),
      isCompOff: true,
    },
  ];

  return (
    <Row gutter={[20, 20]}>
      {cards.map((c, i) => (
        <Col xs={24} sm={12} lg={6} key={i}>
          <Card
            bordered={false}
            style={{
              borderRadius: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              background: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: `${c.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {c.icon}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>{c.title}</h4>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {c.isCompOff ? 'Available Credits' : 'Annual Balance'}
                  </span>
                </div>
              </div>
              <Tag color={c.color} style={{ borderRadius: '12px', fontWeight: 'bold', fontSize: '11px' }}>
                {c.isCompOff ? `${c.remaining} Available` : `${c.remaining} Left`}
              </Tag>
            </div>

            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
                <span style={{ color: '#64748b' }}>Remaining Balance</span>
                <strong style={{ color: c.color }}>
                  {c.isCompOff ? `Available: ${c.remaining}` : `Remaining: ${c.remaining} / ${c.total}`}
                </strong>
              </div>
              <Progress
                percent={c.percent}
                strokeColor={c.color}
                trailColor="#f1f5f9"
                showInfo={false}
                strokeWidth={8}
                style={{ borderRadius: '4px' }}
              />
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
