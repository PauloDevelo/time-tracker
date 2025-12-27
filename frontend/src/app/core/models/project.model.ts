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
  contractId?: {
    _id: string;
    name: string;
    dailyRate: number;
    currency: string;
  } | string;  // Can be populated object or just ID
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCreateRequest {
  name: string;
  description?: string;
  customerId: string;
  contractId?: string;  // Optional, replaces billingOverride
  azureDevOps?: {
    projectName: string;
    projectId: string;
    enabled: boolean;
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
