import API from './api';

export interface JobOpening {
  id?: string;
  title: string;
  department: string;
  designation: string;
  positions: number;
  status: 'Open' | 'Closed';
  requisitionId?: string;
  description?: string;
  location?: string;
}

export interface InterviewFeedback {
  round: string;
  interviewerName: string;
  score: number; // 1-5
  comments?: string;
  submittedAt?: string;
}

export type CandidateStage = 'Applied' | 'Screening' | 'Interview' | 'Offer' | 'Joined' | 'Rejected';

export interface Candidate {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  jobId: string;
  experience?: number;
  source: 'Naukri' | 'LinkedIn' | 'Referral' | 'Career page' | 'Consultant';
  currentCtc?: number;
  expectedCtc?: number;
  noticePeriod?: string;
  resumeUrl?: string;
  stage: CandidateStage;
  rejectionReason?: string;
  feedbackList?: InterviewFeedback[];
}

export interface Interview {
  id?: string;
  candidateId: string;
  roundName: string;
  panel: string[];
  scheduledAt: string;
  mode: 'Google Meet' | 'In person' | 'Phone' | 'Teams';
  status?: 'Scheduled' | 'Completed' | 'Cancelled';
}

// ---------- Job Openings ----------

export const getJobOpenings = async (): Promise<JobOpening[]> => {
  const res = await API.get('/recruitment/jobs');
  return res.data;
};

export const createJobOpening = async (job: JobOpening): Promise<JobOpening> => {
  const res = await API.post('/recruitment/jobs', job);
  return res.data;
};

export const updateJobOpening = async (id: string, job: JobOpening): Promise<JobOpening> => {
  const res = await API.put(`/recruitment/jobs/${id}`, job);
  return res.data;
};

export const deleteJobOpening = async (id: string): Promise<void> => {
  await API.delete(`/recruitment/jobs/${id}`);
};

// ---------- Candidates ----------

export const getCandidates = async (jobId?: string, stage?: string): Promise<Candidate[]> => {
  const res = await API.get('/recruitment/candidates', { params: { jobId, stage } });
  return res.data;
};

export const addCandidate = async (candidate: Candidate): Promise<Candidate> => {
  const res = await API.post('/recruitment/candidates', candidate);
  return res.data;
};

export const moveToNextStage = async (id: string): Promise<Candidate> => {
  const res = await API.post(`/recruitment/candidates/${id}/next-stage`);
  return res.data;
};

export const updateCandidateStage = async (id: string, stage: CandidateStage): Promise<Candidate> => {
  const res = await API.post(`/recruitment/candidates/${id}/stage`, null, { params: { stage } });
  return res.data;
};

export const rejectCandidate = async (id: string, reason?: string): Promise<Candidate> => {
  const res = await API.post(`/recruitment/candidates/${id}/reject`, null, { params: { reason } });
  return res.data;
};

export const addFeedback = async (candidateId: string, feedback: InterviewFeedback): Promise<Candidate> => {
  const res = await API.post(`/recruitment/candidates/${candidateId}/feedback`, feedback);
  return res.data;
};

// ---------- Interviews ----------

export const getInterviews = async (): Promise<Interview[]> => {
  const res = await API.get('/recruitment/interviews');
  return res.data;
};

export const scheduleInterview = async (interview: Interview): Promise<Interview> => {
  const res = await API.post('/recruitment/interviews', interview);
  return res.data;
};

export const updateInterviewStatus = async (id: string, status: string): Promise<Interview> => {
  const res = await API.post(`/recruitment/interviews/${id}/status`, null, { params: { status } });
  return res.data;
};
