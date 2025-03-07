import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CustomerService } from '../../../core/services/customer.service';
import { CustomerFormComponent } from '../customer-form/customer-form.component';
import { Customer, CustomerCreateRequest } from '../../../core/models/customer.model';

@Component({
  selector: 'app-customer-edit',
  standalone: true,
  imports: [
    CommonModule,
    CustomerFormComponent
  ],
  template: `
    <div class="container">
      <h1>Edit Customer</h1>
      <div *ngIf="error" class="error-message">
        {{ error }}
        <button (click)="loadCustomer()">Try Again</button>
      </div>
      <app-customer-form 
        *ngIf="customer"
        [customer]="customer"
        [loading]="loading" 
        (formSubmit)="onSubmit($event)" 
        (cancel)="onCancel()">
      </app-customer-form>
    </div>
  `,
  styles: [`
    .container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    h1 {
      margin-bottom: 24px;
    }
    
    .error-message {
      background-color: #f8d7da;
      color: #721c24;
      padding: 16px;
      border-radius: 4px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      button {
        background-color: #721c24;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
      }
    }
  `]
})
export class CustomerEditComponent implements OnInit {
  customer: Customer | null = null;
  loading = false;
  error: string | null = null;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private customerService: CustomerService,
    private snackBar: MatSnackBar
  ) { }
  
  ngOnInit(): void {
    this.loadCustomer();
  }
  
  loadCustomer(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Customer ID not found';
      return;
    }
    
    this.loading = true;
    this.customerService.getCustomer(id).subscribe({
      next: (customer) => {
        this.customer = customer;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Error loading customer. Please try again.';
        this.loading = false;
        console.error('Error loading customer', error);
      }
    });
  }
  
  onSubmit(customerData: CustomerCreateRequest): void {
    if (!this.customer) return;
    
    this.loading = true;
    
    this.customerService.updateCustomer(this.customer._id, customerData).subscribe({
      next: () => {
        this.snackBar.open('Customer updated successfully', 'Close', { duration: 3000 });
        this.router.navigate(['/customers', this.customer?._id]);
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open('Error updating customer', 'Close', { duration: 5000 });
        console.error('Error updating customer', error);
      }
    });
  }
  
  onCancel(): void {
    if (this.customer) {
      this.router.navigate(['/customers', this.customer._id]);
    } else {
      this.router.navigate(['/customers']);
    }
  }
} 