# Task 09: Create Contract List Component

## Objective
Create a component to display a list of contracts for a customer, with actions to add, edit, and delete.

## Dependencies
- Task 08: Contract service must exist

## Deliverables

### 1. Create Contract List Component

Create the following files:
- `frontend/src/app/features/customers/contract-list/contract-list.component.ts`
- `frontend/src/app/features/customers/contract-list/contract-list.component.html`
- `frontend/src/app/features/customers/contract-list/contract-list.component.scss`

### Component Structure

```typescript
@Component({
  selector: 'app-contract-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatMenuModule
  ],
  templateUrl: './contract-list.component.html',
  styleUrls: ['./contract-list.component.scss']
})
export class ContractListComponent implements OnInit {
  @Input() customerId!: string;
  @Output() addContract = new EventEmitter<void>();
  @Output() editContract = new EventEmitter<Contract>();
  @Output() deleteContract = new EventEmitter<Contract>();

  contracts: Contract[] = [];
  isLoading = false;
  displayedColumns = ['name', 'period', 'dailyRate', 'daysToCompletion', 'actions'];

  constructor(private contractService: ContractService) {}

  ngOnInit(): void {
    this.loadContracts();
  }

  loadContracts(): void { ... }
  onAdd(): void { ... }
  onEdit(contract: Contract): void { ... }
  onDelete(contract: Contract): void { ... }
  isActive(contract: Contract): boolean { ... }
}
```

### Template Features

1. **Table with columns:**
   - Name
   - Period (startDate - endDate)
   - Daily Rate (formatted with currency)
   - Days to Completion
   - Actions (edit, delete)

2. **Visual indicators:**
   - Badge for active contracts (current date within period)
   - Different styling for expired contracts

3. **Empty state:**
   - Message when no contracts exist
   - Button to add first contract

4. **Loading state:**
   - Spinner while loading

### Template Example

```html
<div class="contract-list">
  <div class="list-header">
    <h3>Contracts</h3>
    <button mat-raised-button color="primary" (click)="onAdd()">
      <mat-icon>add</mat-icon> Add Contract
    </button>
  </div>

  <mat-spinner *ngIf="isLoading" diameter="30"></mat-spinner>

  <table mat-table [dataSource]="contracts" *ngIf="!isLoading && contracts.length">
    <!-- Name Column -->
    <ng-container matColumnDef="name">
      <th mat-header-cell *matHeaderCellDef>Name</th>
      <td mat-cell *matCellDef="let contract">
        {{ contract.name }}
        <span class="active-badge" *ngIf="isActive(contract)">Active</span>
      </td>
    </ng-container>
    
    <!-- ... other columns ... -->
    
    <!-- Actions Column -->
    <ng-container matColumnDef="actions">
      <th mat-header-cell *matHeaderCellDef>Actions</th>
      <td mat-cell *matCellDef="let contract">
        <button mat-icon-button (click)="onEdit(contract)">
          <mat-icon>edit</mat-icon>
        </button>
        <button mat-icon-button color="warn" (click)="onDelete(contract)">
          <mat-icon>delete</mat-icon>
        </button>
      </td>
    </ng-container>

    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
    <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
  </table>

  <div class="empty-state" *ngIf="!isLoading && !contracts.length">
    <p>No contracts yet. Add your first contract to start tracking billing.</p>
    <button mat-raised-button color="primary" (click)="onAdd()">
      <mat-icon>add</mat-icon> Add Contract
    </button>
  </div>
</div>
```

## Implementation Steps

1. Create component directory and files
2. Implement component class with Input/Output decorators
3. Create template with Material table
4. Add styling for active/expired contracts
5. Implement helper method `isActive()` to check if contract is current

## Reference Files
- `frontend/src/app/features/customers/customer-list/` - List pattern
- `frontend/src/app/features/projects/project-list/` - Table pattern

## Acceptance Criteria

- [ ] Component displays contracts in a Material table
- [ ] Active contracts are visually highlighted
- [ ] Add, Edit, Delete actions emit events to parent
- [ ] Loading state shows spinner
- [ ] Empty state shows helpful message
- [ ] Dates are properly formatted
- [ ] Currency is properly formatted
- [ ] TypeScript compiles without errors
- [ ] Component is standalone with explicit imports

## Validation Commands

```bash
cd frontend && npm run build
```

## Estimated Time
40 minutes
