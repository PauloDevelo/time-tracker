# Task 06: Update Report Service for Contract Grouping

## Objective
Update the report generation service to group data by Contract first, then by Project, and use the contract's daily rate for billing calculations.

## Dependencies
- Task 05: Report model must have contract grouping structure

## Deliverables

### 1. Update `backend/src/services/report.service.ts`

**Major Changes:**

1. **Remove `getDailyRate` and `IBillingOverride`:**
   - These are no longer needed since rate comes from contract

2. **Update `generateReport` function:**
   - Fetch contracts for the customer
   - Group projects by their contractId
   - Calculate costs using contract's dailyRate
   - Build the new report structure

### New Report Generation Logic

```typescript
export const generateReport = async (
  customerId: string,
  year: number,
  month: number,
  reportType: 'timesheet' | 'invoice',
  userId: string
): Promise<ReportSummary> => {
  // 1. Get customer
  // 2. Get all contracts for customer
  // 3. Get all projects grouped by contract
  // 4. For each contract:
  //    - Get projects for this contract
  //    - For each project:
  //      - Get tasks
  //      - Get time entries in date range
  //      - Calculate hours and costs using CONTRACT's dailyRate
  // 5. Build report with contract → project → task hierarchy
  // 6. Save and return
}
```

### Key Implementation Details

1. **Fetch contracts:**
```typescript
const contracts = await Contract.find({
  customerId: new mongoose.Types.ObjectId(customerId),
  userId: new mongoose.Types.ObjectId(userId)
});
```

2. **Group projects by contract:**
```typescript
const projectsByContract = new Map<string, IProject[]>();
for (const project of projects) {
  const contractId = project.contractId?.toString() || 'unassigned';
  if (!projectsByContract.has(contractId)) {
    projectsByContract.set(contractId, []);
  }
  projectsByContract.get(contractId)?.push(project);
}
```

3. **Use contract rate for billing:**
```typescript
// For each contract
const contract = contractsMap.get(contractId);
const dailyRate = contract.dailyRate;
const hourlyRate = dailyRate / 8;
const cost = hourlyRate * duration;
```

4. **Build contract-level data:**
```typescript
const contractData: ContractTimeData = {
  contractId: contract._id,
  contractName: contract.name,
  dailyRate: contract.dailyRate,
  currency: contract.currency,
  totalHours: 0,
  totalCost: reportType === 'invoice' ? 0 : undefined,
  projects: []
};
```

### 2. Update Tests

Update `backend/src/services/report.service.test.ts`:
- Remove tests for `getDailyRate` with billingOverride
- Add tests for contract-based rate calculation
- Test contract grouping in reports

## Implementation Steps

1. Open `backend/src/services/report.service.ts`
2. Import Contract model
3. Remove `IBillingOverride` interface
4. Update `getDailyRate` to only take contract rate (or remove entirely)
5. Rewrite `generateReport` to:
   - Fetch contracts
   - Group by contract
   - Use contract rates
   - Build new structure
6. Update the return format to match new ReportSummary
7. Update tests in `report.service.test.ts`

## Reference Files
- `backend/src/services/report.service.ts` - Main file to modify
- `backend/src/services/report.service.test.ts` - Tests to update
- `backend/src/models/Contract.ts` - Contract model

## Handling Projects Without Contracts

Since user will manually assign contracts, some projects may temporarily not have contracts:

**Option A (Recommended):** Group under "Unassigned" section using customer's default rate
```typescript
// For projects without contractId, create a virtual "Unassigned" contract entry
const unassignedContractData: ContractTimeData = {
  contractId: null,
  contractName: 'Unassigned (using customer default rate)',
  dailyRate: customer.billingDetails.dailyRate,
  currency: customer.billingDetails.currency,
  totalHours: 0,
  totalCost: reportType === 'invoice' ? 0 : undefined,
  projects: []
};
```

**Option B:** Skip projects without contracts and log a warning

Choose Option A to ensure all time entries are included in reports during the transition period.

## Acceptance Criteria

- [ ] Report groups data by Contract → Project → Task
- [ ] Daily rate comes from Contract, not Customer or Project
- [ ] Single invoice generated per customer (all contracts combined)
- [ ] Summary totals are correct across all contracts
- [ ] Projects without contracts are handled gracefully
- [ ] TypeScript compiles without errors
- [ ] Existing tests are updated and pass
- [ ] New tests cover contract-based calculations

## Validation Commands

```bash
cd backend && npm run build
cd backend && npm test
```

## Estimated Time
60 minutes (largest task)
