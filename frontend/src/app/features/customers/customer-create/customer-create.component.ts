import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CustomerService } from '../../../core/services/customer.service';
import { CustomerFormComponent } from '../customer-form/customer-form.component';
import { CustomerCreateRequest } from '../../../core/models/customer.model';

@Component({
  selector: 'app-customer-create',
  standalone: true,
  imports: [
    CommonModule,
    CustomerFormComponent
  ],
  template: `
    <div class="container">
      <h1>Add New Customer</h1>
      <app-customer-form 
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
  `]
})
export class CustomerCreateComponent {
  loading = false;
  
  constructor(
    private customerService: CustomerService,
    private router: Router,
    private snackBar: MatSnackBar
  ) { }
  
  onSubmit(customerData: CustomerCreateRequest): void {
    this.loading = true;
    
    this.customerService.createCustomer(customerData).subscribe({
      next: () => {
        this.snackBar.open('Customer created successfully', 'Close', { duration: 3000 });
        this.router.navigate(['/customers']);
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open('Error creating customer', 'Close', { duration: 5000 });
        console.error('Error creating customer', error);
      }
    });
  }
  
  onCancel(): void {
    this.router.navigate(['/customers']);
  }
} 