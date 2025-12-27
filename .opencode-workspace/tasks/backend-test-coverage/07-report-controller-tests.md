# 07. Create Report Controller Unit Tests

meta:
  id: backend-test-coverage-07
  feature: backend-test-coverage
  priority: P1
  depends_on: [backend-test-coverage-06]
  tags: [testing, controllers, reports]

## Objective
Create comprehensive unit tests for the report controller (`backend/src/controllers/report.controller.ts`) covering report generation and available months retrieval.

## Context
- The report controller handles report generation for customers
- Current coverage: 0%
- File location: `backend/src/controllers/report.controller.ts`
- Exports: `getAvailableMonths`, `generateReport`
- Delegates to `reportService` for business logic
- Reference pattern: `backend/src/controllers/contract.controller.test.ts`

## Deliverables
- New file: `backend/src/controllers/report.controller.test.ts`
- Test coverage for both exported functions

## Test Cases to Implement

### getAvailableMonths
1. **Happy Path Tests:**
   - Should return available months for valid customer
   - Should return 200 with months array

2. **Error Cases:**
   - Should return 400 for invalid customer ID format
   - Should return 500 on service error

3. **Edge Cases:**
   - Should return empty array when no time entries exist

### generateReport
1. **Happy Path Tests:**
   - Should generate timesheet report
   - Should generate invoice report
   - Should return 200 with success: true and report data

2. **Error Cases:**
   - Should return 400 when customerId not provided
   - Should return 400 when year not provided or invalid
   - Should return 400 when month not provided or invalid (< 1 or > 12)
   - Should return 400 when reportType not provided or invalid
   - Should return 500 on service error

3. **Validation Tests:**
   - Should validate year is a number
   - Should validate month is between 1 and 12
   - Should validate reportType is 'timesheet' or 'invoice'

## Steps
1. Create test file `backend/src/controllers/report.controller.test.ts`
2. Set up Jest mocks for `reportService`
3. Create helper functions for mock report data
4. Implement tests for each function
5. Run tests to verify

## Code Template
```typescript
import { Response } from 'express';
import mongoose from 'mongoose';
import { getAvailableMonths, generateReport } from './report.controller';
import * as reportService from '../services/report.service';
import { AuthenticatedRequest } from '../middleware/authenticated-request.model';

jest.mock('../services/report.service');

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

const createMockReportSummary = (overrides = {}) => ({
  customerId: createObjectId().toString(),
  customerName: 'Test Customer',
  year: 2025,
  month: 1,
  reportType: 'invoice',
  totalHours: 160,
  totalCost: 8000,
  contracts: [],
  ...overrides
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Report Controller', () => {
  describe('getAvailableMonths', () => {
    /**
     * Test: should return available months for valid customer
     */
    it('should return available months for valid customer', async () => {
      // Arrange
      const customerId = createObjectId();
      const userId = createObjectId();
      const mockMonths = [
        { year: 2025, month: 1 },
        { year: 2025, month: 2 }
      ];

      const req = createMockRequest({
        params: { customerId: customerId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (reportService.getAvailableMonths as jest.Mock).mockResolvedValue(mockMonths);

      // Act
      await getAvailableMonths(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(reportService.getAvailableMonths).toHaveBeenCalledWith(
        customerId.toString(),
        userId.toString()
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockMonths);
    });

    /**
     * Test: should return 400 for invalid customer ID format
     */
    it('should return 400 for invalid customer ID format', async () => {
      // Arrange
      const req = createMockRequest({
        params: { customerId: 'invalid-id' }
      });
      const res = createMockResponse();

      // Act
      await getAvailableMonths(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid customer ID' });
      expect(reportService.getAvailableMonths).not.toHaveBeenCalled();
    });
  });

  describe('generateReport', () => {
    /**
     * Test: should generate invoice report
     */
    it('should generate invoice report', async () => {
      // Arrange
      const customerId = createObjectId().toString();
      const userId = createObjectId();
      const mockReport = createMockReportSummary({ customerId });

      const req = createMockRequest({
        body: {
          customerId,
          year: 2025,
          month: 1,
          reportType: 'invoice'
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (reportService.generateReport as jest.Mock).mockResolvedValue(mockReport);

      // Act
      await generateReport(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(reportService.generateReport).toHaveBeenCalledWith(
        customerId,
        2025,
        1,
        'invoice',
        userId.toString()
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
    });

    // More tests...
  });
});
```

## Acceptance Criteria
- [ ] Test file created at `backend/src/controllers/report.controller.test.ts`
- [ ] All test cases pass when running `npm test`
- [ ] Tests follow AAA pattern with clear comments
- [ ] Both functions have comprehensive test coverage
- [ ] Input validation properly tested
- [ ] Error scenarios return correct HTTP status codes and response format

## Validation
```bash
cd backend
npm test -- report.controller.test.ts --coverage --collectCoverageFrom="src/controllers/report.controller.ts"
```
Expected: Coverage for `report.controller.ts` should be >80%

## Dependencies Output
- Report controller test patterns
- Input validation test patterns
- Response format patterns (success: true/false)

## Notes
- `generateReport` uses a specific response format: `{ success: boolean, data?: ..., error?: string }`
- Month validation: must be number between 1 and 12
- Report type validation: must be 'timesheet' or 'invoice'
- Uses `mongoose.Types.ObjectId.isValid()` for ID validation
- Error responses include `success: false` and `error` message
