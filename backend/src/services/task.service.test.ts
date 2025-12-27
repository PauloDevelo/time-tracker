import mongoose from 'mongoose';
import { Task, ITask } from '../models/Task';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask
} from './task.service';

// Mock the Task model
jest.mock('../models/Task', () => ({
  Task: jest.fn()
}));

// Type for task input data
type TaskInput = Omit<ITask, '_id' | 'createdAt' | 'updatedAt'>;

/**
 * Unit tests for the Task service.
 * 
 * These tests verify:
 * - CRUD operations for tasks
 * - Pagination and filtering
 * - Error handling with descriptive messages
 * - Proper interaction with the Task model
 */

// Helper to create valid ObjectId
const createObjectId = (): mongoose.Types.ObjectId => new mongoose.Types.ObjectId();

// Helper to create mock task data
const createMockTask = (overrides = {}) => ({
  _id: createObjectId(),
  name: 'Test Task',
  description: 'Test description',
  url: 'https://example.com/task',
  projectId: createObjectId(),
  userId: createObjectId(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

// Mock chain builder for find queries
const createMockQueryChain = (result: unknown) => {
  const chain = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result)
  };
  return chain;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Task Service', () => {
  describe('createTask', () => {
    /**
     * Test: Should create task successfully
     * 
     * Objective: Verify that a task is created successfully with valid data
     * and the save method is called on the Task model.
     */
    it('should create task successfully', async () => {
      // Arrange
      const taskData = {
        name: 'New Task',
        description: 'Task description',
        projectId: createObjectId(),
        userId: createObjectId()
      } as unknown as TaskInput;
      const savedTask = createMockTask(taskData);
      const mockSave = jest.fn().mockResolvedValue(savedTask);
      
      (Task as unknown as jest.Mock).mockImplementation(() => ({
        save: mockSave
      }));

      // Act
      const result = await createTask(taskData);

      // Assert
      expect(Task).toHaveBeenCalledWith(taskData);
      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual(savedTask);
    });

    /**
     * Test: Should throw error on database failure
     * 
     * Objective: Verify that database errors are caught and re-thrown
     * with a descriptive error message.
     */
    it('should throw error on database failure', async () => {
      // Arrange
      const taskData = {
        name: 'New Task',
        projectId: createObjectId(),
        userId: createObjectId()
      } as unknown as TaskInput;
      const dbError = new Error('Database connection failed');
      const mockSave = jest.fn().mockRejectedValue(dbError);
      
      (Task as unknown as jest.Mock).mockImplementation(() => ({
        save: mockSave
      }));

      // Act & Assert
      await expect(createTask(taskData)).rejects.toThrow('Error creating task: Database connection failed');
    });

    /**
     * Test: Should return the saved task
     * 
     * Objective: Verify that the saved task document is returned
     * with all properties intact.
     */
    it('should return the saved task', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();
      const taskData = {
        name: 'Complete Task',
        description: 'Full description',
        url: 'https://example.com/task',
        projectId,
        userId
      } as unknown as TaskInput;
      const savedTask = createMockTask({
        ...taskData,
        _id: createObjectId(),
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01')
      });
      const mockSave = jest.fn().mockResolvedValue(savedTask);
      
      (Task as unknown as jest.Mock).mockImplementation(() => ({
        save: mockSave
      }));

      // Act
      const result = await createTask(taskData);

      // Assert
      expect(result).toHaveProperty('_id');
      expect(result.name).toBe('Complete Task');
      expect(result.description).toBe('Full description');
      expect(result.url).toBe('https://example.com/task');
      expect(result.projectId).toEqual(projectId);
      expect(result.userId).toEqual(userId);
    });
  });

  describe('getTasks', () => {
    /**
     * Test: Should return tasks with pagination
     * 
     * Objective: Verify that tasks are returned with correct pagination
     * metadata including tasks array, total count, page, and limit.
     */
    it('should return tasks with pagination', async () => {
      // Arrange
      const userId = createObjectId();
      const mockTasks = [
        createMockTask({ userId }),
        createMockTask({ userId })
      ];
      const mockQueryChain = createMockQueryChain(mockTasks);
      
      (Task as any).find = jest.fn().mockReturnValue(mockQueryChain);
      (Task as any).countDocuments = jest.fn().mockResolvedValue(2);

      // Act
      const result = await getTasks({ userId }, { page: 1, limit: 10 });

      // Assert
      expect(Task.find).toHaveBeenCalledWith({ userId });
      expect(mockQueryChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockQueryChain.skip).toHaveBeenCalledWith(0);
      expect(mockQueryChain.limit).toHaveBeenCalledWith(10);
      expect(Task.countDocuments).toHaveBeenCalledWith({ userId });
      expect(result).toEqual({
        tasks: mockTasks,
        total: 2,
        page: 1,
        limit: 10
      });
    });

    /**
     * Test: Should apply filters correctly (userId, projectId)
     * 
     * Objective: Verify that both userId and projectId filters are
     * correctly passed to the database query.
     */
    it('should apply filters correctly (userId, projectId)', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();
      const mockTasks = [createMockTask({ userId, projectId })];
      const mockQueryChain = createMockQueryChain(mockTasks);
      
      (Task as any).find = jest.fn().mockReturnValue(mockQueryChain);
      (Task as any).countDocuments = jest.fn().mockResolvedValue(1);

      // Act
      const result = await getTasks({ userId, projectId }, { page: 1, limit: 10 });

      // Assert
      expect(Task.find).toHaveBeenCalledWith({ userId, projectId });
      expect(Task.countDocuments).toHaveBeenCalledWith({ userId, projectId });
      expect(result.tasks).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    /**
     * Test: Should use default pagination values
     * 
     * Objective: Verify that when no pagination options are provided,
     * default values (page: 1, limit: 10) are used.
     */
    it('should use default pagination values', async () => {
      // Arrange
      const mockTasks: unknown[] = [];
      const mockQueryChain = createMockQueryChain(mockTasks);
      
      (Task as any).find = jest.fn().mockReturnValue(mockQueryChain);
      (Task as any).countDocuments = jest.fn().mockResolvedValue(0);

      // Act
      const result = await getTasks({}, {});

      // Assert
      expect(mockQueryChain.skip).toHaveBeenCalledWith(0); // (1-1) * 10 = 0
      expect(mockQueryChain.limit).toHaveBeenCalledWith(10);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    /**
     * Test: Should throw error on database failure
     * 
     * Objective: Verify that database errors during task retrieval
     * are caught and re-thrown with a descriptive error message.
     */
    it('should throw error on database failure', async () => {
      // Arrange
      const dbError = new Error('Connection timeout');
      const mockQueryChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockRejectedValue(dbError)
      };
      
      (Task as any).find = jest.fn().mockReturnValue(mockQueryChain);

      // Act & Assert
      await expect(getTasks({}, {})).rejects.toThrow('Error getting tasks: Connection timeout');
    });

    /**
     * Test: Should calculate skip correctly for different pages
     * 
     * Objective: Verify that the skip value is calculated correctly
     * based on page and limit values.
     */
    it('should calculate skip correctly for different pages', async () => {
      // Arrange
      const mockTasks: unknown[] = [];
      const mockQueryChain = createMockQueryChain(mockTasks);
      
      (Task as any).find = jest.fn().mockReturnValue(mockQueryChain);
      (Task as any).countDocuments = jest.fn().mockResolvedValue(0);

      // Act
      await getTasks({}, { page: 3, limit: 20 });

      // Assert
      expect(mockQueryChain.skip).toHaveBeenCalledWith(40); // (3-1) * 20 = 40
      expect(mockQueryChain.limit).toHaveBeenCalledWith(20);
    });

    /**
     * Test: Should apply custom sort order
     * 
     * Objective: Verify that custom sort options are applied correctly.
     */
    it('should apply custom sort order', async () => {
      // Arrange
      const mockTasks: unknown[] = [];
      const mockQueryChain = createMockQueryChain(mockTasks);
      
      (Task as any).find = jest.fn().mockReturnValue(mockQueryChain);
      (Task as any).countDocuments = jest.fn().mockResolvedValue(0);

      // Act
      await getTasks({}, { sort: { name: 1 } });

      // Assert
      expect(mockQueryChain.sort).toHaveBeenCalledWith({ name: 1 });
    });
  });

  describe('getTaskById', () => {
    /**
     * Test: Should return task when found
     * 
     * Objective: Verify that a task is returned when it exists
     * and matches both taskId and userId.
     */
    it('should return task when found', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();
      const mockTask = createMockTask({ _id: taskId, userId });
      
      (Task as any).findOne = jest.fn().mockResolvedValue(mockTask);

      // Act
      const result = await getTaskById(taskId.toString(), userId);

      // Assert
      expect(Task.findOne).toHaveBeenCalledWith({ _id: taskId.toString(), userId });
      expect(result).toEqual(mockTask);
    });

    /**
     * Test: Should return null when task not found
     * 
     * Objective: Verify that null is returned when no task matches
     * the given taskId and userId combination.
     */
    it('should return null when task not found', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();
      
      (Task as any).findOne = jest.fn().mockResolvedValue(null);

      // Act
      const result = await getTaskById(taskId.toString(), userId);

      // Assert
      expect(Task.findOne).toHaveBeenCalledWith({ _id: taskId.toString(), userId });
      expect(result).toBeNull();
    });

    /**
     * Test: Should throw error on database failure
     * 
     * Objective: Verify that database errors during task lookup
     * are caught and re-thrown with a descriptive error message.
     */
    it('should throw error on database failure', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();
      const dbError = new Error('Invalid ObjectId');
      
      (Task as any).findOne = jest.fn().mockRejectedValue(dbError);

      // Act & Assert
      await expect(getTaskById(taskId.toString(), userId)).rejects.toThrow(
        'Error getting task by ID: Invalid ObjectId'
      );
    });

    /**
     * Test: Should query with both taskId and userId for authorization
     * 
     * Objective: Verify that the query includes both taskId and userId
     * to ensure users can only access their own tasks.
     */
    it('should query with both taskId and userId for authorization', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();
      
      (Task as any).findOne = jest.fn().mockResolvedValue(null);

      // Act
      await getTaskById(taskId.toString(), userId);

      // Assert
      expect(Task.findOne).toHaveBeenCalledWith({
        _id: taskId.toString(),
        userId
      });
    });
  });

  describe('updateTask', () => {
    /**
     * Test: Should update task successfully
     * 
     * Objective: Verify that a task is updated successfully
     * and the updated document is returned.
     */
    it('should update task successfully', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();
      const updates = { name: 'Updated Task Name', description: 'Updated description' };
      const updatedTask = createMockTask({ _id: taskId, userId, ...updates });
      
      (Task as any).findOneAndUpdate = jest.fn().mockResolvedValue(updatedTask);

      // Act
      const result = await updateTask(taskId.toString(), userId, updates);

      // Assert
      expect(Task.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: taskId.toString(), userId },
        { $set: updates },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(updatedTask);
    });

    /**
     * Test: Should return null when task not found
     * 
     * Objective: Verify that null is returned when no task matches
     * the given taskId and userId combination.
     */
    it('should return null when task not found', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();
      const updates = { name: 'Updated Name' };
      
      (Task as any).findOneAndUpdate = jest.fn().mockResolvedValue(null);

      // Act
      const result = await updateTask(taskId.toString(), userId, updates);

      // Assert
      expect(result).toBeNull();
    });

    /**
     * Test: Should throw error on database failure
     * 
     * Objective: Verify that database errors during task update
     * are caught and re-thrown with a descriptive error message.
     */
    it('should throw error on database failure', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();
      const updates = { name: 'Updated Name' };
      const dbError = new Error('Validation failed');
      
      (Task as any).findOneAndUpdate = jest.fn().mockRejectedValue(dbError);

      // Act & Assert
      await expect(updateTask(taskId.toString(), userId, updates)).rejects.toThrow(
        'Error updating task: Validation failed'
      );
    });

    /**
     * Test: Should run validators on update
     * 
     * Objective: Verify that the runValidators option is set to true
     * to ensure schema validation is applied during updates.
     */
    it('should run validators on update', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();
      const updates = { name: 'Valid Name' };
      const updatedTask = createMockTask({ _id: taskId, userId, ...updates });
      
      (Task as any).findOneAndUpdate = jest.fn().mockResolvedValue(updatedTask);

      // Act
      await updateTask(taskId.toString(), userId, updates);

      // Assert
      expect(Task.findOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.objectContaining({ runValidators: true })
      );
    });

    /**
     * Test: Should return new document after update
     * 
     * Objective: Verify that the new option is set to true
     * to return the updated document instead of the original.
     */
    it('should return new document after update', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();
      const updates = { name: 'New Name' };
      
      (Task as any).findOneAndUpdate = jest.fn().mockResolvedValue(null);

      // Act
      await updateTask(taskId.toString(), userId, updates);

      // Assert
      expect(Task.findOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.objectContaining({ new: true })
      );
    });
  });

  describe('deleteTask', () => {
    /**
     * Test: Should delete task and return true
     * 
     * Objective: Verify that a task is deleted successfully
     * and true is returned when deletedCount > 0.
     */
    it('should delete task and return true', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();
      
      (Task as any).deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

      // Act
      const result = await deleteTask(taskId.toString(), userId);

      // Assert
      expect(Task.deleteOne).toHaveBeenCalledWith({ _id: taskId.toString(), userId });
      expect(result).toBe(true);
    });

    /**
     * Test: Should return false when task not found
     * 
     * Objective: Verify that false is returned when no task matches
     * the given taskId and userId combination (deletedCount = 0).
     */
    it('should return false when task not found', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();
      
      (Task as any).deleteOne = jest.fn().mockResolvedValue({ deletedCount: 0 });

      // Act
      const result = await deleteTask(taskId.toString(), userId);

      // Assert
      expect(result).toBe(false);
    });

    /**
     * Test: Should throw error on database failure
     * 
     * Objective: Verify that database errors during task deletion
     * are caught and re-thrown with a descriptive error message.
     */
    it('should throw error on database failure', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();
      const dbError = new Error('Database unavailable');
      
      (Task as any).deleteOne = jest.fn().mockRejectedValue(dbError);

      // Act & Assert
      await expect(deleteTask(taskId.toString(), userId)).rejects.toThrow(
        'Error deleting task: Database unavailable'
      );
    });

    /**
     * Test: Should only delete task matching userId
     * 
     * Objective: Verify that the delete query includes both taskId
     * and userId to ensure users can only delete their own tasks.
     */
    it('should only delete task matching userId', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();
      
      (Task as any).deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

      // Act
      await deleteTask(taskId.toString(), userId);

      // Assert
      expect(Task.deleteOne).toHaveBeenCalledWith({
        _id: taskId.toString(),
        userId
      });
    });
  });
});
