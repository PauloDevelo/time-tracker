import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  ReportRequest, 
  ReportResponse, 
  ExportResponse, 
  ReportOptions
} from '../models/report.model';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = `${environment.apiUrl}/api/reports`;

  constructor(private http: HttpClient) { }

  // Generate a report for a specific customer and month
  generateReport(request: ReportRequest): Observable<ReportResponse> {
    return this.http.post<ReportResponse>(`${this.apiUrl}/generate`, request);
  }

  // Get a list of months that have time entries for a customer
  getAvailableReportMonths(customerId: string): Observable<{ year: number, month: number }[]> {
    return this.http.get<{ year: number, month: number }[]>(
      `${this.apiUrl}/available-months/${customerId}`
    );
  }

  // Export a report to the specified format (Excel, CSV, PDF)
  exportReport(options: ReportOptions): Observable<ExportResponse> {
    return this.http.post<ExportResponse>(`${this.apiUrl}/export`, options);
  }

  // Download an exported report
  downloadReport(fileUrl: string): Observable<Blob> {
    return this.http.get(fileUrl, { responseType: 'blob' });
  }

  // Helper method to get the first and last day of a month
  getMonthDateRange(year: number, month: number): { startDate: Date, endDate: Date } {
    // Month is 0-indexed in JavaScript Date (0 = January, 11 = December)
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month
    
    return { startDate, endDate };
  }

  // Helper method to format a date range for display
  formatDateRange(startDate: Date, endDate: Date): string {
    const start = startDate.toLocaleDateString();
    const end = endDate.toLocaleDateString();
    return `${start} - ${end}`;
  }

  // Helper method to compute the number of days in a month
  getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
  }
} 