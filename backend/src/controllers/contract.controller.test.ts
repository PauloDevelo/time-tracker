import { Response } from 'express';
import mongoose from 'mongoose';
import {
  getContractsByCustomer,
  getContract,
  createContract,
  updateContract,
  deleteContract
} from './contract.controller';
import { Contract } from '../models/Contract';
import { Customer } from '../models/Customer';
import { Project } from '../models/Project';
import { AuthenticatedRequest } from '../middleware/authenticated-request.model';

// Mock the models
jest.mock('../models/Contract');
jest.mock('../models/Customer');
jest.mock('../models/Project');

/**
 * Unit tests for the Contract controller.
 * 
 * These tests verify:
 * - CRUD operations for contracts
 * - Authorization checks (customer belongs to user)
 * - Input validation (ID format, required fields, date logic)
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

// Helper to create mock contract data
const createMockContract = (overrides = {}) => ({
  _id: createObjectId(),
  customerId: createObjectId(),
  userId: createObjectId(),
  name: 'Test Contract',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  dailyRate: 500,
  currency: 'EUR',
  daysToCompletion: 220,
  description: 'Test description',
  ...overrides
});

// Helper to create mock customer
const createMockCustomer = (overrides = {}) => ({
  _id: createObjectId(),
  userId: createObjectId(),
  name: 'Test Customer',
  ...overrides
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Contract Controller', () => {
  describe('getContractsByCustomer', () => {
    /**
     * Test: should return all contracts for a valid customer
     * 
     * Objective: Verify that contracts are returned when customer exists
     * and belongs to the authenticated user.
     */
    it('should return all contracts for a valid customer', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const mockContracts = [
        createMockContract({ customerId, userId }),
        createMockContract({ customerId, userId })
      ];
      const mockCustomer = createMockCustomer({ _id: customerId, userId });

      const req = createMockRequest({
        params: { customerId: customerId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);
      (Contract.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockContracts)
      });

      // Act
      await getContractsByCustomer(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(Customer.findOne).toHaveBeenCalledWith({ _id: customerId.toString(), userId });
      expect(Contract.find).toHaveBeenCalledWith({ customerId: customerId.toString(), userId });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockContracts);
    });

    /**
     * Test: should return contracts sorted by startDate descending
     * 
     * Objective: Verify that the sort method is called with correct parameters.
     */
    it('should return contracts sorted by startDate descending', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });
      const sortMock = jest.fn().mockResolvedValue([]);

      const req = createMockRequest({
        params: { customerId: customerId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);
      (Contract.find as jest.Mock).mockReturnValue({ sort: sortMock });

      // Act
      await getContractsByCustomer(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(sortMock).toHaveBeenCalledWith({ startDate: -1 });
    });

    /**
     * Test: should return empty array when customer has no contracts
     * 
     * Objective: Verify that an empty array is returned when no contracts exist.
     */
    it('should return empty array when customer has no contracts', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });

      const req = createMockRequest({
        params: { customerId: customerId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);
      (Contract.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockResolvedValue([])
      });

      // Act
      await getContractsByCustomer(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    /**
     * Test: should return 400 for invalid customer ID format
     * 
     * Objective: Verify that invalid ObjectId format is rejected.
     */
    it('should return 400 for invalid customer ID format', async () => {
      // Arrange
      const req = createMockRequest({
        params: { customerId: 'invalid-id' }
      });
      const res = createMockResponse();

      // Act
      await getContractsByCustomer(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid customer ID' });
      expect(Customer.findOne).not.toHaveBeenCalled();
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
        params: { customerId: customerId.toString() }
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      await getContractsByCustomer(req as AuthenticatedRequest, res as Response);

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
      const req = createMockRequest({
        params: { customerId: customerId.toString() }
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act
      await getContractsByCustomer(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to fetch contracts',
        error: 'Database error'
      });
    });
  });

  describe('getContract', () => {
    /**
     * Test: should return contract when found
     * 
     * Objective: Verify that a contract is returned when it exists
     * and belongs to the authenticated user.
     */
    it('should return contract when found', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const contractId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });
      const mockContract = createMockContract({ _id: contractId, customerId, userId });

      const req = createMockRequest({
        params: {
          customerId: customerId.toString(),
          contractId: contractId.toString()
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);
      (Contract.findOne as jest.Mock).mockResolvedValue(mockContract);

      // Act
      await getContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(Contract.findOne).toHaveBeenCalledWith({
        _id: contractId.toString(),
        customerId: customerId.toString(),
        userId
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockContract);
    });

    /**
     * Test: should return 400 for invalid customer ID format
     * 
     * Objective: Verify that invalid customer ObjectId format is rejected.
     */
    it('should return 400 for invalid customer ID format', async () => {
      // Arrange
      const req = createMockRequest({
        params: {
          customerId: 'invalid-id',
          contractId: createObjectId().toString()
        }
      });
      const res = createMockResponse();

      // Act
      await getContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid customer ID' });
    });

    /**
     * Test: should return 400 for invalid contract ID format
     * 
     * Objective: Verify that invalid contract ObjectId format is rejected.
     */
    it('should return 400 for invalid contract ID format', async () => {
      // Arrange
      const req = createMockRequest({
        params: {
          customerId: createObjectId().toString(),
          contractId: 'invalid-id'
        }
      });
      const res = createMockResponse();

      // Act
      await getContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid contract ID' });
    });

    /**
     * Test: should return 404 when customer not found
     * 
     * Objective: Verify that 404 is returned when customer doesn't exist.
     */
    it('should return 404 when customer not found', async () => {
      // Arrange
      const customerId = createObjectId();
      const contractId = createObjectId();
      const req = createMockRequest({
        params: {
          customerId: customerId.toString(),
          contractId: contractId.toString()
        }
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      await getContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer not found' });
    });

    /**
     * Test: should return 404 when contract not found
     * 
     * Objective: Verify that 404 is returned when contract doesn't exist.
     */
    it('should return 404 when contract not found', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const contractId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });

      const req = createMockRequest({
        params: {
          customerId: customerId.toString(),
          contractId: contractId.toString()
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);
      (Contract.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      await getContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Contract not found' });
    });
  });

  describe('createContract', () => {
    /**
     * Test: should create contract with all required fields
     * 
     * Objective: Verify that a contract is created successfully with all required fields.
     */
    it('should create contract with all required fields', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });
      const savedContract = createMockContract({ customerId, userId });

      const req = createMockRequest({
        params: { customerId: customerId.toString() },
        body: {
          name: 'New Contract',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          dailyRate: 500,
          daysToCompletion: 220
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);
      (Contract as unknown as jest.Mock).mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(savedContract)
      }));

      // Act
      await createContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(savedContract);
    });

    /**
     * Test: should create contract with optional description
     * 
     * Objective: Verify that a contract can be created with an optional description.
     */
    it('should create contract with optional description', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });
      const savedContract = createMockContract({
        customerId,
        userId,
        description: 'Optional description'
      });

      const req = createMockRequest({
        params: { customerId: customerId.toString() },
        body: {
          name: 'New Contract',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          dailyRate: 500,
          daysToCompletion: 220,
          description: 'Optional description'
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);
      (Contract as unknown as jest.Mock).mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(savedContract)
      }));

      // Act
      await createContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(savedContract);
    });

    /**
     * Test: should default currency to EUR when not provided
     * 
     * Objective: Verify that currency defaults to EUR when not specified.
     */
    it('should default currency to EUR when not provided', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });
      const savedContract = createMockContract({ customerId, userId, currency: 'EUR' });

      const req = createMockRequest({
        params: { customerId: customerId.toString() },
        body: {
          name: 'New Contract',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          dailyRate: 500,
          daysToCompletion: 220
          // currency not provided
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);
      (Contract as unknown as jest.Mock).mockImplementation((data: any) => {
        expect(data.currency).toBe('EUR');
        return { save: jest.fn().mockResolvedValue(savedContract) };
      });

      // Act
      await createContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
    });

    /**
     * Test: should return 201 status on success
     * 
     * Objective: Verify that 201 status code is returned on successful creation.
     */
    it('should return 201 status on success', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });
      const savedContract = createMockContract({ customerId, userId });

      const req = createMockRequest({
        params: { customerId: customerId.toString() },
        body: {
          name: 'New Contract',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          dailyRate: 500,
          daysToCompletion: 220
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);
      (Contract as unknown as jest.Mock).mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(savedContract)
      }));

      // Act
      await createContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
    });

    /**
     * Test: should return 400 when name is missing
     * 
     * Objective: Verify that missing name field is rejected.
     */
    it('should return 400 when name is missing', async () => {
      // Arrange
      const customerId = createObjectId();
      const req = createMockRequest({
        params: { customerId: customerId.toString() },
        body: {
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          dailyRate: 500,
          daysToCompletion: 220
        }
      });
      const res = createMockResponse();

      // Act
      await createContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Missing required fields: name, startDate, endDate, dailyRate, and daysToCompletion are required'
      });
    });

    /**
     * Test: should return 400 when startDate is missing
     * 
     * Objective: Verify that missing startDate field is rejected.
     */
    it('should return 400 when startDate is missing', async () => {
      // Arrange
      const customerId = createObjectId();
      const req = createMockRequest({
        params: { customerId: customerId.toString() },
        body: {
          name: 'Test Contract',
          endDate: '2025-12-31',
          dailyRate: 500,
          daysToCompletion: 220
        }
      });
      const res = createMockResponse();

      // Act
      await createContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Missing required fields: name, startDate, endDate, dailyRate, and daysToCompletion are required'
      });
    });

    /**
     * Test: should return 400 when endDate is missing
     * 
     * Objective: Verify that missing endDate field is rejected.
     */
    it('should return 400 when endDate is missing', async () => {
      // Arrange
      const customerId = createObjectId();
      const req = createMockRequest({
        params: { customerId: customerId.toString() },
        body: {
          name: 'Test Contract',
          startDate: '2025-01-01',
          dailyRate: 500,
          daysToCompletion: 220
        }
      });
      const res = createMockResponse();

      // Act
      await createContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Missing required fields: name, startDate, endDate, dailyRate, and daysToCompletion are required'
      });
    });

    /**
     * Test: should return 400 when dailyRate is missing
     * 
     * Objective: Verify that missing dailyRate field is rejected.
     */
    it('should return 400 when dailyRate is missing', async () => {
      // Arrange
      const customerId = createObjectId();
      const req = createMockRequest({
        params: { customerId: customerId.toString() },
        body: {
          name: 'Test Contract',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          daysToCompletion: 220
        }
      });
      const res = createMockResponse();

      // Act
      await createContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Missing required fields: name, startDate, endDate, dailyRate, and daysToCompletion are required'
      });
    });

    /**
     * Test: should return 400 when daysToCompletion is missing
     * 
     * Objective: Verify that missing daysToCompletion field is rejected.
     */
    it('should return 400 when daysToCompletion is missing', async () => {
      // Arrange
      const customerId = createObjectId();
      const req = createMockRequest({
        params: { customerId: customerId.toString() },
        body: {
          name: 'Test Contract',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          dailyRate: 500
        }
      });
      const res = createMockResponse();

      // Act
      await createContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Missing required fields: name, startDate, endDate, dailyRate, and daysToCompletion are required'
      });
    });

    /**
     * Test: should return 400 for invalid date format
     * 
     * Objective: Verify that invalid date format is rejected.
     */
    it('should return 400 for invalid date format', async () => {
      // Arrange
      const customerId = createObjectId();
      const req = createMockRequest({
        params: { customerId: customerId.toString() },
        body: {
          name: 'Test Contract',
          startDate: 'not-a-date',
          endDate: '2025-12-31',
          dailyRate: 500,
          daysToCompletion: 220
        }
      });
      const res = createMockResponse();

      // Act
      await createContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid date format' });
    });

    /**
     * Test: should return 400 when endDate is before startDate
     * 
     * Objective: Verify that endDate before startDate is rejected.
     */
    it('should return 400 when endDate is before startDate', async () => {
      // Arrange
      const customerId = createObjectId();
      const req = createMockRequest({
        params: { customerId: customerId.toString() },
        body: {
          name: 'Test Contract',
          startDate: '2025-12-31',
          endDate: '2025-01-01',
          dailyRate: 500,
          daysToCompletion: 220
        }
      });
      const res = createMockResponse();

      // Act
      await createContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'End date must be after start date' });
    });

    /**
     * Test: should return 400 when endDate equals startDate
     * 
     * Objective: Verify that endDate equal to startDate is rejected.
     */
    it('should return 400 when endDate equals startDate', async () => {
      // Arrange
      const customerId = createObjectId();
      const req = createMockRequest({
        params: { customerId: customerId.toString() },
        body: {
          name: 'Test Contract',
          startDate: '2025-06-15',
          endDate: '2025-06-15',
          dailyRate: 500,
          daysToCompletion: 220
        }
      });
      const res = createMockResponse();

      // Act
      await createContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'End date must be after start date' });
    });

    /**
     * Test: should return 400 for invalid customer ID format
     * 
     * Objective: Verify that invalid customer ObjectId format is rejected.
     */
    it('should return 400 for invalid customer ID format', async () => {
      // Arrange
      const req = createMockRequest({
        params: { customerId: 'invalid-id' },
        body: {
          name: 'Test Contract',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          dailyRate: 500,
          daysToCompletion: 220
        }
      });
      const res = createMockResponse();

      // Act
      await createContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid customer ID' });
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
        params: { customerId: customerId.toString() },
        body: {
          name: 'Test Contract',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          dailyRate: 500,
          daysToCompletion: 220
        }
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      await createContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer not found' });
    });
  });

  describe('updateContract', () => {
    /**
     * Test: should update contract name
     * 
     * Objective: Verify that contract name can be updated.
     */
    it('should update contract name', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const contractId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });
      const existingContract = createMockContract({
        _id: contractId,
        customerId,
        userId,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31')
      });
      const updatedContract = { ...existingContract, name: 'Updated Name' };

      const req = createMockRequest({
        params: {
          customerId: customerId.toString(),
          contractId: contractId.toString()
        },
        body: { name: 'Updated Name' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);
      (Contract.findOne as jest.Mock).mockResolvedValue(existingContract);
      (Contract.findByIdAndUpdate as jest.Mock).mockResolvedValue(updatedContract);

      // Act
      await updateContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(Contract.findByIdAndUpdate).toHaveBeenCalledWith(
        contractId.toString(),
        { name: 'Updated Name' },
        { new: true, runValidators: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedContract);
    });

    /**
     * Test: should update contract dates
     * 
     * Objective: Verify that contract dates can be updated.
     */
    it('should update contract dates', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const contractId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });
      const existingContract = createMockContract({
        _id: contractId,
        customerId,
        userId,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31')
      });
      const updatedContract = {
        ...existingContract,
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-11-30')
      };

      const req = createMockRequest({
        params: {
          customerId: customerId.toString(),
          contractId: contractId.toString()
        },
        body: {
          startDate: '2025-02-01',
          endDate: '2025-11-30'
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);
      (Contract.findOne as jest.Mock).mockResolvedValue(existingContract);
      (Contract.findByIdAndUpdate as jest.Mock).mockResolvedValue(updatedContract);

      // Act
      await updateContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedContract);
    });

    /**
     * Test: should update contract dailyRate
     * 
     * Objective: Verify that contract dailyRate can be updated.
     */
    it('should update contract dailyRate', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const contractId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });
      const existingContract = createMockContract({
        _id: contractId,
        customerId,
        userId,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31')
      });
      const updatedContract = { ...existingContract, dailyRate: 750 };

      const req = createMockRequest({
        params: {
          customerId: customerId.toString(),
          contractId: contractId.toString()
        },
        body: { dailyRate: 750 },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);
      (Contract.findOne as jest.Mock).mockResolvedValue(existingContract);
      (Contract.findByIdAndUpdate as jest.Mock).mockResolvedValue(updatedContract);

      // Act
      await updateContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(Contract.findByIdAndUpdate).toHaveBeenCalledWith(
        contractId.toString(),
        { dailyRate: 750 },
        { new: true, runValidators: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    /**
     * Test: should update multiple fields at once
     * 
     * Objective: Verify that multiple fields can be updated simultaneously.
     */
    it('should update multiple fields at once', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const contractId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });
      const existingContract = createMockContract({
        _id: contractId,
        customerId,
        userId,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31')
      });
      const updatedContract = {
        ...existingContract,
        name: 'Updated Name',
        dailyRate: 800,
        description: 'Updated description'
      };

      const req = createMockRequest({
        params: {
          customerId: customerId.toString(),
          contractId: contractId.toString()
        },
        body: {
          name: 'Updated Name',
          dailyRate: 800,
          description: 'Updated description'
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);
      (Contract.findOne as jest.Mock).mockResolvedValue(existingContract);
      (Contract.findByIdAndUpdate as jest.Mock).mockResolvedValue(updatedContract);

      // Act
      await updateContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(Contract.findByIdAndUpdate).toHaveBeenCalledWith(
        contractId.toString(),
        {
          name: 'Updated Name',
          dailyRate: 800,
          description: 'Updated description'
        },
        { new: true, runValidators: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    /**
     * Test: should return updated contract
     * 
     * Objective: Verify that the updated contract is returned in the response.
     */
    it('should return updated contract', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const contractId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });
      const existingContract = createMockContract({
        _id: contractId,
        customerId,
        userId,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31')
      });
      const updatedContract = { ...existingContract, name: 'Updated Contract' };

      const req = createMockRequest({
        params: {
          customerId: customerId.toString(),
          contractId: contractId.toString()
        },
        body: { name: 'Updated Contract' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);
      (Contract.findOne as jest.Mock).mockResolvedValue(existingContract);
      (Contract.findByIdAndUpdate as jest.Mock).mockResolvedValue(updatedContract);

      // Act
      await updateContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.json).toHaveBeenCalledWith(updatedContract);
    });

    /**
     * Test: should return 400 for invalid start date format
     * 
     * Objective: Verify that invalid start date format is rejected.
     */
    it('should return 400 for invalid start date format', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const contractId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });
      const existingContract = createMockContract({
        _id: contractId,
        customerId,
        userId,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31')
      });

      const req = createMockRequest({
        params: {
          customerId: customerId.toString(),
          contractId: contractId.toString()
        },
        body: { startDate: 'not-a-date' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);
      (Contract.findOne as jest.Mock).mockResolvedValue(existingContract);

      // Act
      await updateContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid start date format' });
    });

    /**
     * Test: should return 400 for invalid end date format
     * 
     * Objective: Verify that invalid end date format is rejected.
     */
    it('should return 400 for invalid end date format', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const contractId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });
      const existingContract = createMockContract({
        _id: contractId,
        customerId,
        userId,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31')
      });

      const req = createMockRequest({
        params: {
          customerId: customerId.toString(),
          contractId: contractId.toString()
        },
        body: { endDate: 'not-a-date' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);
      (Contract.findOne as jest.Mock).mockResolvedValue(existingContract);

      // Act
      await updateContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid end date format' });
    });

    /**
     * Test: should return 400 when updated endDate is before startDate
     * 
     * Objective: Verify that updating endDate to be before startDate is rejected.
     */
    it('should return 400 when updated endDate is before startDate', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const contractId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });
      const existingContract = createMockContract({
        _id: contractId,
        customerId,
        userId,
        startDate: new Date('2025-06-01'),
        endDate: new Date('2025-12-31')
      });

      const req = createMockRequest({
        params: {
          customerId: customerId.toString(),
          contractId: contractId.toString()
        },
        body: { endDate: '2025-01-01' }, // Before existing startDate
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);
      (Contract.findOne as jest.Mock).mockResolvedValue(existingContract);

      // Act
      await updateContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'End date must be after start date' });
    });

    /**
     * Test: should return 400 for invalid customer ID format
     * 
     * Objective: Verify that invalid customer ObjectId format is rejected.
     */
    it('should return 400 for invalid customer ID format', async () => {
      // Arrange
      const req = createMockRequest({
        params: {
          customerId: 'invalid-id',
          contractId: createObjectId().toString()
        },
        body: { name: 'Updated Name' }
      });
      const res = createMockResponse();

      // Act
      await updateContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid customer ID' });
    });

    /**
     * Test: should return 400 for invalid contract ID format
     * 
     * Objective: Verify that invalid contract ObjectId format is rejected.
     */
    it('should return 400 for invalid contract ID format', async () => {
      // Arrange
      const req = createMockRequest({
        params: {
          customerId: createObjectId().toString(),
          contractId: 'invalid-id'
        },
        body: { name: 'Updated Name' }
      });
      const res = createMockResponse();

      // Act
      await updateContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid contract ID' });
    });

    /**
     * Test: should return 404 when customer not found
     * 
     * Objective: Verify that 404 is returned when customer doesn't exist.
     */
    it('should return 404 when customer not found', async () => {
      // Arrange
      const customerId = createObjectId();
      const contractId = createObjectId();
      const req = createMockRequest({
        params: {
          customerId: customerId.toString(),
          contractId: contractId.toString()
        },
        body: { name: 'Updated Name' }
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      await updateContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer not found' });
    });

    /**
     * Test: should return 404 when contract not found
     * 
     * Objective: Verify that 404 is returned when contract doesn't exist.
     */
    it('should return 404 when contract not found', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const contractId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });

      const req = createMockRequest({
        params: {
          customerId: customerId.toString(),
          contractId: contractId.toString()
        },
        body: { name: 'Updated Name' },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);
      (Contract.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      await updateContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Contract not found' });
    });
  });

  describe('deleteContract', () => {
    /**
     * Test: should delete contract when not in use
     * 
     * Objective: Verify that a contract can be deleted when no projects use it.
     */
    it('should delete contract when not in use', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const contractId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });
      const mockContract = createMockContract({ _id: contractId, customerId, userId });

      const req = createMockRequest({
        params: {
          customerId: customerId.toString(),
          contractId: contractId.toString()
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);
      (Contract.findOne as jest.Mock).mockResolvedValue(mockContract);
      (Project.countDocuments as jest.Mock).mockResolvedValue(0);
      (Contract.findByIdAndDelete as jest.Mock).mockResolvedValue(mockContract);

      // Act
      await deleteContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(Contract.findByIdAndDelete).toHaveBeenCalledWith(contractId.toString());
      expect(res.status).toHaveBeenCalledWith(200);
    });

    /**
     * Test: should return success message
     * 
     * Objective: Verify that a success message is returned after deletion.
     */
    it('should return success message', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const contractId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });
      const mockContract = createMockContract({ _id: contractId, customerId, userId });

      const req = createMockRequest({
        params: {
          customerId: customerId.toString(),
          contractId: contractId.toString()
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);
      (Contract.findOne as jest.Mock).mockResolvedValue(mockContract);
      (Project.countDocuments as jest.Mock).mockResolvedValue(0);
      (Contract.findByIdAndDelete as jest.Mock).mockResolvedValue(mockContract);

      // Act
      await deleteContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.json).toHaveBeenCalledWith({ message: 'Contract deleted successfully' });
    });

    /**
     * Test: should return 400 for invalid customer ID format
     * 
     * Objective: Verify that invalid customer ObjectId format is rejected.
     */
    it('should return 400 for invalid customer ID format', async () => {
      // Arrange
      const req = createMockRequest({
        params: {
          customerId: 'invalid-id',
          contractId: createObjectId().toString()
        }
      });
      const res = createMockResponse();

      // Act
      await deleteContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid customer ID' });
    });

    /**
     * Test: should return 400 for invalid contract ID format
     * 
     * Objective: Verify that invalid contract ObjectId format is rejected.
     */
    it('should return 400 for invalid contract ID format', async () => {
      // Arrange
      const req = createMockRequest({
        params: {
          customerId: createObjectId().toString(),
          contractId: 'invalid-id'
        }
      });
      const res = createMockResponse();

      // Act
      await deleteContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid contract ID' });
    });

    /**
     * Test: should return 404 when customer not found
     * 
     * Objective: Verify that 404 is returned when customer doesn't exist.
     */
    it('should return 404 when customer not found', async () => {
      // Arrange
      const customerId = createObjectId();
      const contractId = createObjectId();
      const req = createMockRequest({
        params: {
          customerId: customerId.toString(),
          contractId: contractId.toString()
        }
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      await deleteContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer not found' });
    });

    /**
     * Test: should return 404 when contract not found
     * 
     * Objective: Verify that 404 is returned when contract doesn't exist.
     */
    it('should return 404 when contract not found', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const contractId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });

      const req = createMockRequest({
        params: {
          customerId: customerId.toString(),
          contractId: contractId.toString()
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);
      (Contract.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      await deleteContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Contract not found' });
    });

    /**
     * Test: should return 400 when contract is used by projects
     * 
     * Objective: Verify that deletion is prevented when projects use the contract.
     */
    it('should return 400 when contract is used by projects', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const contractId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });
      const mockContract = createMockContract({ _id: contractId, customerId, userId });

      const req = createMockRequest({
        params: {
          customerId: customerId.toString(),
          contractId: contractId.toString()
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);
      (Contract.findOne as jest.Mock).mockResolvedValue(mockContract);
      (Project.countDocuments as jest.Mock).mockResolvedValue(3);

      // Act
      await deleteContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(Contract.findByIdAndDelete).not.toHaveBeenCalled();
    });

    /**
     * Test: should include project count in error message
     * 
     * Objective: Verify that the error message includes the number of projects using the contract.
     */
    it('should include project count in error message', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const contractId = createObjectId();
      const mockCustomer = createMockCustomer({ _id: customerId, userId });
      const mockContract = createMockContract({ _id: contractId, customerId, userId });

      const req = createMockRequest({
        params: {
          customerId: customerId.toString(),
          contractId: contractId.toString()
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);
      (Contract.findOne as jest.Mock).mockResolvedValue(mockContract);
      (Project.countDocuments as jest.Mock).mockResolvedValue(5);

      // Act
      await deleteContract(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        message: 'Cannot delete contract: 5 project(s) are using this contract'
      });
    });
  });
});
