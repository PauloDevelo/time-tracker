export interface ReportOptions {
  customerId: string;
  startDate: Date;
  endDate: Date;
  reportType: 'timesheet' | 'invoice';
  exportFormat?: 'excel' | 'csv' | 'pdf';
}

export interface TaskTimeData {
  taskId: string;
  taskName: string;
  totalHours: number;
  totalCost?: number;
}

export interface ProjectTimeData {
  projectId: string;
  projectName: string;
  totalHours: number;
  totalCost?: number;
  tasks: TaskTimeData[];
}

export interface ContractTimeData {
  contractId: string | null;
  contractName: string;
  dailyRate: number;
  currency: string;
  totalHours: number;
  totalCost?: number;
  projects: ProjectTimeData[];
}

export interface ReportSummary {
  reportId?: string;
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
  totalCost?: number;
  contracts: ContractTimeData[];
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
