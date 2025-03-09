export interface ReportOptions {
  customerId: string;
  startDate: Date;
  endDate: Date;
  reportType: 'timesheet' | 'invoice';
  exportFormat?: 'excel' | 'csv' | 'pdf';
}

export interface ProjectTimeData {
  projectId: string;
  projectName: string;
  totalHours: number;
  tasks: TaskTimeData[];
  totalCost?: number; // Only for invoice reports
}

export interface TaskTimeData {
  taskId: string;
  taskName: string;
  totalHours: number;
  entries: TimeEntryReportData[];
  totalCost?: number; // Only for invoice reports
}

export interface TimeEntryReportData {
  entryId: string;
  startTime: Date;
  duration: number; // Hours
  cost?: number; // Only for invoice reports
}

export interface ReportSummary {
  customerName: string;
  customerAddress?: string;
  userFullName: string;
  userEmail: string;
  generationDate: Date;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  totalHours: number;
  totalCost?: number; // Only for invoice reports
  projects: ProjectTimeData[];
}

export interface ReportRequest {
  customerId: string;
  year: number;
  month: number;
  reportType: 'timesheet' | 'invoice';
}

export interface ReportResponse {
  success: boolean;
  data?: ReportSummary;
  error?: string;
}

export interface ExportResponse {
  success: boolean;
  fileUrl?: string;
  error?: string;
} 