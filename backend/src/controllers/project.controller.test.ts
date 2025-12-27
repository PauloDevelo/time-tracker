import { Response } from 'express';
import mongoose from 'mongoose';
import {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  validateAzureDevOpsProject,
  getAzureDevOpsIterations,
  getAzureDevOpsProjectNames,
  importWorkItems
} from './project.controller';
import { Project } from '../models/Project';
import { Customer } from '../models/Customer';
import { Contract } from '../models/Contract';
import { AzureDevOpsClient } from '../services/azure-devops-client.service';
import { AzureDevOpsSyncService } from '../services/azure-devops-sync.service';
import { AuthenticatedRequest } from '../middleware/authenticated-request.model';

// Mock the models and services
jest.mock('../models/Project');
jest.mock('../models/Customer');
jest.mock('../models/Contract');
jest.mock('../services/azure-devops-client.service');
jest.mock('../services/azure-devops-sync.service');

/**
 * Unit tests for the Project controller.
 * 
 * These tests verify:
 * - CRUD operations for projects
 * - Azure DevOps integration endpoints
 * - Authorization checks (project belongs to user)
 * - Input validation (ID format, required fields)
 * - Error handling (404, 400, 500 responses)
 */

// Helper to create valid ObjectId
const createObjectId = (): mongoose.Types.ObjectId => new mongoose.Types.ObjectId();

// Helper to create mock request
const createMockRequest = (overrides: Partial<AuthenticatedRequest> = {}): Partial<AuthenticatedRequest> => ({
  params: {},
  body: {},
  query: {},
  user: { _id: createObjectId() } as any,
  ...overrides
});

// Helper to create mock response
const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Helper to create mock project data
const createMockProject = (overrides = {}) => ({
  _id: createObjectId(),
  name: 'Test Project',
  description: 'Test description',
  url: 'https://example.com',
  customerId: createObjectId(),
  userId: createObjectId(),
  azureDevOps: {
    projectName: 'AzureProject',
    projectId: '12345678-1234-1234-1234-123456789012',
    enabled: true,
    lastSyncedAt: new Date()
  },
  contractId: createObjectId(),
  createdAt: new Date(),
  updatedAt: new Date(),
  save: jest.fn().mockResolvedValue(this),
  populate: jest.fn().mockResolvedValue(this),
  ...overrides
});

// Helper to create mock customer
const createMockCustomer = (overrides = {}) => ({
  _id: createObjectId(),
  userId: createObjectId(),
  name: 'Test Customer',
  azureDevOps: {
    organizationUrl: 'https://dev.azure.com/testorg',
    pat: 'encrypted-pat',
    enabled: true
  },
  getDecryptedPAT: jest.fn().mockReturnValue('decrypted-pat'),
  ...overrides
});

// Helper to create mock contract
const createMockContract = (overrides = {}) => ({
  _id: createObjectId(),
  customerId: createObjectId(),
  userId: createObjectId(),
  name: 'Test Contract',
  ...overrides
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Project Controller', () => {
  describe('createProject', () => {
    /**
     * Test: should create project with valid data and return 201
     * 
     * Objective: Verify that a project is created successfully with valid data.
     */
    it('should create project with valid data and return 201', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const savedProject = createMockProject({ customerId, userId });

      const req = createMockRequest({
        body: {
          name: 'New Project',
          description: 'Project description',
          url: 'https://example.com',
          customerId: customerId.toString()
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const mockSave = jest.fn().mockResolvedValue(savedProject);
      const mockPopulate = jest.fn().mockResolvedValue(savedProject);
      (Project as unknown as jest.Mock).mockImplementation(() => ({
        save: mockSave,
        populate: mockPopulate
      }));

      // Act
      await createProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(savedProject);
    });

    /**
     * Test: should create project with contractId
     * 
     * Objective: Verify that a project can be created with a valid contractId.
     */
    it('should create project with contractId', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const contractId = createObjectId();
      const mockContract = createMockContract({ _id: contractId, customerId, userId });
      const savedProject = createMockProject({ customerId, userId, contractId });

      const req = createMockRequest({
        body: {
          name: 'New Project',
          description: 'Project description',
          customerId: customerId.toString(),
          contractId: contractId.toString()
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Contract.findOne as jest.Mock).mockResolvedValue(mockContract);
      const mockSave = jest.fn().mockResolvedValue(savedProject);
      const mockPopulate = jest.fn().mockResolvedValue(savedProject);
      (Project as unknown as jest.Mock).mockImplementation(() => ({
        save: mockSave,
        populate: mockPopulate
      }));

      // Act
      await createProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(Contract.findOne).toHaveBeenCalledWith({
        _id: contractId.toString(),
        customerId: customerId.toString(),
        userId: userId
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    /**
     * Test: should return 400 when contract doesn't belong to customer
     * 
     * Objective: Verify that 400 is returned when contract doesn't match customer.
     */
    it('should return 400 when contract doesn\'t belong to customer', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const contractId = createObjectId();

      const req = createMockRequest({
        body: {
          name: 'New Project',
          description: 'Project description',
          customerId: customerId.toString(),
          contractId: contractId.toString()
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Contract.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      await createProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid contract or contract does not belong to this customer'
      });
    });

    /**
     * Test: should return 400 on validation error
     * 
     * Objective: Verify that validation errors are handled properly.
     */
    it('should return 400 on validation error', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();

      const req = createMockRequest({
        body: {
          name: 'New Project',
          description: 'Project description',
          customerId: customerId.toString()
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Project as unknown as jest.Mock).mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error('Validation failed'))
      }));

      // Act
      await createProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to create project',
        error: 'Validation failed'
      });
    });

    /**
     * Test: should create project with azureDevOps configuration
     * 
     * Objective: Verify that a project can be created with Azure DevOps config.
     */
    it('should create project with azureDevOps configuration', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const azureDevOps = {
        projectName: 'AzureProject',
        projectId: '12345678-1234-1234-1234-123456789012',
        enabled: true
      };
      const savedProject = createMockProject({ customerId, userId, azureDevOps });

      const req = createMockRequest({
        body: {
          name: 'New Project',
          description: 'Project description',
          customerId: customerId.toString(),
          azureDevOps
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const mockSave = jest.fn().mockResolvedValue(savedProject);
      const mockPopulate = jest.fn().mockResolvedValue(savedProject);
      (Project as unknown as jest.Mock).mockImplementation(() => ({
        save: mockSave,
        populate: mockPopulate
      }));

      // Act
      await createProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getAllProjects', () => {
    /**
     * Test: should return all projects for user
     * 
     * Objective: Verify that all projects for the authenticated user are returned.
     */
    it('should return all projects for user', async () => {
      // Arrange
      const userId = createObjectId();
      const mockProjects = [
        createMockProject({ userId }),
        createMockProject({ userId })
      ];

      const req = createMockRequest({
        query: {},
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const sortMock = jest.fn().mockResolvedValue(mockProjects);
      const populateMock2 = jest.fn().mockReturnValue({ sort: sortMock });
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });
      (Project.find as jest.Mock).mockReturnValue({ populate: populateMock1 });

      // Act
      await getAllProjects(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(Project.find).toHaveBeenCalledWith({ userId });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockProjects);
    });

    /**
     * Test: should filter by customerId when provided
     * 
     * Objective: Verify that projects are filtered by customerId.
     */
    it('should filter by customerId when provided', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const mockProjects = [createMockProject({ userId, customerId })];

      const req = createMockRequest({
        query: { customerId: customerId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const sortMock = jest.fn().mockResolvedValue(mockProjects);
      const populateMock2 = jest.fn().mockReturnValue({ sort: sortMock });
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });
      (Project.find as jest.Mock).mockReturnValue({ populate: populateMock1 });

      // Act
      await getAllProjects(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(Project.find).toHaveBeenCalledWith({
        userId,
        customerId: customerId.toString()
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    /**
     * Test: should filter by search term
     * 
     * Objective: Verify that projects are filtered by search term.
     */
    it('should filter by search term', async () => {
      // Arrange
      const userId = createObjectId();
      const mockProjects = [createMockProject({ userId, name: 'Test Project' })];

      const req = createMockRequest({
        query: { search: 'Test' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const sortMock = jest.fn().mockResolvedValue(mockProjects);
      const populateMock2 = jest.fn().mockReturnValue({ sort: sortMock });
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });
      (Project.find as jest.Mock).mockReturnValue({ populate: populateMock1 });

      // Act
      await getAllProjects(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(Project.find).toHaveBeenCalledWith({
        userId,
        $or: [
          { name: { $regex: 'Test', $options: 'i' } },
          { description: { $regex: 'Test', $options: 'i' } }
        ]
      });
      expect(res.status).toHaveBeenCalledWith(200);
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

      (Project.find as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      // Act
      await getAllProjects(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to fetch projects',
        error: 'Database error'
      });
    });

    /**
     * Test: should return empty array when no projects exist
     * 
     * Objective: Verify that an empty array is returned when no projects exist.
     */
    it('should return empty array when no projects exist', async () => {
      // Arrange
      const userId = createObjectId();

      const req = createMockRequest({
        query: {},
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const sortMock = jest.fn().mockResolvedValue([]);
      const populateMock2 = jest.fn().mockReturnValue({ sort: sortMock });
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });
      (Project.find as jest.Mock).mockReturnValue({ populate: populateMock1 });

      // Act
      await getAllProjects(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('getProjectById', () => {
    /**
     * Test: should return project with populated details
     * 
     * Objective: Verify that a project is returned with populated customer and contract.
     */
    it('should return project with populated details', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();
      const mockProject = createMockProject({ _id: projectId, userId });

      const req = createMockRequest({
        params: { id: projectId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const populateMock2 = jest.fn().mockResolvedValue(mockProject);
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });
      (Project.findOne as jest.Mock).mockReturnValue({ populate: populateMock1 });

      // Act
      await getProjectById(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(Project.findOne).toHaveBeenCalledWith({ _id: projectId.toString(), userId });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockProject);
    });

    /**
     * Test: should return 400 for invalid project ID format
     * 
     * Objective: Verify that invalid ObjectId format is rejected.
     */
    it('should return 400 for invalid project ID format', async () => {
      // Arrange
      const req = createMockRequest({
        params: { id: 'invalid-id' }
      });
      const res = createMockResponse();

      // Act
      await getProjectById(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid project ID' });
      expect(Project.findOne).not.toHaveBeenCalled();
    });

    /**
     * Test: should return 404 when project not found
     * 
     * Objective: Verify that 404 is returned when project doesn't exist.
     */
    it('should return 404 when project not found', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();

      const req = createMockRequest({
        params: { id: projectId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const populateMock2 = jest.fn().mockResolvedValue(null);
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });
      (Project.findOne as jest.Mock).mockReturnValue({ populate: populateMock1 });

      // Act
      await getProjectById(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
    });

    /**
     * Test: should return 500 on database error
     * 
     * Objective: Verify that database errors are handled gracefully.
     */
    it('should return 500 on database error', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();

      const req = createMockRequest({
        params: { id: projectId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Project.findOne as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      // Act
      await getProjectById(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to fetch project',
        error: 'Database error'
      });
    });
  });

  describe('updateProject', () => {
    /**
     * Test: should update project fields
     * 
     * Objective: Verify that project fields can be updated.
     */
    it('should update project fields', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();
      const customerId = createObjectId();
      const existingProject = createMockProject({ _id: projectId, userId, customerId });
      const updatedProject = { ...existingProject, name: 'Updated Name' };

      const req = createMockRequest({
        params: { id: projectId.toString() },
        body: { name: 'Updated Name', description: 'Updated desc', customerId: customerId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Project.findOne as jest.Mock).mockResolvedValue(existingProject);
      const populateMock2 = jest.fn().mockResolvedValue(updatedProject);
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });
      (Project.findByIdAndUpdate as jest.Mock).mockReturnValue({ populate: populateMock1 });

      // Act
      await updateProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedProject);
    });

    /**
     * Test: should update contractId
     * 
     * Objective: Verify that contractId can be updated.
     */
    it('should update contractId', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();
      const customerId = createObjectId();
      const contractId = createObjectId();
      const existingProject = createMockProject({ _id: projectId, userId, customerId });
      const mockContract = createMockContract({ _id: contractId, customerId, userId });
      const updatedProject = { ...existingProject, contractId };

      const req = createMockRequest({
        params: { id: projectId.toString() },
        body: { contractId: contractId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Project.findOne as jest.Mock).mockResolvedValue(existingProject);
      (Contract.findOne as jest.Mock).mockResolvedValue(mockContract);
      const populateMock2 = jest.fn().mockResolvedValue(updatedProject);
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });
      (Project.findByIdAndUpdate as jest.Mock).mockReturnValue({ populate: populateMock1 });

      // Act
      await updateProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(Contract.findOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    /**
     * Test: should remove contractId when set to null
     * 
     * Objective: Verify that contractId can be removed by setting to null.
     */
    it('should remove contractId when set to null', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();
      const customerId = createObjectId();
      const existingProject = createMockProject({ _id: projectId, userId, customerId });
      const updatedProject = { ...existingProject, contractId: undefined };

      const req = createMockRequest({
        params: { id: projectId.toString() },
        body: { contractId: null },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Project.findOne as jest.Mock).mockResolvedValue(existingProject);
      const populateMock2 = jest.fn().mockResolvedValue(updatedProject);
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });
      (Project.findByIdAndUpdate as jest.Mock).mockReturnValue({ populate: populateMock1 });

      // Act
      await updateProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(Project.findByIdAndUpdate).toHaveBeenCalledWith(
        projectId.toString(),
        expect.objectContaining({ $unset: { contractId: 1 } }),
        { new: true, runValidators: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    /**
     * Test: should remove contractId when set to empty string
     * 
     * Objective: Verify that contractId can be removed by setting to empty string.
     */
    it('should remove contractId when set to empty string', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();
      const customerId = createObjectId();
      const existingProject = createMockProject({ _id: projectId, userId, customerId });
      const updatedProject = { ...existingProject, contractId: undefined };

      const req = createMockRequest({
        params: { id: projectId.toString() },
        body: { contractId: '' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Project.findOne as jest.Mock).mockResolvedValue(existingProject);
      const populateMock2 = jest.fn().mockResolvedValue(updatedProject);
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });
      (Project.findByIdAndUpdate as jest.Mock).mockReturnValue({ populate: populateMock1 });

      // Act
      await updateProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(Project.findByIdAndUpdate).toHaveBeenCalledWith(
        projectId.toString(),
        expect.objectContaining({ $unset: { contractId: 1 } }),
        { new: true, runValidators: true }
      );
    });

    /**
     * Test: should return 404 when project not found
     * 
     * Objective: Verify that 404 is returned when project doesn't exist.
     */
    it('should return 404 when project not found', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();

      const req = createMockRequest({
        params: { id: projectId.toString() },
        body: { name: 'Updated Name' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Project.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      await updateProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
    });

    /**
     * Test: should return 400 when contract doesn't belong to customer
     * 
     * Objective: Verify that 400 is returned when contract doesn't match customer.
     */
    it('should return 400 when contract doesn\'t belong to customer', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();
      const customerId = createObjectId();
      const contractId = createObjectId();
      const existingProject = createMockProject({ _id: projectId, userId, customerId });

      const req = createMockRequest({
        params: { id: projectId.toString() },
        body: { contractId: contractId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Project.findOne as jest.Mock).mockResolvedValue(existingProject);
      (Contract.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      await updateProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid contract or contract does not belong to this customer'
      });
    });

    /**
     * Test: should return 400 for invalid project ID
     * 
     * Objective: Verify that invalid ObjectId format is rejected.
     */
    it('should return 400 for invalid project ID', async () => {
      // Arrange
      const req = createMockRequest({
        params: { id: 'invalid-id' },
        body: { name: 'Updated Name' }
      });
      const res = createMockResponse();

      // Act
      await updateProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid project ID' });
    });
  });

  describe('deleteProject', () => {
    /**
     * Test: should delete project and return success message
     * 
     * Objective: Verify that a project can be deleted successfully.
     */
    it('should delete project and return success message', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();
      const mockProject = createMockProject({ _id: projectId, userId });

      const req = createMockRequest({
        params: { id: projectId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Project.findOne as jest.Mock).mockResolvedValue(mockProject);
      (Project.findByIdAndDelete as jest.Mock).mockResolvedValue(mockProject);

      // Act
      await deleteProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(Project.findByIdAndDelete).toHaveBeenCalledWith(projectId.toString());
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Project deleted successfully' });
    });

    /**
     * Test: should return 400 for invalid project ID
     * 
     * Objective: Verify that invalid ObjectId format is rejected.
     */
    it('should return 400 for invalid project ID', async () => {
      // Arrange
      const req = createMockRequest({
        params: { id: 'invalid-id' }
      });
      const res = createMockResponse();

      // Act
      await deleteProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid project ID' });
    });

    /**
     * Test: should return 404 when project not found
     * 
     * Objective: Verify that 404 is returned when project doesn't exist.
     */
    it('should return 404 when project not found', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();

      const req = createMockRequest({
        params: { id: projectId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Project.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      await deleteProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
    });

    /**
     * Test: should return 500 on database error
     * 
     * Objective: Verify that database errors are handled gracefully.
     */
    it('should return 500 on database error', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();

      const req = createMockRequest({
        params: { id: projectId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Project.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act
      await deleteProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to delete project',
        error: 'Database error'
      });
    });
  });

  describe('validateAzureDevOpsProject', () => {
    /**
     * Test: should return valid: true with project details
     * 
     * Objective: Verify that valid Azure DevOps project returns success.
     */
    it('should return valid: true with project details', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();
      const customerId = createObjectId();
      const mockProject = createMockProject({ _id: projectId, userId, customerId });
      const mockCustomer = createMockCustomer({ _id: customerId, userId });
      const mockAzureProject = {
        id: 'azure-project-id',
        name: 'AzureProject',
        url: 'https://dev.azure.com/testorg/AzureProject'
      };

      const req = createMockRequest({
        params: { id: projectId.toString() },
        body: { projectName: 'AzureProject' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const populateMock = jest.fn().mockResolvedValue(mockProject);
      (Project.findOne as jest.Mock).mockReturnValue({ populate: populateMock });
      (Customer.findById as jest.Mock).mockResolvedValue(mockCustomer);
      
      const mockGetProject = jest.fn().mockResolvedValue(mockAzureProject);
      (AzureDevOpsClient as jest.Mock).mockImplementation(() => ({
        getProject: mockGetProject
      }));

      // Act
      await validateAzureDevOpsProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        valid: true,
        projectId: 'azure-project-id',
        projectName: 'AzureProject',
        projectUrl: 'https://dev.azure.com/testorg/AzureProject'
      });
    });

    /**
     * Test: should return 400 for invalid project ID
     * 
     * Objective: Verify that invalid ObjectId format is rejected.
     */
    it('should return 400 for invalid project ID', async () => {
      // Arrange
      const req = createMockRequest({
        params: { id: 'invalid-id' },
        body: { projectName: 'AzureProject' }
      });
      const res = createMockResponse();

      // Act
      await validateAzureDevOpsProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid project ID' });
    });

    /**
     * Test: should return 400 when projectName not provided
     * 
     * Objective: Verify that missing projectName is rejected.
     */
    it('should return 400 when projectName not provided', async () => {
      // Arrange
      const projectId = createObjectId();
      const req = createMockRequest({
        params: { id: projectId.toString() },
        body: {}
      });
      const res = createMockResponse();

      // Act
      await validateAzureDevOpsProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Project name is required' });
    });

    /**
     * Test: should return 404 when project not found
     * 
     * Objective: Verify that 404 is returned when project doesn't exist.
     */
    it('should return 404 when project not found', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();

      const req = createMockRequest({
        params: { id: projectId.toString() },
        body: { projectName: 'AzureProject' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const populateMock = jest.fn().mockResolvedValue(null);
      (Project.findOne as jest.Mock).mockReturnValue({ populate: populateMock });

      // Act
      await validateAzureDevOpsProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
    });

    /**
     * Test: should return 400 when Azure DevOps not enabled for customer
     * 
     * Objective: Verify that 400 is returned when Azure DevOps is not enabled.
     */
    it('should return 400 when Azure DevOps not enabled for customer', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();
      const customerId = createObjectId();
      const mockProject = createMockProject({ _id: projectId, userId, customerId });
      const mockCustomer = createMockCustomer({
        _id: customerId,
        userId,
        azureDevOps: { enabled: false }
      });

      const req = createMockRequest({
        params: { id: projectId.toString() },
        body: { projectName: 'AzureProject' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const populateMock = jest.fn().mockResolvedValue(mockProject);
      (Project.findOne as jest.Mock).mockReturnValue({ populate: populateMock });
      (Customer.findById as jest.Mock).mockResolvedValue(mockCustomer);

      // Act
      await validateAzureDevOpsProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        valid: false,
        error: 'Azure DevOps is not enabled for this customer'
      });
    });

    /**
     * Test: should return 404 when Azure DevOps project not found
     * 
     * Objective: Verify that 404 is returned when Azure DevOps project doesn't exist.
     */
    it('should return 404 when Azure DevOps project not found', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();
      const customerId = createObjectId();
      const mockProject = createMockProject({ _id: projectId, userId, customerId });
      const mockCustomer = createMockCustomer({ _id: customerId, userId });

      const req = createMockRequest({
        params: { id: projectId.toString() },
        body: { projectName: 'NonExistentProject' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const populateMock = jest.fn().mockResolvedValue(mockProject);
      (Project.findOne as jest.Mock).mockReturnValue({ populate: populateMock });
      (Customer.findById as jest.Mock).mockResolvedValue(mockCustomer);
      
      const mockGetProject = jest.fn().mockRejectedValue(new Error('Project not found'));
      (AzureDevOpsClient as jest.Mock).mockImplementation(() => ({
        getProject: mockGetProject
      }));

      // Act
      await validateAzureDevOpsProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        valid: false,
        error: 'Project not found'
      });
    });

    /**
     * Test: should return 404 when customer not found
     * 
     * Objective: Verify that 404 is returned when customer doesn't exist.
     */
    it('should return 404 when customer not found', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();
      const customerId = createObjectId();
      const mockProject = createMockProject({ _id: projectId, userId, customerId });

      const req = createMockRequest({
        params: { id: projectId.toString() },
        body: { projectName: 'AzureProject' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const populateMock = jest.fn().mockResolvedValue(mockProject);
      (Project.findOne as jest.Mock).mockReturnValue({ populate: populateMock });
      (Customer.findById as jest.Mock).mockResolvedValue(null);

      // Act
      await validateAzureDevOpsProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer not found' });
    });
  });

  describe('getAzureDevOpsIterations', () => {
    /**
     * Test: should return formatted iterations list
     * 
     * Objective: Verify that iterations are returned in the correct format.
     */
    it('should return formatted iterations list', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();
      const customerId = createObjectId();
      const mockProject = createMockProject({
        _id: projectId,
        userId,
        customerId,
        azureDevOps: {
          projectName: 'AzureProject',
          projectId: '12345678-1234-1234-1234-123456789012',
          enabled: true
        }
      });
      const mockCustomer = createMockCustomer({ _id: customerId, userId });
      const mockIterations = [
        {
          id: 'iter-1',
          name: 'Sprint 1',
          path: 'Project\\Sprint 1',
          displayName: 'Sprint 1',
          attributes: {
            startDate: '2025-01-01',
            finishDate: '2025-01-14'
          }
        }
      ];

      const req = createMockRequest({
        params: { id: projectId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const populateMock = jest.fn().mockResolvedValue(mockProject);
      (Project.findOne as jest.Mock).mockReturnValue({ populate: populateMock });
      (Customer.findById as jest.Mock).mockResolvedValue(mockCustomer);
      
      const mockGetIterations = jest.fn().mockResolvedValue(mockIterations);
      (AzureDevOpsClient as jest.Mock).mockImplementation(() => ({
        getIterations: mockGetIterations
      }));

      // Act
      await getAzureDevOpsIterations(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        {
          id: 'iter-1',
          name: 'Sprint 1',
          path: 'Project\\Sprint 1',
          displayName: 'Sprint 1',
          startDate: '2025-01-01',
          finishDate: '2025-01-14'
        }
      ]);
    });

    /**
     * Test: should return 400 for invalid project ID
     * 
     * Objective: Verify that invalid ObjectId format is rejected.
     */
    it('should return 400 for invalid project ID', async () => {
      // Arrange
      const req = createMockRequest({
        params: { id: 'invalid-id' }
      });
      const res = createMockResponse();

      // Act
      await getAzureDevOpsIterations(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid project ID' });
    });

    /**
     * Test: should return 404 when project not found
     * 
     * Objective: Verify that 404 is returned when project doesn't exist.
     */
    it('should return 404 when project not found', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();

      const req = createMockRequest({
        params: { id: projectId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const populateMock = jest.fn().mockResolvedValue(null);
      (Project.findOne as jest.Mock).mockReturnValue({ populate: populateMock });

      // Act
      await getAzureDevOpsIterations(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
    });

    /**
     * Test: should return 400 when Azure DevOps not enabled for project
     * 
     * Objective: Verify that 400 is returned when Azure DevOps is not enabled.
     */
    it('should return 400 when Azure DevOps not enabled for project', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();
      const customerId = createObjectId();
      const mockProject = createMockProject({
        _id: projectId,
        userId,
        customerId,
        azureDevOps: { enabled: false }
      });

      const req = createMockRequest({
        params: { id: projectId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const populateMock = jest.fn().mockResolvedValue(mockProject);
      (Project.findOne as jest.Mock).mockReturnValue({ populate: populateMock });

      // Act
      await getAzureDevOpsIterations(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Azure DevOps is not enabled for this project'
      });
    });

    /**
     * Test: should return 404 when customer not found
     * 
     * Objective: Verify that 404 is returned when customer doesn't exist.
     */
    it('should return 404 when customer not found', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();
      const customerId = createObjectId();
      const mockProject = createMockProject({
        _id: projectId,
        userId,
        customerId,
        azureDevOps: {
          projectName: 'AzureProject',
          projectId: '12345678-1234-1234-1234-123456789012',
          enabled: true
        }
      });

      const req = createMockRequest({
        params: { id: projectId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const populateMock = jest.fn().mockResolvedValue(mockProject);
      (Project.findOne as jest.Mock).mockReturnValue({ populate: populateMock });
      (Customer.findById as jest.Mock).mockResolvedValue(null);

      // Act
      await getAzureDevOpsIterations(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer not found' });
    });
  });

  describe('getAzureDevOpsProjectNames', () => {
    /**
     * Test: should return distinct project names sorted alphabetically
     * 
     * Objective: Verify that project names are returned sorted.
     */
    it('should return distinct project names sorted alphabetically', async () => {
      // Arrange
      const userId = createObjectId();
      const mockProjectNames = ['Zebra Project', 'Alpha Project', 'Beta Project'];

      const req = createMockRequest({
        query: {},
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Project.distinct as jest.Mock).mockResolvedValue(mockProjectNames);

      // Act
      await getAzureDevOpsProjectNames(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(Project.distinct).toHaveBeenCalledWith('azureDevOps.projectName', {
        userId,
        'azureDevOps.projectName': { $exists: true, $ne: '' }
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        projectNames: ['Alpha Project', 'Beta Project', 'Zebra Project']
      });
    });

    /**
     * Test: should filter by customerId when provided
     * 
     * Objective: Verify that project names are filtered by customerId.
     */
    it('should filter by customerId when provided', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const mockProjectNames = ['Project A'];

      const req = createMockRequest({
        query: { customerId: customerId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Project.distinct as jest.Mock).mockResolvedValue(mockProjectNames);

      // Act
      await getAzureDevOpsProjectNames(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(Project.distinct).toHaveBeenCalledWith('azureDevOps.projectName', {
        userId,
        'azureDevOps.projectName': { $exists: true, $ne: '' },
        customerId: customerId.toString()
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    /**
     * Test: should return 400 for invalid customer ID
     * 
     * Objective: Verify that invalid customerId format is rejected.
     */
    it('should return 400 for invalid customer ID', async () => {
      // Arrange
      const userId = createObjectId();

      const req = createMockRequest({
        query: { customerId: 'invalid-id' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      // Act
      await getAzureDevOpsProjectNames(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid customer ID' });
    });

    /**
     * Test: should return empty array when no project names exist
     * 
     * Objective: Verify that empty array is returned when no names exist.
     */
    it('should return empty array when no project names exist', async () => {
      // Arrange
      const userId = createObjectId();

      const req = createMockRequest({
        query: {},
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Project.distinct as jest.Mock).mockResolvedValue([]);

      // Act
      await getAzureDevOpsProjectNames(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ projectNames: [] });
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

      (Project.distinct as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act
      await getAzureDevOpsProjectNames(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to fetch Azure DevOps project names',
        error: 'Database error'
      });
    });
  });

  describe('importWorkItems', () => {
    /**
     * Test: should import work items and return summary
     * 
     * Objective: Verify that work items are imported successfully.
     */
    it('should import work items and return summary', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();
      const customerId = createObjectId();
      const mockProject = {
        ...createMockProject({
          _id: projectId,
          userId,
          customerId,
          azureDevOps: {
            projectName: 'AzureProject',
            projectId: '12345678-1234-1234-1234-123456789012',
            enabled: true
          }
        }),
        save: jest.fn().mockResolvedValue(true)
      };
      const mockCustomer = createMockCustomer({ _id: customerId, userId });
      const mockWorkItems = [
        { id: 1, fields: { 'System.Id': 1, 'System.Title': 'Task 1' } }
      ];
      const mockImportResult = {
        imported: 1,
        skipped: 0,
        tasks: [{ _id: createObjectId(), name: 'Task 1' }]
      };

      const req = createMockRequest({
        params: { id: projectId.toString() },
        body: { iterationPath: 'Project\\Sprint 1' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const populateMock = jest.fn().mockResolvedValue(mockProject);
      (Project.findOne as jest.Mock).mockReturnValue({ populate: populateMock });
      (Customer.findById as jest.Mock).mockResolvedValue(mockCustomer);
      
      const mockGetWorkItems = jest.fn().mockResolvedValue(mockWorkItems);
      (AzureDevOpsClient as jest.Mock).mockImplementation(() => ({
        getWorkItemsByIteration: mockGetWorkItems
      }));
      
      const mockImportWorkItems = jest.fn().mockResolvedValue(mockImportResult);
      (AzureDevOpsSyncService as jest.Mock).mockImplementation(() => ({
        importWorkItems: mockImportWorkItems
      }));

      // Act
      await importWorkItems(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        imported: 1,
        skipped: 0,
        tasks: mockImportResult.tasks
      });
    });

    /**
     * Test: should return 400 for invalid project ID
     * 
     * Objective: Verify that invalid ObjectId format is rejected.
     */
    it('should return 400 for invalid project ID', async () => {
      // Arrange
      const req = createMockRequest({
        params: { id: 'invalid-id' },
        body: { iterationPath: 'Project\\Sprint 1' }
      });
      const res = createMockResponse();

      // Act
      await importWorkItems(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid project ID' });
    });

    /**
     * Test: should return 400 when iterationPath not provided
     * 
     * Objective: Verify that missing iterationPath is rejected.
     */
    it('should return 400 when iterationPath not provided', async () => {
      // Arrange
      const projectId = createObjectId();
      const req = createMockRequest({
        params: { id: projectId.toString() },
        body: {}
      });
      const res = createMockResponse();

      // Act
      await importWorkItems(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Iteration path is required' });
    });

    /**
     * Test: should return 404 when project not found
     * 
     * Objective: Verify that 404 is returned when project doesn't exist.
     */
    it('should return 404 when project not found', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();

      const req = createMockRequest({
        params: { id: projectId.toString() },
        body: { iterationPath: 'Project\\Sprint 1' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const populateMock = jest.fn().mockResolvedValue(null);
      (Project.findOne as jest.Mock).mockReturnValue({ populate: populateMock });

      // Act
      await importWorkItems(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
    });

    /**
     * Test: should return 400 when Azure DevOps not enabled
     * 
     * Objective: Verify that 400 is returned when Azure DevOps is not enabled.
     */
    it('should return 400 when Azure DevOps not enabled', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();
      const customerId = createObjectId();
      const mockProject = createMockProject({
        _id: projectId,
        userId,
        customerId,
        azureDevOps: { enabled: false }
      });

      const req = createMockRequest({
        params: { id: projectId.toString() },
        body: { iterationPath: 'Project\\Sprint 1' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const populateMock = jest.fn().mockResolvedValue(mockProject);
      (Project.findOne as jest.Mock).mockReturnValue({ populate: populateMock });

      // Act
      await importWorkItems(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Azure DevOps is not enabled for this project'
      });
    });

    /**
     * Test: should return 404 when customer not found
     * 
     * Objective: Verify that 404 is returned when customer doesn't exist.
     */
    it('should return 404 when customer not found', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();
      const customerId = createObjectId();
      const mockProject = createMockProject({
        _id: projectId,
        userId,
        customerId,
        azureDevOps: {
          projectName: 'AzureProject',
          projectId: '12345678-1234-1234-1234-123456789012',
          enabled: true
        }
      });

      const req = createMockRequest({
        params: { id: projectId.toString() },
        body: { iterationPath: 'Project\\Sprint 1' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const populateMock = jest.fn().mockResolvedValue(mockProject);
      (Project.findOne as jest.Mock).mockReturnValue({ populate: populateMock });
      (Customer.findById as jest.Mock).mockResolvedValue(null);

      // Act
      await importWorkItems(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer not found' });
    });

    /**
     * Test: should return 400 when customer Azure DevOps not configured
     * 
     * Objective: Verify that 400 is returned when customer Azure DevOps is not configured.
     */
    it('should return 400 when customer Azure DevOps not configured', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();
      const customerId = createObjectId();
      const mockProject = createMockProject({
        _id: projectId,
        userId,
        customerId,
        azureDevOps: {
          projectName: 'AzureProject',
          projectId: '12345678-1234-1234-1234-123456789012',
          enabled: true
        }
      });
      const mockCustomer = createMockCustomer({
        _id: customerId,
        userId,
        azureDevOps: { enabled: false }
      });

      const req = createMockRequest({
        params: { id: projectId.toString() },
        body: { iterationPath: 'Project\\Sprint 1' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const populateMock = jest.fn().mockResolvedValue(mockProject);
      (Project.findOne as jest.Mock).mockReturnValue({ populate: populateMock });
      (Customer.findById as jest.Mock).mockResolvedValue(mockCustomer);

      // Act
      await importWorkItems(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Azure DevOps is not configured for this customer'
      });
    });

    /**
     * Test: should return 503 when Azure DevOps API fails
     * 
     * Objective: Verify that 503 is returned when Azure DevOps API fails.
     */
    it('should return 503 when Azure DevOps API fails', async () => {
      // Arrange
      const userId = createObjectId();
      const projectId = createObjectId();
      const customerId = createObjectId();
      const mockProject = {
        ...createMockProject({
          _id: projectId,
          userId,
          customerId,
          azureDevOps: {
            projectName: 'AzureProject',
            projectId: '12345678-1234-1234-1234-123456789012',
            enabled: true
          }
        }),
        save: jest.fn()
      };
      const mockCustomer = createMockCustomer({ _id: customerId, userId });

      const req = createMockRequest({
        params: { id: projectId.toString() },
        body: { iterationPath: 'Project\\Sprint 1' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      const populateMock = jest.fn().mockResolvedValue(mockProject);
      (Project.findOne as jest.Mock).mockReturnValue({ populate: populateMock });
      (Customer.findById as jest.Mock).mockResolvedValue(mockCustomer);
      
      const mockGetWorkItems = jest.fn().mockRejectedValue(new Error('Connection failed'));
      (AzureDevOpsClient as jest.Mock).mockImplementation(() => ({
        getWorkItemsByIteration: mockGetWorkItems
      }));

      // Act
      await importWorkItems(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to connect to Azure DevOps. Please try again later.'
      });
    });
  });
});
