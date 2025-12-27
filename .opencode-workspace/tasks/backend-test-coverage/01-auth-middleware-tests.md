# 01. Create Auth Middleware Unit Tests

meta:
  id: backend-test-coverage-01
  feature: backend-test-coverage
  priority: P1
  depends_on: []
  tags: [testing, middleware, authentication]

## Objective
Create comprehensive unit tests for the auth middleware (`backend/src/middleware/auth.ts`) covering JWT token validation, user lookup, and the `generateToken` function.

## Context
- The auth middleware is critical for securing all authenticated endpoints
- Current coverage: 0%
- File location: `backend/src/middleware/auth.ts`
- The middleware exports two functions: `auth` (middleware) and `generateToken`
- Uses `jsonwebtoken` for JWT operations and `User` model for user lookup
- Reference pattern: `backend/src/controllers/contract.controller.test.ts`

## Deliverables
- New file: `backend/src/middleware/auth.test.ts`
- Test coverage for `auth` middleware function
- Test coverage for `generateToken` function

## Test Cases to Implement

### auth middleware
1. **Happy Path Tests:**
   - Should call next() when valid token and user exist
   - Should attach user to request object
   - Should extract token correctly from Authorization header

2. **Error Cases:**
   - Should return 401 when no Authorization header provided
   - Should return 401 when Authorization header has no token
   - Should return 401 when token is invalid/malformed
   - Should return 401 when token is expired
   - Should return 401 when user not found in database
   - Should return 401 when JWT_SECRET is missing

3. **Edge Cases:**
   - Should handle Bearer prefix correctly
   - Should handle token with extra whitespace

### generateToken function
1. **Happy Path Tests:**
   - Should generate valid JWT token with userId
   - Should use default expiration when JWT_EXPIRES_IN not set
   - Should use custom expiration from JWT_EXPIRES_IN

2. **Error Cases:**
   - Should throw error when JWT_SECRET is not defined

## Steps
1. Create test file `backend/src/middleware/auth.test.ts`
2. Set up Jest mocks for `jsonwebtoken` and `User` model
3. Create helper functions following the pattern:
   ```typescript
   const createMockRequest = (overrides = {}) => ({...})
   const createMockResponse = () => ({...})
   const createMockNext = () => jest.fn()
   ```
4. Implement tests for `auth` middleware
5. Implement tests for `generateToken` function
6. Run tests to verify: `cd backend && npm test -- auth.test.ts`

## Code Template
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { auth, generateToken } from './auth';
import { User } from '../models/User';
import { AuthenticatedRequest } from './authenticated-request.model';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../models/User');

// Helper functions
const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  header: jest.fn(),
  ...overrides
});

const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createMockNext = (): NextFunction => jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'test-secret';
});

describe('Auth Middleware', () => {
  describe('auth', () => {
    // Tests here
  });

  describe('generateToken', () => {
    // Tests here
  });
});
```

## Acceptance Criteria
- [ ] Test file created at `backend/src/middleware/auth.test.ts`
- [ ] All test cases pass when running `npm test`
- [ ] Tests follow AAA pattern with clear comments
- [ ] Mocks properly isolate the middleware from dependencies
- [ ] Both `auth` and `generateToken` functions have test coverage
- [ ] Error scenarios properly tested with correct status codes

## Validation
```bash
cd backend
npm test -- auth.test.ts --coverage --collectCoverageFrom="src/middleware/auth.ts"
```
Expected: Coverage for `auth.ts` should be >80%

## Dependencies Output
- Established test patterns for middleware testing
- Mock setup patterns for jwt and User model
- Helper function patterns for request/response/next mocking

## Notes
- Remember to mock `process.env.JWT_SECRET` in tests
- The middleware uses `req.header('Authorization')` to get the token
- Token format expected: `Bearer <token>`
- User is attached to request as `(req as AuthenticatedRequest).user`
