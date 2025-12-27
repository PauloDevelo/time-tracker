# 06. Create Task Controller Unit Tests

meta:
  id: backend-test-coverage-06
  feature: backend-test-coverage
  priority: P1
  depends_on: [backend-test-coverage-05]
  tags: [testing, controllers, tasks]

## Objective
Create comprehensive unit tests for the task controller (`backend/src/controllers/task.controller.ts`) covering all CRUD operations that delegate to the task service.

## Context
- The task controller handles task management operations
- Current coverage: 0%
- File location: `backend/src/controllers/task.controller.ts`
- Exports: `createTask`, `getTasks`, `getTaskById`, `updateTask`, `deleteTask`
- Delegates to `taskService` for business logic
- Reference pattern: `backend/src/controllers/contract.controller.test.ts`

## Deliverables
- New file: `backend/src/controllers/task.controller.test.ts`
- Test coverage for all 5 exported functions

## Test Cases to Implement

### createTask
1. **Happy Path Tests:**
   - Should create task with valid data
   - Should return 201 with created task
   - Should include userId from authenticated user

2. **Error Cases:**
   - Should return 400 with error message on service error

### getTasks
1. **Happy Path Tests:**
   - Should return tasks for authenticated user
   - Should filter by projectId when provided
   - Should use pagination options (page, limit)
   - Should return result with tasks array and metadata

2. **Error Cases:**
   - Should return 400 with error message on service error

3. **Edge Cases:**
   - Should use default pagination when not provided

### getTaskById
1. **Happy Path Tests:**
   - Should return task when found
   - Should only return task belonging to user

2. **Error Cases:**
   - Should return 404 when task not found
   - Should return 400 with error message on service error

### updateTask
1. **Happy Path Tests:**
   - Should update task with provided data
   - Should return 200 with updated task

2. **Error Cases:**
   - Should return 404 when task not found
   - Should return 400 with error message on service error

### deleteTask
1. **Happy Path Tests:**
   - Should delete task and return 204 (no content)

2. **Error Cases:**
   - Should return 404 when task not found
   - Should return 400 with error message on service error

## Steps
1. Create test file `backend/src/controllers/task.controller.test.ts`
2. Set up Jest mocks for `taskService`
3. Create helper functions for mock task data
4. Implement tests for each function
5. Run tests to verify

## Code Template
```typescript
import { Response } from 'express';
import mongoose from 'mongoose';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask
} from './task.controller';
import * as taskService from '../services/task.service';
import { AuthenticatedRequest } from '../middleware/authenticated-request.model';

jest.mock('../services/task.service');

const createObjectId = (): mongoose.Types.ObjectId => new mongoose.Types.ObjectId();

const createMockRequest = (overrides: Partial<AuthenticatedRequest> = {}): Partial<AuthenticatedRequest> => ({
  params: {},
  body: {},
  query: {},
  user: { id: createObjectId().toString(), _id: createObjectId() } as any,
  ...overrides
});

const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const createMockTask = (overrides = {}) => ({
  _id: createObjectId(),
  name: 'Test Task',
  description: 'Test description',
  projectId: createObjectId(),
  userId: createObjectId(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Task Controller', () => {
  describe('createTask', () => {
    /**
     * Test: should create task with valid data
     */
    it('should create task with valid data', async () => {
      // Arrange
      const userId = createObjectId();
      const mockTask = createMockTask({ userId });
      const req = createMockRequest({
        body: { name: 'New Task', projectId: createObjectId().toString() },
        user: { id: userId.toString() } as any
      });
      const res = createMockResponse();

      (taskService.createTask as jest.Mock).mockResolvedValue(mockTask);

      // Act
      await createTask(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(taskService.createTask).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockTask);
    });

    /**
     * Test: should return 400 on service error
     */
    it('should return 400 on service error', async () => {
      // Arrange
      const req = createMockRequest({
        body: { name: 'New Task' },
        user: { id: createObjectId().toString() } as any
      });
      const res = createMockResponse();

      (taskService.createTask as jest.Mock).mockRejectedValue(new Error('Validation error'));

      // Act
      await createTask(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Validation error' });
    });
  });

  // More test suites...
});
```

## Acceptance Criteria
- [ ] Test file created at `backend/src/controllers/task.controller.test.ts`
- [ ] All test cases pass when running `npm test`
- [ ] Tests follow AAA pattern with clear comments
- [ ] All 5 functions have comprehensive test coverage
- [ ] Service layer properly mocked
- [ ] Error scenarios return correct HTTP status codes
- [ ] 204 status properly tested for deleteTask

## Validation
```bash
cd backend
npm test -- task.controller.test.ts --coverage --collectCoverageFrom="src/controllers/task.controller.ts"
```
Expected: Coverage for `task.controller.ts` should be >80%

## Dependencies Output
- Task controller test patterns
- Service mocking patterns
- Patterns for testing controllers that delegate to services

## Notes
- Controller uses `req.user.id` (string) not `req.user._id`
- `deleteTask` returns 204 with `res.send()` not `res.json()`
- Controller converts `req.user.id` to ObjectId using `new mongoose.Types.ObjectId()`
- Pagination options are parsed from query strings to integers
