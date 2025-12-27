# 04. Create Project Controller Unit Tests

meta:
  id: backend-test-coverage-04
  feature: backend-test-coverage
  priority: P1
  depends_on: [backend-test-coverage-03]
  tags: [testing, controllers, projects]

## Objective
Create comprehensive unit tests for the project controller (`backend/src/controllers/project.controller.ts`) covering all CRUD operations and Azure DevOps integration endpoints.

## Context
- The project controller handles project management and Azure DevOps work item import
- Current coverage: 0%
- File location: `backend/src/controllers/project.controller.ts`
- Exports: `createProject`, `getAllProjects`, `getProjectById`, `updateProject`, `deleteProject`, `validateAzureDevOpsProject`, `getAzureDevOpsIterations`, `getAzureDevOpsProjectNames`, `importWorkItems`
- Uses `Project`, `Customer`, `Contract` models and Azure DevOps services
- Reference pattern: `backend/src/controllers/contract.controller.test.ts`

## Deliverables
- New file: `backend/src/controllers/project.controller.test.ts`
- Test coverage for all 9 exported functions

## Test Cases to Implement

### createProject
1. **Happy Path Tests:**
   - Should create project with valid data
   - Should create project with contractId
   - Should create project with azureDevOps config
   - Should return 201 with populated contract details

2. **Error Cases:**
   - Should return 400 when contract doesn't belong to customer
   - Should return 400 on validation error

### getAllProjects
1. **Happy Path Tests:**
   - Should return all projects for user
   - Should filter by customerId when provided
   - Should filter by search term
   - Should populate customer and contract details
   - Should return empty array when no projects

2. **Error Cases:**
   - Should return 500 on database error

### getProjectById
1. **Happy Path Tests:**
   - Should return project with populated details
   - Should only return project belonging to user

2. **Error Cases:**
   - Should return 400 for invalid project ID format
   - Should return 404 when project not found
   - Should return 500 on database error

### updateProject
1. **Happy Path Tests:**
   - Should update project fields
   - Should update contractId
   - Should remove contractId when set to null/empty
   - Should update azureDevOps config

2. **Error Cases:**
   - Should return 400 for invalid project ID
   - Should return 404 when project not found
   - Should return 400 when contract doesn't belong to customer
   - Should return 400 on validation error

### deleteProject
1. **Happy Path Tests:**
   - Should delete project and return success message

2. **Error Cases:**
   - Should return 400 for invalid project ID
   - Should return 404 when project not found
   - Should return 500 on database error

### validateAzureDevOpsProject
1. **Happy Path Tests:**
   - Should return valid: true with project details

2. **Error Cases:**
   - Should return 400 for invalid project ID
   - Should return 400 when projectName not provided
   - Should return 404 when project not found
   - Should return 404 when customer not found
   - Should return 400 when Azure DevOps not enabled for customer
   - Should return 400 when Azure DevOps config incomplete
   - Should return 500 when PAT decryption fails
   - Should return 404 when Azure DevOps project not found
   - Should return 401 when Azure DevOps auth fails
   - Should return 503 on Azure DevOps connection error

### getAzureDevOpsIterations
1. **Happy Path Tests:**
   - Should return formatted iterations list

2. **Error Cases:**
   - Should return 400 for invalid project ID
   - Should return 404 when project not found
   - Should return 400 when Azure DevOps not enabled for project
   - Should return 404 when customer not found
   - Should return 400 when customer Azure DevOps not configured
   - Should return 500 when PAT decryption fails
   - Should return 401 on Azure DevOps auth failure
   - Should return 503 on connection error

### getAzureDevOpsProjectNames
1. **Happy Path Tests:**
   - Should return distinct project names sorted alphabetically
   - Should filter by customerId when provided

2. **Error Cases:**
   - Should return 400 for invalid customer ID
   - Should return 500 on database error

### importWorkItems
1. **Happy Path Tests:**
   - Should import work items and return summary
   - Should update project's lastSyncedAt timestamp

2. **Error Cases:**
   - Should return 400 for invalid project ID
   - Should return 400 when iterationPath not provided
   - Should return 404 when project not found
   - Should return 400 when Azure DevOps not enabled
   - Should return 404 when customer not found
   - Should return 400 when customer Azure DevOps not configured
   - Should return 500 when PAT decryption fails
   - Should return 404 when iteration not found
   - Should return 401 on auth failure
   - Should return 429 on rate limit
   - Should return 503 on connection error

## Steps
1. Create test file `backend/src/controllers/project.controller.test.ts`
2. Set up Jest mocks for all models and services
3. Create comprehensive helper functions
4. Implement tests for each function
5. Run tests to verify

## Code Template
```typescript
import { Response } from 'express';
import mongoose from 'mongoose';
import {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  validateAzureDevOpsProject,
  getAzureDevOpsIterations,
  getAzureDevOpsProjectNames,
  importWorkItems
} from './project.controller';
import { Project } from '../models/Project';
import { Customer } from '../models/Customer';
import { Contract } from '../models/Contract';
import { AzureDevOpsClient } from '../services/azure-devops-client.service';
import { AzureDevOpsSyncService } from '../services/azure-devops-sync.service';
import { AuthenticatedRequest } from '../middleware/authenticated-request.model';

jest.mock('../models/Project');
jest.mock('../models/Customer');
jest.mock('../models/Contract');
jest.mock('../services/azure-devops-client.service');
jest.mock('../services/azure-devops-sync.service');

const createObjectId = (): mongoose.Types.ObjectId => new mongoose.Types.ObjectId();

const createMockRequest = (overrides: Partial<AuthenticatedRequest> = {}): Partial<AuthenticatedRequest> => ({
  params: {},
  body: {},
  query: {},
  user: { _id: createObjectId() } as any,
  ...overrides
});

const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createMockProject = (overrides = {}) => ({
  _id: createObjectId(),
  name: 'Test Project',
  description: 'Test description',
  customerId: createObjectId(),
  userId: createObjectId(),
  azureDevOps: {
    enabled: true,
    projectId: 'azure-project-id',
    projectName: 'Azure Project',
    lastSyncedAt: null
  },
  contractId: createObjectId(),
  populate: jest.fn().mockReturnThis(),
  save: jest.fn(),
  ...overrides
});

const createMockCustomer = (overrides = {}) => ({
  _id: createObjectId(),
  name: 'Test Customer',
  azureDevOps: {
    enabled: true,
    organizationUrl: 'https://dev.azure.com/testorg',
    pat: 'encrypted:pat'
  },
  getDecryptedPAT: jest.fn().mockReturnValue('decrypted-pat'),
  ...overrides
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Project Controller', () => {
  // Test suites here
});
```

## Acceptance Criteria
- [ ] Test file created at `backend/src/controllers/project.controller.test.ts`
- [ ] All test cases pass when running `npm test`
- [ ] Tests follow AAA pattern with clear comments
- [ ] All 9 functions have comprehensive test coverage
- [ ] Azure DevOps integration properly mocked
- [ ] Contract validation properly tested
- [ ] Error scenarios return correct HTTP status codes

## Validation
```bash
cd backend
npm test -- project.controller.test.ts --coverage --collectCoverageFrom="src/controllers/project.controller.ts"
```
Expected: Coverage for `project.controller.ts` should be >80%

## Dependencies Output
- Project controller test patterns
- Complex Azure DevOps mock patterns
- Contract validation patterns

## Notes
- This is the largest controller with 9 functions
- Many functions have complex Azure DevOps integration
- Contract validation requires checking customer ownership
- `importWorkItems` uses `AzureDevOpsSyncService`
- `getAzureDevOpsProjectNames` uses `Project.distinct()`
