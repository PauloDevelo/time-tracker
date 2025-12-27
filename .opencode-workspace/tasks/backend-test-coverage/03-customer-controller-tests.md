# 03. Create Customer Controller Unit Tests

meta:
  id: backend-test-coverage-03
  feature: backend-test-coverage
  priority: P1
  depends_on: [backend-test-coverage-02]
  tags: [testing, controllers, customers]

## Objective
Create comprehensive unit tests for the customer controller (`backend/src/controllers/customer.controller.ts`) covering all CRUD operations and Azure DevOps validation.

## Context
- The customer controller handles customer management and Azure DevOps integration
- Current coverage: 0%
- File location: `backend/src/controllers/customer.controller.ts`
- Exports: `createCustomer`, `getCustomers`, `getCustomer`, `updateCustomer`, `deleteCustomer`, `validateAzureDevOpsProject`
- Uses `Customer` model and `AzureDevOpsClient` service
- Reference pattern: `backend/src/controllers/contract.controller.test.ts`

## Deliverables
- New file: `backend/src/controllers/customer.controller.test.ts`
- Test coverage for all 6 exported functions

## Test Cases to Implement

### createCustomer
1. **Happy Path Tests:**
   - Should create customer with valid data
   - Should return 201 with created customer
   - Should associate customer with authenticated user

2. **Error Cases:**
   - Should return 400 on validation error
   - Should return 400 on database error

### getCustomers
1. **Happy Path Tests:**
   - Should return all customers for authenticated user
   - Should return customers sorted by name
   - Should return empty array when no customers exist

2. **Error Cases:**
   - Should return 500 on database error

### getCustomer
1. **Happy Path Tests:**
   - Should return customer when found
   - Should only return customer belonging to user

2. **Error Cases:**
   - Should return 404 when customer not found
   - Should return 500 on database error

### updateCustomer
1. **Happy Path Tests:**
   - Should update customer name
   - Should update contactInfo
   - Should update billingDetails
   - Should update azureDevOps config with new PAT
   - Should preserve existing PAT when not provided in update

2. **Error Cases:**
   - Should return 404 when customer not found
   - Should return 400 on validation error

3. **Edge Cases:**
   - Should handle partial updates
   - Should handle empty PAT (preserve existing)

### deleteCustomer
1. **Happy Path Tests:**
   - Should delete customer and return success message
   - Should only delete customer belonging to user

2. **Error Cases:**
   - Should return 404 when customer not found
   - Should return 500 on database error

### validateAzureDevOpsProject
1. **Happy Path Tests:**
   - Should return valid: true with project details when project exists
   - Should return projectId, projectName, projectUrl

2. **Error Cases:**
   - Should return 400 when projectName not provided
   - Should return 404 when customer not found
   - Should return 400 when Azure DevOps not enabled
   - Should return 400 when Azure DevOps config incomplete
   - Should return 500 when PAT decryption fails
   - Should return 404 when Azure DevOps project not found
   - Should return 401 when Azure DevOps authentication fails
   - Should return 500 on general Azure DevOps error

## Steps
1. Create test file `backend/src/controllers/customer.controller.test.ts`
2. Set up Jest mocks for `Customer` model and `AzureDevOpsClient`
3. Create helper functions for mock customer data
4. Implement tests for each function
5. Run tests to verify

## Code Template
```typescript
import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  validateAzureDevOpsProject
} from './customer.controller';
import { Customer } from '../models/Customer';
import { AzureDevOpsClient } from '../services/azure-devops-client.service';
import { AuthenticatedRequest } from '../middleware/authenticated-request.model';

// Mock dependencies
jest.mock('../models/Customer');
jest.mock('../services/azure-devops-client.service');

const createObjectId = (): mongoose.Types.ObjectId => new mongoose.Types.ObjectId();

const createMockRequest = (overrides: Partial<AuthenticatedRequest> = {}): Partial<AuthenticatedRequest> => ({
  params: {},
  body: {},
  user: { _id: createObjectId() } as any,
  ...overrides
});

const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createMockNext = (): NextFunction => jest.fn();

const createMockCustomer = (overrides = {}) => ({
  _id: createObjectId(),
  name: 'Test Customer',
  contactInfo: {
    email: 'customer@example.com',
    phone: '123-456-7890',
    address: '123 Test St'
  },
  billingDetails: {
    dailyRate: 500,
    currency: 'USD'
  },
  userId: createObjectId(),
  azureDevOps: {
    organizationUrl: 'https://dev.azure.com/testorg',
    pat: 'encrypted:pat',
    enabled: true
  },
  getDecryptedPAT: jest.fn().mockReturnValue('decrypted-pat'),
  markModified: jest.fn(),
  save: jest.fn(),
  ...overrides
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Customer Controller', () => {
  // Test suites here
});
```

## Acceptance Criteria
- [ ] Test file created at `backend/src/controllers/customer.controller.test.ts`
- [ ] All test cases pass when running `npm test`
- [ ] Tests follow AAA pattern with clear comments
- [ ] All 6 functions have comprehensive test coverage
- [ ] Azure DevOps integration properly mocked
- [ ] PAT handling (encryption/decryption) properly tested
- [ ] Error scenarios return correct HTTP status codes

## Validation
```bash
cd backend
npm test -- customer.controller.test.ts --coverage --collectCoverageFrom="src/controllers/customer.controller.ts"
```
Expected: Coverage for `customer.controller.ts` should be >80%

## Dependencies Output
- Customer controller test patterns
- AzureDevOpsClient mock patterns
- PAT encryption/decryption mock patterns

## Notes
- The `updateCustomer` function has complex PAT handling logic
- `getCustomers` calls `next()` after sending response
- `validateAzureDevOpsProject` uses `getDecryptedPAT()` method on customer
- Azure DevOps URL validation regex: `/^https:\/\/(dev\.azure\.com\/[^/]+|[^/]+\.visualstudio\.com)$/`
