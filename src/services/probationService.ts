import API from './api';

export interface RatingItem {
  criterion: string;
  score: number; // 1-5
}

export interface ApprovalAuditLogItem {
  approverId?: string;
  approverName?: string;
  approverRole?: string;
  action: string;
  timestamp: string;
  comments?: string;
  level?: number;
}

export interface ProbationRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  designation?: string;
  dateOfJoining: string;
  probationMonths: number;
  confirmationDueDate: string;
  status: 'Upcoming' | 'Manager Review' | 'Confirmed' | 'Probation Extended' | 'Terminated' | string;
  ratings?: RatingItem[];
  decisionRemarks?: string;
  decisionDate?: string;
  payrollNotificationStatus?: string;
  auditLogs?: ApprovalAuditLogItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface EvaluationPayload {
  ratings: RatingItem[];
}

export interface DecisionPayload {
  decisionType: 'CONFIRM' | 'EXTEND' | 'TERMINATE';
  extendByMonths?: number;
  remarks: string;
}

export interface CreateProbationPayload {
  employeeId: string;
  employeeName: string;
  designation?: string;
  dateOfJoining: string;
  probationMonths?: number;
}

export const getProbationRecords = async (filter?: 'due-soon' | 'overdue' | 'all'): Promise<ProbationRecord[]> => {
  const res = await API.get('/probation', { params: filter ? { filter } : undefined });
  return res.data;
};

export const getProbationRecordById = async (id: string): Promise<ProbationRecord> => {
  const res = await API.get(`/probation/${id}`);
  return res.data;
};

export const createProbationRecord = async (payload: CreateProbationPayload): Promise<ProbationRecord> => {
  const res = await API.post('/probation', payload);
  return res.data;
};

export const submitProbationEvaluation = async (id: string, ratings: RatingItem[]): Promise<ProbationRecord> => {
  const res = await API.post(`/probation/${id}/evaluate`, ratings);
  return res.data;
};

export const submitProbationDecision = async (id: string, payload: DecisionPayload): Promise<ProbationRecord> => {
  const res = await API.post(`/probation/${id}/decision`, payload);
  return res.data;
};
