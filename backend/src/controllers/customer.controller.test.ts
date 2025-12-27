import { NextFunction, Response } from 'express';
import mongoose from 'mongoose';
import {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  validateAzureDevOpsProject
} from './customer.controller';
import { Customer } from '../models/Customer';
import { AzureDevOpsClient } from '../services/azure-devops-client.service';
import { AuthenticatedRequest } from '../middleware/authenticated-request.model';

// Mock the models and services
jest.mock('../models/Customer');
jest.mock('../services/azure-devops-client.service');

/**
 * Unit tests for the Customer controller.
 * 
 * These tests verify:
 * - CRUD operations for customers
 * - Authorization checks (customer belongs to user)
 * - Azure DevOps validation functionality
 * - Error handling (404, 400, 500 responses)
 */

// Helper to create valid ObjectId
const createObjectId = (): mongoose.Types.ObjectId => new mongoose.Types.ObjectId();

// Helper to create mock request
const createMockRequest = (overrides: Partial<AuthenticatedRequest> = {}): Partial<AuthenticatedRequest> => ({
  params: {},
  body: {},
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

// Helper to create mock NextFunction
const createMockNext = (): NextFunction => jest.fn();

// Helper to create mock customer data
const createMockCustomer = (overrides = {}) => ({
  _id: createObjectId(),
  userId: createObjectId(),
  name: 'Test Customer',
  contactInfo: {
    email: 'test@example.com',
    phone: '123-456-7890',
    address: '123 Test St'
  },
  billingDetails: {
    dailyRate: 500,
    currency: 'EUR',
    paymentTerms: 'Net 30'
  },
  azureDevOps: {
    organizationUrl: 'https://dev.azure.com/testorg',
    pat: 'encrypted:pat:value',
    enabled: true
  },
  getDecryptedPAT: jest.fn().mockReturnValue('decrypted-pat-value'),
  markModified: jest.fn(),
  save: jest.fn(),
  isModified: jest.fn().mockReturnValue(false),
  ...overrides
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Customer Controller', () => {
  describe('createCustomer', () => {
    /**
     * Test: should create customer with valid data and return 201
     * 
     * Objective: Verify that a customer is created successfully with valid data.
     */
    it('should create customer with valid data and return 201', async () => {
      // Arrange
      const userId = createObjectId();
      const customerData = {
        name: 'New Customer',
        contactInfo: {
          email: 'new@example.com',
          phone: '555-1234'
        },
        billingDetails: {
          dailyRate: 600,
          currency: 'USD'
        }
      };
      const savedCustomer = createMockCustomer({ ...customerData, userId });

      const req = createMockRequest({
        body: customerData,
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.create as jest.Mock).mockResolvedValue(savedCustomer);

      // Act
      await createCustomer(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(Customer.create).toHaveBeenCalledWith({
        ...customerData,
        userId
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(savedCustomer);
    });

    /**
     * Test: should associate customer with authenticated user
     * 
     * Objective: Verify that the customer is associated with the authenticated user's ID.
     */
    it('should associate customer with authenticated user', async () => {
      // Arrange
      const userId = createObjectId();
      const customerData = {
        name: 'User Customer',
        contactInfo: { email: 'user@example.com' },
        billingDetails: { dailyRate: 400, currency: 'EUR' }
      };
      const savedCustomer = createMockCustomer({ ...customerData, userId });

      const req = createMockRequest({
        body: customerData,
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.create as jest.Mock).mockResolvedValue(savedCustomer);

      // Act
      await createCustomer(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(Customer.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId })
      );
    });

    /**
     * Test: should return 400 on validation error
     * 
     * Objective: Verify that validation errors return 400 status.
     */
    it('should return 400 on validation error', async () => {
      // Arrange
      const req = createMockRequest({
        body: { name: '' } // Invalid data
      });
      const res = createMockResponse();
      const validationError = new Error('Validation failed');

      (Customer.create as jest.Mock).mockRejectedValue(validationError);

      // Act
      await createCustomer(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error creating customer',
        error: validationError
      });
    });
  });

  describe('getCustomers', () => {
    /**
     * Test: should return all customers for authenticated user
     * 
     * Objective: Verify that all customers belonging to the user are returned.
     */
    it('should return all customers for authenticated user', async () => {
      // Arrange
      const userId = createObjectId();
      const mockCustomers = [
        createMockCustomer({ userId, name: 'Customer A' }),
        createMockCustomer({ userId, name: 'Customer B' })
      ];

      const req = createMockRequest({
        user: { _id: userId } as any
      });
      const res = createMockResponse();
      const next = createMockNext();

      (Customer.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockCustomers)
      });

      // Act
      await getCustomers(req as AuthenticatedRequest, res as Response, next);

      // Assert
      expect(Customer.find).toHaveBeenCalledWith({ userId });
      expect(res.json).toHaveBeenCalledWith(mockCustomers);
      expect(next).toHaveBeenCalled();
    });

    /**
     * Test: should return customers sorted by name
     * 
     * Objective: Verify that the sort method is called with correct parameters.
     */
    it('should return customers sorted by name', async () => {
      // Arrange
      const userId = createObjectId();
      const sortMock = jest.fn().mockResolvedValue([]);

      const req = createMockRequest({
        user: { _id: userId } as any
      });
      const res = createMockResponse();
      const next = createMockNext();

      (Customer.find as jest.Mock).mockReturnValue({ sort: sortMock });

      // Act
      await getCustomers(req as AuthenticatedRequest, res as Response, next);

      // Assert
      expect(sortMock).toHaveBeenCalledWith({ name: 1 });
    });

    /**
     * Test: should return 500 on database error
     * 
     * Objective: Verify that database errors are handled gracefully.
     */
    it('should return 500 on database error', async () => {
      // Arrange
      const userId = createObjectId();
      const dbError = new Error('Database connection failed');

      const req = createMockRequest({
        user: { _id: userId } as any
      });
      const res = createMockResponse();
      const next = createMockNext();

      (Customer.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockRejectedValue(dbError)
      });

      // Act
      await getCustomers(req as AuthenticatedRequest, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error fetching customers',
        error: dbError
      });
    });
  });

  describe('getCustomer', () => {
    /**
     * Test: should return customer when found
     * 
     * Objective: Verify that a customer is returned when it exists
     * and belongs to the authenticated user.
     */
    it('should return customer when found', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });

      const req = createMockRequest({
        params: { id: customerId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);

      // Act
      await getCustomer(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(Customer.findOne).toHaveBeenCalledWith({
        _id: customerId.toString(),
        userId
      });
      expect(res.json).toHaveBeenCalledWith(mockCustomer);
    });

    /**
     * Test: should return 404 when customer not found
     * 
     * Objective: Verify that 404 is returned when customer doesn't exist
     * or doesn't belong to the user.
     */
    it('should return 404 when customer not found', async () => {
      // Arrange
      const customerId = createObjectId();
      const req = createMockRequest({
        params: { id: customerId.toString() }
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      await getCustomer(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer not found' });
    });

    /**
     * Test: should return 500 on database error
     * 
     * Objective: Verify that database errors are handled gracefully.
     */
    it('should return 500 on database error', async () => {
      // Arrange
      const customerId = createObjectId();
      const dbError = new Error('Database error');

      const req = createMockRequest({
        params: { id: customerId.toString() }
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockRejectedValue(dbError);

      // Act
      await getCustomer(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error fetching customer',
        error: dbError
      });
    });
  });

  describe('updateCustomer', () => {
    /**
     * Test: should update customer name
     * 
     * Objective: Verify that customer name can be updated.
     */
    it('should update customer name', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });
      mockCustomer.save = jest.fn().mockResolvedValue(mockCustomer);

      const req = createMockRequest({
        params: { id: customerId.toString() },
        body: { name: 'Updated Customer Name' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);

      // Act
      await updateCustomer(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(mockCustomer.name).toBe('Updated Customer Name');
      expect(mockCustomer.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockCustomer);
    });

    /**
     * Test: should update azureDevOps config with new PAT
     * 
     * Objective: Verify that Azure DevOps config is updated when a new PAT is provided.
     */
    it('should update azureDevOps config with new PAT', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });
      mockCustomer.save = jest.fn().mockResolvedValue(mockCustomer);

      const newAzureDevOps = {
        organizationUrl: 'https://dev.azure.com/neworg',
        pat: 'new-pat-token',
        enabled: true
      };

      const req = createMockRequest({
        params: { id: customerId.toString() },
        body: { azureDevOps: newAzureDevOps },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);

      // Act
      await updateCustomer(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(mockCustomer.azureDevOps).toEqual(expect.objectContaining({
        organizationUrl: 'https://dev.azure.com/neworg',
        pat: 'new-pat-token',
        enabled: true
      }));
      expect(mockCustomer.markModified).toHaveBeenCalledWith('azureDevOps');
      expect(mockCustomer.save).toHaveBeenCalled();
    });

    /**
     * Test: should preserve existing PAT when not provided in update
     * 
     * Objective: Verify that existing PAT is preserved when update doesn't include a new PAT.
     */
    it('should preserve existing PAT when not provided in update', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const existingPat = 'existing-encrypted-pat';
      const mockCustomer = createMockCustomer({
        _id: customerId,
        userId,
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/oldorg',
          pat: existingPat,
          enabled: true
        }
      });
      mockCustomer.save = jest.fn().mockResolvedValue(mockCustomer);

      const req = createMockRequest({
        params: { id: customerId.toString() },
        body: {
          azureDevOps: {
            organizationUrl: 'https://dev.azure.com/neworg',
            pat: '', // Empty PAT - should preserve existing
            enabled: false
          }
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);

      // Act
      await updateCustomer(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(mockCustomer.azureDevOps.organizationUrl).toBe('https://dev.azure.com/neworg');
      expect(mockCustomer.azureDevOps.enabled).toBe(false);
      expect(mockCustomer.azureDevOps.pat).toBe(existingPat); // PAT preserved
      expect(mockCustomer.markModified).toHaveBeenCalledWith('azureDevOps.organizationUrl');
      expect(mockCustomer.markModified).toHaveBeenCalledWith('azureDevOps.enabled');
    });

    /**
     * Test: should return 404 when customer not found
     * 
     * Objective: Verify that 404 is returned when customer doesn't exist.
     */
    it('should return 404 when customer not found', async () => {
      // Arrange
      const customerId = createObjectId();
      const req = createMockRequest({
        params: { id: customerId.toString() },
        body: { name: 'Updated Name' }
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      await updateCustomer(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer not found' });
    });

    /**
     * Test: should return 400 on validation error
     * 
     * Objective: Verify that validation errors during save return 400 status.
     */
    it('should return 400 on validation error', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });
      const validationError = new Error('Validation failed');
      mockCustomer.save = jest.fn().mockRejectedValue(validationError);

      const req = createMockRequest({
        params: { id: customerId.toString() },
        body: { name: 'Updated Name' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);

      // Act
      await updateCustomer(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error updating customer',
        error: validationError
      });
    });
  });

  describe('deleteCustomer', () => {
    /**
     * Test: should delete customer and return success message
     * 
     * Objective: Verify that a customer can be deleted successfully.
     */
    it('should delete customer and return success message', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });

      const req = createMockRequest({
        params: { id: customerId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOneAndDelete as jest.Mock).mockResolvedValue(mockCustomer);

      // Act
      await deleteCustomer(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(Customer.findOneAndDelete).toHaveBeenCalledWith({
        _id: customerId.toString(),
        userId
      });
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer deleted successfully' });
    });

    /**
     * Test: should return 404 when customer not found
     * 
     * Objective: Verify that 404 is returned when customer doesn't exist.
     */
    it('should return 404 when customer not found', async () => {
      // Arrange
      const customerId = createObjectId();
      const req = createMockRequest({
        params: { id: customerId.toString() }
      });
      const res = createMockResponse();

      (Customer.findOneAndDelete as jest.Mock).mockResolvedValue(null);

      // Act
      await deleteCustomer(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer not found' });
    });

    /**
     * Test: should return 500 on database error
     * 
     * Objective: Verify that database errors are handled gracefully.
     */
    it('should return 500 on database error', async () => {
      // Arrange
      const customerId = createObjectId();
      const dbError = new Error('Database error');

      const req = createMockRequest({
        params: { id: customerId.toString() }
      });
      const res = createMockResponse();

      (Customer.findOneAndDelete as jest.Mock).mockRejectedValue(dbError);

      // Act
      await deleteCustomer(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error deleting customer',
        error: dbError
      });
    });
  });

  describe('validateAzureDevOpsProject', () => {
    /**
     * Test: should return valid: true with project details when project exists
     * 
     * Objective: Verify that valid project returns success response with project details.
     */
    it('should return valid: true with project details when project exists', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const mockCustomer = createMockCustomer({
        _id: customerId,
        userId,
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/testorg',
          pat: 'encrypted-pat',
          enabled: true
        }
      });
      mockCustomer.getDecryptedPAT = jest.fn().mockReturnValue('decrypted-pat');

      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        url: 'https://dev.azure.com/testorg/Test%20Project'
      };

      const mockGetProject = jest.fn().mockResolvedValue(mockProject);
      (AzureDevOpsClient as jest.Mock).mockImplementation(() => ({
        getProject: mockGetProject
      }));

      const req = createMockRequest({
        params: { id: customerId.toString() },
        body: { projectName: 'Test Project' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);

      // Act
      await validateAzureDevOpsProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(AzureDevOpsClient).toHaveBeenCalledWith(
        'https://dev.azure.com/testorg',
        'decrypted-pat'
      );
      expect(mockGetProject).toHaveBeenCalledWith('Test Project');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        valid: true,
        projectId: 'project-123',
        projectName: 'Test Project',
        projectUrl: 'https://dev.azure.com/testorg/Test%20Project'
      });
    });

    /**
     * Test: should return 400 when projectName not provided
     * 
     * Objective: Verify that missing projectName returns 400 error.
     */
    it('should return 400 when projectName not provided', async () => {
      // Arrange
      const req = createMockRequest({
        params: { id: createObjectId().toString() },
        body: {} // No projectName
      });
      const res = createMockResponse();

      // Act
      await validateAzureDevOpsProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Project name is required' });
    });

    /**
     * Test: should return 404 when customer not found
     * 
     * Objective: Verify that 404 is returned when customer doesn't exist.
     */
    it('should return 404 when customer not found', async () => {
      // Arrange
      const customerId = createObjectId();
      const req = createMockRequest({
        params: { id: customerId.toString() },
        body: { projectName: 'Test Project' }
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      await validateAzureDevOpsProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer not found' });
    });

    /**
     * Test: should return 400 when Azure DevOps not enabled
     * 
     * Objective: Verify that 400 is returned when Azure DevOps is not enabled for customer.
     */
    it('should return 400 when Azure DevOps not enabled', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const mockCustomer = createMockCustomer({
        _id: customerId,
        userId,
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/testorg',
          pat: 'encrypted-pat',
          enabled: false // Not enabled
        }
      });

      const req = createMockRequest({
        params: { id: customerId.toString() },
        body: { projectName: 'Test Project' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);

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
      const customerId = createObjectId();
      const mockCustomer = createMockCustomer({
        _id: customerId,
        userId,
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/testorg',
          pat: 'encrypted-pat',
          enabled: true
        }
      });
      mockCustomer.getDecryptedPAT = jest.fn().mockReturnValue('decrypted-pat');

      const mockGetProject = jest.fn().mockRejectedValue(
        new Error("Azure DevOps project 'NonExistent' not found")
      );
      (AzureDevOpsClient as jest.Mock).mockImplementation(() => ({
        getProject: mockGetProject
      }));

      const req = createMockRequest({
        params: { id: customerId.toString() },
        body: { projectName: 'NonExistent' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);

      // Act
      await validateAzureDevOpsProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        valid: false,
        error: "Azure DevOps project 'NonExistent' not found"
      });
    });

    /**
     * Test: should return 401 when Azure DevOps authentication fails
     * 
     * Objective: Verify that 401 is returned when Azure DevOps authentication fails.
     */
    it('should return 401 when Azure DevOps authentication fails', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const mockCustomer = createMockCustomer({
        _id: customerId,
        userId,
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/testorg',
          pat: 'encrypted-pat',
          enabled: true
        }
      });
      mockCustomer.getDecryptedPAT = jest.fn().mockReturnValue('invalid-pat');

      const mockGetProject = jest.fn().mockRejectedValue(
        new Error('Azure DevOps authentication failed')
      );
      (AzureDevOpsClient as jest.Mock).mockImplementation(() => ({
        getProject: mockGetProject
      }));

      const req = createMockRequest({
        params: { id: customerId.toString() },
        body: { projectName: 'Test Project' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);

      // Act
      await validateAzureDevOpsProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        valid: false,
        error: 'Azure DevOps authentication failed'
      });
    });

    /**
     * Test: should return 400 when Azure DevOps configuration is incomplete
     * 
     * Objective: Verify that 400 is returned when organizationUrl or PAT is missing.
     */
    it('should return 400 when Azure DevOps configuration is incomplete', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const mockCustomer = createMockCustomer({
        _id: customerId,
        userId,
        azureDevOps: {
          organizationUrl: '', // Missing organization URL
          pat: '',
          enabled: true
        }
      });

      const req = createMockRequest({
        params: { id: customerId.toString() },
        body: { projectName: 'Test Project' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);

      // Act
      await validateAzureDevOpsProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        valid: false,
        error: 'Azure DevOps configuration is incomplete for this customer'
      });
    });

    /**
     * Test: should return 500 when PAT decryption fails
     * 
     * Objective: Verify that 500 is returned when PAT cannot be decrypted.
     */
    it('should return 500 when PAT decryption fails', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const mockCustomer = createMockCustomer({
        _id: customerId,
        userId,
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/testorg',
          pat: 'corrupted-encrypted-pat',
          enabled: true
        }
      });
      mockCustomer.getDecryptedPAT = jest.fn().mockReturnValue(null); // Decryption failed

      const req = createMockRequest({
        params: { id: customerId.toString() },
        body: { projectName: 'Test Project' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);

      // Act
      await validateAzureDevOpsProject(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        valid: false,
        error: 'Failed to decrypt Azure DevOps PAT'
      });
    });
  });
});
