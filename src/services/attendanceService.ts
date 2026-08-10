import API from './api';

export interface AttendanceSession {
  checkIn: string;
  checkOut?: string | null;
}

export interface AttendanceBreak {
  startTime: string;
  endTime?: string | null;
}

export interface Attendance {
  id?: string;
  employeeId: string;
  date: string;
  shiftId?: string;
  sessions: AttendanceSession[];
  breaks: AttendanceBreak[];
  totalDurationMinutes?: number;
  totalBreakMinutes?: number;
  effectiveWorkingMinutes?: number;
  overtimeMinutes?: number;
  lateMinutes?: number;
  earlyCheckoutMinutes?: number;
  status: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceStatusDto {
  attendance: Attendance | null;
  currentStatus: 'Working' | 'OnBreak' | 'CheckedOut' | 'NotCheckedIn' | string;
  checkedIn: boolean;
  onBreak: boolean;
  workingMinutesSoFar: number;
  breakMinutesSoFar: number;
  requiredWorkingMinutes: number;
  remainingMinutes: number;
}

export interface MonthlyAttendanceSummaryDto {
  employeeId: string;
  month: number;
  year: number;
  workingDays: number;
  present: number;
  absent: number;
  leave: number;
  lateCount: number;
  earlyCheckoutCount: number;
  totalOvertimeMinutes: number;
  averageEffectiveWorkingMinutes: number;
}

export interface TeamAttendanceDto {
  employeeId: string;
  employeeName: string;
  status: string;
  checkIn?: string | null;
  checkOut?: string | null;
  workingMinutes?: number | null;
}

export interface Shift {
  id?: string;
  name: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  standardBreakMinutes: number;
  maxBreakMinutes: number;
  requiredWorkingMinutes: number;
  overtimeThresholdMinutes: number;
  halfDayThresholdMinutes: number;
  lateThresholdMinutes: number;
  earlyCheckoutThresholdMinutes: number;
  weeklyOffDays: number[];
}

export const checkIn = async (): Promise<Attendance> => {
  const res = await API.post('/attendance/check-in');
  return res.data;
};

export const checkOut = async (): Promise<Attendance> => {
  const res = await API.post('/attendance/check-out');
  return res.data;
};

export const startBreak = async (): Promise<Attendance> => {
  const res = await API.post('/attendance/break/start');
  return res.data;
};

export const endBreak = async (): Promise<Attendance> => {
  const res = await API.post('/attendance/break/end');
  return res.data;
};

export const getToday = async (employeeId?: string): Promise<AttendanceStatusDto> => {
  const res = await API.get('/attendance/today', { params: employeeId ? { employeeId } : {} });
  return res.data;
};

export const getHistory = async (from: string, to: string, employeeId?: string): Promise<Attendance[]> => {
  const res = await API.get('/attendance/history', { params: { from, to, ...(employeeId ? { employeeId } : {}) } });
  return res.data || [];
};

export const getDayDetail = async (date: string): Promise<Attendance> => {
  const res = await API.get(`/attendance/${date}`);
  return res.data;
};

export const getMonthlySummary = async (month: number, year: number, employeeId?: string): Promise<MonthlyAttendanceSummaryDto> => {
  const res = await API.get('/attendance/monthly-summary', { params: { month, year, ...(employeeId ? { employeeId } : {}) } });
  return res.data;
};

export const getTeamAttendance = async (date: string, managerId?: string): Promise<TeamAttendanceDto[]> => {
  const res = await API.get('/attendance/team', { params: { date, ...(managerId ? { managerId } : {}) } });
  return res.data || [];
};

export interface MonthlyRegisterRowDto {
  employeeId: string;
  employeeCode: string;
  name: string;
  days: Record<string, string>;
  presentCount: number;
}

export const getMonthlyRegister = async (
  month: number,
  year: number,
  departmentId?: string,
): Promise<MonthlyRegisterRowDto[]> => {
  const res = await API.get('/attendance/monthly-register', {
    params: { month, year, ...(departmentId ? { departmentId } : {}) },
  });
  return res.data || [];
};

export const getDateWiseAttendance = async (date: string): Promise<Attendance[]> => {
  const res = await API.get('/attendance/date', { params: { date } });
  return res.data || [];
};

export const getShiftRules = async (): Promise<Shift[]> => {
  const res = await API.get('/attendance/rules');
  return res.data || [];
};

export const getShifts = async (): Promise<Shift[]> => {
  const res = await API.get('/attendance/shifts');
  return res.data || [];
};

export const createShift = async (shift: Shift): Promise<Shift> => {
  const res = await API.post('/attendance/shifts', shift);
  return res.data;
};

export const updateShift = async (id: string, shift: Shift): Promise<Shift> => {
  const res = await API.put(`/attendance/shifts/${id}`, shift);
  return res.data;
};
