# Task 02: Backend Contract Controller Unit Tests

## Objective
Create unit tests for the Contract controller to verify CRUD operations, authorization, and error handling.

## Dependencies
- Task 01: Contract model tests (for understanding model behavior)

## Deliverables

### Create `backend/src/controllers/contract.controller.test.ts`

Test all 5 controller functions with mocked dependencies.

### 1. getContractsByCustomer Tests

```typescript
describe('getContractsByCustomer', () => {
  describe('Success Cases', () => {
    it('should return all contracts for a valid customer');
    it('should return contracts sorted by startDate descending');
    it('should return empty array when customer has no contracts');
  });

  describe('Error Cases', () => {
    it('should return 400 for invalid customer ID format');
    it('should return 404 when customer not found');
    it('should return 404 when customer belongs to different user');
    it('should return 500 on database error');
  });
});
```

### 2. getContract Tests

```typescript
describe('getContract', () => {
  describe('Success Cases', () => {
    it('should return contract when found');
  });

  describe('Error Cases', () => {
    it('should return 400 for invalid customer ID format');
    it('should return 400 for invalid contract ID format');
    it('should return 404 when customer not found');
    it('should return 404 when contract not found');
    it('should return 404 when contract belongs to different customer');
  });
});
```

### 3. createContract Tests

```typescript
describe('createContract', () => {
  describe('Success Cases', () => {
    it('should create contract with all required fields');
    it('should create contract with optional description');
    it('should default currency to EUR when not provided');
    it('should return 201 status on success');
  });

  describe('Validation Errors', () => {
    it('should return 400 when name is missing');
    it('should return 400 when startDate is missing');
    it('should return 400 when endDate is missing');
    it('should return 400 when dailyRate is missing');
    it('should return 400 when daysToCompletion is missing');
    it('should return 400 for invalid date format');
    it('should return 400 when endDate is before startDate');
    it('should return 400 when endDate equals startDate');
  });

  describe('Authorization Errors', () => {
    it('should return 400 for invalid customer ID format');
    it('should return 404 when customer not found');
  });
});
```

### 4. updateContract Tests

```typescript
describe('updateContract', () => {
  describe('Success Cases', () => {
    it('should update contract name');
    it('should update contract dates');
    it('should update contract dailyRate');
    it('should update multiple fields at once');
    it('should return updated contract');
  });

  describe('Validation Errors', () => {
    it('should return 400 for invalid start date format');
    it('should return 400 for invalid end date format');
    it('should return 400 when updated endDate is before startDate');
  });

  describe('Authorization Errors', () => {
    it('should return 400 for invalid customer ID format');
    it('should return 400 for invalid contract ID format');
    it('should return 404 when customer not found');
    it('should return 404 when contract not found');
  });
});
```

### 5. deleteContract Tests

```typescript
describe('deleteContract', () => {
  describe('Success Cases', () => {
    it('should delete contract when not in use');
    it('should return success message');
  });

  describe('Error Cases', () => {
    it('should return 400 for invalid customer ID format');
    it('should return 400 for invalid contract ID format');
    it('should return 404 when customer not found');
    it('should return 404 when contract not found');
    it('should return 400 when contract is used by projects');
    it('should include project count in error message');
  });
});
```

## Test Setup

```typescript
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  getContractsByCustomer,
  getContract,
  createContract,
  updateContract,
  deleteContract
} from './contract.controller';
import { Contract } from '../models/Contract';
import { Customer } from '../models/Customer';
import { Project } from '../models/Project';
import { AuthenticatedRequest } from '../middleware/authenticated-request.model';

// Mock the models
jest.mock('../models/Contract');
jest.mock('../models/Customer');
jest.mock('../models/Project');

// Helper to create mock request
const createMockRequest = (overrides = {}): Partial<AuthenticatedRequest> => ({
  params: {},
  body: {},
  user: { _id: new mongoose.Types.ObjectId() },
  ...overrides
});

// Helper to create mock response
const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
```

## Implementation Notes

- Mock mongoose models using `jest.mock()`
- Use `jest.fn()` for mock functions
- Reset mocks in `beforeEach`
- Test both success and error paths
- Verify correct HTTP status codes
- Verify response body structure

## Reference Files
- `backend/src/controllers/contract.controller.ts` - Controller to test
- `backend/src/services/report.service.test.ts` - Test pattern reference

## Acceptance Criteria

- [ ] All 5 controller functions are tested
- [ ] Success cases are covered
- [ ] Validation error cases are covered
- [ ] Authorization error cases are covered
- [ ] HTTP status codes are verified
- [ ] Response bodies are verified
- [ ] All tests pass with `cd backend && npm test`

## Validation Commands

```bash
cd backend && npm test -- --testPathPattern=contract.controller
```

## Estimated Time
60 minutes
