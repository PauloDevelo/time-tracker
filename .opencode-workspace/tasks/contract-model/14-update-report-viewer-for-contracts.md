# Task 14: Update Report Viewer for Contract Grouping

## Objective
Update the report viewer component to display the new contract-grouped report structure.

## Dependencies
- Task 13: Frontend report models must be updated

## Deliverables

### 1. Update Report Viewer Component

Locate and update the report viewer component (likely in `frontend/src/app/features/reports/`).

**Update the template to show:**
1. Report header (customer, period, totals)
2. For each Contract:
   - Contract header (name, daily rate, subtotals)
   - For each Project under the contract:
     - Project header (name, subtotals)
     - Task list with hours/costs

### Template Structure

```html
<div class="report-container">
  <!-- Report Header -->
  <div class="report-header">
    <h1>{{ report.reportType === 'invoice' ? 'Invoice' : 'Timesheet' }}</h1>
    <div class="customer-info">
      <h2>{{ report.customerName }}</h2>
      <p *ngIf="report.customerAddress">{{ report.customerAddress }}</p>
    </div>
    <div class="period-info">
      <p>Period: {{ report.startDate | date:'mediumDate' }} - {{ report.endDate | date:'mediumDate' }}</p>
      <p>Generated: {{ report.generationDate | date:'medium' }}</p>
    </div>
  </div>

  <!-- Contracts Section -->
  <div class="contracts-section">
    <div class="contract-block" *ngFor="let contract of report.contracts">
      <!-- Contract Header -->
      <div class="contract-header">
        <h3>{{ contract.contractName }}</h3>
        <div class="contract-meta">
          <span class="rate">Rate: {{ contract.dailyRate | currency:contract.currency }}/day</span>
          <span class="hours">{{ contract.totalHours | number:'1.2-2' }} hours</span>
          <span class="cost" *ngIf="report.reportType === 'invoice'">
            {{ contract.totalCost | currency:contract.currency }}
          </span>
        </div>
      </div>

      <!-- Projects under this Contract -->
      <div class="projects-section">
        <div class="project-block" *ngFor="let project of contract.projects">
          <div class="project-header">
            <h4>{{ project.projectName }}</h4>
            <div class="project-totals">
              <span>{{ project.totalHours | number:'1.2-2' }} hours</span>
              <span *ngIf="report.reportType === 'invoice'">
                {{ project.totalCost | currency:contract.currency }}
              </span>
            </div>
          </div>

          <!-- Tasks under this Project -->
          <table class="tasks-table" mat-table [dataSource]="project.tasks">
            <ng-container matColumnDef="taskName">
              <th mat-header-cell *matHeaderCellDef>Task</th>
              <td mat-cell *matCellDef="let task">{{ task.taskName }}</td>
            </ng-container>

            <ng-container matColumnDef="hours">
              <th mat-header-cell *matHeaderCellDef>Hours</th>
              <td mat-cell *matCellDef="let task">{{ task.totalHours | number:'1.2-2' }}</td>
            </ng-container>

            <ng-container matColumnDef="cost" *ngIf="report.reportType === 'invoice'">
              <th mat-header-cell *matHeaderCellDef>Cost</th>
              <td mat-cell *matCellDef="let task">
                {{ task.totalCost | currency:contract.currency }}
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="getTaskColumns()"></tr>
            <tr mat-row *matRowDef="let row; columns: getTaskColumns();"></tr>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- Report Summary -->
  <div class="report-summary">
    <div class="summary-row">
      <span>Total Hours:</span>
      <span>{{ report.totalHours | number:'1.2-2' }}</span>
    </div>
    <div class="summary-row" *ngIf="report.reportType === 'invoice'">
      <span>Total Amount:</span>
      <span class="total-amount">{{ report.totalCost | currency:'EUR' }}</span>
    </div>
  </div>
</div>
```

### Component Logic

```typescript
export class ReportViewerComponent {
  report: ReportSummary | null = null;

  getTaskColumns(): string[] {
    const columns = ['taskName', 'hours'];
    if (this.report?.reportType === 'invoice') {
      columns.push('cost');
    }
    return columns;
  }

  // Helper to get currency for display
  getReportCurrency(): string {
    // Use first contract's currency or default
    return this.report?.contracts[0]?.currency || 'EUR';
  }
}
```

### Styling

```scss
.report-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

.contract-block {
  margin-bottom: 32px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.contract-header {
  background: #f5f5f5;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h3 {
    margin: 0;
  }
  
  .contract-meta {
    display: flex;
    gap: 24px;
  }
}

.project-block {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  
  &:last-child {
    border-bottom: none;
  }
}

.project-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  
  h4 {
    margin: 0;
    color: #666;
  }
}

.tasks-table {
  width: 100%;
}

.report-summary {
  margin-top: 32px;
  padding: 24px;
  background: #f5f5f5;
  border-radius: 8px;
  
  .summary-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    font-size: 1.1em;
    
    &:last-child {
      font-weight: bold;
      font-size: 1.3em;
    }
  }
}
```

## Implementation Steps

1. Locate the report viewer component
2. Update the component to handle new `contracts` structure
3. Update template to show contract → project → task hierarchy
4. Add helper methods for dynamic columns
5. Update styling for visual hierarchy
6. Handle edge cases (empty contracts, no tasks)

## Reference Files
- `frontend/src/app/features/reports/report-viewer/` - Component to modify
- `frontend/src/app/core/models/report.model.ts` - Updated models

## Edge Cases

1. **No contracts in report:** Show "No data for this period" message
2. **Contract with no projects:** Skip or show empty state
3. **Mixed currencies:** Each contract shows its own currency
4. **Timesheet vs Invoice:** Conditionally show cost columns

## Acceptance Criteria

- [ ] Report displays contracts as top-level grouping
- [ ] Each contract shows its projects nested underneath
- [ ] Each project shows its tasks
- [ ] Contract header shows name, rate, and subtotals
- [ ] Invoice reports show costs at all levels
- [ ] Timesheet reports hide cost columns
- [ ] Summary shows correct totals
- [ ] Visual hierarchy is clear and readable
- [ ] TypeScript compiles without errors

## Validation Commands

```bash
cd frontend && npm run build
cd frontend && npm start
# Generate a report and verify display
```

## Estimated Time
45 minutes
