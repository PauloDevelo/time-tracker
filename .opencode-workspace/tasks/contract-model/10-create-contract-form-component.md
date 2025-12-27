# Task 10: Create Contract Form Dialog Component

## Objective
Create a dialog component for creating and editing contracts.

## Dependencies
- Task 08: Contract service must exist

## Deliverables

### 1. Create Contract Form Dialog Component

Create the following files:
- `frontend/src/app/features/customers/contract-form-dialog/contract-form-dialog.component.ts`
- `frontend/src/app/features/customers/contract-form-dialog/contract-form-dialog.component.html`
- `frontend/src/app/features/customers/contract-form-dialog/contract-form-dialog.component.scss`

### Component Structure

```typescript
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
    MatNativeDateModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
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

  initForm(): void { ... }
  onSubmit(): void { ... }
  onCancel(): void { ... }
}
```

### Form Fields

1. **name** - Required, text input
2. **startDate** - Required, date picker
3. **endDate** - Required, date picker (must be after startDate)
4. **dailyRate** - Required, number input, min 0
5. **currency** - Required, select dropdown
6. **daysToCompletion** - Required, number input, min 0
7. **description** - Optional, textarea

### Template Example

```html
<h2 mat-dialog-title>{{ isEditMode ? 'Edit Contract' : 'New Contract' }}</h2>

<mat-dialog-content>
  <form [formGroup]="form">
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Contract Name</mat-label>
      <input matInput formControlName="name" placeholder="e.g., 2025 Annual Contract">
      <mat-error *ngIf="form.get('name')?.hasError('required')">
        Name is required
      </mat-error>
    </mat-form-field>

    <div class="date-row">
      <mat-form-field appearance="outline">
        <mat-label>Start Date</mat-label>
        <input matInput [matDatepicker]="startPicker" formControlName="startDate">
        <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
        <mat-datepicker #startPicker></mat-datepicker>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>End Date</mat-label>
        <input matInput [matDatepicker]="endPicker" formControlName="endDate">
        <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
        <mat-datepicker #endPicker></mat-datepicker>
        <mat-error *ngIf="form.get('endDate')?.hasError('endDateBeforeStart')">
          End date must be after start date
        </mat-error>
      </mat-form-field>
    </div>

    <div class="billing-row">
      <mat-form-field appearance="outline">
        <mat-label>Daily Rate</mat-label>
        <input matInput type="number" formControlName="dailyRate" min="0">
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Currency</mat-label>
        <mat-select formControlName="currency">
          <mat-option *ngFor="let c of currencies" [value]="c">{{ c }}</mat-option>
        </mat-select>
      </mat-form-field>
    </div>

    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Days to Completion</mat-label>
      <input matInput type="number" formControlName="daysToCompletion" min="0">
    </mat-form-field>

    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Description (optional)</mat-label>
      <textarea matInput formControlName="description" rows="3"></textarea>
    </mat-form-field>
  </form>
</mat-dialog-content>

<mat-dialog-actions align="end">
  <button mat-button (click)="onCancel()">Cancel</button>
  <button mat-raised-button color="primary" 
          (click)="onSubmit()" 
          [disabled]="form.invalid || isLoading">
    <mat-spinner *ngIf="isLoading" diameter="20"></mat-spinner>
    {{ isEditMode ? 'Update' : 'Create' }}
  </button>
</mat-dialog-actions>
```

### Custom Validator

Add a custom validator to ensure endDate > startDate:

```typescript
function endDateAfterStartDate(control: AbstractControl): ValidationErrors | null {
  const startDate = control.get('startDate')?.value;
  const endDate = control.get('endDate')?.value;
  
  if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
    control.get('endDate')?.setErrors({ endDateBeforeStart: true });
    return { endDateBeforeStart: true };
  }
  return null;
}
```

## Implementation Steps

1. Create component directory and files
2. Implement form with all fields
3. Add custom date validation
4. Implement create/update logic
5. Handle loading states
6. Show success/error snackbar messages
7. Close dialog with result on success

## Reference Files
- `frontend/src/app/features/projects/task-dialog/` - Dialog pattern
- `frontend/src/app/features/customers/customer-form/` - Form pattern

## Acceptance Criteria

- [ ] Dialog opens for both create and edit modes
- [ ] All form fields are properly validated
- [ ] End date validation prevents dates before start date
- [ ] Form submits to correct API endpoint
- [ ] Loading state prevents double submission
- [ ] Success closes dialog and returns created/updated contract
- [ ] Error shows snackbar message
- [ ] TypeScript compiles without errors

## Validation Commands

```bash
cd frontend && npm run build
```

## Estimated Time
45 minutes
