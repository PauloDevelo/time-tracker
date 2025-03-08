export interface TimeEntry {
  _id: string;
  startTime: string; // ISO date string in UTC
  totalDurationInHour: number; // Duration in hours
  taskId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntryCreateRequest {
  startTime: string;
  totalDurationInHour: number;
  taskId: string;
}

export interface TimeEntryUpdateRequest {
  _id: string;
  startTime?: string;
  totalDurationInHour?: number;
  taskId?: string;
}

export interface ActiveTimeTracking {
  taskId: string;
  startedAt: Date;
} 