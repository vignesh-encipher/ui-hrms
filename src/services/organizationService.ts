import API from './api';

export interface OrgTreeNode {
  id: string;
  key: string;
  title: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone?: string;
  designation: string;
  department: string;
  managerId?: string;
  managerName?: string;
  hrApproverId?: string;
  hrApproverName?: string;
  status: string;
  photo?: string;
  joiningDate?: string;
  salary?: number;
  directReportsCount: number;
  children: OrgTreeNode[];
}

export interface ApprovalConfigData {
  employeeId: string;
  managerId?: string;
  hrApproverId?: string;
}

const DEFAULT_TREE: OrgTreeNode[] = [
  {
    id: 'EMP-001',
    key: 'EMP-001',
    title: 'Super Admin',
    employeeId: 'EMP-001',
    firstName: 'Super',
    lastName: 'Admin',
    name: 'Super Admin',
    email: 'admin@hrms.com',
    phone: '+1 555-0101',
    designation: 'Chief Executive Officer',
    department: 'Executive Board',
    managerName: 'Board of Directors',
    hrApproverId: 'EMP-002',
    hrApproverName: 'HR Manager',
    status: 'Active',
    joiningDate: '2024-01-15',
    salary: 15000,
    directReportsCount: 2,
    children: [
      {
        id: 'EMP-003',
        key: 'EMP-003',
        title: 'Team Manager',
        employeeId: 'EMP-003',
        firstName: 'Team',
        lastName: 'Manager',
        name: 'Team Manager',
        email: 'manager@hrms.com',
        phone: '+1 555-0103',
        designation: 'Engineering Lead',
        department: 'Engineering',
        managerId: 'EMP-001',
        managerName: 'Super Admin',
        hrApproverId: 'EMP-002',
        hrApproverName: 'HR Manager',
        status: 'Active',
        joiningDate: '2023-05-10',
        salary: 12000,
        directReportsCount: 1,
        children: [
          {
            id: 'EMP-004',
            key: 'EMP-004',
            title: 'Regular Employee',
            employeeId: 'EMP-004',
            firstName: 'Regular',
            lastName: 'Employee',
            name: 'Regular Employee',
            email: 'employee@hrms.com',
            phone: '+1 555-0104',
            designation: 'Software Engineer',
            department: 'Engineering',
            managerId: 'EMP-003',
            managerName: 'Team Manager',
            hrApproverId: 'EMP-002',
            hrApproverName: 'HR Manager',
            status: 'Active',
            joiningDate: '2026-01-10',
            salary: 6000,
            directReportsCount: 0,
            children: [],
          },
        ],
      },
      {
        id: 'EMP-002',
        key: 'EMP-002',
        title: 'HR Manager',
        employeeId: 'EMP-002',
        firstName: 'HR',
        lastName: 'Manager',
        name: 'HR Manager',
        email: 'hr@hrms.com',
        phone: '+1 555-0102',
        designation: 'HR Director',
        department: 'Human Resources',
        managerId: 'EMP-001',
        managerName: 'Super Admin',
        hrApproverId: 'EMP-002',
        hrApproverName: 'HR Manager',
        status: 'Active',
        joiningDate: '2025-02-01',
        salary: 9000,
        directReportsCount: 0,
        children: [],
      },
    ],
  },
];

export const getOrganizationTree = async (): Promise<OrgTreeNode[]> => {
  try {
    const res = await API.get('/organization/tree');
    return res.data && res.data.length > 0 ? res.data : DEFAULT_TREE;
  } catch (err) {
    return DEFAULT_TREE;
  }
};

export const updateOrganizationTree = async (employeeId: string, newManagerId?: string, newHrApproverId?: string): Promise<string> => {
  const res = await API.put('/organization/tree', {
    employeeId,
    newManagerId,
    newHrApproverId,
  });
  return res.data;
};

export const getApprovalConfig = async (employeeId: string): Promise<ApprovalConfigData> => {
  try {
    const res = await API.get(`/organization/approval-config/${employeeId}`);
    return res.data;
  } catch (err) {
    return { employeeId, managerId: 'EMP-003', hrApproverId: 'EMP-002' };
  }
};

export const updateApprovalConfig = async (employeeId: string, managerId?: string, hrApproverId?: string): Promise<any> => {
  const res = await API.put(`/organization/approval-config/${employeeId}`, {
    managerId,
    hrApproverId,
  });
  return res.data;
};
