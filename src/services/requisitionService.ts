import API from './api';

export interface ApprovalAuditLog {
  approverId?: string;
  approverName?: string;
  approverRole: string;
  action: string;
  timestamp: string;
  comments?: string;
  level: number;
}

export interface Requisition {
  id: string;
  roleTitle: string;
  department: string;
  requestType: 'New Position' | 'Replacement' | 'Contract' | 'Intern' | 'Consultant';
  numberOfPositions: number;
  budgetedCtcMin?: string;
  budgetedCtcMax?: string;
  businessUnit?: string;
  workLocation?: string;
  grade?: string;
  minimumExperience?: string;
  requiredSkills?: string[];
  businessJustification: string;

  raisedByEmployeeId: string;
  raisedByName?: string;
  raisedDate?: string;
  targetJoiningDate?: string;

  status: string;
  totalLevels?: number;
  currentLevel?: number;

  level1ApproverId?: string;
  level1ApproverName?: string;
  level1Role?: string;
  level1Status?: string;
  level1Remarks?: string;

  level2ApproverId?: string;
  level2ApproverName?: string;
  level2Role?: string;
  level2Status?: string;
  level2Remarks?: string;

  level3ApproverId?: string;
  level3ApproverName?: string;
  level3Role?: string;
  level3Status?: string;
  level3Remarks?: string;

  level4ApproverId?: string;
  level4ApproverName?: string;
  level4Role?: string;
  level4Status?: string;
  level4Remarks?: string;

  level5ApproverId?: string;
  level5ApproverName?: string;
  level5Role?: string;
  level5Status?: string;
  level5Remarks?: string;

  auditLogs?: ApprovalAuditLog[];
}

export interface RaiseRequisitionPayload {
  roleTitle: string;
  department: string;
  requestType: string;
  numberOfPositions: number;
  budgetedCtcMin?: string;
  budgetedCtcMax?: string;
  businessUnit?: string;
  workLocation?: string;
  grade?: string;
  minimumExperience?: string;
  requiredSkills?: string[];
  businessJustification: string;
  raisedByEmployeeId: string;
  targetJoiningDate?: string;
}

export const raiseRequisition = async (payload: RaiseRequisitionPayload): Promise<Requisition> => {
  const res = await API.post('/requisitions/raise', payload);
  return res.data;
};

export const approveRequisition = async (id: string, role: string, remarks?: string): Promise<Requisition> => {
  const res = await API.post(`/requisitions/approve/${id}`, null, { params: { role, remarks } });
  return res.data;
};

export const rejectRequisition = async (id: string, role: string, remarks?: string): Promise<Requisition> => {
  const res = await API.post(`/requisitions/reject/${id}`, null, { params: { role, remarks } });
  return res.data;
};

export const getAllRequisitions = async (): Promise<Requisition[]> => {
  const res = await API.get('/requisitions');
  return res.data;
};

export const getPendingRequisitions = async (): Promise<Requisition[]> => {
  const res = await API.get('/requisitions/pending');
  return res.data;
};

export const getRequisitionById = async (id: string): Promise<Requisition> => {
  const res = await API.get(`/requisitions/${id}`);
  return res.data;
};

export const getRequisitionsByRequester = async (employeeId: string): Promise<Requisition[]> => {
  const res = await API.get(`/requisitions/requester/${employeeId}`);
  return res.data;
};
