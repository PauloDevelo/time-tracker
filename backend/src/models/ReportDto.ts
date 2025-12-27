// DTO interfaces for report endpoints

// Request DTO for generating a report
export interface GenerateReportRequest {
  customerId: string;
  year: number;
  month: number;
  reportType: 'timesheet' | 'invoice';
}

// Task summary in report
export interface TaskSummary {
  taskId: string;
  taskName: string;
  totalHours: number;
  totalCost?: number; // Only for invoice reports
}

// Project summary in report
export interface ProjectSummary {
  projectId: string;
  projectName: string;
  totalHours: number;
  totalCost?: number; // Only for invoice reports
  tasks: TaskSummary[];
}

// Contract summary in report
export interface ContractSummary {
  contractId: string | null;
  contractName: string;
  dailyRate: number;
  currency: string;
  totalHours: number;
  totalCost?: number; // Only for invoice reports
  projects: ProjectSummary[];
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
  contracts: ContractSummary[];
}

// Generic response format for report endpoints
export interface ReportResponse {
  success: boolean;
  data?: ReportSummary;
  error?: string;
} 