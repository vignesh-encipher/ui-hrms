import API from './api';

export interface DayTypeResultDto {
  date: string;
  employeeId: string;
  dayType: 'WORKING' | 'WEEKLY_OFF' | 'PUBLIC_HOLIDAY' | 'SPECIAL_WORKING_DAY' | 'LEAVE' | string;
  reason?: string;
  source?: string;
}

export interface CalendarDayDto {
  date: string;
  dayType: 'WORKING' | 'WEEKLY_OFF' | 'PUBLIC_HOLIDAY' | 'SPECIAL_WORKING_DAY' | string;
  label?: string;
  source?: string;
}

export type WorkCalendarScope = 'ORGANIZATION' | 'LOCATION' | 'DEPARTMENT' | 'SHIFT' | 'EMPLOYEE';

export interface WorkCalendarRule {
  id?: string;
  scope: WorkCalendarScope;
  scopeRefId?: string | null;
  weeklyPattern: Record<string, 'WORKING' | 'OFF'>;
  saturdayPattern?: 'EVERY_WORKING' | 'EVERY_OFF' | 'FIRST_THIRD_WORKING' | 'SECOND_FOURTH_WORKING' | 'FIRST_THIRD_OFF' | 'CUSTOM' | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  createdBy?: string;
  createdAt?: string;
  active?: boolean;
}

export type SpecialDateAppliesToScope = 'ORGANIZATION' | 'DEPARTMENT' | 'EMPLOYEE';

export interface SpecialDateOverride {
  id?: string;
  date: string;
  dayType: 'WORKING' | 'OFF' | 'HOLIDAY';
  reason?: string;
  appliesToScope: SpecialDateAppliesToScope | string;
  appliesToRefId?: string | null;
  createdBy?: string;
  createdAt?: string;
}

export interface WeekendWorkPolicy {
  id?: string;
  treatAs: 'OVERTIME' | 'NORMAL_HOURS' | 'COMPENSATORY_OFF';
  requiresManagerApproval: boolean;
  requiresHrApproval: boolean;
  effectiveFrom?: string;
  createdBy?: string;
  createdAt?: string;
  active?: boolean;
}

export interface WorkCalendarAuditLog {
  id?: string;
  entityType: string;
  entityId: string;
  action: string;
  previousValue?: string;
  newValue?: string;
  changedBy?: string;
  changedAt?: string;
  reason?: string;
}

export const getDayType = async (date: string, employeeId?: string): Promise<DayTypeResultDto> => {
  const res = await API.get('/work-calendar/day-type', { params: { date, ...(employeeId ? { employeeId } : {}) } });
  return res.data;
};

export const getCalendarMonth = async (
  scope: WorkCalendarScope,
  month: number,
  year: number,
  scopeRefId?: string | null,
): Promise<CalendarDayDto[]> => {
  const res = await API.get('/work-calendar/month', {
    params: { scope, month, year, ...(scopeRefId ? { scopeRefId } : {}) },
  });
  return res.data || [];
};

export const getRules = async (
  scope: WorkCalendarScope,
  scopeRefId?: string | null,
  includeHistory = false,
): Promise<WorkCalendarRule[]> => {
  const res = await API.get('/work-calendar/rules', {
    params: { scope, includeHistory, ...(scopeRefId ? { scopeRefId } : {}) },
  });
  return res.data || [];
};

export const upsertRule = async (rule: WorkCalendarRule): Promise<WorkCalendarRule> => {
  const res = await API.post('/work-calendar/rules', rule);
  return res.data;
};

export const createSpecialDate = async (override: SpecialDateOverride): Promise<SpecialDateOverride> => {
  const res = await API.post('/work-calendar/special-dates', override);
  return res.data;
};

export const listSpecialDates = async (
  from: string,
  to: string,
  scope?: string,
  scopeRefId?: string | null,
): Promise<SpecialDateOverride[]> => {
  const res = await API.get('/work-calendar/special-dates', {
    params: { from, to, ...(scope ? { scope } : {}), ...(scopeRefId ? { scopeRefId } : {}) },
  });
  return res.data || [];
};

export const getWeekendPolicy = async (): Promise<WeekendWorkPolicy> => {
  const res = await API.get('/work-calendar/weekend-policy');
  return res.data;
};

export const upsertWeekendPolicy = async (policy: WeekendWorkPolicy): Promise<WeekendWorkPolicy> => {
  const res = await API.post('/work-calendar/weekend-policy', policy);
  return res.data;
};

export const getHistory = async (scope: WorkCalendarScope, scopeRefId?: string | null): Promise<WorkCalendarAuditLog[]> => {
  const res = await API.get('/work-calendar/history', {
    params: { scope, ...(scopeRefId ? { scopeRefId } : {}) },
  });
  return res.data || [];
};
