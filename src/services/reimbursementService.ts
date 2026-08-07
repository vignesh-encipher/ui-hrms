import API from './api';

export interface ExpenseAuditLog {
  approverId?: string;
  approverName?: string;
  approverRole: string;
  action: string;
  timestamp: string;
  comments?: string;
  level: number;
}

export interface ExpenseClaim {
  id: string;
  employeeId: string;
  employeeName?: string;
  category: string;
  amount: number;
  expenseDate: string;
  costCentre?: string;
  description?: string;
  receiptFilePaths?: string[];
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
  policyBreach?: boolean;
  policyBreachReason?: string;
  auditLogs?: ExpenseAuditLog[];
  createdAt?: string;
  updatedAt?: string;
}

export const EXPENSE_CATEGORIES: string[] = [
  'Travel',
  'Accommodation',
  'Food & Meals',
  'Office Supplies',
  'Client Entertainment',
  'Communication',
  'Training & Development',
  'Miscellaneous',
];

export const submitClaim = async (formData: FormData): Promise<ExpenseClaim> => {
  const res = await API.post('/reimbursements/submit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const approveClaim = async (id: string, role: string, remarks?: string): Promise<ExpenseClaim> => {
  const res = await API.post(`/reimbursements/approve/${id}`, null, {
    params: { role, remarks },
  });
  return res.data;
};

export const rejectClaim = async (id: string, role: string, remarks?: string): Promise<ExpenseClaim> => {
  const res = await API.post(`/reimbursements/reject/${id}`, null, {
    params: { role, remarks },
  });
  return res.data;
};

export const markPaid = async (id: string): Promise<ExpenseClaim> => {
  const res = await API.post(`/reimbursements/mark-paid/${id}`);
  return res.data;
};

export const listClaims = async (): Promise<ExpenseClaim[]> => {
  try {
    const res = await API.get('/reimbursements/list');
    return res.data || [];
  } catch (err) {
    return [];
  }
};

export const getClaimById = async (id: string): Promise<ExpenseClaim | null> => {
  try {
    const res = await API.get(`/reimbursements/${id}`);
    return res.data;
  } catch (err) {
    return null;
  }
};

export const getMyClaims = async (employeeId: string): Promise<ExpenseClaim[]> => {
  try {
    const res = await API.get(`/reimbursements/employee/${employeeId}`);
    return res.data || [];
  } catch (err) {
    return [];
  }
};

export const getPendingClaims = async (): Promise<ExpenseClaim[]> => {
  try {
    const res = await API.get('/reimbursements/pending');
    return res.data || [];
  } catch (err) {
    return [];
  }
};
