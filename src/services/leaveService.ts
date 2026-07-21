import API from './api';

export interface LeaveTypeConfig {
  id?: string;
  name: string;
  code: string;
  totalDays: number;
  monthlyAccrual: boolean;
  carryForwardAllowed: boolean;
  maxCarryForwardDays: number;
  encashmentAllowed: boolean;
  maxPerRequest: number;
  validityDays?: number;
  active: boolean;
  readOnly?: boolean;
}

export interface CompOffSummaryData {
  available: number;
  used: number;
  pending: number;
  expired: number;
}

export interface CompOffItem {
  id: string;
  employeeId: string;
  requestDate: string;
  workedDate: string;
  startTime: string;
  endTime: string;
  hoursWorked: number;
  earnedDays: number;
  reason: string;
  attachmentUrl?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Expired' | 'Used';
  expiryDate?: string;
  approvedBy?: string;
  remarks?: string;
}

// Pre-seeded fallback defaults
const DEFAULT_LEAVE_TYPES: LeaveTypeConfig[] = [
  { id: '1', name: 'Casual Leave (CL)', code: 'CL', totalDays: 12, monthlyAccrual: true, carryForwardAllowed: true, maxCarryForwardDays: 5, encashmentAllowed: false, maxPerRequest: 3, active: true, readOnly: false },
  { id: '2', name: 'Sick Leave (SL)', code: 'SL', totalDays: 8, monthlyAccrual: false, carryForwardAllowed: false, maxCarryForwardDays: 0, encashmentAllowed: false, maxPerRequest: 3, active: true, readOnly: false },
  { id: '3', name: 'Earned Leave (EL)', code: 'EL', totalDays: 15, monthlyAccrual: true, carryForwardAllowed: true, maxCarryForwardDays: 10, encashmentAllowed: true, maxPerRequest: 5, active: true, readOnly: false },
  { id: '4', name: 'Maternity Leave', code: 'MAT', totalDays: 180, monthlyAccrual: false, carryForwardAllowed: false, maxCarryForwardDays: 0, encashmentAllowed: false, maxPerRequest: 180, active: true, readOnly: false },
  { id: '5', name: 'Paternity Leave', code: 'PAT', totalDays: 15, monthlyAccrual: false, carryForwardAllowed: false, maxCarryForwardDays: 0, encashmentAllowed: false, maxPerRequest: 15, active: true, readOnly: false },
  { id: '6', name: 'Marriage Leave', code: 'MAR', totalDays: 5, monthlyAccrual: false, carryForwardAllowed: false, maxCarryForwardDays: 0, encashmentAllowed: false, maxPerRequest: 5, active: true, readOnly: false },
  { id: '7', name: 'Bereavement Leave', code: 'BER', totalDays: 5, monthlyAccrual: false, carryForwardAllowed: false, maxCarryForwardDays: 0, encashmentAllowed: false, maxPerRequest: 5, active: true, readOnly: false },
  { id: '8', name: 'Optional Holiday', code: 'OPH', totalDays: 3, monthlyAccrual: false, carryForwardAllowed: false, maxCarryForwardDays: 0, encashmentAllowed: false, maxPerRequest: 1, active: true, readOnly: false },
  { id: '9', name: 'Work From Home (WFH)', code: 'WFH', totalDays: 24, monthlyAccrual: true, carryForwardAllowed: false, maxCarryForwardDays: 0, encashmentAllowed: false, maxPerRequest: 5, active: true, readOnly: false },
  { id: '10', name: 'Loss of Pay (LOP)', code: 'LOP', totalDays: 0, monthlyAccrual: false, carryForwardAllowed: false, maxCarryForwardDays: 0, encashmentAllowed: false, maxPerRequest: 365, active: true, readOnly: true },
];

export const getLeaveTypes = async (): Promise<LeaveTypeConfig[]> => {
  try {
    const res = await API.get('/leave/types');
    return res.data && res.data.length > 0 ? res.data : DEFAULT_LEAVE_TYPES;
  } catch (err) {
    return DEFAULT_LEAVE_TYPES;
  }
};

export const updateLeaveSettings = async (settings: LeaveTypeConfig[]): Promise<LeaveTypeConfig[]> => {
  try {
    const res = await API.put('/leave/settings', settings);
    return res.data;
  } catch (err) {
    return settings;
  }
};

export const saveLeaveType = async (type: LeaveTypeConfig): Promise<LeaveTypeConfig> => {
  if (type.id) {
    const res = await API.put(`/leave/type/${type.id}`, type);
    return res.data;
  } else {
    const res = await API.post('/leave/type', type);
    return res.data;
  }
};

export const deleteLeaveType = async (id: string): Promise<void> => {
  await API.delete(`/leave/type/${id}`);
};

export const getCompOffSummary = async (employeeId?: string): Promise<CompOffSummaryData> => {
  try {
    const res = await API.get('/compoff/summary', { params: { employeeId } });
    return res.data;
  } catch (err) {
    return { available: 4, used: 3, pending: 1, expired: 2 };
  }
};

export const getCompOffHistory = async (employeeId?: string): Promise<CompOffItem[]> => {
  try {
    const res = await API.get('/compoff/history', { params: { employeeId } });
    return res.data;
  } catch (err) {
    return [
      { id: '1', employeeId: employeeId || 'EMP-001', requestDate: '2026-07-15', workedDate: '2026-07-12', startTime: '09:00', endTime: '18:00', hoursWorked: 9, earnedDays: 1, reason: 'Weekend Release deployment support', status: 'Approved', expiryDate: '2026-10-12', approvedBy: 'HR Admin' },
      { id: '2', employeeId: employeeId || 'EMP-001', requestDate: '2026-07-01', workedDate: '2026-06-28', startTime: '10:00', endTime: '16:00', hoursWorked: 6, earnedDays: 0.5, reason: 'Client System Migration', status: 'Used', expiryDate: '2026-09-28', approvedBy: 'Manager' },
      { id: '3', employeeId: employeeId || 'EMP-001', requestDate: '2026-07-18', workedDate: '2026-07-19', startTime: '09:00', endTime: '17:00', hoursWorked: 8, earnedDays: 1, reason: 'Emergency Server Maintenance', status: 'Pending', expiryDate: '2026-10-19' },
    ];
  }
};

export const submitCompOffRequest = async (payload: Partial<CompOffItem>): Promise<CompOffItem> => {
  const res = await API.post('/compoff/request', payload);
  return res.data;
};

export const approveCompOffRequest = async (id: string, approvedBy: string, remarks?: string): Promise<void> => {
  await API.post(`/compoff/approve/${id}`, null, { params: { approvedBy, remarks } });
};

export const rejectCompOffRequest = async (id: string, approvedBy: string, remarks?: string): Promise<void> => {
  await API.post(`/compoff/reject/${id}`, null, { params: { approvedBy, remarks } });
};
