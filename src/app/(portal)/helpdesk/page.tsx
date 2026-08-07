'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Space,
  Drawer,
  List,
  Avatar,
  Empty,
  message,
} from 'antd';
import {
  PlusOutlined,
  UserOutlined,
  CheckCircleOutlined,
  SendOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  Ticket,
  getAllTickets,
  raiseTicket,
  assignTicket,
  replyToTicket,
  resolveTicket,
} from '@/services/helpdeskService';

const CATEGORIES = ['HR', 'IT', 'Payroll', 'Finance', 'Admin'];
const PRIORITIES = ['Low', 'Medium', 'High'];
const STATUSES = ['Open', 'In progress', 'Resolved'];

const statusColor = (status: string) => {
  switch (status) {
    case 'Open':
      return 'blue';
    case 'In progress':
      return 'orange';
    case 'Resolved':
      return 'green';
    default:
      return 'default';
  }
};

const priorityColor = (priority: string) => {
  switch (priority) {
    case 'High':
      return 'red';
    case 'Medium':
      return 'gold';
    case 'Low':
      return 'default';
    default:
      return 'default';
  }
};

export default function HelpdeskPage() {
  const { employeeId, roles } = useSelector((state: RootState) => state.auth);

  const canAssignOrResolve =
    roles.includes('ROLE_SUPER_ADMIN') ||
    roles.includes('ROLE_HR') ||
    roles.includes('ROLE_FINANCE') ||
    roles.includes('ROLE_IT_ADMIN');

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const [isRaiseOpen, setIsRaiseOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await getAllTickets();
      setTickets(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (categoryFilter && t.category !== categoryFilter) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      return true;
    });
  }, [tickets, categoryFilter, statusFilter]);

  const handleRaiseTicket = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await raiseTicket(values);
      message.success('Ticket raised successfully');
      setIsRaiseOpen(false);
      form.resetFields();
      loadTickets();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Failed to raise ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const openTicketDrawer = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsDrawerOpen(true);
    setReplyMessage('');
  };

  const refreshSelectedTicket = (updated: Ticket) => {
    setSelectedTicket(updated);
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleAssign = async () => {
    if (!selectedTicket) return;
    setActionLoading(true);
    try {
      const updated = await assignTicket(selectedTicket.id);
      refreshSelectedTicket(updated);
      message.success('Ticket assigned to you');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to assign ticket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedTicket) return;
    setActionLoading(true);
    try {
      const updated = await resolveTicket(selectedTicket.id);
      refreshSelectedTicket(updated);
      message.success('Ticket resolved');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to resolve ticket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    setActionLoading(true);
    try {
      const updated = await replyToTicket(selectedTicket.id, replyMessage.trim());
      refreshSelectedTicket(updated);
      setReplyMessage('');
      message.success('Reply sent');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to send reply');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => <Tag>{category}</Tag>,
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => <Tag color={priorityColor(priority)}>{priority}</Tag>,
    },
    {
      title: 'SLA (hrs)',
      dataIndex: 'slaHours',
      key: 'slaHours',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={statusColor(status)}>{status}</Tag>,
    },
    {
      title: 'Assigned To',
      dataIndex: 'assignedToName',
      key: 'assignedToName',
      render: (name: string) => name || '-',
    },
    {
      title: 'Raised On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (date ? dayjs(date).format('DD MMM YYYY, HH:mm') : '-'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Ticket) => (
        <Button type="link" onClick={() => openTicketDrawer(record)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="HR Helpdesk"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsRaiseOpen(true)}>
            Raise Ticket
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="Filter by category"
            allowClear
            style={{ width: 180 }}
            options={CATEGORIES.map((c) => ({ label: c, value: c }))}
            value={categoryFilter}
            onChange={setCategoryFilter}
          />
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 180 }}
            options={STATUSES.map((s) => ({ label: s, value: s }))}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </Space>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={filteredTickets}
          locale={{ emptyText: <Empty description="No tickets found" /> }}
        />
      </Card>

      <Modal
        title="Raise a Ticket"
        open={isRaiseOpen}
        onCancel={() => setIsRaiseOpen(false)}
        onOk={handleRaiseTicket}
        confirmLoading={submitting}
        okText="Submit"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="subject"
            label="Subject"
            rules={[{ required: true, message: 'Subject is required' }]}
          >
            <Input placeholder="Brief summary of the issue" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Description is required' }]}
          >
            <Input.TextArea rows={4} placeholder="Describe the issue in detail" />
          </Form.Item>
          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: 'Category is required' }]}
          >
            <Select options={CATEGORIES.map((c) => ({ label: c, value: c }))} />
          </Form.Item>
          <Form.Item name="priority" label="Priority" initialValue="Medium">
            <Select options={PRIORITIES.map((p) => ({ label: p, value: p }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={selectedTicket?.subject}
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        width={480}
      >
        {selectedTicket && (
          <>
            <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
              <div>
                <Tag>{selectedTicket.category}</Tag>
                <Tag color={priorityColor(selectedTicket.priority)}>{selectedTicket.priority}</Tag>
                <Tag color={statusColor(selectedTicket.status)}>{selectedTicket.status}</Tag>
              </div>
              <div>
                <strong>Description:</strong>
                <div>{selectedTicket.description}</div>
              </div>
              <div>
                <strong>Raised By:</strong> {selectedTicket.raisedByName || selectedTicket.raisedByEmployeeId || '-'}
              </div>
              <div>
                <strong>SLA:</strong> {selectedTicket.slaHours} hrs
              </div>
              <div>
                <strong>Assigned To:</strong> {selectedTicket.assignedToName || 'Unassigned'}
              </div>
              {canAssignOrResolve && (
                <Space>
                  <Button
                    icon={<UserOutlined />}
                    onClick={handleAssign}
                    loading={actionLoading}
                    disabled={selectedTicket.status === 'Resolved'}
                  >
                    Assign to Me
                  </Button>
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={handleResolve}
                    loading={actionLoading}
                    disabled={selectedTicket.status === 'Resolved'}
                  >
                    Resolve
                  </Button>
                </Space>
              )}
            </Space>

            <Card title="Replies" size="small" style={{ marginBottom: 16 }}>
              <List
                dataSource={selectedTicket.replies || []}
                locale={{ emptyText: 'No replies yet' }}
                renderItem={(reply) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={reply.authorName || reply.authorId}
                      description={
                        <>
                          <div>{reply.message}</div>
                          <div style={{ fontSize: 12, color: '#888' }}>
                            {reply.timestamp ? dayjs(reply.timestamp).format('DD MMM YYYY, HH:mm') : ''}
                          </div>
                        </>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>

            <Space.Compact style={{ width: '100%' }}>
              <Input.TextArea
                rows={2}
                placeholder="Type a reply..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                disabled={selectedTicket.status === 'Resolved'}
              />
            </Space.Compact>
            <Button
              type="primary"
              icon={<SendOutlined />}
              style={{ marginTop: 8 }}
              onClick={handleReply}
              loading={actionLoading}
              disabled={!replyMessage.trim() || selectedTicket.status === 'Resolved'}
            >
              Send Reply
            </Button>
          </>
        )}
      </Drawer>
    </div>
  );
}
