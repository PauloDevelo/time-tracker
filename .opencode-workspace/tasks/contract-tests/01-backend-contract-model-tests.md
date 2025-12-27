# Task 01: Backend Contract Model Unit Tests

## Objective
Create unit tests for the Contract Mongoose model to verify schema validation, pre-validate hooks, and field constraints.

## Dependencies
- None (foundation task)

## Deliverables

### Create `backend/src/models/contract.model.test.ts`

Test the following areas:

### 1. Schema Validation Tests

```typescript
describe('Contract Model', () => {
  describe('Schema Validation', () => {
    describe('Required Fields', () => {
      it('should require customerId');
      it('should require name');
      it('should require startDate');
      it('should require endDate');
      it('should require dailyRate');
      it('should require daysToCompletion');
      it('should require userId');
      it('should not require description (optional)');
    });

    describe('Field Constraints', () => {
      it('should reject negative dailyRate');
      it('should accept dailyRate of 0');
      it('should reject negative daysToCompletion');
      it('should accept daysToCompletion of 0');
      it('should default currency to EUR');
      it('should trim name field');
      it('should trim description field');
    });
  });
});
```

### 2. Date Validation Tests

```typescript
describe('Date Validation', () => {
  it('should reject when endDate equals startDate');
  it('should reject when endDate is before startDate');
  it('should accept when endDate is after startDate');
  it('should accept dates spanning multiple years');
  it('should accept dates one day apart');
});
```

### 3. Valid Contract Creation Tests

```typescript
describe('Valid Contract Creation', () => {
  it('should create a contract with all required fields');
  it('should create a contract with optional description');
  it('should set timestamps automatically');
  it('should generate _id automatically');
});
```

## Test Setup

```typescript
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Contract, IContract } from './Contract';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Contract.deleteMany({});
});

// Helper to create valid contract data
const createValidContractData = (overrides = {}) => ({
  customerId: new mongoose.Types.ObjectId(),
  userId: new mongoose.Types.ObjectId(),
  name: 'Test Contract 2025',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  dailyRate: 500,
  currency: 'EUR',
  daysToCompletion: 220,
  ...overrides
});
```

## Implementation Notes

- Use `mongodb-memory-server` for in-memory MongoDB testing
- Install if not present: `npm install --save-dev mongodb-memory-server`
- Follow existing test patterns from `report.service.test.ts`
- Use descriptive test names that explain the expected behavior

## Reference Files
- `backend/src/models/Contract.ts` - Model to test
- `backend/src/services/report.service.test.ts` - Test pattern reference
- `backend/jest.config.js` - Jest configuration

## Acceptance Criteria

- [ ] All required field validations are tested
- [ ] Field constraints (min values, defaults) are tested
- [ ] Date validation (endDate > startDate) is tested
- [ ] Valid contract creation is tested
- [ ] Tests use in-memory MongoDB for isolation
- [ ] All tests pass with `cd backend && npm test`

## Validation Commands

```bash
cd backend && npm test -- --testPathPattern=contract.model
```

## Estimated Time
45 minutes
