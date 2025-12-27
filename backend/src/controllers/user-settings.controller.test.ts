import { Response } from 'express';
import mongoose from 'mongoose';
import { getUserSettings, updateUserSettings } from './user-settings.controller';
import { UserSettings } from '../models/UserSettings';
import { AuthenticatedRequest } from '../middleware/authenticated-request.model';

// Mock the UserSettings model
jest.mock('../models/UserSettings');

/**
 * Unit tests for the User Settings controller.
 * 
 * These tests verify:
 * - Get user settings with default creation
 * - Update user settings with merge behavior
 * - File upload handling for profile images
 * - Error handling (400, 404, 500 responses)
 */

// Helper to create valid ObjectId
const createObjectId = (): mongoose.Types.ObjectId => new mongoose.Types.ObjectId();

// Helper to create mock authenticated request
const createMockRequest = (overrides: Partial<AuthenticatedRequest> = {}): Partial<AuthenticatedRequest> => ({
  params: {},
  body: {},
  user: { _id: createObjectId() } as any,
  file: undefined,
  ...overrides
});

// Helper to create mock response
const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Helper to create mock user settings data
const createMockUserSettings = (overrides = {}) => ({
  _id: createObjectId(),
  userId: createObjectId(),
  companyInformation: {
    name: 'Test Company',
    address: '123 Test St',
    businessNumber: 'BN123456',
    incorporationNumber: 'INC789'
  },
  personalInformation: {
    address: '456 Personal Ave',
    image: undefined
  },
  ...overrides
});

// Helper to create default empty user settings
const createDefaultUserSettings = (userId: mongoose.Types.ObjectId) => ({
  _id: createObjectId(),
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
     * 
     * Objective: Verify that existing user settings are returned correctly.
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
     * Test: should create default settings when none exist
     * 
     * Objective: Verify that default settings are created for new users.
     */
    it('should create default settings when none exist', async () => {
      // Arrange
      const userId = createObjectId();
      const defaultSettings = createDefaultUserSettings(userId);

      const req = createMockRequest({
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (UserSettings.findOne as jest.Mock).mockResolvedValue(null);
      (UserSettings.create as jest.Mock).mockResolvedValue(defaultSettings);

      // Act
      await getUserSettings(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(UserSettings.findOne).toHaveBeenCalledWith({ userId });
      expect(UserSettings.create).toHaveBeenCalledWith({
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
      expect(res.json).toHaveBeenCalledWith(defaultSettings);
    });

    /**
     * Test: should return 500 on database error
     * 
     * Objective: Verify that database errors are handled gracefully.
     */
    it('should return 500 on database error', async () => {
      // Arrange
      const userId = createObjectId();

      const req = createMockRequest({
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (UserSettings.findOne as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      // Act
      await getUserSettings(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to retrieve user settings' });
    });

    /**
     * Test: should include companyInformation and personalInformation
     * 
     * Objective: Verify that returned settings include both information sections.
     */
    it('should include companyInformation and personalInformation', async () => {
      // Arrange
      const userId = createObjectId();
      const mockSettings = createMockUserSettings({
        userId,
        companyInformation: {
          name: 'Acme Corp',
          address: '100 Business Blvd',
          businessNumber: 'BN999',
          incorporationNumber: 'INC888'
        },
        personalInformation: {
          address: '200 Home Lane',
          image: {
            data: Buffer.from('test-image'),
            contentType: 'image/png'
          }
        }
      });

      const req = createMockRequest({
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (UserSettings.findOne as jest.Mock).mockResolvedValue(mockSettings);

      // Act
      await getUserSettings(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.json).toHaveBeenCalledWith(mockSettings);
      const returnedSettings = (res.json as jest.Mock).mock.calls[0][0];
      expect(returnedSettings.companyInformation).toBeDefined();
      expect(returnedSettings.companyInformation.name).toBe('Acme Corp');
      expect(returnedSettings.personalInformation).toBeDefined();
      expect(returnedSettings.personalInformation.address).toBe('200 Home Lane');
    });

    /**
     * Test: should return 500 when UserSettings.create fails
     * 
     * Objective: Verify that errors during default settings creation are handled.
     */
    it('should return 500 when UserSettings.create fails', async () => {
      // Arrange
      const userId = createObjectId();

      const req = createMockRequest({
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (UserSettings.findOne as jest.Mock).mockResolvedValue(null);
      (UserSettings.create as jest.Mock).mockRejectedValue(new Error('Create failed'));

      // Act
      await getUserSettings(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to retrieve user settings' });
    });
  });

  describe('updateUserSettings', () => {
    /**
     * Test: should update company information
     * 
     * Objective: Verify that company information can be updated.
     */
    it('should update company information', async () => {
      // Arrange
      const userId = createObjectId();
      const currentSettings = createMockUserSettings({ userId });
      const updatedSettings = {
        ...currentSettings,
        companyInformation: {
          name: 'New Company Name',
          address: '123 Test St',
          businessNumber: 'BN123456',
          incorporationNumber: 'INC789'
        }
      };

      const req = createMockRequest({
        user: { _id: userId } as any,
        body: {
          companyInformation: { name: 'New Company Name' }
        }
      });
      const res = createMockResponse();

      (UserSettings.findOne as jest.Mock).mockResolvedValue(currentSettings);
      (UserSettings.findOneAndUpdate as jest.Mock).mockResolvedValue(updatedSettings);

      // Act
      await updateUserSettings(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(UserSettings.findOneAndUpdate).toHaveBeenCalledWith(
        { userId },
        { $set: expect.objectContaining({
          companyInformation: expect.objectContaining({ name: 'New Company Name' })
        }) },
        { new: true, upsert: true }
      );
      expect(res.json).toHaveBeenCalledWith(updatedSettings);
    });

    /**
     * Test: should update personal information
     * 
     * Objective: Verify that personal information can be updated.
     */
    it('should update personal information', async () => {
      // Arrange
      const userId = createObjectId();
      const currentSettings = createMockUserSettings({ userId });
      const updatedSettings = {
        ...currentSettings,
        personalInformation: {
          address: 'New Personal Address'
        }
      };

      const req = createMockRequest({
        user: { _id: userId } as any,
        body: {
          personalInformation: { address: 'New Personal Address' }
        }
      });
      const res = createMockResponse();

      (UserSettings.findOne as jest.Mock).mockResolvedValue(currentSettings);
      (UserSettings.findOneAndUpdate as jest.Mock).mockResolvedValue(updatedSettings);

      // Act
      await updateUserSettings(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(UserSettings.findOneAndUpdate).toHaveBeenCalledWith(
        { userId },
        { $set: expect.objectContaining({
          personalInformation: expect.objectContaining({ address: 'New Personal Address' })
        }) },
        { new: true, upsert: true }
      );
      expect(res.json).toHaveBeenCalledWith(updatedSettings);
    });

    /**
     * Test: should merge with existing data (not overwrite)
     * 
     * Objective: Verify that updates merge with existing data instead of replacing.
     */
    it('should merge with existing data (not overwrite)', async () => {
      // Arrange
      const userId = createObjectId();
      const currentSettings = createMockUserSettings({
        userId,
        companyInformation: {
          name: 'Original Name',
          address: 'Original Address',
          businessNumber: 'BN123',
          incorporationNumber: 'INC456'
        }
      });

      const req = createMockRequest({
        user: { _id: userId } as any,
        body: {
          companyInformation: { name: 'Updated Name' }
        }
      });
      const res = createMockResponse();

      (UserSettings.findOne as jest.Mock).mockResolvedValue(currentSettings);
      (UserSettings.findOneAndUpdate as jest.Mock).mockResolvedValue({});

      // Act
      await updateUserSettings(req as AuthenticatedRequest, res as Response);

      // Assert - verify merge behavior
      expect(UserSettings.findOneAndUpdate).toHaveBeenCalledWith(
        { userId },
        { $set: {
          companyInformation: {
            name: 'Updated Name',
            address: 'Original Address',
            businessNumber: 'BN123',
            incorporationNumber: 'INC456'
          }
        } },
        { new: true, upsert: true }
      );
    });

    /**
     * Test: should handle file upload for profile image
     * 
     * Objective: Verify that file uploads are processed correctly.
     */
    it('should handle file upload for profile image', async () => {
      // Arrange
      const userId = createObjectId();
      const currentSettings = createMockUserSettings({ userId });
      const imageBuffer = Buffer.from('test-image-data');
      const mockFile = {
        buffer: imageBuffer,
        mimetype: 'image/jpeg'
      };

      const req = createMockRequest({
        user: { _id: userId } as any,
        body: {},
        file: mockFile as any
      });
      const res = createMockResponse();

      (UserSettings.findOne as jest.Mock).mockResolvedValue(currentSettings);
      (UserSettings.findOneAndUpdate as jest.Mock).mockResolvedValue({
        ...currentSettings,
        personalInformation: {
          ...currentSettings.personalInformation,
          image: { data: imageBuffer, contentType: 'image/jpeg' }
        }
      });

      // Act
      await updateUserSettings(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(UserSettings.findOneAndUpdate).toHaveBeenCalledWith(
        { userId },
        { $set: expect.objectContaining({
          personalInformation: expect.objectContaining({
            image: {
              data: imageBuffer,
              contentType: 'image/jpeg'
            }
          })
        }) },
        { new: true, upsert: true }
      );
    });

    /**
     * Test: should return 400 when no update data provided
     * 
     * Objective: Verify that empty updates are rejected.
     */
    it('should return 400 when no update data provided', async () => {
      // Arrange
      const userId = createObjectId();

      const req = createMockRequest({
        user: { _id: userId } as any,
        body: {}
      });
      const res = createMockResponse();

      (UserSettings.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      await updateUserSettings(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No update data provided' });
      expect(UserSettings.findOneAndUpdate).not.toHaveBeenCalled();
    });

    /**
     * Test: should return 404 when update fails
     * 
     * Objective: Verify that failed updates return 404.
     */
    it('should return 404 when update fails', async () => {
      // Arrange
      const userId = createObjectId();
      const currentSettings = createMockUserSettings({ userId });

      const req = createMockRequest({
        user: { _id: userId } as any,
        body: {
          companyInformation: { name: 'New Name' }
        }
      });
      const res = createMockResponse();

      (UserSettings.findOne as jest.Mock).mockResolvedValue(currentSettings);
      (UserSettings.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      // Act
      await updateUserSettings(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update user settings' });
    });

    /**
     * Test: should return 500 on database error
     * 
     * Objective: Verify that database errors are handled gracefully.
     */
    it('should return 500 on database error', async () => {
      // Arrange
      const userId = createObjectId();

      const req = createMockRequest({
        user: { _id: userId } as any,
        body: {
          companyInformation: { name: 'New Name' }
        }
      });
      const res = createMockResponse();

      (UserSettings.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act
      await updateUserSettings(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update user settings: Database error' });
    });

    /**
     * Test: should preserve existing fields when updating partial data
     * 
     * Objective: Verify that partial updates don't lose existing data.
     */
    it('should preserve existing fields when updating partial data', async () => {
      // Arrange
      const userId = createObjectId();
      const currentSettings = createMockUserSettings({
        userId,
        personalInformation: {
          address: 'Existing Address',
          image: {
            data: Buffer.from('existing-image'),
            contentType: 'image/png'
          }
        }
      });

      const req = createMockRequest({
        user: { _id: userId } as any,
        body: {
          personalInformation: { address: 'New Address' }
        }
      });
      const res = createMockResponse();

      (UserSettings.findOne as jest.Mock).mockResolvedValue(currentSettings);
      (UserSettings.findOneAndUpdate as jest.Mock).mockResolvedValue({});

      // Act
      await updateUserSettings(req as AuthenticatedRequest, res as Response);

      // Assert - verify existing image is preserved
      expect(UserSettings.findOneAndUpdate).toHaveBeenCalledWith(
        { userId },
        { $set: {
          personalInformation: expect.objectContaining({
            address: 'New Address',
            image: currentSettings.personalInformation.image
          })
        } },
        { new: true, upsert: true }
      );
    });

    /**
     * Test: should handle undefined companyInformation
     * 
     * Objective: Verify that undefined companyInformation is not included in update.
     */
    it('should handle undefined companyInformation', async () => {
      // Arrange
      const userId = createObjectId();
      const currentSettings = createMockUserSettings({ userId });

      const req = createMockRequest({
        user: { _id: userId } as any,
        body: {
          personalInformation: { address: 'New Address' }
          // companyInformation is undefined
        }
      });
      const res = createMockResponse();

      (UserSettings.findOne as jest.Mock).mockResolvedValue(currentSettings);
      (UserSettings.findOneAndUpdate as jest.Mock).mockResolvedValue({});

      // Act
      await updateUserSettings(req as AuthenticatedRequest, res as Response);

      // Assert - companyInformation should not be in the update
      const updateCall = (UserSettings.findOneAndUpdate as jest.Mock).mock.calls[0];
      const updateData = updateCall[1].$set;
      expect(updateData.companyInformation).toBeUndefined();
      expect(updateData.personalInformation).toBeDefined();
    });

    /**
     * Test: should handle undefined personalInformation
     * 
     * Objective: Verify that undefined personalInformation is not included in update.
     */
    it('should handle undefined personalInformation', async () => {
      // Arrange
      const userId = createObjectId();
      const currentSettings = createMockUserSettings({ userId });

      const req = createMockRequest({
        user: { _id: userId } as any,
        body: {
          companyInformation: { name: 'New Company' }
          // personalInformation is undefined
        }
      });
      const res = createMockResponse();

      (UserSettings.findOne as jest.Mock).mockResolvedValue(currentSettings);
      (UserSettings.findOneAndUpdate as jest.Mock).mockResolvedValue({});

      // Act
      await updateUserSettings(req as AuthenticatedRequest, res as Response);

      // Assert - personalInformation should not be in the update
      const updateCall = (UserSettings.findOneAndUpdate as jest.Mock).mock.calls[0];
      const updateData = updateCall[1].$set;
      expect(updateData.personalInformation).toBeUndefined();
      expect(updateData.companyInformation).toBeDefined();
    });

    /**
     * Test: should handle image upload with existing personalInformation
     * 
     * Objective: Verify that image upload merges with existing personal info.
     */
    it('should handle image upload with existing personalInformation', async () => {
      // Arrange
      const userId = createObjectId();
      const currentSettings = createMockUserSettings({
        userId,
        personalInformation: {
          address: 'Existing Address'
        }
      });
      const imageBuffer = Buffer.from('new-image-data');
      const mockFile = {
        buffer: imageBuffer,
        mimetype: 'image/png'
      };

      const req = createMockRequest({
        user: { _id: userId } as any,
        body: {
          personalInformation: { address: 'Updated Address' }
        },
        file: mockFile as any
      });
      const res = createMockResponse();

      (UserSettings.findOne as jest.Mock).mockResolvedValue(currentSettings);
      (UserSettings.findOneAndUpdate as jest.Mock).mockResolvedValue({});

      // Act
      await updateUserSettings(req as AuthenticatedRequest, res as Response);

      // Assert - both address update and image should be included
      expect(UserSettings.findOneAndUpdate).toHaveBeenCalledWith(
        { userId },
        { $set: {
          personalInformation: {
            address: 'Updated Address',
            image: {
              data: imageBuffer,
              contentType: 'image/png'
            }
          }
        } },
        { new: true, upsert: true }
      );
    });

    /**
     * Test: should handle image upload when no current settings exist
     * 
     * Objective: Verify that image upload works when there are no existing settings.
     */
    it('should handle image upload when no current settings exist', async () => {
      // Arrange
      const userId = createObjectId();
      const imageBuffer = Buffer.from('new-image-data');
      const mockFile = {
        buffer: imageBuffer,
        mimetype: 'image/jpeg'
      };

      const req = createMockRequest({
        user: { _id: userId } as any,
        body: {},
        file: mockFile as any
      });
      const res = createMockResponse();

      (UserSettings.findOne as jest.Mock).mockResolvedValue(null);
      (UserSettings.findOneAndUpdate as jest.Mock).mockResolvedValue({});

      // Act
      await updateUserSettings(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(UserSettings.findOneAndUpdate).toHaveBeenCalledWith(
        { userId },
        { $set: {
          personalInformation: {
            image: {
              data: imageBuffer,
              contentType: 'image/jpeg'
            }
          }
        } },
        { new: true, upsert: true }
      );
    });

    /**
     * Test: should return 500 with error message when Error instance is thrown
     * 
     * Objective: Verify that Error instances include their message in the response.
     */
    it('should return 500 with error message when Error instance is thrown', async () => {
      // Arrange
      const userId = createObjectId();
      const currentSettings = createMockUserSettings({ userId });

      const req = createMockRequest({
        user: { _id: userId } as any,
        body: {
          companyInformation: { name: 'New Name' }
        }
      });
      const res = createMockResponse();

      (UserSettings.findOne as jest.Mock).mockResolvedValue(currentSettings);
      (UserSettings.findOneAndUpdate as jest.Mock).mockRejectedValue(new Error('Specific error message'));

      // Act
      await updateUserSettings(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update user settings: Specific error message' });
    });

    /**
     * Test: should return 500 with generic message when non-Error is thrown
     * 
     * Objective: Verify that non-Error exceptions return a generic message.
     */
    it('should return 500 with generic message when non-Error is thrown', async () => {
      // Arrange
      const userId = createObjectId();
      const currentSettings = createMockUserSettings({ userId });

      const req = createMockRequest({
        user: { _id: userId } as any,
        body: {
          companyInformation: { name: 'New Name' }
        }
      });
      const res = createMockResponse();

      (UserSettings.findOne as jest.Mock).mockResolvedValue(currentSettings);
      (UserSettings.findOneAndUpdate as jest.Mock).mockRejectedValue('String error');

      // Act
      await updateUserSettings(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update user settings' });
    });

    /**
     * Test: should update both company and personal information together
     * 
     * Objective: Verify that both sections can be updated in a single request.
     */
    it('should update both company and personal information together', async () => {
      // Arrange
      const userId = createObjectId();
      const currentSettings = createMockUserSettings({ userId });

      const req = createMockRequest({
        user: { _id: userId } as any,
        body: {
          companyInformation: { name: 'New Company' },
          personalInformation: { address: 'New Address' }
        }
      });
      const res = createMockResponse();

      (UserSettings.findOne as jest.Mock).mockResolvedValue(currentSettings);
      (UserSettings.findOneAndUpdate as jest.Mock).mockResolvedValue({});

      // Act
      await updateUserSettings(req as AuthenticatedRequest, res as Response);

      // Assert
      const updateCall = (UserSettings.findOneAndUpdate as jest.Mock).mock.calls[0];
      const updateData = updateCall[1].$set;
      expect(updateData.companyInformation).toBeDefined();
      expect(updateData.personalInformation).toBeDefined();
    });
  });
});
