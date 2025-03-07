import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Customer, CustomerCreateRequest } from '../../../core/models/customer.model';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './customer-form.component.html',
  styleUrls: ['./customer-form.component.scss']
})
export class CustomerFormComponent implements OnInit, OnChanges {
  @Input() customer: Customer | null = null;
  @Input() loading = false;
  @Output() formSubmit = new EventEmitter<CustomerCreateRequest>();
  @Output() cancel = new EventEmitter<void>();
  
  customerForm: FormGroup;
  currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF'];
  submitted = false;
  
  constructor(private fb: FormBuilder) {
    this.customerForm = this.createForm();
  }
  
  ngOnInit(): void {
    if (this.customer) {
      this.patchFormValues();
    }
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['customer'] && changes['customer'].currentValue) {
      this.patchFormValues();
    }
  }
  
  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      contactInfo: this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        phone: [''],
        address: ['']
      }),
      billingDetails: this.fb.group({
        dailyRate: [0, [Validators.required, Validators.min(0)]],
        currency: ['USD', Validators.required],
        paymentTerms: ['']
      })
    });
  }
  
  private patchFormValues(): void {
    if (this.customer) {
      this.customerForm.patchValue({
        name: this.customer.name,
        contactInfo: {
          email: this.customer.contactInfo.email,
          phone: this.customer.contactInfo.phone,
          address: this.customer.contactInfo.address
        },
        billingDetails: {
          dailyRate: this.customer.billingDetails.dailyRate,
          currency: this.customer.billingDetails.currency,
          paymentTerms: this.customer.billingDetails.paymentTerms
        }
      });
    }
  }
  
  onSubmit(): void {
    this.submitted = true;
    
    if (this.customerForm.invalid) {
      return;
    }
    
    this.formSubmit.emit(this.customerForm.value);
  }
  
  onCancel(): void {
    this.cancel.emit();
  }
  
  // Helper methods for template
  get f() { 
    return this.customerForm.controls; 
  }
  
  get contactInfo() { 
    return this.customerForm.get('contactInfo') as FormGroup; 
  }
  
  get billingDetails() { 
    return this.customerForm.get('billingDetails') as FormGroup; 
  }
} 