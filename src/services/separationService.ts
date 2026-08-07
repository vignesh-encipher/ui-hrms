import API from './api';

export interface Clearance {
  department: string; // HR, IT, Admin, Finance
  done: boolean;
  notes?: string;
}

export interface AssetReturn {
  assetTag: string;
  description: string;
  returned: boolean;
}

export interface FullAndFinal {
  salaryTillLwd?: number;
  leaveEncashment?: number;
  gratuity?: number;
  recoveries?: number;
  netPayable?: number;
}

export interface ApprovalAuditLog {
  approverId?: string;
  approverName?: string;
  approverRole?: string;
  action?: string;
  timestamp?: string;
  comments?: string;
  level?: number;
}

export interface SeparationRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  role?: string;
  department?: string;
  resignationDate?: string;
  lastWorkingDay?: string;
  noticePeriod?: number;
  reason?: string;
  status: string;
  clearances: Clearance[];
  assetReturns: AssetReturn[];
  fullAndFinal?: FullAndFinal;
  auditLogs?: ApprovalAuditLog[];
}

export const submitResignation = async (payload: Partial<SeparationRequest>): Promise<SeparationRequest> => {
  const res = await API.post('/separations/resign', payload);
  return res.data;
};

export const getSeparationById = async (id: string): Promise<SeparationRequest> => {
  const res = await API.get(`/separations/${id}`);
  return res.data;
};

export const getAllSeparations = async (): Promise<SeparationRequest[]> => {
  const res = await API.get('/separations');
  return res.data;
};

export const toggleClearance = async (
  id: string,
  department: string,
  done: boolean,
  notes?: string
): Promise<SeparationRequest> => {
  const res = await API.post(`/separations/${id}/clearance`, null, {
    params: { department, done, notes },
  });
  return res.data;
};

export const toggleAssetReturn = async (
  id: string,
  assetTag: string,
  returned: boolean
): Promise<SeparationRequest> => {
  const res = await API.post(`/separations/${id}/asset-return`, null, {
    params: { assetTag, returned },
  });
  return res.data;
};

export const generateFullAndFinal = async (
  id: string,
  fullAndFinal: FullAndFinal
): Promise<SeparationRequest> => {
  const res = await API.post(`/separations/${id}/full-and-final`, fullAndFinal);
  return res.data;
};

export const approveSeparation = async (
  id: string,
  role: string,
  remarks?: string
): Promise<SeparationRequest> => {
  const res = await API.post(`/separations/${id}/approve`, null, {
    params: { role, remarks },
  });
  return res.data;
};

export const rejectSeparation = async (
  id: string,
  role: string,
  remarks?: string
): Promise<SeparationRequest> => {
  const res = await API.post(`/separations/${id}/reject`, null, {
    params: { role, remarks },
  });
  return res.data;
};
