'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Card, Tree, Input, Select, Button, Space, Modal, message, Spin, Skeleton, Tag, Tooltip } from 'antd';
import {
  SearchOutlined,
  SaveOutlined,
  UndoOutlined,
  ExpandOutlined,
  CompressOutlined,
  ExclamationCircleOutlined,
  ClusterOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import {
  OrgTreeNode,
  getOrganizationTree,
  updateOrganizationTree,
} from '@/services/organizationService';
import {
  flattenTree,
  isCircularDependency,
  moveTreeNode,
  filterTreeNodes,
  getAllTreeKeys,
} from '@/utils/treeHelpers';

import EmployeeNode from '@/components/OrganizationChart/EmployeeNode';
import EmployeeDrawer from '@/components/OrganizationChart/EmployeeDrawer';
import ApprovalConfigModal from '@/components/OrganizationChart/ApprovalConfigModal';

export default function OrganizationChartPage() {
  const { roles } = useSelector((state: RootState) => state.auth);
  const isSuperAdmin = roles && roles.length > 0
    ? roles.some((r: string) => r.includes('SUPER_ADMIN') || r.includes('ADMIN'))
    : true;

  const [treeData, setTreeData] = useState<OrgTreeNode[]>([]);
  const [originalTreeData, setOriginalTreeData] = useState<OrgTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<{ employeeId: string; newManagerId: string; employeeName: string; managerName: string }[]>([]);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Tree state
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);

  // Selected node for Drawer & Approval Modal
  const [selectedNode, setSelectedNode] = useState<OrgTreeNode | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configNode, setConfigNode] = useState<OrgTreeNode | null>(null);

  const loadTree = async () => {
    setLoading(true);
    try {
      const data = await getOrganizationTree();
      setTreeData(data);
      setOriginalTreeData(data);
      setExpandedKeys(getAllTreeKeys(data));
      setIsDirty(false);
      setPendingChanges([]);
    } catch (err) {
      message.error('Failed to load organization chart');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTree();
  }, []);

  const allEmployeesList = flattenTree(treeData);

  // Departments list for filter dropdown
  const departmentsList = Array.from(new Set(allEmployeesList.map((e) => e.department).filter(Boolean)));

  // Expand / Collapse Controls
  const handleExpandAll = () => {
    setExpandedKeys(getAllTreeKeys(treeData));
  };

  const handleCollapseAll = () => {
    setExpandedKeys([]);
  };

  // Drag & Drop Handler (Super Admin only)
  const onDrop = (info: any) => {
    if (!isSuperAdmin) return;

    const dragKey = info.dragNode.key as string;
    const dropKey = info.node.key as string;

    if (dragKey === dropKey) return;

    // Check circular dependency
    if (isCircularDependency(dragKey, dropKey, treeData)) {
      message.error('Circular reporting hierarchy detected! Cannot assign a direct report as reporting manager.');
      return;
    }

    const dragEmp = allEmployeesList.find((e) => e.employeeId === dragKey);
    const dropEmp = allEmployeesList.find((e) => e.employeeId === dropKey);

    if (!dragEmp || !dropEmp) return;

    Modal.confirm({
      title: 'Change Reporting Manager?',
      icon: <ExclamationCircleOutlined style={{ color: '#0284c7' }} />,
      content: (
        <div>
          Are you sure you want to move <strong>{dragEmp.name}</strong> under manager <strong>{dropEmp.name}</strong>?
        </div>
      ),
      okText: 'Yes, Move Employee',
      okType: 'primary',
      cancelText: 'Cancel',
      onOk: () => {
        // Move node locally in tree structure
        const updatedTree = moveTreeNode(treeData, dragKey, dropKey, dropEmp.name);
        setTreeData(updatedTree);

        // Ensure dropKey parent is expanded in tree
        setExpandedKeys((prev) => Array.from(new Set([...prev, dropKey, dragKey])));

        setIsDirty(true);
        setPendingChanges((prev) => [
          ...prev.filter((c) => c.employeeId !== dragKey),
          { employeeId: dragKey, newManagerId: dropKey, employeeName: dragEmp.name, managerName: dropEmp.name },
        ]);
        message.info(`Moved ${dragEmp.name} under ${dropEmp.name}. Click "Save Hierarchy" to save to backend.`);
      },
    });
  };

  // Save Hierarchy changes
  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      for (const change of pendingChanges) {
        await updateOrganizationTree(change.employeeId, change.newManagerId);
      }
      message.success('Organization hierarchy saved successfully!');
      loadTree();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error saving hierarchy changes');
    } finally {
      setSaving(false);
    }
  };

  // Cancel Pending Changes
  const handleCancelChanges = () => {
    setTreeData(originalTreeData);
    setIsDirty(false);
    setPendingChanges([]);
    message.info('Hierarchy changes reverted.');
  };

  // Filtered Tree
  const filteredTree = filterTreeNodes(treeData, search, deptFilter, statusFilter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header & Controls Bar */}
      <Card bordered={false} style={{ borderRadius: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClusterOutlined style={{ fontSize: '20px', color: '#0284c7' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Company Organization Chart</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Interactive company reporting hierarchy and approval workflow mapping
              </p>
            </div>
          </div>

          <Space size={12} wrap>
            <Button icon={<ExpandOutlined />} onClick={handleExpandAll} style={{ borderRadius: '12px' }}>
              Expand All
            </Button>
            <Button icon={<CompressOutlined />} onClick={handleCollapseAll} style={{ borderRadius: '12px' }}>
              Collapse All
            </Button>
            {isSuperAdmin && (
              <>
                <Button
                  icon={<UndoOutlined />}
                  onClick={handleCancelChanges}
                  disabled={!isDirty}
                  style={{ borderRadius: '12px' }}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSaveChanges}
                  loading={saving}
                  disabled={!isDirty || saving}
                  style={{ borderRadius: '12px', background: '#0284c7', fontWeight: 'bold' }}
                >
                  Save Hierarchy
                </Button>
              </>
            )}
          </Space>
        </div>
      </Card>

      {/* Filter Bar */}
      <Card bordered={false} style={{ borderRadius: '20px' }} bodyStyle={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Input
            placeholder="Search employee, ID, title, or department..."
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '280px', borderRadius: '12px' }}
            allowClear
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FilterOutlined style={{ color: '#64748b' }} />
            <span style={{ fontSize: '12px', color: '#64748b' }}>Department:</span>
            <Select
              value={deptFilter}
              onChange={setDeptFilter}
              style={{ width: '160px', borderRadius: '12px' }}
            >
              <Select.Option value="ALL">All Departments</Select.Option>
              {departmentsList.map((d) => (
                <Select.Option key={d} value={d}>{d}</Select.Option>
              ))}
            </Select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Status:</span>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '140px', borderRadius: '12px' }}
            >
              <Select.Option value="ALL">All Status</Select.Option>
              <Select.Option value="Active">Active</Select.Option>
              <Select.Option value="Inactive">Inactive</Select.Option>
            </Select>
          </div>

          {isSuperAdmin && (
            <Tag color="blue" style={{ marginLeft: 'auto', borderRadius: '12px', padding: '4px 12px' }}>
              Drag & Drop Enabled (Super Admin)
            </Tag>
          )}
        </div>
      </Card>

      {/* Main Tree View */}
      <Card bordered={false} style={{ borderRadius: '24px', minHeight: '500px', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Spin size="large" />
            <Skeleton active style={{ marginTop: '24px' }} />
          </div>
        ) : (
          <div style={{ minWidth: '800px', padding: '16px' }}>
            <Tree
              draggable={isSuperAdmin ? { icon: false } : false}
              allowDrop={() => true}
              blockNode
              showLine={{ showLeafIcon: false }}
              expandedKeys={expandedKeys}
              autoExpandParent={autoExpandParent}
              onExpand={(keys) => {
                setExpandedKeys(keys);
                setAutoExpandParent(false);
              }}
              onDrop={onDrop}
              treeData={filteredTree.map((item) => renderTreeNode(item, isSuperAdmin, (n) => {
                setSelectedNode(n);
                setDrawerOpen(true);
              }, (n) => {
                setConfigNode(n);
                setConfigModalOpen(true);
              }))}
            />
          </div>
        )}
      </Card>

      {/* Employee Detail Drawer */}
      <EmployeeDrawer
        open={drawerOpen}
        node={selectedNode}
        isSuperAdmin={isSuperAdmin}
        onClose={() => setDrawerOpen(false)}
        onOpenConfig={(n) => {
          setConfigNode(n);
          setConfigModalOpen(true);
        }}
      />

      {/* Approval Config Modal */}
      <ApprovalConfigModal
        open={configModalOpen}
        node={configNode}
        allEmployees={allEmployeesList}
        onClose={() => setConfigModalOpen(false)}
        onSuccess={loadTree}
      />
    </div>
  );
}

// Recursive function to transform OrgTreeNode into AntD Tree format
function renderTreeNode(
  node: OrgTreeNode,
  isSuperAdmin: boolean,
  onSelect: (node: OrgTreeNode) => void,
  onOpenConfig: (node: OrgTreeNode) => void
): any {
  return {
    key: node.key,
    title: (
      <EmployeeNode
        node={node}
        isSuperAdmin={isSuperAdmin}
        onSelect={onSelect}
        onOpenConfig={onOpenConfig}
      />
    ),
    children: node.children && node.children.length > 0
      ? node.children.map((child) => renderTreeNode(child, isSuperAdmin, onSelect, onOpenConfig))
      : [],
  };
}
