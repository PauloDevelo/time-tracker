import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CustomerService } from '../../../core/services/customer.service';
import { Customer } from '../../../core/models/customer.model';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './customer-detail.component.html',
  styleUrls: ['./customer-detail.component.scss']
})
export class CustomerDetailComponent implements OnInit {
  customer: Customer | null = null;
  isLoading = true;
  error: string | null = null;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private customerService: CustomerService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { }
  
  ngOnInit(): void {
    this.loadCustomer();
  }
  
  loadCustomer(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Customer ID not found';
      this.isLoading = false;
      return;
    }
    
    this.isLoading = true;
    this.customerService.getCustomer(id).subscribe({
      next: (customer) => {
        this.customer = customer;
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Error loading customer details. Please try again.';
        this.isLoading = false;
        this.snackBar.open(this.error, 'Close', { duration: 5000 });
        console.error('Error loading customer', error);
      }
    });
  }
  
  editCustomer(): void {
    if (this.customer) {
      this.router.navigate(['/customers', this.customer._id, 'edit']);
    }
  }
  
  deleteCustomer(): void {
    if (!this.customer) return;
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: { 
        title: 'Confirm Delete',
        message: 'Are you sure you want to delete this customer? This action cannot be undone.'
      }
    });
    
    dialogRef.afterClosed().subscribe(result => {
      if (result && this.customer) {
        this.customerService.deleteCustomer(this.customer._id).subscribe({
          next: () => {
            this.snackBar.open('Customer deleted successfully', 'Close', { duration: 3000 });
            this.router.navigate(['/customers']);
          },
          error: (error) => {
            this.snackBar.open('Error deleting customer', 'Close', { duration: 5000 });
            console.error('Error deleting customer', error);
          }
        });
      }
    });
  }
  
  goBack(): void {
    this.router.navigate(['/customers']);
  }
} 