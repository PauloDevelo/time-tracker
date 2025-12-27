# Task 05: Update Report Model with Contract Grouping

## Objective
Update the Report model to support grouping data by Contract, then by Project, then by Task.

## Dependencies
- Task 01: Contract model must exist

## Deliverables

### 1. Update `backend/src/models/Report.ts`

**Add new interface for contract-level data:**
```typescript
export interface ContractTimeData {
  contractId: mongoose.Types.ObjectId;
  contractName: string;
  dailyRate: number;
  currency: string;
  totalHours: number;
  totalCost?: number;
  projects: ProjectTimeData[];
}
```

**Update IReport interface:**
```typescript
export interface IReport extends Document {
  reportType: 'timesheet' | 'invoice';
  customerId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  generationDate: Date;
  period: {
    year: number;
    month: number;
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalDays: number;
    totalHours: number;
    totalCost?: number;
  };
  contracts: ContractTimeData[];  // Changed from projects
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Update Schema

Replace the `projects` array with `contracts` array:

```typescript
contracts: [{
  contractId: {
    type: Schema.Types.ObjectId,
    ref: 'Contract',
    required: true,
  },
  contractName: {
    type: String,
    required: true,
  },
  dailyRate: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
  },
  totalHours: {
    type: Number,
    required: true,
  },
  totalCost: {
    type: Number,
    required: false,
  },
  projects: [{
    projectId: { ... },
    totalHours: { ... },
    totalCost: { ... },
    tasks: [{ ... }]
  }]
}]
```

### 3. Update `backend/src/models/ReportDto.ts`

Update the ReportSummary DTO to match the new structure:

```typescript
export interface ContractSummary {
  contractId: string;
  contractName: string;
  dailyRate: number;
  currency: string;
  totalHours: number;
  totalCost?: number;
  projects: ProjectSummary[];
}

export interface ReportSummary {
  // ... existing fields
  contracts: ContractSummary[];  // Changed from projects
}
```

## Implementation Steps

1. Open `backend/src/models/Report.ts`
2. Add `ContractTimeData` interface
3. Update `IReport` interface to use `contracts` instead of `projects`
4. Update the schema to nest projects under contracts
5. Open `backend/src/models/ReportDto.ts`
6. Add `ContractSummary` interface
7. Update `ReportSummary` to use `contracts`

## Reference Files
- `backend/src/models/Report.ts` - File to modify
- `backend/src/models/ReportDto.ts` - DTO file to modify

## Acceptance Criteria

- [ ] `ContractTimeData` interface is defined
- [ ] `IReport` uses `contracts` array instead of `projects`
- [ ] Schema properly nests: contracts → projects → tasks
- [ ] `ReportDto.ts` is updated with matching structure
- [ ] TypeScript compiles without errors
- [ ] Existing report indexes still make sense

## Validation Commands

```bash
cd backend && npm run build
```

## Notes

- This change will break the report service (Task 06 will fix it)
- Existing reports in the database will have old structure
- Consider if old reports need migration or if they can be regenerated

## Estimated Time
30 minutes
