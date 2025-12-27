# Task 03: Backend Project Model Contract Validation Tests

## Objective
Create unit tests for the Project model's contract validation logic, specifically the pre-validate hook that ensures a contract belongs to the same customer as the project.

## Dependencies
- Task 01: Contract model tests (for understanding validation patterns)

## Deliverables

### Create `backend/src/models/project.model.test.ts`

Test the contractId validation logic added to the Project model.

### 1. ContractId Field Tests

```typescript
describe('Project Model - Contract Validation', () => {
  describe('contractId Field', () => {
    it('should accept project without contractId (optional field)');
    it('should accept project with valid contractId');
    it('should store contractId as ObjectId reference');
  });
});
```

### 2. Contract-Customer Validation Tests

```typescript
describe('Contract-Customer Validation Hook', () => {
  describe('Valid Cases', () => {
    it('should accept when contract belongs to same customer');
    it('should accept when contractId is not set');
    it('should accept when contractId is null');
  });

  describe('Invalid Cases', () => {
    it('should reject when contract does not exist');
    it('should reject when contract belongs to different customer');
  });
});
```

### 3. Integration with Existing Validation

```typescript
describe('Combined Validation', () => {
  it('should validate both Azure DevOps and contract in same hook');
  it('should fail fast on first validation error');
});
```

## Test Setup

```typescript
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Project, IProject } from './Project';
import { Contract } from './Contract';
import { Customer } from './Customer';

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
  await Project.deleteMany({});
  await Contract.deleteMany({});
  await Customer.deleteMany({});
});

// Helper to create test data
const createTestCustomer = async (userId: mongoose.Types.ObjectId) => {
  const customer = new Customer({
    name: 'Test Customer',
    contactInfo: { email: 'test@example.com' },
    billingDetails: { dailyRate: 400, currency: 'EUR' },
    userId
  });
  return customer.save();
};

const createTestContract = async (customerId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId) => {
  const contract = new Contract({
    customerId,
    userId,
    name: 'Test Contract',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    dailyRate: 500,
    currency: 'EUR',
    daysToCompletion: 220
  });
  return contract.save();
};

const createValidProjectData = (customerId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId, overrides = {}) => ({
  name: 'Test Project',
  description: 'Test Description',
  customerId,
  userId,
  ...overrides
});
```

## Test Scenarios

### Scenario 1: Project without contract
```typescript
it('should accept project without contractId', async () => {
  const userId = new mongoose.Types.ObjectId();
  const customer = await createTestCustomer(userId);
  
  const project = new Project(createValidProjectData(customer._id, userId));
  
  await expect(project.save()).resolves.toBeDefined();
  expect(project.contractId).toBeUndefined();
});
```

### Scenario 2: Project with valid contract
```typescript
it('should accept when contract belongs to same customer', async () => {
  const userId = new mongoose.Types.ObjectId();
  const customer = await createTestCustomer(userId);
  const contract = await createTestContract(customer._id, userId);
  
  const project = new Project(createValidProjectData(customer._id, userId, {
    contractId: contract._id
  }));
  
  await expect(project.save()).resolves.toBeDefined();
});
```

### Scenario 3: Project with contract from different customer
```typescript
it('should reject when contract belongs to different customer', async () => {
  const userId = new mongoose.Types.ObjectId();
  const customer1 = await createTestCustomer(userId);
  const customer2 = await createTestCustomer(userId);
  const contract = await createTestContract(customer2._id, userId);
  
  const project = new Project(createValidProjectData(customer1._id, userId, {
    contractId: contract._id
  }));
  
  await expect(project.save()).rejects.toThrow('Contract must belong to the same customer');
});
```

## Implementation Notes

- Use real MongoDB (in-memory) for integration testing
- Create actual Customer and Contract documents for validation
- Test the pre-validate hook behavior
- Verify error messages are descriptive

## Reference Files
- `backend/src/models/Project.ts` - Model to test (lines 98-116 for contract validation)
- `backend/src/models/Contract.ts` - Contract model
- `backend/src/models/Customer.ts` - Customer model

## Acceptance Criteria

- [ ] contractId field acceptance is tested
- [ ] Contract-customer matching validation is tested
- [ ] Non-existent contract rejection is tested
- [ ] Mismatched customer rejection is tested
- [ ] Error messages are verified
- [ ] All tests pass with `cd backend && npm test`

## Validation Commands

```bash
cd backend && npm test -- --testPathPattern=project.model
```

## Estimated Time
40 minutes
