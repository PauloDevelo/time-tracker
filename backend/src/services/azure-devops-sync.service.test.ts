import mongoose from 'mongoose';
import { Task, ITask } from '../models/Task';
import { AzureDevOpsSyncService } from './azure-devops-sync.service';
import { IAzureDevOpsWorkItem } from './azure-devops-client.service';

// Mock the Task model
jest.mock('../models/Task', () => ({
  Task: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

/**
 * Unit tests for the AzureDevOpsSyncService.
 * 
 * These tests verify:
 * - Work item to task transformation
 * - Import logic with duplicate detection
 * - Update decision logic based on sync time
 * - Task field updates from work items
 */

// Helper to create valid ObjectId
const createObjectId = (): mongoose.Types.ObjectId => new mongoose.Types.ObjectId();

// Mock work item data
const createMockWorkItem = (overrides: Partial<IAzureDevOpsWorkItem> = {}): IAzureDevOpsWorkItem => ({
  id: 123,
  url: 'https://dev.azure.com/org/project/_workitems/edit/123',
  fields: {
    'System.Id': 123,
    'System.Title': 'Test Bug',
    'System.WorkItemType': 'Bug',
    'System.State': 'Active',
    'System.IterationPath': 'Project\\Sprint 1',
    'System.Description': 'Bug description',
    'System.AssignedTo': {
      displayName: 'John Doe',
      uniqueName: 'john@example.com',
    },
  },
  ...overrides,
});

// Mock task data
const createMockTask = (overrides: Partial<ITask> = {}): ITask => ({
  _id: createObjectId(),
  name: 'Test Task',
  description: 'Test description',
  url: 'https://example.com/task',
  projectId: createObjectId(),
  userId: createObjectId(),
  azureDevOps: {
    workItemId: 123,
    workItemType: 'Bug',
    iterationPath: 'Project\\Sprint 1',
    assignedTo: 'John Doe',
    lastSyncedAt: new Date(),
    sourceUrl: 'https://dev.azure.com/org/project/_workitems/edit/123',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  isAzureDevOpsTask: true,
  isImportedFromAzureDevOps: jest.fn().mockReturnValue(true),
  getWorkItemUrl: jest.fn().mockReturnValue('https://dev.azure.com/org/project/_workitems/edit/123'),
  ...overrides,
} as unknown as ITask);

beforeEach(() => {
  jest.clearAllMocks();
  // Reset console mocks
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('AzureDevOpsSyncService', () => {
  let service: AzureDevOpsSyncService;

  beforeEach(() => {
    service = new AzureDevOpsSyncService();
  });

  describe('transformWorkItemToTask', () => {
    const projectId = createObjectId().toString();
    const userId = createObjectId().toString();

    /**
     * Test: Should map System.Title to name
     * 
     * Objective: Verify that the work item title is correctly mapped to task name.
     */
    it('should map System.Title to name', () => {
      // Arrange
      const workItem = createMockWorkItem({
        fields: {
          ...createMockWorkItem().fields,
          'System.Title': 'Important Bug Fix',
        },
      });

      // Act
      const result = service.transformWorkItemToTask(workItem, projectId, userId);

      // Assert
      expect(result.name).toBe('Important Bug Fix');
    });

    /**
     * Test: Should map System.Description to description
     * 
     * Objective: Verify that the work item description is correctly mapped.
     */
    it('should map System.Description to description', () => {
      // Arrange
      const workItem = createMockWorkItem({
        fields: {
          ...createMockWorkItem().fields,
          'System.Description': 'Detailed bug description',
        },
      });

      // Act
      const result = service.transformWorkItemToTask(workItem, projectId, userId);

      // Assert
      expect(result.description).toBe('Detailed bug description');
    });

    /**
     * Test: Should handle missing description (empty string)
     * 
     * Objective: Verify that missing description defaults to empty string.
     */
    it('should handle missing description (empty string)', () => {
      // Arrange
      const workItem = createMockWorkItem();
      delete (workItem.fields as any)['System.Description'];

      // Act
      const result = service.transformWorkItemToTask(workItem, projectId, userId);

      // Assert
      expect(result.description).toBe('');
    });

    /**
     * Test: Should set workItemId from System.Id
     * 
     * Objective: Verify that the work item ID is correctly set in azureDevOps metadata.
     */
    it('should set workItemId from System.Id', () => {
      // Arrange
      const workItem = createMockWorkItem({
        fields: {
          ...createMockWorkItem().fields,
          'System.Id': 456,
        },
      });

      // Act
      const result = service.transformWorkItemToTask(workItem, projectId, userId);

      // Assert
      expect(result.azureDevOps.workItemId).toBe(456);
    });

    /**
     * Test: Should set workItemType correctly (Bug)
     * 
     * Objective: Verify that Bug work item type is correctly mapped.
     */
    it('should set workItemType correctly (Bug)', () => {
      // Arrange
      const workItem = createMockWorkItem({
        fields: {
          ...createMockWorkItem().fields,
          'System.WorkItemType': 'Bug',
        },
      });

      // Act
      const result = service.transformWorkItemToTask(workItem, projectId, userId);

      // Assert
      expect(result.azureDevOps.workItemType).toBe('Bug');
    });

    /**
     * Test: Should set workItemType correctly (Task)
     * 
     * Objective: Verify that Task work item type is correctly mapped.
     */
    it('should set workItemType correctly (Task)', () => {
      // Arrange
      const workItem = createMockWorkItem({
        fields: {
          ...createMockWorkItem().fields,
          'System.WorkItemType': 'Task',
        },
      });

      // Act
      const result = service.transformWorkItemToTask(workItem, projectId, userId);

      // Assert
      expect(result.azureDevOps.workItemType).toBe('Task');
    });

    /**
     * Test: Should set workItemType correctly (User Story)
     * 
     * Objective: Verify that User Story work item type is correctly mapped.
     */
    it('should set workItemType correctly (User Story)', () => {
      // Arrange
      const workItem = createMockWorkItem({
        fields: {
          ...createMockWorkItem().fields,
          'System.WorkItemType': 'User Story',
        },
      });

      // Act
      const result = service.transformWorkItemToTask(workItem, projectId, userId);

      // Assert
      expect(result.azureDevOps.workItemType).toBe('User Story');
    });

    /**
     * Test: Should set iterationPath from System.IterationPath
     * 
     * Objective: Verify that the iteration path is correctly mapped.
     */
    it('should set iterationPath from System.IterationPath', () => {
      // Arrange
      const workItem = createMockWorkItem({
        fields: {
          ...createMockWorkItem().fields,
          'System.IterationPath': 'MyProject\\Sprint 2',
        },
      });

      // Act
      const result = service.transformWorkItemToTask(workItem, projectId, userId);

      // Assert
      expect(result.azureDevOps.iterationPath).toBe('MyProject\\Sprint 2');
    });

    /**
     * Test: Should set assignedTo from System.AssignedTo.displayName
     * 
     * Objective: Verify that the assigned user display name is correctly mapped.
     */
    it('should set assignedTo from System.AssignedTo.displayName', () => {
      // Arrange
      const workItem = createMockWorkItem({
        fields: {
          ...createMockWorkItem().fields,
          'System.AssignedTo': {
            displayName: 'Jane Smith',
            uniqueName: 'jane@example.com',
          },
        },
      });

      // Act
      const result = service.transformWorkItemToTask(workItem, projectId, userId);

      // Assert
      expect(result.azureDevOps.assignedTo).toBe('Jane Smith');
    });

    /**
     * Test: Should handle missing assignedTo (undefined)
     * 
     * Objective: Verify that missing assignedTo results in undefined.
     */
    it('should handle missing assignedTo (undefined)', () => {
      // Arrange
      const workItem = createMockWorkItem();
      delete (workItem.fields as any)['System.AssignedTo'];

      // Act
      const result = service.transformWorkItemToTask(workItem, projectId, userId);

      // Assert
      expect(result.azureDevOps.assignedTo).toBeUndefined();
    });

    /**
     * Test: Should set sourceUrl from workItem.url
     * 
     * Objective: Verify that the work item URL is correctly set as sourceUrl.
     */
    it('should set sourceUrl from workItem.url', () => {
      // Arrange
      const workItem = createMockWorkItem({
        url: 'https://dev.azure.com/myorg/myproject/_workitems/edit/789',
      });

      // Act
      const result = service.transformWorkItemToTask(workItem, projectId, userId);

      // Assert
      expect(result.azureDevOps.sourceUrl).toBe('https://dev.azure.com/myorg/myproject/_workitems/edit/789');
    });

    /**
     * Test: Should set lastSyncedAt to current date
     * 
     * Objective: Verify that lastSyncedAt is set to approximately the current time.
     */
    it('should set lastSyncedAt to current date', () => {
      // Arrange
      const workItem = createMockWorkItem();
      const beforeTest = new Date();

      // Act
      const result = service.transformWorkItemToTask(workItem, projectId, userId);
      const afterTest = new Date();

      // Assert
      expect(result.azureDevOps.lastSyncedAt).toBeInstanceOf(Date);
      expect(result.azureDevOps.lastSyncedAt.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
      expect(result.azureDevOps.lastSyncedAt.getTime()).toBeLessThanOrEqual(afterTest.getTime());
    });

    /**
     * Test: Should convert projectId to ObjectId
     * 
     * Objective: Verify that projectId string is converted to mongoose ObjectId.
     */
    it('should convert projectId to ObjectId', () => {
      // Arrange
      const workItem = createMockWorkItem();
      const testProjectId = createObjectId().toString();

      // Act
      const result = service.transformWorkItemToTask(workItem, testProjectId, userId);

      // Assert
      expect(result.projectId).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(result.projectId.toString()).toBe(testProjectId);
    });

    /**
     * Test: Should convert userId to ObjectId
     * 
     * Objective: Verify that userId string is converted to mongoose ObjectId.
     */
    it('should convert userId to ObjectId', () => {
      // Arrange
      const workItem = createMockWorkItem();
      const testUserId = createObjectId().toString();

      // Act
      const result = service.transformWorkItemToTask(workItem, projectId, testUserId);

      // Assert
      expect(result.userId).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(result.userId.toString()).toBe(testUserId);
    });

    /**
     * Test: Should set url from workItem.url
     * 
     * Objective: Verify that the task url field is set from work item url.
     */
    it('should set url from workItem.url', () => {
      // Arrange
      const workItem = createMockWorkItem({
        url: 'https://dev.azure.com/org/project/_workitems/edit/999',
      });

      // Act
      const result = service.transformWorkItemToTask(workItem, projectId, userId);

      // Assert
      expect(result.url).toBe('https://dev.azure.com/org/project/_workitems/edit/999');
    });
  });

  describe('importWorkItems', () => {
    const projectId = createObjectId().toString();
    const userId = createObjectId().toString();

    /**
     * Test: Should create tasks for new work items
     * 
     * Objective: Verify that new work items are created as tasks in the database.
     */
    it('should create tasks for new work items', async () => {
      // Arrange
      const workItems = [createMockWorkItem()];
      const createdTask = createMockTask();
      
      (Task.findOne as jest.Mock).mockResolvedValue(null);
      (Task.create as jest.Mock).mockResolvedValue(createdTask);

      // Act
      const result = await service.importWorkItems(workItems, projectId, userId);

      // Assert
      expect(Task.create).toHaveBeenCalledTimes(1);
      expect(result.imported).toBe(1);
      expect(result.tasks).toHaveLength(1);
    });

    /**
     * Test: Should skip existing work items (duplicate detection)
     * 
     * Objective: Verify that work items already in the database are skipped.
     */
    it('should skip existing work items (duplicate detection)', async () => {
      // Arrange
      const workItems = [createMockWorkItem()];
      const existingTask = createMockTask();
      
      (Task.findOne as jest.Mock).mockResolvedValue(existingTask);

      // Act
      const result = await service.importWorkItems(workItems, projectId, userId);

      // Assert
      expect(Task.create).not.toHaveBeenCalled();
      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.tasks).toHaveLength(0);
    });

    /**
     * Test: Should return correct import statistics (imported, skipped counts)
     * 
     * Objective: Verify that import statistics accurately reflect the operation.
     */
    it('should return correct import statistics (imported, skipped counts)', async () => {
      // Arrange
      const workItem1 = createMockWorkItem({ id: 1, fields: { ...createMockWorkItem().fields, 'System.Id': 1 } });
      const workItem2 = createMockWorkItem({ id: 2, fields: { ...createMockWorkItem().fields, 'System.Id': 2 } });
      const workItem3 = createMockWorkItem({ id: 3, fields: { ...createMockWorkItem().fields, 'System.Id': 3 } });
      const workItems = [workItem1, workItem2, workItem3];
      
      const existingTask = createMockTask();
      const newTask = createMockTask();
      
      // First item exists, second and third are new
      (Task.findOne as jest.Mock)
        .mockResolvedValueOnce(existingTask)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      (Task.create as jest.Mock).mockResolvedValue(newTask);

      // Act
      const result = await service.importWorkItems(workItems, projectId, userId);

      // Assert
      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(1);
      expect(result.tasks).toHaveLength(2);
    });

    /**
     * Test: Should return created tasks in result
     * 
     * Objective: Verify that created tasks are included in the result.
     */
    it('should return created tasks in result', async () => {
      // Arrange
      const workItems = [createMockWorkItem()];
      const createdTask = createMockTask({ name: 'Created Task' });
      
      (Task.findOne as jest.Mock).mockResolvedValue(null);
      (Task.create as jest.Mock).mockResolvedValue(createdTask);

      // Act
      const result = await service.importWorkItems(workItems, projectId, userId);

      // Assert
      expect(result.tasks).toContain(createdTask);
      expect(result.tasks[0].name).toBe('Created Task');
    });

    /**
     * Test: Should handle database errors gracefully (continue with next item)
     * 
     * Objective: Verify that errors on one item don't stop processing of others.
     */
    it('should handle database errors gracefully (continue with next item)', async () => {
      // Arrange
      const workItem1 = createMockWorkItem({ id: 1, fields: { ...createMockWorkItem().fields, 'System.Id': 1 } });
      const workItem2 = createMockWorkItem({ id: 2, fields: { ...createMockWorkItem().fields, 'System.Id': 2 } });
      const workItems = [workItem1, workItem2];
      
      const createdTask = createMockTask();
      
      // First item throws error, second succeeds
      (Task.findOne as jest.Mock)
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce(null);
      (Task.create as jest.Mock).mockResolvedValue(createdTask);

      // Act
      const result = await service.importWorkItems(workItems, projectId, userId);

      // Assert
      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
      expect(console.error).toHaveBeenCalled();
    });

    /**
     * Test: Should handle empty work items array
     * 
     * Objective: Verify that empty input returns zero counts.
     */
    it('should handle empty work items array', async () => {
      // Arrange
      const workItems: IAzureDevOpsWorkItem[] = [];

      // Act
      const result = await service.importWorkItems(workItems, projectId, userId);

      // Assert
      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.tasks).toHaveLength(0);
      expect(Task.findOne).not.toHaveBeenCalled();
      expect(Task.create).not.toHaveBeenCalled();
    });

    /**
     * Test: Should log import progress
     * 
     * Objective: Verify that import progress is logged to console.
     */
    it('should log import progress', async () => {
      // Arrange
      const workItems = [createMockWorkItem()];
      const createdTask = createMockTask({ _id: createObjectId() });
      
      (Task.findOne as jest.Mock).mockResolvedValue(null);
      (Task.create as jest.Mock).mockResolvedValue(createdTask);

      // Act
      await service.importWorkItems(workItems, projectId, userId);

      // Assert
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Imported work item 123')
      );
    });

    /**
     * Test: Should log skipped duplicates
     * 
     * Objective: Verify that skipped duplicates are logged.
     */
    it('should log skipped duplicates', async () => {
      // Arrange
      const workItems = [createMockWorkItem()];
      const existingTask = createMockTask();
      
      (Task.findOne as jest.Mock).mockResolvedValue(existingTask);

      // Act
      await service.importWorkItems(workItems, projectId, userId);

      // Assert
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Skipping duplicate work item 123')
      );
    });

    /**
     * Test: Should query with correct projectId and workItemId
     * 
     * Objective: Verify that duplicate check uses correct query parameters.
     */
    it('should query with correct projectId and workItemId', async () => {
      // Arrange
      const workItem = createMockWorkItem({
        fields: {
          ...createMockWorkItem().fields,
          'System.Id': 456,
        },
      });
      const workItems = [workItem];
      
      (Task.findOne as jest.Mock).mockResolvedValue(null);
      (Task.create as jest.Mock).mockResolvedValue(createMockTask());

      // Act
      await service.importWorkItems(workItems, projectId, userId);

      // Assert
      expect(Task.findOne).toHaveBeenCalledWith({
        projectId: expect.any(mongoose.Types.ObjectId),
        'azureDevOps.workItemId': 456,
      });
    });
  });

  describe('shouldUpdateExistingTask', () => {
    /**
     * Test: Should return true when lastSyncedAt is more than 24 hours ago
     * 
     * Objective: Verify that tasks synced more than 24 hours ago should be updated.
     */
    it('should return true when lastSyncedAt is more than 24 hours ago', () => {
      // Arrange
      const thirtyHoursAgo = new Date(Date.now() - 30 * 60 * 60 * 1000);
      const existingTask = createMockTask({
        azureDevOps: {
          workItemId: 123,
          workItemType: 'Bug',
          iterationPath: 'Project\\Sprint 1',
          lastSyncedAt: thirtyHoursAgo,
          sourceUrl: 'https://example.com',
        },
      });
      const workItem = createMockWorkItem();

      // Act
      const result = service.shouldUpdateExistingTask(existingTask, workItem);

      // Assert
      expect(result).toBe(true);
    });

    /**
     * Test: Should return false when lastSyncedAt is less than 24 hours ago
     * 
     * Objective: Verify that recently synced tasks should not be updated.
     */
    it('should return false when lastSyncedAt is less than 24 hours ago', () => {
      // Arrange
      const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000);
      const existingTask = createMockTask({
        azureDevOps: {
          workItemId: 123,
          workItemType: 'Bug',
          iterationPath: 'Project\\Sprint 1',
          lastSyncedAt: tenHoursAgo,
          sourceUrl: 'https://example.com',
        },
      });
      const workItem = createMockWorkItem();

      // Act
      const result = service.shouldUpdateExistingTask(existingTask, workItem);

      // Assert
      expect(result).toBe(false);
    });

    /**
     * Test: Should return false when lastSyncedAt is exactly 24 hours ago
     * 
     * Objective: Verify boundary condition - exactly 24 hours should not trigger update.
     * Note: Using 23 hours 59 minutes 59 seconds to avoid millisecond timing issues.
     */
    it('should return false when lastSyncedAt is exactly 24 hours ago', () => {
      // Arrange
      // Use slightly less than 24 hours to avoid timing edge cases
      const justUnderTwentyFourHours = new Date(Date.now() - (24 * 60 * 60 * 1000 - 1000));
      const existingTask = createMockTask({
        azureDevOps: {
          workItemId: 123,
          workItemType: 'Bug',
          iterationPath: 'Project\\Sprint 1',
          lastSyncedAt: justUnderTwentyFourHours,
          sourceUrl: 'https://example.com',
        },
      });
      const workItem = createMockWorkItem();

      // Act
      const result = service.shouldUpdateExistingTask(existingTask, workItem);

      // Assert
      expect(result).toBe(false);
    });

    /**
     * Test: Should handle missing azureDevOps metadata
     * 
     * Objective: Verify that tasks without azureDevOps metadata return false.
     */
    it('should handle missing azureDevOps metadata', () => {
      // Arrange
      const existingTask = createMockTask();
      delete (existingTask as any).azureDevOps;
      const workItem = createMockWorkItem();

      // Act
      const result = service.shouldUpdateExistingTask(existingTask, workItem);

      // Assert
      expect(result).toBe(false);
    });

    /**
     * Test: Should handle missing lastSyncedAt
     * 
     * Objective: Verify that tasks without lastSyncedAt return false.
     */
    it('should handle missing lastSyncedAt', () => {
      // Arrange
      const existingTask = createMockTask({
        azureDevOps: {
          workItemId: 123,
          workItemType: 'Bug',
          iterationPath: 'Project\\Sprint 1',
          lastSyncedAt: undefined as any,
          sourceUrl: 'https://example.com',
        },
      });
      const workItem = createMockWorkItem();

      // Act
      const result = service.shouldUpdateExistingTask(existingTask, workItem);

      // Assert
      expect(result).toBe(false);
    });

    /**
     * Test: Should return true when lastSyncedAt is 25 hours ago (just over threshold)
     * 
     * Objective: Verify that tasks synced just over 24 hours ago should be updated.
     */
    it('should return true when lastSyncedAt is 25 hours ago (just over threshold)', () => {
      // Arrange
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const existingTask = createMockTask({
        azureDevOps: {
          workItemId: 123,
          workItemType: 'Bug',
          iterationPath: 'Project\\Sprint 1',
          lastSyncedAt: twentyFiveHoursAgo,
          sourceUrl: 'https://example.com',
        },
      });
      const workItem = createMockWorkItem();

      // Act
      const result = service.shouldUpdateExistingTask(existingTask, workItem);

      // Assert
      expect(result).toBe(true);
    });

    /**
     * Test: Should return false when lastSyncedAt is 23 hours ago (just under threshold)
     * 
     * Objective: Verify that tasks synced just under 24 hours ago should not be updated.
     */
    it('should return false when lastSyncedAt is 23 hours ago (just under threshold)', () => {
      // Arrange
      const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000);
      const existingTask = createMockTask({
        azureDevOps: {
          workItemId: 123,
          workItemType: 'Bug',
          iterationPath: 'Project\\Sprint 1',
          lastSyncedAt: twentyThreeHoursAgo,
          sourceUrl: 'https://example.com',
        },
      });
      const workItem = createMockWorkItem();

      // Act
      const result = service.shouldUpdateExistingTask(existingTask, workItem);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('updateTaskFromWorkItem', () => {
    /**
     * Test: Should update task name from System.Title
     * 
     * Objective: Verify that task name is updated from work item title.
     */
    it('should update task name from System.Title', () => {
      // Arrange
      const task = createMockTask({ name: 'Old Name' });
      const workItem = createMockWorkItem({
        fields: {
          ...createMockWorkItem().fields,
          'System.Title': 'New Updated Name',
        },
      });

      // Act
      const result = service.updateTaskFromWorkItem(task, workItem);

      // Assert
      expect(result.name).toBe('New Updated Name');
    });

    /**
     * Test: Should update task description from System.Description
     * 
     * Objective: Verify that task description is updated from work item.
     */
    it('should update task description from System.Description', () => {
      // Arrange
      const task = createMockTask({ description: 'Old description' });
      const workItem = createMockWorkItem({
        fields: {
          ...createMockWorkItem().fields,
          'System.Description': 'New updated description',
        },
      });

      // Act
      const result = service.updateTaskFromWorkItem(task, workItem);

      // Assert
      expect(result.description).toBe('New updated description');
    });

    /**
     * Test: Should preserve existing description if new one is empty
     * 
     * Objective: Verify that empty description doesn't overwrite existing one.
     */
    it('should preserve existing description if new one is empty', () => {
      // Arrange
      const task = createMockTask({ description: 'Existing description' });
      const workItem = createMockWorkItem();
      delete (workItem.fields as any)['System.Description'];

      // Act
      const result = service.updateTaskFromWorkItem(task, workItem);

      // Assert
      expect(result.description).toBe('Existing description');
    });

    /**
     * Test: Should preserve existing description if new one is undefined
     * 
     * Objective: Verify that undefined description doesn't overwrite existing one.
     */
    it('should preserve existing description if new one is undefined', () => {
      // Arrange
      const task = createMockTask({ description: 'Keep this description' });
      const workItem = createMockWorkItem({
        fields: {
          ...createMockWorkItem().fields,
          'System.Description': undefined,
        },
      });

      // Act
      const result = service.updateTaskFromWorkItem(task, workItem);

      // Assert
      expect(result.description).toBe('Keep this description');
    });

    /**
     * Test: Should update iterationPath
     * 
     * Objective: Verify that iteration path is updated in azureDevOps metadata.
     */
    it('should update iterationPath', () => {
      // Arrange
      const task = createMockTask();
      const workItem = createMockWorkItem({
        fields: {
          ...createMockWorkItem().fields,
          'System.IterationPath': 'Project\\Sprint 3',
        },
      });

      // Act
      const result = service.updateTaskFromWorkItem(task, workItem);

      // Assert
      expect(result.azureDevOps?.iterationPath).toBe('Project\\Sprint 3');
    });

    /**
     * Test: Should update assignedTo
     * 
     * Objective: Verify that assignedTo is updated in azureDevOps metadata.
     */
    it('should update assignedTo', () => {
      // Arrange
      const task = createMockTask();
      const workItem = createMockWorkItem({
        fields: {
          ...createMockWorkItem().fields,
          'System.AssignedTo': {
            displayName: 'New Assignee',
            uniqueName: 'new@example.com',
          },
        },
      });

      // Act
      const result = service.updateTaskFromWorkItem(task, workItem);

      // Assert
      expect(result.azureDevOps?.assignedTo).toBe('New Assignee');
    });

    /**
     * Test: Should update lastSyncedAt to current date
     * 
     * Objective: Verify that lastSyncedAt is updated to current time.
     */
    it('should update lastSyncedAt to current date', () => {
      // Arrange
      const oldDate = new Date('2020-01-01');
      const task = createMockTask({
        azureDevOps: {
          workItemId: 123,
          workItemType: 'Bug',
          iterationPath: 'Project\\Sprint 1',
          lastSyncedAt: oldDate,
          sourceUrl: 'https://example.com',
        },
      });
      const workItem = createMockWorkItem();
      const beforeTest = new Date();

      // Act
      const result = service.updateTaskFromWorkItem(task, workItem);
      const afterTest = new Date();

      // Assert
      expect(result.azureDevOps?.lastSyncedAt).toBeInstanceOf(Date);
      expect(result.azureDevOps?.lastSyncedAt.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
      expect(result.azureDevOps?.lastSyncedAt.getTime()).toBeLessThanOrEqual(afterTest.getTime());
    });

    /**
     * Test: Should handle missing azureDevOps metadata on task
     * 
     * Objective: Verify that task without azureDevOps metadata doesn't crash.
     */
    it('should handle missing azureDevOps metadata on task', () => {
      // Arrange
      const task = createMockTask();
      delete (task as any).azureDevOps;
      const workItem = createMockWorkItem();

      // Act
      const result = service.updateTaskFromWorkItem(task, workItem);

      // Assert
      expect(result.name).toBe('Test Bug');
      expect(result.azureDevOps).toBeUndefined();
    });

    /**
     * Test: Should return the updated task
     * 
     * Objective: Verify that the same task object is returned after update.
     */
    it('should return the updated task', () => {
      // Arrange
      const task = createMockTask();
      const workItem = createMockWorkItem();

      // Act
      const result = service.updateTaskFromWorkItem(task, workItem);

      // Assert
      expect(result).toBe(task);
    });

    /**
     * Test: Should handle assignedTo being removed (undefined)
     * 
     * Objective: Verify that assignedTo can be set to undefined when removed.
     */
    it('should handle assignedTo being removed (undefined)', () => {
      // Arrange
      const task = createMockTask();
      const workItem = createMockWorkItem();
      delete (workItem.fields as any)['System.AssignedTo'];

      // Act
      const result = service.updateTaskFromWorkItem(task, workItem);

      // Assert
      expect(result.azureDevOps?.assignedTo).toBeUndefined();
    });
  });
});
