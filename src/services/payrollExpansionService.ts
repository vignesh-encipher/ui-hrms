import API from '@/services/api';

// ---------- Types ----------

export interface SalaryComponent {
  id: string;
  name: string;
  type: 'Earning' | 'Deduction' | string;
  calculationDescription: string;
  appliesTo: string;
  isStatutory: boolean;
  isPartOfCtc: boolean;
}

export interface SalaryRevision {
  id: string;
  employeeId: string;
  fromCtc: number;
  toCtc: number;
  effectiveDate: string; // ISO date
  reason: string;
  status: 'Pending approval' | 'Approved' | string;
  arrearsAmount: number;
}

export interface LoanAdvance {
  id: string;
  employeeId: string;
  kind: 'Salary advance' | 'Personal loan' | string;
  amount: number;
  emi: number;
  totalInstalments: number;
  instalmentsPaid: number;
  outstanding: number;
  status: 'Pending approval' | 'Recovering' | 'Closed' | string;
}

export interface PayrollRun {
  id: string;
  period: string;
  status: 'Draft' | 'Processing' | 'Approved' | 'Paid' | string;
  stage: number;
  processedDate?: string;
  processedBy?: string;
}

export interface BankAdviceRow {
  employeeName: string;
  bankAccount: string;
  netPay: number;
  reference: string;
}

// ---------- Salary Components ----------

export const listSalaryComponents = () => API.get<SalaryComponent[]>('/payroll/components');
export const createSalaryComponent = (data: Partial<SalaryComponent>) =>
  API.post<SalaryComponent>('/payroll/components', data);
export const getSalaryComponent = (id: string) => API.get<SalaryComponent>(`/payroll/components/${id}`);
export const updateSalaryComponent = (id: string, data: Partial<SalaryComponent>) =>
  API.put<SalaryComponent>(`/payroll/components/${id}`, data);
export const deleteSalaryComponent = (id: string) => API.delete(`/payroll/components/${id}`);

// ---------- Salary Revisions ----------

export const listSalaryRevisions = () => API.get<SalaryRevision[]>('/payroll/revisions');
export const createSalaryRevision = (data: Partial<SalaryRevision>) =>
  API.post<SalaryRevision>('/payroll/revisions', data);
export const getSalaryRevision = (id: string) => API.get<SalaryRevision>(`/payroll/revisions/${id}`);
export const approveSalaryRevision = (id: string) =>
  API.post<SalaryRevision>(`/payroll/revisions/approve/${id}`);

// ---------- Loans & Advances ----------

export const listLoanAdvances = () => API.get<LoanAdvance[]>('/payroll/loans');
export const createLoanAdvance = (data: Partial<LoanAdvance>) => API.post<LoanAdvance>('/payroll/loans', data);
export const getLoanAdvance = (id: string) => API.get<LoanAdvance>(`/payroll/loans/${id}`);
export const approveLoanAdvance = (id: string) => API.post<LoanAdvance>(`/payroll/loans/approve/${id}`);
export const recordLoanInstalment = (id: string) =>
  API.post<LoanAdvance>(`/payroll/loans/recordInstalment/${id}`);

// ---------- Payroll Runs ----------

export const listPayrollRuns = () => API.get<PayrollRun[]>('/payroll/runs');
export const createPayrollRun = (data: Partial<PayrollRun>) => API.post<PayrollRun>('/payroll/runs', data);
export const getPayrollRun = (id: string) => API.get<PayrollRun>(`/payroll/runs/${id}`);
export const advancePayrollRunStage = (id: string) => API.post<PayrollRun>(`/payroll/runs/advanceStage/${id}`);

// ---------- Bank Advice ----------

export const getBankAdvice = (period: string) => API.get<BankAdviceRow[]>(`/payroll/bank-advice/${period}`);
