export interface Project {
  _id: string;
  name: string;
  description?: string;
  customerId: {
    _id: string;
    name: string;
  };
  startDate?: string;
  endDate?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCreateRequest {
  name: string;
  description?: string;
  customerId: string;
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