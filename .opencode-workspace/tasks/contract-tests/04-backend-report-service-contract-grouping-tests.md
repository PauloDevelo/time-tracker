# Task 04: Backend Report Service Contract Grouping Tests

## Objective
Extend the existing report service tests to cover contract grouping logic and rate calculation from contracts.

## Dependencies
- Task 01: Contract model tests (for understanding contract structure)

## Deliverables

### Extend `backend/src/services/report.service.test.ts`

Add new test sections for contract grouping functionality.

### 1. Contract Grouping Logic Tests

```typescript
describe('Report Service - Contract Grouping', () => {
  describe('Project Grouping by Contract', () => {
    it('should group projects by their contractId');
    it('should group projects without contract under "No Contract"');
    it('should handle mix of projects with and without contracts');
    it('should maintain project order within contract groups');
  });

  describe('Contract Data in Report', () => {
    it('should include contractId in contract data');
    it('should include contractName in contract data');
    it('should include dailyRate from contract');
    it('should include currency from contract');
    it('should set contractId to null for unassigned projects');
    it('should use "No Contract" as name for unassigned projects');
  });
});
```

### 2. Rate Calculation from Contract Tests

```typescript
describe('Rate Calculation with Contracts', () => {
  describe('Contract Rate Usage', () => {
    it('should use contract dailyRate for projects with contract');
    it('should use customer dailyRate for projects without contract');
    it('should calculate hourly rate from contract dailyRate');
    it('should calculate cost using contract rate');
  });

  describe('Mixed Rate Scenarios', () => {
    it('should use different rates for different contracts');
    it('should handle contract with rate 0 (pro-bono)');
    it('should handle contract rate higher than customer rate');
    it('should handle contract rate lower than customer rate');
  });
});
```

### 3. Report Structure Tests

```typescript
describe('Report Structure with Contracts', () => {
  describe('Hierarchy', () => {
    it('should structure report as contracts -> projects -> tasks');
    it('should include all projects under their respective contracts');
    it('should include all tasks under their respective projects');
  });

  describe('Totals Calculation', () => {
    it('should calculate totalHours per contract');
    it('should calculate totalCost per contract for invoice reports');
    it('should sum contract totals for report summary');
    it('should not include totalCost for timesheet reports');
  });
});
```

### 4. Edge Cases

```typescript
describe('Edge Cases', () => {
  it('should handle customer with no projects');
  it('should handle customer with no contracts');
  it('should handle contract with no projects assigned');
  it('should handle project with no tasks');
  it('should handle task with no time entries in period');
  it('should handle multiple contracts with same daily rate');
});
```

## Test Data Setup

```typescript
// Helper to create test contract
const createTestContract = (customerId: string, userId: string, overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  customerId: new mongoose.Types.ObjectId(customerId),
  userId: new mongoose.Types.ObjectId(userId),
  name: 'Test Contract',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  dailyRate: 500,
  currency: 'EUR',
  daysToCompletion: 220,
  ...overrides
});

// Helper to create test project with contract
const createTestProjectWithContract = (customerId: string, contractId: string, userId: string) => ({
  _id: new mongoose.Types.ObjectId(),
  name: 'Test Project',
  description: 'Test',
  customerId: new mongoose.Types.ObjectId(customerId),
  contractId: new mongoose.Types.ObjectId(contractId),
  userId: new mongoose.Types.ObjectId(userId)
});

// Helper to create test project without contract
const createTestProjectWithoutContract = (customerId: string, userId: string) => ({
  _id: new mongoose.Types.ObjectId(),
  name: 'Unassigned Project',
  description: 'Test',
  customerId: new mongoose.Types.ObjectId(customerId),
  userId: new mongoose.Types.ObjectId(userId)
});
```

## Implementation Notes

- Extend the existing test file rather than creating a new one
- Use the existing test patterns and helpers
- Mock the Contract model alongside existing mocks
- Test the `generateReport` function with contract scenarios
- Verify the report structure matches `ContractTimeData` interface

## Reference Files
- `backend/src/services/report.service.ts` - Service to test (lines 240-347 for contract grouping)
- `backend/src/services/report.service.test.ts` - Existing tests to extend
- `backend/src/models/Report.ts` - ContractTimeData interface

## Acceptance Criteria

- [ ] Contract grouping logic is tested
- [ ] Rate calculation from contracts is tested
- [ ] Report structure with contracts is verified
- [ ] Edge cases are covered
- [ ] Existing tests still pass
- [ ] All tests pass with `cd backend && npm test`

## Validation Commands

```bash
cd backend && npm test -- --testPathPattern=report.service
```

## Estimated Time
50 minutes
