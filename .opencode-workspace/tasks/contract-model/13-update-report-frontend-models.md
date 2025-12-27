# Task 13: Update Frontend Report Models for Contract Grouping

## Objective
Update the frontend report models to match the new backend structure with contract-level grouping.

## Dependencies
- Task 06: Backend report service must be updated

## Deliverables

### 1. Update `frontend/src/app/core/models/report.model.ts`

**Add ContractTimeData interface:**
```typescript
export interface ContractTimeData {
  contractId: string;
  contractName: string;
  dailyRate: number;
  currency: string;
  totalHours: number;
  totalCost?: number;
  projects: ProjectTimeData[];
}
```

**Update ProjectTimeData:**
```typescript
export interface ProjectTimeData {
  projectId: string;
  projectName: string;
  totalHours: number;
  totalCost?: number;
  tasks: TaskTimeData[];
}
```

**Update ReportSummary:**
```typescript
export interface ReportSummary {
  reportId?: string;
  reportType: 'timesheet' | 'invoice';
  customerName: string;
  customerAddress?: string;
  userFullName: string;
  userEmail: string;
  generationDate: Date;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  totalHours: number;
  totalCost?: number;
  contracts: ContractTimeData[];  // Changed from projects
}
```

### 2. Full Updated File

```typescript
export interface ReportOptions {
  customerId: string;
  startDate: Date;
  endDate: Date;
  reportType: 'timesheet' | 'invoice';
  exportFormat?: 'excel' | 'csv' | 'pdf';
}

export interface TaskTimeData {
  taskId: string;
  taskName: string;
  totalHours: number;
  totalCost?: number;
}

export interface ProjectTimeData {
  projectId: string;
  projectName: string;
  totalHours: number;
  totalCost?: number;
  tasks: TaskTimeData[];
}

export interface ContractTimeData {
  contractId: string;
  contractName: string;
  dailyRate: number;
  currency: string;
  totalHours: number;
  totalCost?: number;
  projects: ProjectTimeData[];
}

export interface ReportSummary {
  reportId?: string;
  reportType: 'timesheet' | 'invoice';
  customerName: string;
  customerAddress?: string;
  userFullName: string;
  userEmail: string;
  generationDate: Date;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  totalHours: number;
  totalCost?: number;
  contracts: ContractTimeData[];
}

export interface ReportRequest {
  customerId: string;
  year: number;
  month: number;
  reportType: 'timesheet' | 'invoice';
}

export interface ReportResponse {
  success: boolean;
  data?: ReportSummary;
  error?: string;
}

export interface ExportResponse {
  success: boolean;
  fileUrl?: string;
  error?: string;
}
```

## Implementation Steps

1. Open `frontend/src/app/core/models/report.model.ts`
2. Add `ContractTimeData` interface
3. Update `ProjectTimeData` (remove entries if present, keep tasks)
4. Update `ReportSummary` to use `contracts` instead of `projects`
5. Ensure all interfaces are properly exported

## Reference Files
- `frontend/src/app/core/models/report.model.ts` - File to modify
- `backend/src/models/ReportDto.ts` - Backend DTO for reference

## Notes

- The `TimeEntryReportData` interface can be removed if not used elsewhere
- The structure now mirrors: Report → Contracts → Projects → Tasks
- Each contract includes its dailyRate and currency for display

## Acceptance Criteria

- [ ] `ContractTimeData` interface is defined
- [ ] `ReportSummary` uses `contracts` array
- [ ] All interfaces match backend DTOs
- [ ] TypeScript compiles without errors
- [ ] Frontend builds successfully

## Validation Commands

```bash
cd frontend && npm run build
```

## Estimated Time
15 minutes
