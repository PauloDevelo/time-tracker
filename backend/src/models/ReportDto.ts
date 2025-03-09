// DTO interfaces for report endpoints

// Request DTO for generating a report
export interface GenerateReportRequest {
  customerId: string;
  year: number;
  month: number;
  reportType: 'timesheet' | 'invoice';
}

// Response DTO for successful report generation
export interface ReportSummary {
  reportId: string;
  reportType: 'timesheet' | 'invoice';
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
  projects: ProjectTimeDataDto[];
}

// Project time data in report summary
export interface ProjectTimeDataDto {
  projectId: string;
  projectName: string;
  totalHours: number;
  tasks: TaskTimeDataDto[];
  totalCost?: number; // Only for invoice reports
}

// Task time data in report summary
export interface TaskTimeDataDto {
  taskId: string;
  taskName: string;
  totalHours: number;
  totalCost?: number; // Only for invoice reports
}

// Generic response format for report endpoints
export interface ReportResponse {
  success: boolean;
  data?: ReportSummary;
  error?: string;
} 