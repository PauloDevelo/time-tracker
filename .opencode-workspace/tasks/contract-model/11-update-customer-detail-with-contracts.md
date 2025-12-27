# Task 11: Update Customer Detail Page with Contracts Section

## Objective
Integrate the contract list and form components into the customer detail page.

## Dependencies
- Task 09: Contract list component
- Task 10: Contract form dialog component

## Deliverables

### 1. Update `customer-detail.component.ts`

Add contract management functionality:

```typescript
import { ContractListComponent } from '../contract-list/contract-list.component';
import { ContractFormDialogComponent, ContractFormDialogData } from '../contract-form-dialog/contract-form-dialog.component';
import { Contract } from '../../../core/models/contract.model';
import { ContractService } from '../../../core/services/contract.service';

@Component({
  // ...
  imports: [
    // ... existing imports
    ContractListComponent
  ]
})
export class CustomerDetailComponent implements OnInit {
  // ... existing properties
  
  constructor(
    // ... existing injections
    private contractService: ContractService
  ) {}

  // Contract management methods
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
        this.snackBar.open('Contract created successfully', 'Close', { duration: 3000 });
        // Refresh contract list (handled by child component)
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
        this.snackBar.open('Contract updated successfully', 'Close', { duration: 3000 });
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
```

### 2. Update `customer-detail.component.html`

Add contracts section after billing details:

```html
<!-- After the Billing Details section -->
<mat-divider></mat-divider>

<div class="detail-section">
  <app-contract-list
    [customerId]="customer._id"
    (addContract)="onAddContract()"
    (editContract)="onEditContract($event)"
    (deleteContract)="onDeleteContract($event)">
  </app-contract-list>
</div>

<mat-divider></mat-divider>

<!-- System Information section continues... -->
```

### 3. Update Styling

Add styles to `customer-detail.component.scss`:

```scss
.detail-section {
  padding: 16px 0;
  
  app-contract-list {
    display: block;
    margin-top: 8px;
  }
}
```

## Implementation Steps

1. Open `customer-detail.component.ts`
2. Add imports for ContractListComponent, ContractFormDialogComponent, Contract, ContractService
3. Add ContractListComponent to imports array
4. Inject ContractService
5. Implement onAddContract, onEditContract, onDeleteContract methods
6. Open `customer-detail.component.html`
7. Add contracts section with app-contract-list component
8. Update styling as needed

## Reference Files
- `frontend/src/app/features/customers/customer-detail/` - Files to modify
- `frontend/src/app/features/projects/project-detail/` - Pattern for child components

## Acceptance Criteria

- [ ] Contract list displays in customer detail page
- [ ] Add button opens contract form dialog
- [ ] Edit action opens dialog with contract data
- [ ] Delete action shows confirmation and deletes
- [ ] Success/error messages display correctly
- [ ] Contract list refreshes after CRUD operations
- [ ] TypeScript compiles without errors
- [ ] UI is visually consistent with rest of app

## Validation Commands

```bash
cd frontend && npm run build
cd frontend && npm start
# Navigate to customer detail page and test contract CRUD
```

## Estimated Time
30 minutes
