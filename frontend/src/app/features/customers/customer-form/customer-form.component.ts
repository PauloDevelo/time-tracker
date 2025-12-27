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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';

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
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatExpansionModule
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
      }),
      azureDevOps: this.fb.group({
        organizationUrl: ['', [Validators.pattern(/^https:\/\/(dev\.azure\.com\/[^\/]+|[^\/]+\.visualstudio\.com)$/)]],
        pat: [''],
        enabled: [false]
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
        },
        azureDevOps: {
          organizationUrl: this.customer.azureDevOps?.organizationUrl || '',
          pat: '', // Never pre-fill PAT for security
          enabled: this.customer.azureDevOps?.enabled || false
        }
      });
      
      // Update validators based on enabled state
      this.updateAzureDevOpsValidators();
    }
  }
  
  onSubmit(): void {
    this.submitted = true;
    
    if (this.customerForm.invalid) {
      return;
    }
    
    const formValue = this.customerForm.value;
    
    // Remove azureDevOps if not enabled or if fields are empty
    if (!formValue.azureDevOps?.enabled || !formValue.azureDevOps?.organizationUrl) {
      delete formValue.azureDevOps;
    }
    
    this.formSubmit.emit(formValue);
  }
  
  onCancel(): void {
    this.cancel.emit();
  }
  
  toggleAzureDevOps(): void {
    this.updateAzureDevOpsValidators();
  }
  
  private updateAzureDevOpsValidators(): void {
    const azureDevOpsGroup = this.azureDevOps;
    const enabled = azureDevOpsGroup.get('enabled')?.value;
    const organizationUrlControl = azureDevOpsGroup.get('organizationUrl');
    const patControl = azureDevOpsGroup.get('pat');
    
    // Check if we're editing an existing customer with Azure DevOps already configured
    const isEditingWithExistingPat = this.customer?.azureDevOps?.enabled;
    
    if (enabled) {
      organizationUrlControl?.setValidators([
        Validators.required,
        Validators.pattern(/^https:\/\/(dev\.azure\.com\/[^\/]+|[^\/]+\.visualstudio\.com)$/)
      ]);
      // PAT is only required for new customers or when enabling Azure DevOps for the first time
      // When editing, the existing PAT is preserved on the backend if not provided
      if (!isEditingWithExistingPat) {
        patControl?.setValidators([Validators.required]);
      } else {
        patControl?.clearValidators();
      }
    } else {
      organizationUrlControl?.setValidators([
        Validators.pattern(/^https:\/\/(dev\.azure\.com\/[^\/]+|[^\/]+\.visualstudio\.com)$/)
      ]);
      patControl?.clearValidators();
    }
    
    organizationUrlControl?.updateValueAndValidity();
    patControl?.updateValueAndValidity();
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
  
  get azureDevOps() { 
    return this.customerForm.get('azureDevOps') as FormGroup; 
  }
  
  get isAzureDevOpsEnabled(): boolean {
    return this.azureDevOps.get('enabled')?.value || false;
  }
}