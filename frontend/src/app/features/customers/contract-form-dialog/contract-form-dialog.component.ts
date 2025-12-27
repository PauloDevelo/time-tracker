import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { provideNativeDateAdapter } from '@angular/material/core';

import { Contract, ContractCreateRequest } from '../../../core/models/contract.model';
import { ContractService } from '../../../core/services/contract.service';

export interface ContractFormDialogData {
  customerId: string;
  contract?: Contract;  // If provided, we're editing
  currency?: string;    // Default currency from customer
}

@Component({
  selector: 'app-contract-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './contract-form-dialog.component.html',
  styleUrls: ['./contract-form-dialog.component.scss']
})
export class ContractFormDialogComponent implements OnInit {
  form!: FormGroup;
  isLoading = false;
  isEditMode = false;
  currencies = ['EUR', 'USD', 'GBP', 'CHF'];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ContractFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ContractFormDialogData,
    private contractService: ContractService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.isEditMode = !!this.data.contract;
    this.initForm();
  }

  initForm(): void {
    const contract = this.data.contract;

    this.form = this.fb.group({
      name: [contract?.name || '', Validators.required],
      startDate: [contract ? new Date(contract.startDate) : null, Validators.required],
      endDate: [contract ? new Date(contract.endDate) : null, Validators.required],
      dailyRate: [contract?.dailyRate || '', [Validators.required, Validators.min(0)]],
      currency: [contract?.currency || this.data.currency || 'EUR', Validators.required],
      daysToCompletion: [contract?.daysToCompletion || '', [Validators.required, Validators.min(0)]],
      description: [contract?.description || '']
    }, { validators: this.dateRangeValidator });
  }

  dateRangeValidator(control: AbstractControl): ValidationErrors | null {
    const startDate = control.get('startDate')?.value;
    const endDate = control.get('endDate')?.value;

    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      return { dateRange: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formValue = this.form.value;

    const contractData: ContractCreateRequest = {
      name: formValue.name,
      startDate: formValue.startDate.toISOString(),
      endDate: formValue.endDate.toISOString(),
      dailyRate: formValue.dailyRate,
      currency: formValue.currency,
      daysToCompletion: formValue.daysToCompletion,
      description: formValue.description || undefined
    };

    const request$ = this.isEditMode
      ? this.contractService.updateContract(this.data.customerId, this.data.contract!._id, { ...contractData, _id: this.data.contract!._id })
      : this.contractService.createContract(this.data.customerId, contractData);

    request$.subscribe({
      next: (result) => {
        this.isLoading = false;
        this.snackBar.open(
          this.isEditMode ? 'Contract updated successfully' : 'Contract created successfully',
          'Close',
          { duration: 3000 }
        );
        this.dialogRef.close(result);
      },
      error: (error) => {
        this.isLoading = false;
        const message = error.error?.message || 'An error occurred';
        this.snackBar.open(message, 'Close', { duration: 5000 });
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
