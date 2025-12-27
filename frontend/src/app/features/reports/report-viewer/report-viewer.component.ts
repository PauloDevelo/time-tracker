import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';

import { ReportService } from '../../../core/services/report.service';
import { ReportSummary, ReportRequest, ReportOptions, ContractTimeData } from '../../../core/models/report.model';

@Component({
  selector: 'app-report-viewer',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTableModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatExpansionModule
  ],
  templateUrl: './report-viewer.component.html',
  styleUrl: './report-viewer.component.scss'
})
export class ReportViewerComponent implements OnInit {
  report: ReportSummary | null = null;
  reportRequest: ReportRequest | null = null;
  loading = false;
  error = '';
  
  // For contract data table
  contractsDisplayedColumns: string[] = ['contractName', 'dailyRate', 'totalHours'];
  
  // For project data table
  projectsDisplayedColumns: string[] = ['projectName', 'totalHours'];
  
  // For task data table
  tasksDisplayedColumns: string[] = ['taskName', 'totalHours'];
  
  constructor(
    private router: Router,
    private reportService: ReportService,
    private snackBar: MatSnackBar
  ) {
    // Get report data from router state
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.report = navigation.extras.state['report'];
      this.reportRequest = navigation.extras.state['request'];
    }
    
    // Add cost column for invoice reports
    if (this.reportRequest?.reportType === 'invoice') {
      this.contractsDisplayedColumns.push('totalCost');
      this.projectsDisplayedColumns.push('totalCost');
      this.tasksDisplayedColumns.push('totalCost');
    }
  }

  ngOnInit(): void {
    // If no report data in state, redirect back to generator
    if (!this.report || !this.reportRequest) {
      this.router.navigate(['/reports']);
    }
  }

  getDateRange(): string {
    if (!this.report) return '';
    
    const start = new Date(this.report.startDate).toLocaleDateString();
    const end = new Date(this.report.endDate).toLocaleDateString();
    return `${start} to ${end}`;
  }

  formatCurrency(amount: number | undefined, currency?: string): string {
    if (amount === undefined) return '';
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    });
  }

  formatDailyRate(contract: ContractTimeData): string {
    return this.formatCurrency(contract.dailyRate, contract.currency);
  }

  exportReport(format: 'excel' | 'csv' | 'pdf'): void {
    if (!this.reportRequest) return;
    
    this.loading = true;
    
    const { year, month, customerId, reportType } = this.reportRequest;
    const { startDate, endDate } = this.reportService.getMonthDateRange(year, month);
    
    const exportOptions: ReportOptions = {
      customerId,
      startDate,
      endDate,
      reportType,
      exportFormat: format
    };
    
    this.reportService.exportReport(exportOptions)
      .subscribe({
        next: (response) => {
          this.loading = false;
          
          if (response.success && response.fileUrl) {
            // Download the file
            this.downloadFile(response.fileUrl, format);
          } else {
            this.error = response.error || `Failed to export ${format.toUpperCase()} file`;
            this.snackBar.open(this.error, 'Close', { duration: 5000 });
          }
        },
        error: (err) => {
          this.loading = false;
          this.error = `Error exporting ${format.toUpperCase()} file`;
          console.error(`Error exporting ${format} file:`, err);
          this.snackBar.open(this.error, 'Close', { duration: 5000 });
        }
      });
  }

  private downloadFile(fileUrl: string, format: string): void {
    this.reportService.downloadReport(fileUrl)
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          const reportType = this.reportRequest?.reportType || 'report';
          const customerName = this.report?.customerName || 'customer';
          const date = new Date().toISOString().substring(0, 10);
          
          a.href = url;
          a.download = `${reportType}-${customerName}-${date}.${format}`;
          document.body.appendChild(a);
          a.click();
          
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          this.snackBar.open(`Report exported successfully as ${format.toUpperCase()}`, 'Close', { 
            duration: 3000,
            panelClass: 'success-snackbar'
          });
        },
        error: (err) => {
          console.error('Error downloading file:', err);
          this.snackBar.open(`Failed to download ${format.toUpperCase()} file`, 'Close', { 
            duration: 5000,
            panelClass: 'error-snackbar'
          });
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/reports']);
  }
}
