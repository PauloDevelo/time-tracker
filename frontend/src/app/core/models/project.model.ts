export interface Project {
  _id: string;
  name: string;
  description?: string;
  customerId: {
    _id: string;
    name: string;
  };
  azureDevOps?: {
    projectName: string;
    projectId: string;
    enabled: boolean;
    lastSyncedAt?: string;
  };
  billingOverride?: {
    dailyRate?: number;
    currency?: string;
  };
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCreateRequest {
  name: string;
  description?: string;
  customerId: string;
  azureDevOps?: {
    projectName: string;
    projectId: string;
    enabled: boolean;
  };
  billingOverride?: {
    dailyRate?: number;
    currency?: string;
  };
}

export interface ProjectUpdateRequest extends ProjectCreateRequest {
  _id: string;
}

export interface ProjectsByCustomer {
  customer: {
    _id: string;
    name: string;
  };
  projects: Project[];
} 