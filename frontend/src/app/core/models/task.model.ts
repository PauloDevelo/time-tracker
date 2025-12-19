export interface Task {
  _id: string;
  name: string;
  description?: string;
  url?: string;
  projectId: string;
  userId: string;
  azureDevOps?: {
    workItemId: number;
    workItemType: 'Bug' | 'Task' | 'User Story';
    iterationPath: string;
    assignedTo?: string;
    lastSyncedAt: string;
    sourceUrl: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TaskCreateRequest {
  name: string;
  description?: string;
  url?: string;
  projectId: string;
}

export interface TaskUpdateRequest extends Partial<TaskCreateRequest> {
  _id: string;
}

export interface TaskWithProjectName extends Task {
  projectName: string;
}

export interface TasksByProject {
  project: {
    _id: string;
    name: string;
  };
  tasks: Task[];
} 