# 08. Create User Settings Controller Unit Tests

meta:
  id: backend-test-coverage-08
  feature: backend-test-coverage
  priority: P1
  depends_on: [backend-test-coverage-07]
  tags: [testing, controllers, user-settings]

## Objective
Create comprehensive unit tests for the user settings controller (`backend/src/controllers/user-settings.controller.ts`) covering get and update operations for user settings.

## Context
- The user settings controller handles user profile and company information
- Current coverage: 0%
- File location: `backend/src/controllers/user-settings.controller.ts`
- Exports: `getUserSettings`, `updateUserSettings`
- Uses `UserSettings` model with nested objects for company and personal info
- Reference pattern: `backend/src/controllers/contract.controller.test.ts`

## Deliverables
- New file: `backend/src/controllers/user-settings.controller.test.ts`
- Test coverage for both exported functions

## Test Cases to Implement

### getUserSettings
1. **Happy Path Tests:**
   - Should return existing user settings
   - Should create default settings if none exist
   - Should return settings with all fields

2. **Error Cases:**
   - Should return 500 on database error

3. **Edge Cases:**
   - Should create settings with empty default values

### updateUserSettings
1. **Happy Path Tests:**
   - Should update companyInformation only
   - Should update personalInformation only
   - Should update both companyInformation and personalInformation
   - Should merge with existing data (not overwrite)
   - Should handle file upload for profile image
   - Should return updated settings

2. **Error Cases:**
   - Should return 400 when no update data provided
   - Should return 404 when update fails (findOneAndUpdate returns null)
   - Should return 500 on database error

3. **Edge Cases:**
   - Should preserve existing fields when updating partial data
   - Should handle image upload with existing personalInformation
   - Should handle image upload without existing personalInformation

## Steps
1. Create test file `backend/src/controllers/user-settings.controller.test.ts`
2. Set up Jest mocks for `UserSettings` model
3. Create helper functions for mock settings data
4. Implement tests for each function including file upload scenarios
5. Run tests to verify

## Code Template
```typescript
import { Response } from 'express';
import mongoose from 'mongoose';
import { getUserSettings, updateUserSettings } from './user-settings.controller';
import { UserSettings } from '../models/UserSettings';
import { AuthenticatedRequest } from '../middleware/authenticated-request.model';

jest.mock('../models/UserSettings');

const createObjectId = (): mongoose.Types.ObjectId => new mongoose.Types.ObjectId();

const createMockRequest = (overrides: Partial<AuthenticatedRequest> = {}): Partial<AuthenticatedRequest> => ({
  params: {},
  body: {},
  user: { _id: createObjectId() } as any,
  file: undefined,
  ...overrides
});

const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createMockUserSettings = (overrides = {}) => ({
  _id: createObjectId(),
  userId: createObjectId(),
  companyInformation: {
    name: 'Test Company',
    address: '123 Test St',
    businessNumber: 'BN123',
    incorporationNumber: 'INC456'
  },
  personalInformation: {
    address: '456 Personal Ave',
    image: null
  },
  ...overrides
});

const createDefaultSettings = (userId: mongoose.Types.ObjectId) => ({
  userId,
  companyInformation: {
    name: '',
    address: '',
    businessNumber: '',
    incorporationNumber: ''
  },
  personalInformation: {
    address: ''
  }
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('User Settings Controller', () => {
  describe('getUserSettings', () => {
    /**
     * Test: should return existing user settings
     */
    it('should return existing user settings', async () => {
      // Arrange
      const userId = createObjectId();
      const mockSettings = createMockUserSettings({ userId });

      const req = createMockRequest({
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (UserSettings.findOne as jest.Mock).mockResolvedValue(mockSettings);

      // Act
      await getUserSettings(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(UserSettings.findOne).toHaveBeenCalledWith({ userId });
      expect(res.json).toHaveBeenCalledWith(mockSettings);
    });

    /**
     * Test: should create default settings if none exist
     */
    it('should create default settings if none exist', async () => {
      // Arrange
      const userId = createObjectId();
      const defaultSettings = createDefaultSettings(userId);

      const req = createMockRequest({
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (UserSettings.findOne as jest.Mock).mockResolvedValue(null);
      (UserSettings.create as jest.Mock).mockResolvedValue(defaultSettings);

      // Act
      await getUserSettings(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(UserSettings.create).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(defaultSettings);
    });
  });

  describe('updateUserSettings', () => {
    /**
     * Test: should update companyInformation only
     */
    it('should update companyInformation only', async () => {
      // Arrange
      const userId = createObjectId();
      const existingSettings = createMockUserSettings({ userId });
      const updatedSettings = {
        ...existingSettings,
        companyInformation: {
          ...existingSettings.companyInformation,
          name: 'Updated Company'
        }
      };

      const req = createMockRequest({
        user: { _id: userId } as any,
        body: {
          companyInformation: { name: 'Updated Company' }
        }
      });
      const res = createMockResponse();

      (UserSettings.findOne as jest.Mock).mockResolvedValue(existingSettings);
      (UserSettings.findOneAndUpdate as jest.Mock).mockResolvedValue(updatedSettings);

      // Act
      await updateUserSettings(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(UserSettings.findOneAndUpdate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(updatedSettings);
    });

    /**
     * Test: should handle file upload for profile image
     */
    it('should handle file upload for profile image', async () => {
      // Arrange
      const userId = createObjectId();
      const existingSettings = createMockUserSettings({ userId });
      const mockFile = {
        buffer: Buffer.from('test-image'),
        mimetype: 'image/png'
      };

      const req = createMockRequest({
        user: { _id: userId } as any,
        body: {},
        file: mockFile as any
      });
      const res = createMockResponse();

      (UserSettings.findOne as jest.Mock).mockResolvedValue(existingSettings);
      (UserSettings.findOneAndUpdate as jest.Mock).mockResolvedValue({
        ...existingSettings,
        personalInformation: {
          ...existingSettings.personalInformation,
          image: { data: mockFile.buffer, contentType: mockFile.mimetype }
        }
      });

      // Act
      await updateUserSettings(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(UserSettings.findOneAndUpdate).toHaveBeenCalled();
    });

    /**
     * Test: should return 400 when no update data provided
     */
    it('should return 400 when no update data provided', async () => {
      // Arrange
      const userId = createObjectId();
      const existingSettings = createMockUserSettings({ userId });

      const req = createMockRequest({
        user: { _id: userId } as any,
        body: {} // No update data
      });
      const res = createMockResponse();

      (UserSettings.findOne as jest.Mock).mockResolvedValue(existingSettings);

      // Act
      await updateUserSettings(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No update data provided' });
    });
  });
});
```

## Acceptance Criteria
- [ ] Test file created at `backend/src/controllers/user-settings.controller.test.ts`
- [ ] All test cases pass when running `npm test`
- [ ] Tests follow AAA pattern with clear comments
- [ ] Both functions have comprehensive test coverage
- [ ] File upload scenarios properly tested
- [ ] Merge behavior for nested objects properly tested
- [ ] Error scenarios return correct HTTP status codes

## Validation
```bash
cd backend
npm test -- user-settings.controller.test.ts --coverage --collectCoverageFrom="src/controllers/user-settings.controller.ts"
```
Expected: Coverage for `user-settings.controller.ts` should be >80%

## Dependencies Output
- User settings controller test patterns
- File upload mock patterns
- Nested object merge test patterns

## Notes
- `updateUserSettings` merges updates with existing data using spread operator
- File upload is handled via `req.file` (multer middleware)
- Image is stored as `{ data: Buffer, contentType: string }`
- Uses `findOneAndUpdate` with `{ new: true, upsert: true }` options
- Empty update data (no companyInformation, personalInformation, or file) returns 400
