# 09. Create Task Service Unit Tests

meta:
  id: backend-test-coverage-09
  feature: backend-test-coverage
  priority: P1
  depends_on: [backend-test-coverage-06]
  tags: [testing, services, tasks]

## Objective
Create comprehensive unit tests for the task service (`backend/src/services/task.service.ts`) covering all CRUD operations and pagination logic.

## Context
- The task service handles task business logic
- Current coverage: 0%
- File location: `backend/src/services/task.service.ts`
- Exports: `createTask`, `getTasks`, `getTaskById`, `updateTask`, `deleteTask`
- Uses `Task` model directly
- Reference pattern: `backend/src/services/report.service.test.ts`

## Deliverables
- New file: `backend/src/services/task.service.test.ts`
- Test coverage for all 5 exported functions

## Test Cases to Implement

### createTask
1. **Happy Path Tests:**
   - Should create task with valid data
   - Should return saved task

2. **Error Cases:**
   - Should throw error with descriptive message on save failure

### getTasks
1. **Happy Path Tests:**
   - Should return tasks with pagination metadata
   - Should filter by userId
   - Should filter by projectId
   - Should apply sorting (default: createdAt descending)
   - Should apply skip and limit for pagination

2. **Error Cases:**
   - Should throw error with descriptive message on query failure

3. **Edge Cases:**
   - Should use default pagination (page 1, limit 10)
   - Should return empty array when no tasks match
   - Should calculate correct skip value

### getTaskById
1. **Happy Path Tests:**
   - Should return task when found
   - Should filter by both taskId and userId

2. **Error Cases:**
   - Should throw error with descriptive message on query failure

3. **Edge Cases:**
   - Should return null when task not found

### updateTask
1. **Happy Path Tests:**
   - Should update task with provided data
   - Should return updated task
   - Should use runValidators option

2. **Error Cases:**
   - Should throw error with descriptive message on update failure

3. **Edge Cases:**
   - Should return null when task not found

### deleteTask
1. **Happy Path Tests:**
   - Should delete task and return true
   - Should filter by both taskId and userId

2. **Error Cases:**
   - Should throw error with descriptive message on delete failure

3. **Edge Cases:**
   - Should return false when task not found (deletedCount = 0)

## Steps
1. Create test file `backend/src/services/task.service.test.ts`
2. Set up Jest mocks for `Task` model
3. Create helper functions for mock task data
4. Implement tests for each function
5. Run tests to verify

## Code Template
```typescript
import mongoose from 'mongoose';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask
} from './task.service';
import { Task } from '../models/Task';

jest.mock('../models/Task');

const createObjectId = (): mongoose.Types.ObjectId => new mongoose.Types.ObjectId();

const createMockTask = (overrides = {}) => ({
  _id: createObjectId(),
  name: 'Test Task',
  description: 'Test description',
  projectId: createObjectId(),
  userId: createObjectId(),
  createdAt: new Date(),
  updatedAt: new Date(),
  save: jest.fn(),
  ...overrides
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Task Service', () => {
  describe('createTask', () => {
    /**
     * Test: should create task with valid data
     */
    it('should create task with valid data', async () => {
      // Arrange
      const taskData = {
        name: 'New Task',
        description: 'Task description',
        projectId: createObjectId(),
        userId: createObjectId()
      };
      const savedTask = createMockTask(taskData);

      (Task as unknown as jest.Mock).mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(savedTask)
      }));

      // Act
      const result = await createTask(taskData as any);

      // Assert
      expect(result).toEqual(savedTask);
    });

    /**
     * Test: should throw error on save failure
     */
    it('should throw error on save failure', async () => {
      // Arrange
      const taskData = {
        name: 'New Task',
        projectId: createObjectId(),
        userId: createObjectId()
      };

      (Task as unknown as jest.Mock).mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error('Database error'))
      }));

      // Act & Assert
      await expect(createTask(taskData as any)).rejects.toThrow('Error creating task: Database error');
    });
  });

  describe('getTasks', () => {
    /**
     * Test: should return tasks with pagination metadata
     */
    it('should return tasks with pagination metadata', async () => {
      // Arrange
      const userId = createObjectId();
      const mockTasks = [createMockTask({ userId }), createMockTask({ userId })];
      const filter = { userId };
      const options = { page: 1, limit: 10 };

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockTasks)
      };

      (Task.find as jest.Mock).mockReturnValue(mockQuery);
      (Task.countDocuments as jest.Mock).mockResolvedValue(2);

      // Act
      const result = await getTasks(filter, options);

      // Assert
      expect(result).toEqual({
        tasks: mockTasks,
        total: 2,
        page: 1,
        limit: 10
      });
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    /**
     * Test: should calculate correct skip value for pagination
     */
    it('should calculate correct skip value for pagination', async () => {
      // Arrange
      const filter = { userId: createObjectId() };
      const options = { page: 3, limit: 10 };

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      };

      (Task.find as jest.Mock).mockReturnValue(mockQuery);
      (Task.countDocuments as jest.Mock).mockResolvedValue(0);

      // Act
      await getTasks(filter, options);

      // Assert
      expect(mockQuery.skip).toHaveBeenCalledWith(20); // (3-1) * 10 = 20
    });
  });

  describe('getTaskById', () => {
    /**
     * Test: should return task when found
     */
    it('should return task when found', async () => {
      // Arrange
      const taskId = createObjectId().toString();
      const userId = createObjectId();
      const mockTask = createMockTask({ _id: taskId, userId });

      (Task.findOne as jest.Mock).mockResolvedValue(mockTask);

      // Act
      const result = await getTaskById(taskId, userId);

      // Assert
      expect(Task.findOne).toHaveBeenCalledWith({ _id: taskId, userId });
      expect(result).toEqual(mockTask);
    });

    /**
     * Test: should return null when task not found
     */
    it('should return null when task not found', async () => {
      // Arrange
      const taskId = createObjectId().toString();
      const userId = createObjectId();

      (Task.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await getTaskById(taskId, userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateTask', () => {
    /**
     * Test: should update task with provided data
     */
    it('should update task with provided data', async () => {
      // Arrange
      const taskId = createObjectId().toString();
      const userId = createObjectId();
      const updates = { name: 'Updated Task' };
      const updatedTask = createMockTask({ _id: taskId, userId, ...updates });

      (Task.findOneAndUpdate as jest.Mock).mockResolvedValue(updatedTask);

      // Act
      const result = await updateTask(taskId, userId, updates);

      // Assert
      expect(Task.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: taskId, userId },
        { $set: updates },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(updatedTask);
    });
  });

  describe('deleteTask', () => {
    /**
     * Test: should delete task and return true
     */
    it('should delete task and return true', async () => {
      // Arrange
      const taskId = createObjectId().toString();
      const userId = createObjectId();

      (Task.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });

      // Act
      const result = await deleteTask(taskId, userId);

      // Assert
      expect(Task.deleteOne).toHaveBeenCalledWith({ _id: taskId, userId });
      expect(result).toBe(true);
    });

    /**
     * Test: should return false when task not found
     */
    it('should return false when task not found', async () => {
      // Arrange
      const taskId = createObjectId().toString();
      const userId = createObjectId();

      (Task.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 0 });

      // Act
      const result = await deleteTask(taskId, userId);

      // Assert
      expect(result).toBe(false);
    });
  });
});
```

## Acceptance Criteria
- [ ] Test file created at `backend/src/services/task.service.test.ts`
- [ ] All test cases pass when running `npm test`
- [ ] Tests follow AAA pattern with clear comments
- [ ] All 5 functions have comprehensive test coverage
- [ ] Pagination logic properly tested
- [ ] Error wrapping properly tested (errors include descriptive prefix)
- [ ] Edge cases (null returns, empty results) properly tested

## Validation
```bash
cd backend
npm test -- task.service.test.ts --coverage --collectCoverageFrom="src/services/task.service.ts"
```
Expected: Coverage for `task.service.ts` should be >80%

## Dependencies Output
- Service layer test patterns
- Mongoose query chain mock patterns
- Pagination calculation patterns

## Notes
- Service wraps errors with descriptive messages: `Error creating task: ${error.message}`
- Default sort is `{ createdAt: -1 }`
- Default pagination: page 1, limit 10
- Skip calculation: `(page - 1) * limit`
- `deleteTask` returns boolean based on `deletedCount`
- Uses `$set` operator for updates
