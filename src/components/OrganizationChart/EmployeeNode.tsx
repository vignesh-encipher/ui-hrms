'use client';

import React from 'react';
import { Avatar, Tag, Tooltip, Badge } from 'antd';
import { UserOutlined, SettingOutlined, HolderOutlined } from '@ant-design/icons';
import { OrgTreeNode } from '@/services/organizationService';

interface EmployeeNodeProps {
  node: OrgTreeNode;
  isSuperAdmin: boolean;
  onSelect: (node: OrgTreeNode) => void;
  onOpenConfig?: (node: OrgTreeNode, e: React.MouseEvent) => void;
}

export default function EmployeeNode({ node, isSuperAdmin, onSelect, onOpenConfig }: EmployeeNodeProps) {
  const isInactive = node.status === 'Inactive' || node.status === 'Terminated';

  return (
    <div
      onClick={(e) => {
        // Prevent click if user was dragging
        onSelect(node);
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 16px',
        borderRadius: '16px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        cursor: isSuperAdmin ? 'grab' : 'pointer',
        transition: 'all 0.2s ease',
        minWidth: '280px',
        maxWidth: '360px',
        opacity: isInactive ? 0.6 : 1,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      className="hover:shadow-md hover:border-sky-500"
    >
      {/* Drag handle for Super Admin */}
      {isSuperAdmin && (
        <HolderOutlined style={{ color: '#94a3b8', fontSize: '14px', cursor: 'grab' }} />
      )}

      {/* Avatar with Direct Reports Badge */}
      <Badge count={node.directReportsCount} overflowCount={99} color="#0284c7" offset={[-4, 4]}>
        <Avatar
          size={44}
          src={node.photo}
          icon={<UserOutlined />}
          style={{
            backgroundColor: isInactive ? '#94a3b8' : '#0284c7',
            fontWeight: 'bold',
            flexShrink: 0,
          }}
        />
      </Badge>

      {/* Info Column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <h4
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#0f172a',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {node.name}
          </h4>
          <Tag
            color={node.status === 'Active' ? 'green' : 'default'}
            style={{ borderRadius: '10px', fontSize: '10px', padding: '0 6px', margin: 0 }}
          >
            {node.status || 'Active'}
          </Tag>
        </div>

        <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {node.designation} • <span style={{ color: '#0284c7', fontWeight: 'semibold' }}>{node.department}</span>
        </div>

        {/* Manager & HR Tags */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
          <Tooltip title={`Reporting Manager: ${node.managerName || 'None'}`}>
            <Tag style={{ fontSize: '10px', borderRadius: '8px', background: '#f1f5f9', border: 'none', color: '#475569', margin: 0 }}>
              Mgr: {node.managerName ? node.managerName.split(' ')[0] : 'None'}
            </Tag>
          </Tooltip>
          <Tooltip title={`HR Approver: ${node.hrApproverName || 'HR Team'}`}>
            <Tag style={{ fontSize: '10px', borderRadius: '8px', background: '#e0f2fe', border: 'none', color: '#0369a1', margin: 0 }}>
              HR: {node.hrApproverName ? node.hrApproverName.split(' ')[0] : 'HR'}
            </Tag>
          </Tooltip>
        </div>
      </div>

      {/* Super Admin Config Icon */}
      {isSuperAdmin && onOpenConfig && (
        <Tooltip title="Configure Approval Workflow">
          <div
            onClick={(e) => {
              e.stopPropagation();
              onOpenConfig(node, e);
            }}
            style={{
              padding: '6px',
              borderRadius: '8px',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            className="hover:bg-slate-100 hover:text-sky-600"
          >
            <SettingOutlined style={{ fontSize: '14px' }} />
          </div>
        </Tooltip>
      )}
    </div>
  );
}
