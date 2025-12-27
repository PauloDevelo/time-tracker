import { Component, OnInit, ViewChild } from '@angular/core';
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
import { ContractService } from '../../../core/services/contract.service';
import { Customer } from '../../../core/models/customer.model';
import { Contract } from '../../../core/models/contract.model';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { ContractListComponent } from '../contract-list/contract-list.component';
import { ContractFormDialogComponent, ContractFormDialogData } from '../contract-form-dialog/contract-form-dialog.component';

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
    MatProgressSpinnerModule,
    ContractListComponent
  ],
  templateUrl: './customer-detail.component.html',
  styleUrls: ['./customer-detail.component.scss']
})
export class CustomerDetailComponent implements OnInit {
  @ViewChild(ContractListComponent) contractList!: ContractListComponent;

  customer: Customer | null = null;
  isLoading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private customerService: CustomerService,
    private contractService: ContractService,
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

  onAddContract(): void {
    const dialogRef = this.dialog.open(ContractFormDialogComponent, {
      width: '500px',
      data: {
        customerId: this.customer!._id,
        currency: this.customer!.billingDetails.currency
      } as ContractFormDialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.contractList?.loadContracts();
      }
    });
  }

  onEditContract(contract: Contract): void {
    const dialogRef = this.dialog.open(ContractFormDialogComponent, {
      width: '500px',
      data: {
        customerId: this.customer!._id,
        contract: contract,
        currency: this.customer!.billingDetails.currency
      } as ContractFormDialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.contractList?.loadContracts();
      }
    });
  }

  onDeleteContract(contract: Contract): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: {
        title: 'Delete Contract',
        message: `Are you sure you want to delete "${contract.name}"? This cannot be undone.`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.contractService.deleteContract(this.customer!._id, contract._id).subscribe({
          next: () => {
            this.snackBar.open('Contract deleted successfully', 'Close', { duration: 3000 });
            this.contractList?.loadContracts();
          },
          error: (error) => {
            const message = error.error?.message || 'Error deleting contract';
            this.snackBar.open(message, 'Close', { duration: 5000 });
          }
        });
      }
    });
  }
}