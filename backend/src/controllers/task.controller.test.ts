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

// Mock the task service
jest.mock('../services/task.service');

/**
 * Unit tests for the Task controller.
 * 
 * These tests verify:
 * - CRUD operations for tasks
 * - Association with authenticated user
 * - Pagination and filtering
 * - Error handling (404, 400 responses)
 */

// Helper to create valid ObjectId
const createObjectId = (): mongoose.Types.ObjectId => new mongoose.Types.ObjectId();

// Helper to create mock request
const createMockRequest = (overrides: Partial<AuthenticatedRequest> = {}): Partial<AuthenticatedRequest> => ({
  params: {},
  body: {},
  query: {},
  user: { id: createObjectId().toString() } as any,
  ...overrides
});

// Helper to create mock response
const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Task Controller', () => {
  describe('createTask', () => {
    /**
     * Test: should create task and return 201
     * 
     * Objective: Verify that a task is created successfully with valid data.
     */
    it('should create task and return 201', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();
      const taskData = {
        name: 'New Task',
        description: 'Task description',
        projectId: projectId.toString()
      };
      const savedTask = createMockTask({ ...taskData, userId });

      const req = createMockRequest({
        body: taskData,
        user: { id: userId.toString() } as any
      });
      const res = createMockResponse();

      (taskService.createTask as jest.Mock).mockResolvedValue(savedTask);

      // Act
      await createTask(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(taskService.createTask).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(savedTask);
    });

    /**
     * Test: should associate task with authenticated user
     * 
     * Objective: Verify that the task is associated with the authenticated user's ID.
     */
    it('should associate task with authenticated user', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();
      const taskData = {
        name: 'User Task',
        projectId: projectId.toString()
      };
      const savedTask = createMockTask({ ...taskData, userId });

      const req = createMockRequest({
        body: taskData,
        user: { id: userId.toString() } as any
      });
      const res = createMockResponse();

      (taskService.createTask as jest.Mock).mockResolvedValue(savedTask);

      // Act
      await createTask(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(taskService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.any(mongoose.Types.ObjectId)
        })
      );
      // Verify the userId matches
      const callArg = (taskService.createTask as jest.Mock).mock.calls[0][0];
      expect(callArg.userId.toString()).toBe(userId.toString());
    });

    /**
     * Test: should return 400 on error
     * 
     * Objective: Verify that errors during task creation return 400 status.
     */
    it('should return 400 on error', async () => {
      // Arrange
      const userId = createObjectId();
      const taskData = {
        name: 'Invalid Task'
      };
      const errorMessage = 'Validation failed';

      const req = createMockRequest({
        body: taskData,
        user: { id: userId.toString() } as any
      });
      const res = createMockResponse();

      (taskService.createTask as jest.Mock).mockRejectedValue(new Error(errorMessage));

      // Act
      await createTask(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
    });

    /**
     * Test: should include all task data in creation
     * 
     * Objective: Verify that all provided task data is passed to the service.
     */
    it('should include all task data in creation', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();
      const taskData = {
        name: 'Complete Task',
        description: 'Full description',
        url: 'https://example.com/task',
        projectId: projectId.toString()
      };
      const savedTask = createMockTask({ ...taskData, userId });

      const req = createMockRequest({
        body: taskData,
        user: { id: userId.toString() } as any
      });
      const res = createMockResponse();

      (taskService.createTask as jest.Mock).mockResolvedValue(savedTask);

      // Act
      await createTask(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(taskService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Complete Task',
          description: 'Full description',
          url: 'https://example.com/task',
          projectId: projectId.toString()
        })
      );
    });
  });

  describe('getTasks', () => {
    /**
     * Test: should return tasks with pagination
     * 
     * Objective: Verify that tasks are returned with pagination options.
     */
    it('should return tasks with pagination', async () => {
      // Arrange
      const userId = createObjectId();
      const mockTasks = [
        createMockTask({ userId }),
        createMockTask({ userId })
      ];
      const mockResult = {
        tasks: mockTasks,
        total: 2,
        page: 1,
        limit: 10
      };

      const req = createMockRequest({
        query: { page: '1', limit: '10' },
        user: { id: userId.toString() } as any
      });
      const res = createMockResponse();

      (taskService.getTasks as jest.Mock).mockResolvedValue(mockResult);

      // Act
      await getTasks(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(taskService.getTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.any(mongoose.Types.ObjectId)
        }),
        expect.objectContaining({
          page: 1,
          limit: 10
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    /**
     * Test: should filter by projectId
     * 
     * Objective: Verify that tasks are filtered by projectId when provided.
     */
    it('should filter by projectId', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();
      const mockTasks = [createMockTask({ userId, projectId })];
      const mockResult = {
        tasks: mockTasks,
        total: 1,
        page: 1,
        limit: 10
      };

      const req = createMockRequest({
        query: { projectId: projectId.toString() },
        user: { id: userId.toString() } as any
      });
      const res = createMockResponse();

      (taskService.getTasks as jest.Mock).mockResolvedValue(mockResult);

      // Act
      await getTasks(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(taskService.getTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.any(mongoose.Types.ObjectId),
          projectId: expect.any(mongoose.Types.ObjectId)
        }),
        expect.any(Object)
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    /**
     * Test: should return 400 on error
     * 
     * Objective: Verify that errors during task retrieval return 400 status.
     */
    it('should return 400 on error', async () => {
      // Arrange
      const userId = createObjectId();
      const errorMessage = 'Database error';

      const req = createMockRequest({
        query: {},
        user: { id: userId.toString() } as any
      });
      const res = createMockResponse();

      (taskService.getTasks as jest.Mock).mockRejectedValue(new Error(errorMessage));

      // Act
      await getTasks(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
    });

    /**
     * Test: should use default pagination when not provided
     * 
     * Objective: Verify that default pagination values are used when not specified.
     */
    it('should use default pagination when not provided', async () => {
      // Arrange
      const userId = createObjectId();
      const mockResult = {
        tasks: [],
        total: 0,
        page: 1,
        limit: 10
      };

      const req = createMockRequest({
        query: {},
        user: { id: userId.toString() } as any
      });
      const res = createMockResponse();

      (taskService.getTasks as jest.Mock).mockResolvedValue(mockResult);

      // Act
      await getTasks(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(taskService.getTasks).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          page: 1,
          limit: 10
        })
      );
    });
  });

  describe('getTaskById', () => {
    /**
     * Test: should return task when found
     * 
     * Objective: Verify that a task is returned when it exists and belongs to the user.
     */
    it('should return task when found', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();
      const mockTask = createMockTask({ _id: taskId, userId });

      const req = createMockRequest({
        params: { id: taskId.toString() },
        user: { id: userId.toString() } as any
      });
      const res = createMockResponse();

      (taskService.getTaskById as jest.Mock).mockResolvedValue(mockTask);

      // Act
      await getTaskById(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(taskService.getTaskById).toHaveBeenCalledWith(
        taskId.toString(),
        expect.any(mongoose.Types.ObjectId)
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockTask);
    });

    /**
     * Test: should return 404 when task not found
     * 
     * Objective: Verify that 404 is returned when task doesn't exist.
     */
    it('should return 404 when task not found', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();

      const req = createMockRequest({
        params: { id: taskId.toString() },
        user: { id: userId.toString() } as any
      });
      const res = createMockResponse();

      (taskService.getTaskById as jest.Mock).mockResolvedValue(null);

      // Act
      await getTaskById(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Task not found' });
    });

    /**
     * Test: should return 400 on error
     * 
     * Objective: Verify that errors during task retrieval return 400 status.
     */
    it('should return 400 on error', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();
      const errorMessage = 'Invalid task ID';

      const req = createMockRequest({
        params: { id: taskId.toString() },
        user: { id: userId.toString() } as any
      });
      const res = createMockResponse();

      (taskService.getTaskById as jest.Mock).mockRejectedValue(new Error(errorMessage));

      // Act
      await getTaskById(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
    });

    /**
     * Test: should pass userId to service for authorization
     * 
     * Objective: Verify that the userId is passed to the service for authorization.
     */
    it('should pass userId to service for authorization', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();
      const mockTask = createMockTask({ _id: taskId, userId });

      const req = createMockRequest({
        params: { id: taskId.toString() },
        user: { id: userId.toString() } as any
      });
      const res = createMockResponse();

      (taskService.getTaskById as jest.Mock).mockResolvedValue(mockTask);

      // Act
      await getTaskById(req as AuthenticatedRequest, res as Response);

      // Assert
      const callArgs = (taskService.getTaskById as jest.Mock).mock.calls[0];
      expect(callArgs[1].toString()).toBe(userId.toString());
    });
  });

  describe('updateTask', () => {
    /**
     * Test: should update task and return 200
     * 
     * Objective: Verify that a task is updated successfully.
     */
    it('should update task and return 200', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();
      const updates = { name: 'Updated Task Name', description: 'Updated description' };
      const updatedTask = createMockTask({ _id: taskId, userId, ...updates });

      const req = createMockRequest({
        params: { id: taskId.toString() },
        body: updates,
        user: { id: userId.toString() } as any
      });
      const res = createMockResponse();

      (taskService.updateTask as jest.Mock).mockResolvedValue(updatedTask);

      // Act
      await updateTask(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(taskService.updateTask).toHaveBeenCalledWith(
        taskId.toString(),
        expect.any(mongoose.Types.ObjectId),
        updates
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedTask);
    });

    /**
     * Test: should return 404 when task not found
     * 
     * Objective: Verify that 404 is returned when task doesn't exist.
     */
    it('should return 404 when task not found', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();
      const updates = { name: 'Updated Name' };

      const req = createMockRequest({
        params: { id: taskId.toString() },
        body: updates,
        user: { id: userId.toString() } as any
      });
      const res = createMockResponse();

      (taskService.updateTask as jest.Mock).mockResolvedValue(null);

      // Act
      await updateTask(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Task not found' });
    });

    /**
     * Test: should return 400 on error
     * 
     * Objective: Verify that errors during task update return 400 status.
     */
    it('should return 400 on error', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();
      const updates = { name: '' };
      const errorMessage = 'Validation failed';

      const req = createMockRequest({
        params: { id: taskId.toString() },
        body: updates,
        user: { id: userId.toString() } as any
      });
      const res = createMockResponse();

      (taskService.updateTask as jest.Mock).mockRejectedValue(new Error(errorMessage));

      // Act
      await updateTask(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
    });

    /**
     * Test: should pass userId to service for authorization
     * 
     * Objective: Verify that the userId is passed to the service for authorization.
     */
    it('should pass userId to service for authorization', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();
      const updates = { name: 'Updated Name' };
      const updatedTask = createMockTask({ _id: taskId, userId, ...updates });

      const req = createMockRequest({
        params: { id: taskId.toString() },
        body: updates,
        user: { id: userId.toString() } as any
      });
      const res = createMockResponse();

      (taskService.updateTask as jest.Mock).mockResolvedValue(updatedTask);

      // Act
      await updateTask(req as AuthenticatedRequest, res as Response);

      // Assert
      const callArgs = (taskService.updateTask as jest.Mock).mock.calls[0];
      expect(callArgs[1].toString()).toBe(userId.toString());
    });
  });

  describe('deleteTask', () => {
    /**
     * Test: should delete task and return 204
     * 
     * Objective: Verify that a task is deleted successfully with no content response.
     */
    it('should delete task and return 204', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();

      const req = createMockRequest({
        params: { id: taskId.toString() },
        user: { id: userId.toString() } as any
      });
      const res = createMockResponse();

      (taskService.deleteTask as jest.Mock).mockResolvedValue(true);

      // Act
      await deleteTask(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(taskService.deleteTask).toHaveBeenCalledWith(
        taskId.toString(),
        expect.any(mongoose.Types.ObjectId)
      );
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    /**
     * Test: should return 404 when task not found
     * 
     * Objective: Verify that 404 is returned when task doesn't exist.
     */
    it('should return 404 when task not found', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();

      const req = createMockRequest({
        params: { id: taskId.toString() },
        user: { id: userId.toString() } as any
      });
      const res = createMockResponse();

      (taskService.deleteTask as jest.Mock).mockResolvedValue(false);

      // Act
      await deleteTask(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Task not found' });
    });

    /**
     * Test: should return 400 on error
     * 
     * Objective: Verify that errors during task deletion return 400 status.
     */
    it('should return 400 on error', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();
      const errorMessage = 'Database error';

      const req = createMockRequest({
        params: { id: taskId.toString() },
        user: { id: userId.toString() } as any
      });
      const res = createMockResponse();

      (taskService.deleteTask as jest.Mock).mockRejectedValue(new Error(errorMessage));

      // Act
      await deleteTask(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
    });

    /**
     * Test: should pass userId to service for authorization
     * 
     * Objective: Verify that the userId is passed to the service for authorization.
     */
    it('should pass userId to service for authorization', async () => {
      // Arrange
      const userId = createObjectId();
      const taskId = createObjectId();

      const req = createMockRequest({
        params: { id: taskId.toString() },
        user: { id: userId.toString() } as any
      });
      const res = createMockResponse();

      (taskService.deleteTask as jest.Mock).mockResolvedValue(true);

      // Act
      await deleteTask(req as AuthenticatedRequest, res as Response);

      // Assert
      const callArgs = (taskService.deleteTask as jest.Mock).mock.calls[0];
      expect(callArgs[1].toString()).toBe(userId.toString());
    });
  });
});
