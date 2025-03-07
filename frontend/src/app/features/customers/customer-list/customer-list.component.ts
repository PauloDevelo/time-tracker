import { Component, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';

import { CustomerService } from '../../../core/services/customer.service';
import { Customer } from '../../../core/models/customer.model';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule
  ],
  templateUrl: './customer-list.component.html',
  styleUrls: ['./customer-list.component.scss']
})
export class CustomerListComponent implements OnInit {
  customers: Customer[] = [];
  displayedColumns: string[] = ['name', 'email', 'phone', 'dailyRate', 'actions'];
  isLoading = true;
  error: string | null = null;

  constructor(
    private customerService: CustomerService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.isLoading = true;
    this.customerService.getCustomers().subscribe({
      next: (customers) => {
        this.customers = customers;
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Error loading customers. Please try again.';
        this.isLoading = false;
        this.snackBar.open(this.error, 'Close', { duration: 5000 });
        console.error('Error loading customers', error);
      }
    });
  }

  deleteCustomer(id: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: { 
        title: 'Confirm Delete',
        message: 'Are you sure you want to delete this customer? This action cannot be undone.'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.customerService.deleteCustomer(id).subscribe({
          next: () => {
            this.snackBar.open('Customer deleted successfully', 'Close', { duration: 3000 });
            this.loadCustomers();
          },
          error: (error) => {
            this.snackBar.open('Error deleting customer', 'Close', { duration: 5000 });
            console.error('Error deleting customer', error);
          }
        });
      }
    });
  }

  editCustomer(id: string): void {
    this.router.navigate(['/customers', id, 'edit']);
  }

  viewCustomer(id: string): void {
    this.router.navigate(['/customers', id]);
  }
} 