import API from './api';

export interface ChecklistItem {
  item: string;
  done: boolean;
}

export interface PreOnboardingCandidate {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  designation?: string;
  dateOfJoining?: string;
  reportingManagerId?: string;
  workLocation?: string;
  shift?: string;
  bgvStatus?: 'Not Started' | 'In Progress' | 'Cleared' | string;
  documentsChecklist: ChecklistItem[];
  itAdminChecklist: ChecklistItem[];
  hrChecklist: ChecklistItem[];
  status?: string;
  convertedEmployeeId?: string;
  stage?: number;
}

export interface ConvertToEmployeePayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  departmentId?: string;
  designationId?: string;
  managerId?: string;
  joiningDate?: string;
  employmentType?: string;
  salary?: number;
  address?: string;
  emergencyContact?: string;
  status?: string;
  password: string;
  role?: string;
}

export const getPreOnboardingCandidates = async (): Promise<PreOnboardingCandidate[]> => {
  const res = await API.get('/pre-onboarding');
  return res.data;
};

export const getPreOnboardingCandidateById = async (id: string): Promise<PreOnboardingCandidate> => {
  const res = await API.get(`/pre-onboarding/${id}`);
  return res.data;
};

export const createPreOnboardingCandidate = async (
  payload: Partial<PreOnboardingCandidate>
): Promise<PreOnboardingCandidate> => {
  const res = await API.post('/pre-onboarding', payload);
  return res.data;
};

export const toggleChecklistItem = async (
  id: string,
  checklistType: 'documents' | 'itAdmin' | 'hr',
  item: string,
  done: boolean
): Promise<PreOnboardingCandidate> => {
  const res = await API.post(`/pre-onboarding/${id}/checklist/toggle`, null, {
    params: { checklistType, item, done },
  });
  return res.data;
};

export const updateBgvStatus = async (id: string, bgvStatus: string): Promise<PreOnboardingCandidate> => {
  const res = await API.post(`/pre-onboarding/${id}/bgv`, null, {
    params: { bgvStatus },
  });
  return res.data;
};

export const convertToEmployee = async (id: string, payload: ConvertToEmployeePayload): Promise<any> => {
  const res = await API.post(`/pre-onboarding/${id}/convert-to-employee`, payload);
  return res.data;
};

export const STAGE_LABELS = [
  'Offer Accepted',
  'Documents',
  'BGV',
  'IT Setup',
  'Ready to Join',
];
