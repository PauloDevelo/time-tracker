# 05. Create Time Entry Controller Unit Tests

meta:
  id: backend-test-coverage-05
  feature: backend-test-coverage
  priority: P1
  depends_on: [backend-test-coverage-04]
  tags: [testing, controllers, time-entries]

## Objective
Create comprehensive unit tests for the time entry controller (`backend/src/controllers/entry.controller.ts`) covering time tracking operations including start, stop, create, update, delete, and list.

## Context
- The entry controller handles time tracking operations
- Current coverage: 0%
- File location: `backend/src/controllers/entry.controller.ts`
- Exports: `startTimeEntry`, `stopTimeEntry`, `createTimeEntry`, `updateTimeEntry`, `deleteTimeEntry`, `getTimeEntries`
- Uses `TimeEntry` model with duration calculations
- Reference pattern: `backend/src/controllers/contract.controller.test.ts`

## Deliverables
- New file: `backend/src/controllers/entry.controller.test.ts`
- Test coverage for all 6 exported functions

## Test Cases to Implement

### startTimeEntry
1. **Happy Path Tests:**
   - Should start time entry and set startProgressTime to current time
   - Should return 201 with updated time entry

2. **Error Cases:**
   - Should return 404 when time entry not found
   - Should return 400 when user already has entry in progress
   - Should return 500 on database error

### stopTimeEntry
1. **Happy Path Tests:**
   - Should stop time entry and calculate duration
   - Should add duration to totalDurationInHour
   - Should clear startProgressTime
   - Should return updated time entry

2. **Error Cases:**
   - Should return 404 when time entry not found
   - Should return 400 when time entry is not in progress
   - Should return 500 on database error

3. **Edge Cases:**
   - Should correctly calculate duration in hours

### createTimeEntry
1. **Happy Path Tests:**
   - Should create time entry with provided data
   - Should return 201 with created entry
   - Should set startProgressTime to undefined

2. **Error Cases:**
   - Should return 500 on database error

### updateTimeEntry
1. **Happy Path Tests:**
   - Should update time entry fields
   - Should return updated entry

2. **Error Cases:**
   - Should return 400 when trying to set startProgressTime directly
   - Should return 404 when time entry not found
   - Should return 500 on database error

### deleteTimeEntry
1. **Happy Path Tests:**
   - Should delete time entry and return success message

2. **Error Cases:**
   - Should return 404 when time entry not found
   - Should return 500 on database error

### getTimeEntries
1. **Happy Path Tests:**
   - Should return paginated time entries for user
   - Should filter by taskId when provided
   - Should filter by date range (startDate, endDate)
   - Should filter by inProgressOnly
   - Should return pagination metadata
   - Should sort by startTime descending

2. **Error Cases:**
   - Should return 500 on database error

3. **Edge Cases:**
   - Should use default pagination (page 1, limit 10)
   - Should handle empty results

## Steps
1. Create test file `backend/src/controllers/entry.controller.test.ts`
2. Set up Jest mocks for `TimeEntry` model
3. Create helper functions for mock time entry data
4. Implement tests for each function
5. Run tests to verify

## Code Template
```typescript
import { Response } from 'express';
import mongoose from 'mongoose';
import {
  startTimeEntry,
  stopTimeEntry,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getTimeEntries
} from './entry.controller';
import { TimeEntry } from '../models/TimeEntry';
import { AuthenticatedRequest } from '../middleware/authenticated-request.model';

jest.mock('../models/TimeEntry');

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

const createMockTimeEntry = (overrides = {}) => ({
  _id: createObjectId(),
  taskId: createObjectId(),
  userId: createObjectId(),
  startTime: new Date('2025-01-15T09:00:00Z'),
  totalDurationInHour: 0,
  startProgressTime: null,
  save: jest.fn(),
  ...overrides
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Entry Controller', () => {
  describe('startTimeEntry', () => {
    /**
     * Test: should start time entry and set startProgressTime
     */
    it('should start time entry and set startProgressTime', async () => {
      // Arrange
      const userId = createObjectId();
      const timeEntryId = createObjectId();
      const mockTimeEntry = createMockTimeEntry({
        _id: timeEntryId,
        userId,
        startProgressTime: null
      });

      const req = createMockRequest({
        params: { timeEntryId: timeEntryId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (TimeEntry.findOne as jest.Mock)
        .mockResolvedValueOnce(mockTimeEntry) // First call - find the entry
        .mockResolvedValueOnce(null); // Second call - check for in-progress

      // Act
      await startTimeEntry(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(mockTimeEntry.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // More test suites...
});
```

## Acceptance Criteria
- [ ] Test file created at `backend/src/controllers/entry.controller.test.ts`
- [ ] All test cases pass when running `npm test`
- [ ] Tests follow AAA pattern with clear comments
- [ ] All 6 functions have comprehensive test coverage
- [ ] Duration calculations properly tested
- [ ] Pagination properly tested
- [ ] Error scenarios return correct HTTP status codes

## Validation
```bash
cd backend
npm test -- entry.controller.test.ts --coverage --collectCoverageFrom="src/controllers/entry.controller.ts"
```
Expected: Coverage for `entry.controller.ts` should be >80%

## Dependencies Output
- Time entry controller test patterns
- Duration calculation test patterns
- Pagination test patterns

## Notes
- `startTimeEntry` checks for existing in-progress entries
- `stopTimeEntry` calculates duration: `(now - startProgressTime) / (1000 * 60 * 60)`
- `getTimeEntries` uses complex query building with optional filters
- Time entries are sorted by `startTime: -1` (descending)
- Pagination uses skip/limit pattern
