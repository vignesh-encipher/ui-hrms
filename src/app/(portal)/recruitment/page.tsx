'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  Card,
  Row,
  Col,
  Button,
  Table,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  DatePicker,
  Tabs,
  Tag,
  Rate,
  Empty,
  Popconfirm,
} from 'antd';
import { PlusOutlined, CalendarOutlined, TeamOutlined, CommentOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import {
  JobOpening,
  Candidate,
  Interview,
  CandidateStage,
  getJobOpenings,
  createJobOpening,
  getCandidates,
  addCandidate,
  moveToNextStage,
  rejectCandidate,
  addFeedback,
  getInterviews,
  scheduleInterview,
} from '@/services/recruitmentService';

const STAGES: CandidateStage[] = ['Applied', 'Screening', 'Interview', 'Offer', 'Joined'];

const STAGE_COLORS: Record<string, string> = {
  Applied: '#0284c7',
  Screening: '#7c3aed',
  Interview: '#d97706',
  Offer: '#059669',
  Joined: '#10b981',
  Rejected: '#dc2626',
};

export default function RecruitmentPage() {
  const { roles } = useSelector((state: RootState) => state.auth);
  const canManage = roles.includes('ROLE_HR') || roles.includes('ROLE_RECRUITER') || roles.includes('ROLE_SUPER_ADMIN');

  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(false);

  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [jobForm] = Form.useForm();
  const [candidateForm] = Form.useForm();
  const [feedbackForm] = Form.useForm();
  const [interviewForm] = Form.useForm();

  const loadData = () => {
    setLoading(true);
    Promise.all([getJobOpenings(), getCandidates(), getInterviews()])
      .then(([j, c, i]) => {
        setJobs(j);
        setCandidates(c);
        setInterviews(i);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const getJobTitle = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    return job ? `${job.title} (${job.department})` : jobId;
  };

  const handleCreateJob = async (values: any) => {
    try {
      setSubmitting(true);
      await createJobOpening({
        title: values.title,
        department: values.department,
        designation: values.designation,
        positions: values.positions,
        status: 'Open',
        location: values.location,
        description: values.description,
      });
      message.success('Job opening created');
      setIsJobModalOpen(false);
      jobForm.resetFields();
      loadData();
    } catch {
      // handled globally
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCandidate = async (values: any) => {
    try {
      setSubmitting(true);
      await addCandidate({
        name: values.name,
        email: values.email,
        phone: values.phone,
        jobId: values.jobId,
        experience: values.experience,
        source: values.source,
        currentCtc: values.currentCtc,
        expectedCtc: values.expectedCtc,
        noticePeriod: values.noticePeriod,
        stage: 'Applied',
      });
      message.success('Candidate added');
      setIsCandidateModalOpen(false);
      candidateForm.resetFields();
      loadData();
    } catch {
      // handled globally
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveNext = async (candidate: Candidate) => {
    try {
      await moveToNextStage(candidate.id!);
      message.success(`${candidate.name} moved to next stage`);
      loadData();
    } catch {
      // handled globally
    }
  };

  const handleReject = async (candidate: Candidate) => {
    try {
      await rejectCandidate(candidate.id!, 'Not a fit');
      message.success(`${candidate.name} rejected`);
      loadData();
    } catch {
      // handled globally
    }
  };

  const handleAddFeedback = async (values: any) => {
    if (!selectedCandidate) return;
    try {
      setSubmitting(true);
      await addFeedback(selectedCandidate.id!, {
        round: values.round,
        interviewerName: values.interviewerName,
        score: values.score,
        comments: values.comments,
      });
      message.success('Feedback added');
      setIsFeedbackModalOpen(false);
      feedbackForm.resetFields();
      setSelectedCandidate(null);
      loadData();
    } catch {
      // handled globally
    } finally {
      setSubmitting(false);
    }
  };

  const handleScheduleInterview = async (values: any) => {
    try {
      setSubmitting(true);
      await scheduleInterview({
        candidateId: values.candidateId,
        roundName: values.roundName,
        panel: values.panel ? values.panel.split(',').map((p: string) => p.trim()) : [],
        scheduledAt: values.scheduledAt.format('YYYY-MM-DDTHH:mm:ss'),
        mode: values.mode,
      });
      message.success('Interview scheduled');
      setIsInterviewModalOpen(false);
      interviewForm.resetFields();
      loadData();
    } catch {
      // handled globally
    } finally {
      setSubmitting(false);
    }
  };

  const getCandidateName = (candidateId: string) => {
    const c = candidates.find(c => c.id === candidateId);
    return c ? c.name : candidateId;
  };

  const kanbanTab = (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <Row gutter={16} style={{ minWidth: 1100 }} wrap={false}>
        {STAGES.map(stage => {
          const stageCandidates = candidates.filter(c => c.stage === stage);
          return (
            <Col key={stage} style={{ minWidth: 220, flex: '1 0 220px' }}>
              <Card
                size="small"
                bordered={false}
                style={{ borderRadius: 16, background: '#f8fafc', minHeight: 400 }}
                title={
                  <span style={{ color: STAGE_COLORS[stage], fontWeight: 700 }}>
                    {stage} ({stageCandidates.length})
                  </span>
                }
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {stageCandidates.length === 0 && <Empty description="No candidates" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                  {stageCandidates.map(c => (
                    <Card
                      key={c.id}
                      size="small"
                      style={{ borderRadius: 12, borderLeft: `4px solid ${STAGE_COLORS[stage]}` }}
                    >
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{getJobTitle(c.jobId)}</div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                        <Tag>{c.source}</Tag>
                        {c.experience != null && <Tag>{c.experience} yrs</Tag>}
                      </div>
                      {canManage && (
                        <Space size={4} style={{ marginTop: 8 }}>
                          <Button
                            size="small"
                            onClick={() => {
                              setSelectedCandidate(c);
                              setIsFeedbackModalOpen(true);
                            }}
                            icon={<CommentOutlined />}
                          />
                          {stage !== 'Joined' && (
                            <Button size="small" type="primary" onClick={() => handleMoveNext(c)} style={{ background: '#0284c7' }}>
                              Advance
                            </Button>
                          )}
                          <Popconfirm title="Reject this candidate?" onConfirm={() => handleReject(c)}>
                            <Button size="small" danger icon={<CloseOutlined />} />
                          </Popconfirm>
                        </Space>
                      )}
                    </Card>
                  ))}
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );

  const jobsTab = (
    <Table
      size="small"
      dataSource={jobs}
      rowKey="id"
      loading={loading}
      pagination={{ pageSize: 10 }}
      columns={[
        { title: 'Title', dataIndex: 'title', key: 'title' },
        { title: 'Department', dataIndex: 'department', key: 'department' },
        { title: 'Designation', dataIndex: 'designation', key: 'designation' },
        { title: 'Positions', dataIndex: 'positions', key: 'positions', width: 90 },
        { title: 'Location', dataIndex: 'location', key: 'location' },
        {
          title: 'Status',
          dataIndex: 'status',
          key: 'status',
          render: (status: string) => <Tag color={status === 'Open' ? 'green' : 'default'}>{status}</Tag>,
        },
      ]}
    />
  );

  const interviewsTab = (
    <Table
      size="small"
      dataSource={interviews}
      rowKey="id"
      loading={loading}
      pagination={{ pageSize: 10 }}
      columns={[
        { title: 'Candidate', key: 'candidate', render: (_: any, r: Interview) => getCandidateName(r.candidateId) },
        { title: 'Round', dataIndex: 'roundName', key: 'roundName' },
        { title: 'Panel', key: 'panel', render: (_: any, r: Interview) => (r.panel || []).join(', ') },
        {
          title: 'Scheduled At',
          dataIndex: 'scheduledAt',
          key: 'scheduledAt',
          render: (val: string) => (val ? dayjs(val).format('DD MMM YYYY, HH:mm') : '-'),
        },
        { title: 'Mode', dataIndex: 'mode', key: 'mode' },
        {
          title: 'Status',
          dataIndex: 'status',
          key: 'status',
          render: (status: string) => <Tag color={status === 'Completed' ? 'green' : status === 'Cancelled' ? 'red' : 'blue'}>{status}</Tag>,
        },
      ]}
    />
  );

  const tabItems = [
    {
      key: 'board',
      label: (
        <span>
          <TeamOutlined /> Candidate Pipeline
        </span>
      ),
      children: kanbanTab,
    },
    {
      key: 'jobs',
      label: (
        <span>
          <PlusOutlined /> Job Openings
        </span>
      ),
      children: jobsTab,
    },
    {
      key: 'interviews',
      label: (
        <span>
          <CalendarOutlined /> Interviews
        </span>
      ),
      children: interviewsTab,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card bordered={false} style={{ borderRadius: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Recruitment / ATS</h2>
          {canManage && (
            <Space>
              <Button icon={<PlusOutlined />} onClick={() => setIsJobModalOpen(true)} style={{ borderRadius: 12 }}>
                New Job Opening
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsCandidateModalOpen(true)}
                style={{ borderRadius: 12, background: '#0284c7' }}
              >
                Add Candidate
              </Button>
              <Button icon={<CalendarOutlined />} onClick={() => setIsInterviewModalOpen(true)} style={{ borderRadius: 12 }}>
                Schedule Interview
              </Button>
            </Space>
          )}
        </div>
        <Tabs defaultActiveKey="board" items={tabItems} size="large" />
      </Card>

      {/* New Job Opening Modal */}
      <Modal
        title="Create Job Opening"
        open={isJobModalOpen}
        onCancel={() => setIsJobModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={jobForm} layout="vertical" onFinish={handleCreateJob}>
          <Form.Item name="title" label="Job Title" rules={[{ required: true }]}>
            <Input style={{ borderRadius: 8 }} />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="department" label="Department" rules={[{ required: true }]}>
              <Input style={{ borderRadius: 8 }} />
            </Form.Item>
            <Form.Item name="designation" label="Designation" rules={[{ required: true }]}>
              <Input style={{ borderRadius: 8 }} />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="positions" label="Number of Positions" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: '100%', borderRadius: 8 }} />
            </Form.Item>
            <Form.Item name="location" label="Location">
              <Input style={{ borderRadius: 8 }} />
            </Form.Item>
          </div>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} style={{ borderRadius: 8 }} />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'end', gap: 12, marginTop: 16 }}>
            <Button onClick={() => setIsJobModalOpen(false)} style={{ borderRadius: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ borderRadius: 8, background: '#0284c7' }}>Create</Button>
          </div>
        </Form>
      </Modal>

      {/* Add Candidate Modal */}
      <Modal
        title="Add Candidate"
        open={isCandidateModalOpen}
        onCancel={() => setIsCandidateModalOpen(false)}
        footer={null}
        destroyOnClose
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Form form={candidateForm} layout="vertical" onFinish={handleAddCandidate}>
          <Form.Item name="name" label="Candidate Name" rules={[{ required: true }]}>
            <Input style={{ borderRadius: 8 }} />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="email" label="Email">
              <Input style={{ borderRadius: 8 }} />
            </Form.Item>
            <Form.Item name="phone" label="Phone">
              <Input style={{ borderRadius: 8 }} />
            </Form.Item>
          </div>
          <Form.Item name="jobId" label="Applied For (Job Opening)" rules={[{ required: true }]}>
            <Select
              options={jobs.map(j => ({ value: j.id, label: `${j.title} (${j.department})` }))}
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="experience" label="Experience (years)">
              <InputNumber min={0} step={0.5} style={{ width: '100%', borderRadius: 8 }} />
            </Form.Item>
            <Form.Item name="source" label="Source" rules={[{ required: true }]}>
              <Select
                options={['Naukri', 'LinkedIn', 'Referral', 'Career page', 'Consultant'].map(s => ({ value: s, label: s }))}
                style={{ borderRadius: 8 }}
              />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="currentCtc" label="Current CTC (LPA)">
              <InputNumber min={0} style={{ width: '100%', borderRadius: 8 }} />
            </Form.Item>
            <Form.Item name="expectedCtc" label="Expected CTC (LPA)">
              <InputNumber min={0} style={{ width: '100%', borderRadius: 8 }} />
            </Form.Item>
          </div>
          <Form.Item name="noticePeriod" label="Notice Period">
            <Input placeholder="e.g. 30 days" style={{ borderRadius: 8 }} />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'end', gap: 12, marginTop: 16 }}>
            <Button onClick={() => setIsCandidateModalOpen(false)} style={{ borderRadius: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ borderRadius: 8, background: '#0284c7' }}>Add</Button>
          </div>
        </Form>
      </Modal>

      {/* Add Feedback Modal */}
      <Modal
        title={`Add Interview Feedback${selectedCandidate ? ` — ${selectedCandidate.name}` : ''}`}
        open={isFeedbackModalOpen}
        onCancel={() => {
          setIsFeedbackModalOpen(false);
          setSelectedCandidate(null);
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={feedbackForm} layout="vertical" onFinish={handleAddFeedback}>
          <Form.Item name="round" label="Round" rules={[{ required: true }]}>
            <Input style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item name="interviewerName" label="Interviewer Name" rules={[{ required: true }]}>
            <Input style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item name="score" label="Score" rules={[{ required: true }]}>
            <Rate count={5} />
          </Form.Item>
          <Form.Item name="comments" label="Comments">
            <Input.TextArea rows={3} style={{ borderRadius: 8 }} />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'end', gap: 12, marginTop: 16 }}>
            <Button onClick={() => setIsFeedbackModalOpen(false)} style={{ borderRadius: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ borderRadius: 8, background: '#0284c7' }}>Submit</Button>
          </div>
        </Form>
      </Modal>

      {/* Schedule Interview Modal */}
      <Modal
        title="Schedule Interview"
        open={isInterviewModalOpen}
        onCancel={() => setIsInterviewModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={interviewForm} layout="vertical" onFinish={handleScheduleInterview}>
          <Form.Item name="candidateId" label="Candidate" rules={[{ required: true }]}>
            <Select
              options={candidates.map(c => ({ value: c.id, label: `${c.name} (${c.stage})` }))}
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
          <Form.Item name="roundName" label="Round Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Technical Round 1" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item name="panel" label="Panel (comma separated names)">
            <Input style={{ borderRadius: 8 }} />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="scheduledAt" label="Scheduled Date & Time" rules={[{ required: true }]}>
              <DatePicker showTime style={{ width: '100%', borderRadius: 8 }} />
            </Form.Item>
            <Form.Item name="mode" label="Mode" rules={[{ required: true }]}>
              <Select
                options={['Google Meet', 'In person', 'Phone', 'Teams'].map(m => ({ value: m, label: m }))}
                style={{ borderRadius: 8 }}
              />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', justifyContent: 'end', gap: 12, marginTop: 16 }}>
            <Button onClick={() => setIsInterviewModalOpen(false)} style={{ borderRadius: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ borderRadius: 8, background: '#0284c7' }}>Schedule</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
