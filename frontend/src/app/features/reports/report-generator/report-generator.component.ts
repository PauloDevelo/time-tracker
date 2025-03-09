import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { MatNativeDateModule } from '@angular/material/core';

import { CustomerService } from '../../../core/services/customer.service';
import { ReportService } from '../../../core/services/report.service';
import { Customer } from '../../../core/models/customer.model';
import { ReportRequest } from '../../../core/models/report.model';

@Component({
  selector: 'app-report-generator',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatRadioModule,
    MatCardModule,
  ],
  templateUrl: './report-generator.component.html',
  styleUrl: './report-generator.component.scss'
})
export class ReportGeneratorComponent implements OnInit {
  reportForm: FormGroup;
  customers: Customer[] = [];
  availableMonths: { year: number, month: number, label: string }[] = [];
  loading = false;
  error = '';

  // Month names for display
  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerService,
    private reportService: ReportService,
    private router: Router
  ) {
    this.reportForm = this.fb.group({
      customerId: ['', Validators.required],
      yearMonth: ['', Validators.required],
      reportType: ['timesheet', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadCustomers();
    
    // Listen for customer selection changes to load available months
    this.reportForm.get('customerId')?.valueChanges.subscribe(customerId => {
      if (customerId) {
        this.loadAvailableMonths(customerId);
      } else {
        this.availableMonths = [];
      }
    });
  }

  loadCustomers(): void {
    this.loading = true;
    this.customerService.getCustomers()
      .subscribe({
        next: (customers) => {
          this.customers = customers;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load customers';
          console.error('Error loading customers:', err);
          this.loading = false;
        }
      });
  }

  loadAvailableMonths(customerId: string): void {
    this.loading = true;
    this.availableMonths = [];
    this.reportService.getAvailableReportMonths(customerId)
      .subscribe({
        next: (months) => {
          this.availableMonths = months.map(m => ({
            year: m.year,
            month: m.month,
            label: `${this.monthNames[m.month - 1]} ${m.year}`
          }));
          
          this.loading = false;
          
          // If there are available months, select the most recent one
          if (this.availableMonths.length > 0) {
            const mostRecent = this.availableMonths.sort((a, b) => {
              if (a.year !== b.year) return b.year - a.year;
              return b.month - a.month;
            })[0];
            
            this.reportForm.get('yearMonth')?.setValue(`${mostRecent.year}-${mostRecent.month}`);
          }
        },
        error: (err) => {
          this.error = 'Failed to load available months';
          console.error('Error loading available months:', err);
          this.loading = false;
        }
      });
  }

  generateReport(): void {
    if (this.reportForm.valid) {
      this.loading = true;
      const formValue = this.reportForm.value;
      const [year, month] = formValue.yearMonth.split('-').map(Number);

      const request: ReportRequest = {
        customerId: formValue.customerId,
        year,
        month,
        reportType: formValue.reportType
      };

      this.reportService.generateReport(request)
        .subscribe({
          next: (response) => {
            this.loading = false;
            if (response.success && response.data) {
              // Navigate to the report viewer with the report data
              this.router.navigate(['/reports/view'], { 
                state: { 
                  report: response.data,
                  request: request
                } 
              });
            } else {
              this.error = response.error || 'Failed to generate report';
            }
          },
          error: (err) => {
            this.loading = false;
            this.error = 'Error generating report';
            console.error('Error generating report:', err);
          }
        });
    }
  }
} 