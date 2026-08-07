import API from './api';

export interface AssetHistoryEntry {
  employeeId: string;
  assignedOn: string;
  returnedOn?: string | null;
  conditionNotes?: string;
}

export interface Asset {
  id: string;
  assetTag: string;
  kind: string;
  model: string;
  assignedToEmployeeId?: string | null;
  assignedSince?: string | null;
  warrantyTill?: string | null;
  amcVendor?: string | null;
  status: string;
  history?: AssetHistoryEntry[];
}

export const ASSET_KINDS = ['Laptop', 'Desktop', 'Monitor', 'Keyboard', 'Mouse', 'ID Card', 'Phone'];
export const ASSET_STATUSES = ['In stock', 'Assigned', 'Recovery due', 'Retired'];

export const getAssets = async (filters?: { status?: string; kind?: string; employeeId?: string }) => {
  const res = await API.get<Asset[]>('/assets', { params: filters });
  return res.data;
};

export const getAssetById = async (id: string) => {
  const res = await API.get<Asset>(`/assets/${id}`);
  return res.data;
};

export const createAsset = async (asset: Partial<Asset>) => {
  const res = await API.post<Asset>('/assets', asset);
  return res.data;
};

export const assignAsset = async (id: string, employeeId: string, conditionNotes?: string) => {
  const res = await API.post<Asset>(`/assets/${id}/assign`, null, {
    params: { employeeId, conditionNotes },
  });
  return res.data;
};

export const returnAsset = async (id: string, conditionNotes?: string) => {
  const res = await API.post<Asset>(`/assets/${id}/return`, null, {
    params: { conditionNotes },
  });
  return res.data;
};

export const markRecoveryDue = async (id: string) => {
  const res = await API.post<Asset>(`/assets/${id}/recovery-due`);
  return res.data;
};
