# 02. Create Auth Controller Unit Tests

meta:
  id: backend-test-coverage-02
  feature: backend-test-coverage
  priority: P1
  depends_on: [backend-test-coverage-01]
  tags: [testing, controllers, authentication]

## Objective
Create comprehensive unit tests for the auth controller (`backend/src/controllers/auth.controller.ts`) covering signup, login, logout, and getCurrentUser functions.

## Context
- The auth controller handles user authentication operations
- Current coverage: 0%
- File location: `backend/src/controllers/auth.controller.ts`
- Exports: `signup`, `login`, `logout`, `getCurrentUser`
- Uses `bcrypt` for password hashing and `jsonwebtoken` for token generation
- Reference pattern: `backend/src/controllers/contract.controller.test.ts`

## Deliverables
- New file: `backend/src/controllers/auth.controller.test.ts`
- Test coverage for all 4 exported functions

## Test Cases to Implement

### signup
1. **Happy Path Tests:**
   - Should create new user with hashed password
   - Should return 201 with user info and token
   - Should not include password in response

2. **Error Cases:**
   - Should return 400 when email already registered
   - Should return 500 on database error

3. **Edge Cases:**
   - Should handle missing required fields

### login
1. **Happy Path Tests:**
   - Should return 200 with user info and token on valid credentials
   - Should include firstName and lastName in response

2. **Error Cases:**
   - Should return 401 when email not found
   - Should return 401 when password is incorrect
   - Should return 500 on database error

### logout
1. **Happy Path Tests:**
   - Should call req.logout and return success message
   - Should return JSON response with logout message

### getCurrentUser
1. **Happy Path Tests:**
   - Should return user data when authenticated
   - Should exclude __v field from response

2. **Error Cases:**
   - Should return 401 when user not authenticated (req.user is null)
   - Should return 404 when user not found in database
   - Should return 500 on database error

## Steps
1. Create test file `backend/src/controllers/auth.controller.test.ts`
2. Set up Jest mocks for `User` model, `bcrypt`, and `jsonwebtoken`
3. Create helper functions following the established pattern
4. Implement tests for each function
5. Run tests to verify

## Code Template
```typescript
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { signup, login, logout, getCurrentUser } from './auth.controller';
import { User } from '../models/User';

// Mock dependencies
jest.mock('../models/User');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

// Helper to create valid ObjectId
const createObjectId = (): mongoose.Types.ObjectId => new mongoose.Types.ObjectId();

// Helper to create mock request
const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  body: {},
  user: null,
  logout: jest.fn((callback: () => void) => callback()),
  ...overrides
});

// Helper to create mock response
const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Helper to create mock user
const createMockUser = (overrides = {}) => ({
  _id: createObjectId(),
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  password: 'hashedpassword',
  ...overrides
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'test-secret';
});

describe('Auth Controller', () => {
  describe('signup', () => {
    // Tests here
  });

  describe('login', () => {
    // Tests here
  });

  describe('logout', () => {
    // Tests here
  });

  describe('getCurrentUser', () => {
    // Tests here
  });
});
```

## Acceptance Criteria
- [ ] Test file created at `backend/src/controllers/auth.controller.test.ts`
- [ ] All test cases pass when running `npm test`
- [ ] Tests follow AAA pattern with clear comments
- [ ] All 4 functions have comprehensive test coverage
- [ ] Password hashing is properly mocked
- [ ] JWT token generation is properly mocked
- [ ] Error scenarios return correct HTTP status codes

## Validation
```bash
cd backend
npm test -- auth.controller.test.ts --coverage --collectCoverageFrom="src/controllers/auth.controller.ts"
```
Expected: Coverage for `auth.controller.ts` should be >80%

## Dependencies Output
- Established controller test patterns
- Mock patterns for bcrypt and jwt
- User model mock patterns

## Notes
- `logout` uses a callback pattern with `req.logout()`
- `getCurrentUser` expects `req.user` to be set by auth middleware
- Password should never be included in responses
- Token expiration is set to '7d' in the controller
