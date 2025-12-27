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

// Mock the TimeEntry model
jest.mock('../models/TimeEntry');

/**
 * Unit tests for the Entry controller.
 * 
 * These tests verify:
 * - Starting time entries with validation
 * - Stopping time entries with duration calculation
 * - Creating time entries manually
 * - Updating time entries with field restrictions
 * - Deleting time entries
 * - Retrieving time entries with filtering and pagination
 * - Error handling (400, 404, 500 responses)
 */

// Helper to create valid ObjectId
const createObjectId = (): mongoose.Types.ObjectId => new mongoose.Types.ObjectId();

// Helper to create mock authenticated request
const createMockRequest = (overrides: Partial<AuthenticatedRequest> = {}): Partial<AuthenticatedRequest> => ({
  params: {},
  body: {},
  query: {},
  user: {
    _id: createObjectId()
  } as any,
  ...overrides
});

// Helper to create mock response
const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Helper to create mock time entry data
const createMockTimeEntry = (overrides = {}) => {
  const entry = {
    _id: createObjectId(),
    startTime: new Date('2024-01-15T09:00:00Z'),
    totalDurationInHour: 2.5,
    startProgressTime: undefined as Date | undefined,
    taskId: createObjectId(),
    userId: createObjectId(),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides
  };
  return entry;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Entry Controller', () => {
  describe('startTimeEntry', () => {
    /**
     * Test: should start time entry and return 201
     * 
     * Objective: Verify that a time entry can be started successfully
     * when no other entry is in progress.
     */
    it('should start time entry and return 201', async () => {
      // Arrange
      const userId = createObjectId();
      const timeEntryId = createObjectId();
      const mockTimeEntry = createMockTimeEntry({
        _id: timeEntryId,
        userId,
        startProgressTime: undefined
      });

      const req = createMockRequest({
        params: { timeEntryId: timeEntryId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      // First findOne returns the time entry
      // Second findOne returns null (no in-progress entry)
      (TimeEntry.findOne as jest.Mock)
        .mockResolvedValueOnce(mockTimeEntry)
        .mockResolvedValueOnce(null);

      // Act
      await startTimeEntry(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(TimeEntry.findOne).toHaveBeenCalledTimes(2);
      expect(mockTimeEntry.save).toHaveBeenCalled();
      expect(mockTimeEntry.startProgressTime).toBeDefined();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockTimeEntry);
    });

    /**
     * Test: should return 404 when time entry not found
     * 
     * Objective: Verify that starting a non-existent time entry returns 404.
     */
    it('should return 404 when time entry not found', async () => {
      // Arrange
      const userId = createObjectId();
      const timeEntryId = createObjectId();

      const req = createMockRequest({
        params: { timeEntryId: timeEntryId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (TimeEntry.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      await startTimeEntry(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(TimeEntry.findOne).toHaveBeenCalledWith({
        userId,
        _id: expect.any(mongoose.Types.ObjectId)
      });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Time entry not found' });
    });

    /**
     * Test: should return 400 when another entry is already in progress
     * 
     * Objective: Verify that starting a time entry when another is in progress
     * returns 400 with the existing entry.
     */
    it('should return 400 when another entry is already in progress', async () => {
      // Arrange
      const userId = createObjectId();
      const timeEntryId = createObjectId();
      const mockTimeEntry = createMockTimeEntry({
        _id: timeEntryId,
        userId,
        startProgressTime: undefined
      });
      const existingInProgressEntry = createMockTimeEntry({
        _id: createObjectId(),
        userId,
        startProgressTime: new Date()
      });

      const req = createMockRequest({
        params: { timeEntryId: timeEntryId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      // First findOne returns the time entry
      // Second findOne returns an in-progress entry
      (TimeEntry.findOne as jest.Mock)
        .mockResolvedValueOnce(mockTimeEntry)
        .mockResolvedValueOnce(existingInProgressEntry);

      // Act
      await startTimeEntry(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(TimeEntry.findOne).toHaveBeenCalledTimes(2);
      expect(mockTimeEntry.save).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'You already have a time entry in progress',
        existingEntry: existingInProgressEntry
      });
    });

    /**
     * Test: should return 500 on database error
     * 
     * Objective: Verify that database errors are handled gracefully.
     */
    it('should return 500 on database error', async () => {
      // Arrange
      const userId = createObjectId();
      const timeEntryId = createObjectId();

      const req = createMockRequest({
        params: { timeEntryId: timeEntryId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (TimeEntry.findOne as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      // Act
      await startTimeEntry(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to start time entry',
        error: expect.any(Error)
      });
    });

    /**
     * Test: should return 500 when save fails
     * 
     * Objective: Verify that save errors are handled gracefully.
     */
    it('should return 500 when save fails', async () => {
      // Arrange
      const userId = createObjectId();
      const timeEntryId = createObjectId();
      const mockTimeEntry = createMockTimeEntry({
        _id: timeEntryId,
        userId,
        startProgressTime: undefined,
        save: jest.fn().mockRejectedValue(new Error('Save failed'))
      });

      const req = createMockRequest({
        params: { timeEntryId: timeEntryId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (TimeEntry.findOne as jest.Mock)
        .mockResolvedValueOnce(mockTimeEntry)
        .mockResolvedValueOnce(null);

      // Act
      await startTimeEntry(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to start time entry',
        error: expect.any(Error)
      });
    });
  });

  describe('stopTimeEntry', () => {
    /**
     * Test: should stop time entry and calculate duration
     * 
     * Objective: Verify that stopping a time entry calculates the duration
     * correctly and clears the startProgressTime.
     */
    it('should stop time entry and calculate duration', async () => {
      // Arrange
      const userId = createObjectId();
      const timeEntryId = createObjectId();
      const startProgressTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const mockTimeEntry = createMockTimeEntry({
        _id: timeEntryId,
        userId,
        totalDurationInHour: 1.0,
        startProgressTime
      });

      const req = createMockRequest({
        params: { timeEntryId: timeEntryId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (TimeEntry.findOne as jest.Mock).mockResolvedValue(mockTimeEntry);

      // Act
      await stopTimeEntry(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(TimeEntry.findOne).toHaveBeenCalledWith({
        _id: timeEntryId.toString(),
        userId
      });
      expect(mockTimeEntry.save).toHaveBeenCalled();
      expect(mockTimeEntry.startProgressTime).toBeUndefined();
      // Duration should be approximately 3 hours (1 original + ~2 hours elapsed)
      expect(mockTimeEntry.totalDurationInHour).toBeGreaterThan(2.9);
      expect(res.json).toHaveBeenCalledWith(mockTimeEntry);
    });

    /**
     * Test: should return 404 when time entry not found
     * 
     * Objective: Verify that stopping a non-existent time entry returns 404.
     */
    it('should return 404 when time entry not found', async () => {
      // Arrange
      const userId = createObjectId();
      const timeEntryId = createObjectId();

      const req = createMockRequest({
        params: { timeEntryId: timeEntryId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (TimeEntry.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      await stopTimeEntry(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Time entry not found' });
    });

    /**
     * Test: should return 400 when entry is not in progress
     * 
     * Objective: Verify that stopping an entry that is not in progress returns 400.
     */
    it('should return 400 when entry is not in progress', async () => {
      // Arrange
      const userId = createObjectId();
      const timeEntryId = createObjectId();
      const mockTimeEntry = createMockTimeEntry({
        _id: timeEntryId,
        userId,
        startProgressTime: undefined // Not in progress
      });

      const req = createMockRequest({
        params: { timeEntryId: timeEntryId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (TimeEntry.findOne as jest.Mock).mockResolvedValue(mockTimeEntry);

      // Act
      await stopTimeEntry(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(mockTimeEntry.save).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Time entry is not in progress' });
    });

    /**
     * Test: should return 500 on database error
     * 
     * Objective: Verify that database errors are handled gracefully.
     */
    it('should return 500 on database error', async () => {
      // Arrange
      const userId = createObjectId();
      const timeEntryId = createObjectId();

      const req = createMockRequest({
        params: { timeEntryId: timeEntryId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (TimeEntry.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act
      await stopTimeEntry(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to stop time entry',
        error: expect.any(Error)
      });
    });

    /**
     * Test: should return 500 when save fails
     * 
     * Objective: Verify that save errors are handled gracefully.
     */
    it('should return 500 when save fails', async () => {
      // Arrange
      const userId = createObjectId();
      const timeEntryId = createObjectId();
      const mockTimeEntry = createMockTimeEntry({
        _id: timeEntryId,
        userId,
        startProgressTime: new Date(),
        save: jest.fn().mockRejectedValue(new Error('Save failed'))
      });

      const req = createMockRequest({
        params: { timeEntryId: timeEntryId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (TimeEntry.findOne as jest.Mock).mockResolvedValue(mockTimeEntry);

      // Act
      await stopTimeEntry(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to stop time entry',
        error: expect.any(Error)
      });
    });
  });

  describe('createTimeEntry', () => {
    /**
     * Test: should create time entry with valid data and return 201
     * 
     * Objective: Verify that a time entry can be created manually with valid data.
     */
    it('should create time entry with valid data and return 201', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();
      const startTime = new Date('2024-01-15T09:00:00Z');
      const totalDurationInHour = 3.5;

      const mockSavedEntry = {
        _id: createObjectId(),
        startTime,
        totalDurationInHour,
        startProgressTime: undefined,
        taskId,
        userId,
        save: jest.fn().mockResolvedValue(undefined)
      };

      const req = createMockRequest({
        body: {
          startTime,
          totalDurationInHour,
          taskId
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      // Mock the TimeEntry constructor
      (TimeEntry as unknown as jest.Mock).mockImplementation(() => mockSavedEntry);

      // Act
      await createTimeEntry(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(TimeEntry).toHaveBeenCalledWith({
        startTime,
        totalDurationInHour,
        startProgressTime: undefined,
        taskId,
        userId
      });
      expect(mockSavedEntry.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockSavedEntry);
    });

    /**
     * Test: should return 500 on database error
     * 
     * Objective: Verify that database errors during creation are handled gracefully.
     */
    it('should return 500 on database error', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();

      const mockEntry = {
        save: jest.fn().mockRejectedValue(new Error('Database error'))
      };

      const req = createMockRequest({
        body: {
          startTime: new Date(),
          totalDurationInHour: 2.0,
          taskId
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (TimeEntry as unknown as jest.Mock).mockImplementation(() => mockEntry);

      // Act
      await createTimeEntry(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to create time entry',
        error: expect.any(Error)
      });
    });

    /**
     * Test: should create time entry with zero duration
     * 
     * Objective: Verify that a time entry can be created with zero duration.
     */
    it('should create time entry with zero duration', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();
      const startTime = new Date('2024-01-15T09:00:00Z');

      const mockSavedEntry = {
        _id: createObjectId(),
        startTime,
        totalDurationInHour: 0,
        startProgressTime: undefined,
        taskId,
        userId,
        save: jest.fn().mockResolvedValue(undefined)
      };

      const req = createMockRequest({
        body: {
          startTime,
          totalDurationInHour: 0,
          taskId
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (TimeEntry as unknown as jest.Mock).mockImplementation(() => mockSavedEntry);

      // Act
      await createTimeEntry(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(TimeEntry).toHaveBeenCalledWith({
        startTime,
        totalDurationInHour: 0,
        startProgressTime: undefined,
        taskId,
        userId
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateTimeEntry', () => {
    /**
     * Test: should update time entry fields
     * 
     * Objective: Verify that time entry fields can be updated successfully.
     */
    it('should update time entry fields', async () => {
      // Arrange
      const userId = createObjectId();
      const timeEntryId = createObjectId();
      const updates = {
        totalDurationInHour: 5.0,
        startTime: new Date('2024-01-16T10:00:00Z')
      };
      const updatedEntry = createMockTimeEntry({
        _id: timeEntryId,
        userId,
        ...updates
      });

      const req = createMockRequest({
        params: { timeEntryId: timeEntryId.toString() },
        body: updates,
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (TimeEntry.findOneAndUpdate as jest.Mock).mockResolvedValue(updatedEntry);

      // Act
      await updateTimeEntry(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(TimeEntry.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: timeEntryId.toString(), userId },
        updates,
        { new: true, runValidators: true }
      );
      expect(res.json).toHaveBeenCalledWith(updatedEntry);
    });

    /**
     * Test: should return 400 when trying to update startProgressTime
     * 
     * Objective: Verify that updating startProgressTime directly is not allowed.
     */
    it('should return 400 when trying to update startProgressTime', async () => {
      // Arrange
      const userId = createObjectId();
      const timeEntryId = createObjectId();

      const req = createMockRequest({
        params: { timeEntryId: timeEntryId.toString() },
        body: {
          startProgressTime: new Date()
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      // Act
      await updateTimeEntry(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(TimeEntry.findOneAndUpdate).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Use the endpoints stop and start to manage in-progress entries'
      });
    });

    /**
     * Test: should return 404 when time entry not found
     * 
     * Objective: Verify that updating a non-existent time entry returns 404.
     */
    it('should return 404 when time entry not found', async () => {
      // Arrange
      const userId = createObjectId();
      const timeEntryId = createObjectId();

      const req = createMockRequest({
        params: { timeEntryId: timeEntryId.toString() },
        body: { totalDurationInHour: 3.0 },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (TimeEntry.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      // Act
      await updateTimeEntry(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Time entry not found' });
    });

    /**
     * Test: should return 500 on database error
     * 
     * Objective: Verify that database errors are handled gracefully.
     */
    it('should return 500 on database error', async () => {
      // Arrange
      const userId = createObjectId();
      const timeEntryId = createObjectId();

      const req = createMockRequest({
        params: { timeEntryId: timeEntryId.toString() },
        body: { totalDurationInHour: 3.0 },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (TimeEntry.findOneAndUpdate as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act
      await updateTimeEntry(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to update time entry',
        error: expect.any(Error)
      });
    });

    /**
     * Test: should update only provided fields
     * 
     * Objective: Verify that only the provided fields are updated.
     */
    it('should update only provided fields', async () => {
      // Arrange
      const userId = createObjectId();
      const timeEntryId = createObjectId();
      const updates = { totalDurationInHour: 4.5 };
      const updatedEntry = createMockTimeEntry({
        _id: timeEntryId,
        userId,
        totalDurationInHour: 4.5
      });

      const req = createMockRequest({
        params: { timeEntryId: timeEntryId.toString() },
        body: updates,
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (TimeEntry.findOneAndUpdate as jest.Mock).mockResolvedValue(updatedEntry);

      // Act
      await updateTimeEntry(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(TimeEntry.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: timeEntryId.toString(), userId },
        updates,
        { new: true, runValidators: true }
      );
      expect(res.json).toHaveBeenCalledWith(updatedEntry);
    });
  });

  describe('deleteTimeEntry', () => {
    /**
     * Test: should delete time entry and return success message
     * 
     * Objective: Verify that a time entry can be deleted successfully.
     */
    it('should delete time entry and return success message', async () => {
      // Arrange
      const userId = createObjectId();
      const timeEntryId = createObjectId();
      const deletedEntry = createMockTimeEntry({
        _id: timeEntryId,
        userId
      });

      const req = createMockRequest({
        params: { timeEntryId: timeEntryId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (TimeEntry.findOneAndDelete as jest.Mock).mockResolvedValue(deletedEntry);

      // Act
      await deleteTimeEntry(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(TimeEntry.findOneAndDelete).toHaveBeenCalledWith({
        _id: timeEntryId.toString(),
        userId
      });
      expect(res.json).toHaveBeenCalledWith({ message: 'Time entry deleted successfully' });
    });

    /**
     * Test: should return 404 when time entry not found
     * 
     * Objective: Verify that deleting a non-existent time entry returns 404.
     */
    it('should return 404 when time entry not found', async () => {
      // Arrange
      const userId = createObjectId();
      const timeEntryId = createObjectId();

      const req = createMockRequest({
        params: { timeEntryId: timeEntryId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (TimeEntry.findOneAndDelete as jest.Mock).mockResolvedValue(null);

      // Act
      await deleteTimeEntry(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Time entry not found' });
    });

    /**
     * Test: should return 500 on database error
     * 
     * Objective: Verify that database errors are handled gracefully.
     */
    it('should return 500 on database error', async () => {
      // Arrange
      const userId = createObjectId();
      const timeEntryId = createObjectId();

      const req = createMockRequest({
        params: { timeEntryId: timeEntryId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (TimeEntry.findOneAndDelete as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act
      await deleteTimeEntry(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to delete time entry',
        error: expect.any(Error)
      });
    });
  });

  describe('getTimeEntries', () => {
    /**
     * Test: should return time entries with pagination
     * 
     * Objective: Verify that time entries are returned with proper pagination.
     */
    it('should return time entries with pagination', async () => {
      // Arrange
      const userId = createObjectId();
      const mockEntries = [
        createMockTimeEntry({ userId }),
        createMockTimeEntry({ userId })
      ];

      const req = createMockRequest({
        query: { page: '1', limit: '10' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockEntries)
      };

      (TimeEntry.find as jest.Mock).mockReturnValue(mockQuery);
      (TimeEntry.countDocuments as jest.Mock).mockResolvedValue(2);

      // Act
      await getTimeEntries(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(TimeEntry.find).toHaveBeenCalledWith({ userId });
      expect(mockQuery.select).toHaveBeenCalledWith('startTime totalDurationInHour startProgressTime taskId userId');
      expect(mockQuery.sort).toHaveBeenCalledWith({ startTime: -1 });
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(TimeEntry.countDocuments).toHaveBeenCalledWith({ userId });
      expect(res.json).toHaveBeenCalledWith({
        timeEntries: mockEntries,
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          pages: 1
        }
      });
    });

    /**
     * Test: should filter by taskId
     * 
     * Objective: Verify that time entries can be filtered by taskId.
     */
    it('should filter by taskId', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();
      const mockEntries = [createMockTimeEntry({ userId, taskId })];

      const req = createMockRequest({
        query: { taskId: taskId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockEntries)
      };

      (TimeEntry.find as jest.Mock).mockReturnValue(mockQuery);
      (TimeEntry.countDocuments as jest.Mock).mockResolvedValue(1);

      // Act
      await getTimeEntries(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(TimeEntry.find).toHaveBeenCalledWith({
        userId,
        taskId: expect.any(mongoose.Types.ObjectId)
      });
    });

    /**
     * Test: should filter by date range
     * 
     * Objective: Verify that time entries can be filtered by start and end date.
     */
    it('should filter by date range', async () => {
      // Arrange
      const userId = createObjectId();
      const startDate = '2024-01-01T00:00:00Z';
      const endDate = '2024-01-31T23:59:59Z';
      const mockEntries = [createMockTimeEntry({ userId })];

      const req = createMockRequest({
        query: { startDate, endDate },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockEntries)
      };

      (TimeEntry.find as jest.Mock).mockReturnValue(mockQuery);
      (TimeEntry.countDocuments as jest.Mock).mockResolvedValue(1);

      // Act
      await getTimeEntries(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(TimeEntry.find).toHaveBeenCalledWith({
        userId,
        startTime: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      });
    });

    /**
     * Test: should filter in-progress only
     * 
     * Objective: Verify that time entries can be filtered to show only in-progress entries.
     */
    it('should filter in-progress only', async () => {
      // Arrange
      const userId = createObjectId();
      const mockEntries = [createMockTimeEntry({ userId, startProgressTime: new Date() })];

      const req = createMockRequest({
        query: { inProgressOnly: 'true' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockEntries)
      };

      (TimeEntry.find as jest.Mock).mockReturnValue(mockQuery);
      (TimeEntry.countDocuments as jest.Mock).mockResolvedValue(1);

      // Act
      await getTimeEntries(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(TimeEntry.find).toHaveBeenCalledWith({
        userId,
        startProgressTime: { $ne: null }
      });
    });

    /**
     * Test: should use default pagination values
     * 
     * Objective: Verify that default pagination values are used when not provided.
     */
    it('should use default pagination values', async () => {
      // Arrange
      const userId = createObjectId();
      const mockEntries: any[] = [];

      const req = createMockRequest({
        query: {},
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockEntries)
      };

      (TimeEntry.find as jest.Mock).mockReturnValue(mockQuery);
      (TimeEntry.countDocuments as jest.Mock).mockResolvedValue(0);

      // Act
      await getTimeEntries(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(mockQuery.skip).toHaveBeenCalledWith(0); // (1 - 1) * 10
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(res.json).toHaveBeenCalledWith({
        timeEntries: mockEntries,
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          pages: 0
        }
      });
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
        query: {},
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (TimeEntry.find as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      // Act
      await getTimeEntries(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to retrieve time entries',
        error: expect.any(Error)
      });
    });

    /**
     * Test: should handle pagination for page 2
     * 
     * Objective: Verify that pagination correctly calculates skip for page 2.
     */
    it('should handle pagination for page 2', async () => {
      // Arrange
      const userId = createObjectId();
      const mockEntries = [createMockTimeEntry({ userId })];

      const req = createMockRequest({
        query: { page: '2', limit: '5' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockEntries)
      };

      (TimeEntry.find as jest.Mock).mockReturnValue(mockQuery);
      (TimeEntry.countDocuments as jest.Mock).mockResolvedValue(10);

      // Act
      await getTimeEntries(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(mockQuery.skip).toHaveBeenCalledWith(5); // (2 - 1) * 5
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
      expect(res.json).toHaveBeenCalledWith({
        timeEntries: mockEntries,
        pagination: {
          total: 10,
          page: 2,
          limit: 5,
          pages: 2
        }
      });
    });

    /**
     * Test: should filter by startDate only
     * 
     * Objective: Verify that time entries can be filtered by startDate only.
     */
    it('should filter by startDate only', async () => {
      // Arrange
      const userId = createObjectId();
      const startDate = '2024-01-01T00:00:00Z';
      const mockEntries = [createMockTimeEntry({ userId })];

      const req = createMockRequest({
        query: { startDate },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockEntries)
      };

      (TimeEntry.find as jest.Mock).mockReturnValue(mockQuery);
      (TimeEntry.countDocuments as jest.Mock).mockResolvedValue(1);

      // Act
      await getTimeEntries(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(TimeEntry.find).toHaveBeenCalledWith({
        userId,
        startTime: {
          $gte: new Date(startDate)
        }
      });
    });
  });
});
