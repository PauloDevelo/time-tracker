# Task 12: Update Project Form with Contract Selection

## Objective
Replace the billing override fields in the project form with a contract selection dropdown.

## Dependencies
- Task 07: Contract frontend model
- Task 08: Contract frontend service

## Deliverables

### 1. Update `project-form.component.ts`

**Remove:**
- billingOverride form controls
- Any billing override related logic

**Add:**
- Contract dropdown with contracts loaded from API
- contractId form control (optional - to allow editing existing projects without contracts)

```typescript
import { ContractService } from '../../../core/services/contract.service';
import { Contract } from '../../../core/models/contract.model';

@Component({
  // ...
})
export class ProjectFormComponent implements OnInit {
  // ... existing properties
  contracts: Contract[] = [];
  contractsLoading = false;

  constructor(
    // ... existing injections
    private contractService: ContractService
  ) {}

  ngOnInit(): void {
    this.initForm();
    // Load contracts when customer changes
    this.form.get('customerId')?.valueChanges.subscribe(customerId => {
      if (customerId) {
        this.loadContracts(customerId);
      } else {
        this.contracts = [];
      }
    });
  }

  initForm(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      customerId: ['', Validators.required],
      contractId: [''],  // NEW - optional to support existing projects without contracts
      azureDevOps: this.fb.group({
        // ... existing
      })
      // REMOVED: billingOverride
    });
  }

  loadContracts(customerId: string): void {
    this.contractsLoading = true;
    this.contractService.getContractsByCustomer(customerId).subscribe({
      next: (contracts) => {
        this.contracts = contracts;
        this.contractsLoading = false;
        
        // If editing and project has a contract, select it
        if (this.project?.contractId) {
          const contractId = typeof this.project.contractId === 'string' 
            ? this.project.contractId 
            : this.project.contractId._id;
          this.form.patchValue({ contractId });
        }
      },
      error: (error) => {
        console.error('Error loading contracts:', error);
        this.contractsLoading = false;
      }
    });
  }

  // Update onSubmit to include contractId
  onSubmit(): void {
    if (this.form.invalid) return;

    const formValue = this.form.value;
    const projectData: ProjectCreateRequest = {
      name: formValue.name,
      description: formValue.description,
      customerId: formValue.customerId,
      contractId: formValue.contractId,  // NEW
      azureDevOps: formValue.azureDevOps?.enabled ? formValue.azureDevOps : undefined
    };
    
    // ... rest of submit logic
  }
}
```

### 2. Update `project-form.component.html`

**Remove:**
```html
<!-- Remove billing override section -->
<div class="billing-section">
  <h3>Billing Override (Optional)</h3>
  <!-- ... -->
</div>
```

**Add contract dropdown after customer selection:**
```html
<mat-form-field appearance="outline" class="full-width">
  <mat-label>Customer</mat-label>
  <mat-select formControlName="customerId">
    <mat-option *ngFor="let customer of customers" [value]="customer._id">
      {{ customer.name }}
    </mat-option>
  </mat-select>
  <mat-error *ngIf="form.get('customerId')?.hasError('required')">
    Customer is required
  </mat-error>
</mat-form-field>

<!-- NEW: Contract Selection -->
<mat-form-field appearance="outline" class="full-width">
  <mat-label>Contract</mat-label>
  <mat-select formControlName="contractId" [disabled]="!form.get('customerId')?.value">
    <mat-option *ngIf="contractsLoading" disabled>
      Loading contracts...
    </mat-option>
    <mat-option *ngIf="!contractsLoading && contracts.length === 0" disabled>
      No contracts available. Create one first.
    </mat-option>
    <mat-option *ngFor="let contract of contracts" [value]="contract._id">
      {{ contract.name }} ({{ contract.dailyRate | currency:contract.currency }}/day)
    </mat-option>
  </mat-select>
  <mat-hint *ngIf="!form.get('customerId')?.value">
    Select a customer first
  </mat-hint>
  <mat-error *ngIf="form.get('contractId')?.hasError('required')">
    Contract is required
  </mat-error>
</mat-form-field>
```

### 3. Update Styling

```scss
mat-form-field.full-width {
  width: 100%;
  margin-bottom: 16px;
}
```

## Implementation Steps

1. Open `project-form.component.ts`
2. Import ContractService and Contract model
3. Add contracts array and loading state
4. Update form to remove billingOverride, add contractId
5. Add customer change listener to load contracts
6. Implement loadContracts method
7. Update onSubmit to include contractId
8. Open `project-form.component.html`
9. Remove billing override section
10. Add contract dropdown after customer field
11. Handle loading and empty states

## Reference Files
- `frontend/src/app/features/projects/project-form/` - Files to modify
- `frontend/src/app/features/customers/customer-form/` - Dropdown pattern

## Edge Cases

1. **No contracts for customer:** Show message suggesting to create one first
2. **Customer changed:** Clear contract selection, reload contracts
3. **Edit mode:** Pre-select the project's current contract (if any)
4. **Existing project without contract:** Allow saving without contract (user will assign manually)
5. **Contract deleted:** Handle gracefully if project's contract no longer exists

## Acceptance Criteria

- [ ] Billing override fields are completely removed
- [ ] Contract dropdown appears after customer selection
- [ ] Contracts load when customer is selected
- [ ] Contract is optional (to support existing projects during transition)
- [ ] Loading state shows while fetching contracts
- [ ] Empty state shows when no contracts exist
- [ ] Edit mode pre-selects existing contract (if any)
- [ ] Form submits with contractId (or without for existing projects)
- [ ] TypeScript compiles without errors

## Validation Commands

```bash
cd frontend && npm run build
cd frontend && npm start
# Test creating/editing projects with contract selection
```

## Estimated Time
40 minutes
