import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Project, IProject } from './Project';
import { Contract } from './Contract';
import { Customer } from './Customer';

/**
 * Unit tests for the Project Mongoose model.
 * 
 * These tests verify:
 * - ContractId field acceptance (optional field)
 * - Contract-customer validation in pre-validate hook
 * - Combined Azure DevOps and contract validation
 */

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Project.deleteMany({});
  await Contract.deleteMany({});
  await Customer.deleteMany({});
});

/**
 * Helper to create a test customer with required fields.
 */
const createTestCustomer = async (userId: mongoose.Types.ObjectId) => {
  const customer = new Customer({
    name: 'Test Customer',
    contactInfo: { email: 'test@example.com' },
    billingDetails: { dailyRate: 400, currency: 'EUR' },
    userId
  });
  return customer.save();
};

/**
 * Helper to create a test contract with required fields.
 */
const createTestContract = async (customerId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId) => {
  const contract = new Contract({
    customerId,
    userId,
    name: 'Test Contract',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    dailyRate: 500,
    currency: 'EUR',
    daysToCompletion: 220
  });
  return contract.save();
};

/**
 * Helper to create valid project data with optional overrides.
 */
const createValidProjectData = (
  customerId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId,
  overrides: Partial<IProject> = {}
): Partial<IProject> => ({
  name: 'Test Project',
  description: 'Test Description',
  customerId,
  userId,
  ...overrides
});

describe('Project Model', () => {
  describe('ContractId Field Tests', () => {
    /**
     * Test: should accept project without contractId (optional field)
     * 
     * Objective: Verify that contractId is optional and projects
     * can be created without it.
     */
    it('should accept project without contractId (optional field)', async () => {
      // Arrange
      const userId = new mongoose.Types.ObjectId();
      const customer = await createTestCustomer(userId);
      const projectData = createValidProjectData(customer._id as mongoose.Types.ObjectId, userId);

      // Act
      const project = new Project(projectData);
      const savedProject = await project.save();

      // Assert
      expect(savedProject._id).toBeDefined();
      expect(savedProject.contractId).toBeUndefined();
    });

    /**
     * Test: should accept project with valid contractId
     * 
     * Objective: Verify that a project can be created with a valid
     * contractId that belongs to the same customer.
     */
    it('should accept project with valid contractId', async () => {
      // Arrange
      const userId = new mongoose.Types.ObjectId();
      const customer = await createTestCustomer(userId);
      const contract = await createTestContract(customer._id as mongoose.Types.ObjectId, userId);
      const projectData = createValidProjectData(
        customer._id as mongoose.Types.ObjectId,
        userId,
        { contractId: contract._id as mongoose.Types.ObjectId }
      );

      // Act
      const project = new Project(projectData);
      const savedProject = await project.save();

      // Assert
      expect(savedProject._id).toBeDefined();
      expect(savedProject.contractId).toEqual(contract._id);
    });

    /**
     * Test: should store contractId as ObjectId reference
     * 
     * Objective: Verify that contractId is stored as a valid ObjectId.
     */
    it('should store contractId as ObjectId reference', async () => {
      // Arrange
      const userId = new mongoose.Types.ObjectId();
      const customer = await createTestCustomer(userId);
      const contract = await createTestContract(customer._id as mongoose.Types.ObjectId, userId);
      const projectData = createValidProjectData(
        customer._id as mongoose.Types.ObjectId,
        userId,
        { contractId: contract._id as mongoose.Types.ObjectId }
      );

      // Act
      const project = new Project(projectData);
      const savedProject = await project.save();

      // Assert
      expect(mongoose.Types.ObjectId.isValid(savedProject.contractId!)).toBe(true);
      expect(savedProject.contractId!.toString()).toBe(contract._id.toString());
    });
  });

  describe('Contract-Customer Validation Hook Tests - Valid Cases', () => {
    /**
     * Test: should accept when contract belongs to same customer
     * 
     * Objective: Verify that the pre-validate hook accepts projects
     * where the contract belongs to the same customer.
     */
    it('should accept when contract belongs to same customer', async () => {
      // Arrange
      const userId = new mongoose.Types.ObjectId();
      const customer = await createTestCustomer(userId);
      const contract = await createTestContract(customer._id as mongoose.Types.ObjectId, userId);
      const projectData = createValidProjectData(
        customer._id as mongoose.Types.ObjectId,
        userId,
        { contractId: contract._id as mongoose.Types.ObjectId }
      );

      // Act
      const project = new Project(projectData);

      // Assert
      await expect(project.validate()).resolves.toBeUndefined();
    });

    /**
     * Test: should accept when contractId is not set
     * 
     * Objective: Verify that the pre-validate hook accepts projects
     * without a contractId.
     */
    it('should accept when contractId is not set', async () => {
      // Arrange
      const userId = new mongoose.Types.ObjectId();
      const customer = await createTestCustomer(userId);
      const projectData = createValidProjectData(customer._id as mongoose.Types.ObjectId, userId);

      // Act
      const project = new Project(projectData);

      // Assert
      await expect(project.validate()).resolves.toBeUndefined();
    });

    /**
     * Test: should accept when contractId is null
     * 
     * Objective: Verify that the pre-validate hook accepts projects
     * with null contractId.
     */
    it('should accept when contractId is null', async () => {
      // Arrange
      const userId = new mongoose.Types.ObjectId();
      const customer = await createTestCustomer(userId);
      const projectData = createValidProjectData(
        customer._id as mongoose.Types.ObjectId,
        userId,
        { contractId: null as any }
      );

      // Act
      const project = new Project(projectData);

      // Assert
      await expect(project.validate()).resolves.toBeUndefined();
    });
  });

  describe('Contract-Customer Validation Hook Tests - Invalid Cases', () => {
    /**
     * Test: should reject when contract does not exist
     * 
     * Objective: Verify that the pre-validate hook rejects projects
     * with a contractId that doesn't exist in the database.
     */
    it('should reject when contract does not exist', async () => {
      // Arrange
      const userId = new mongoose.Types.ObjectId();
      const customer = await createTestCustomer(userId);
      const nonExistentContractId = new mongoose.Types.ObjectId();
      const projectData = createValidProjectData(
        customer._id as mongoose.Types.ObjectId,
        userId,
        { contractId: nonExistentContractId }
      );

      // Act
      const project = new Project(projectData);

      // Assert
      await expect(project.validate()).rejects.toThrow('Contract not found');
    });

    /**
     * Test: should reject when contract belongs to different customer
     * 
     * Objective: Verify that the pre-validate hook rejects projects
     * where the contract belongs to a different customer.
     */
    it('should reject when contract belongs to different customer', async () => {
      // Arrange
      const userId = new mongoose.Types.ObjectId();
      const customer1 = await createTestCustomer(userId);
      const customer2 = await createTestCustomer(userId);
      // Create contract for customer2
      const contract = await createTestContract(customer2._id as mongoose.Types.ObjectId, userId);
      // Try to create project for customer1 with contract from customer2
      const projectData = createValidProjectData(
        customer1._id as mongoose.Types.ObjectId,
        userId,
        { contractId: contract._id as mongoose.Types.ObjectId }
      );

      // Act
      const project = new Project(projectData);

      // Assert
      await expect(project.validate()).rejects.toThrow('Contract must belong to the same customer as the project');
    });
  });

  describe('Combined Validation Tests', () => {
    /**
     * Test: should validate both Azure DevOps and contract in same hook
     * 
     * Objective: Verify that both Azure DevOps and contract validations
     * work together in the pre-validate hook.
     */
    it('should validate both Azure DevOps and contract in same hook', async () => {
      // Arrange
      const userId = new mongoose.Types.ObjectId();
      const customer = await createTestCustomer(userId);
      const contract = await createTestContract(customer._id as mongoose.Types.ObjectId, userId);
      const projectData = createValidProjectData(
        customer._id as mongoose.Types.ObjectId,
        userId,
        {
          contractId: contract._id as mongoose.Types.ObjectId,
          azureDevOps: {
            enabled: true,
            projectName: 'TestProject',
            projectId: '12345678-1234-1234-1234-123456789012'
          }
        }
      );

      // Act
      const project = new Project(projectData);

      // Assert
      await expect(project.validate()).resolves.toBeUndefined();
    });

    /**
     * Test: should fail fast on first validation error (Azure DevOps)
     * 
     * Objective: Verify that the pre-validate hook fails on the first
     * validation error encountered (Azure DevOps validation runs first).
     */
    it('should fail fast on first validation error (Azure DevOps)', async () => {
      // Arrange
      const userId = new mongoose.Types.ObjectId();
      const customer = await createTestCustomer(userId);
      const nonExistentContractId = new mongoose.Types.ObjectId();
      const projectData = createValidProjectData(
        customer._id as mongoose.Types.ObjectId,
        userId,
        {
          contractId: nonExistentContractId,
          azureDevOps: {
            enabled: true,
            projectName: '', // Missing projectName - should fail first
            projectId: ''
          }
        }
      );

      // Act
      const project = new Project(projectData);

      // Assert - Azure DevOps validation runs first, so it should fail on projectName
      await expect(project.validate()).rejects.toThrow('Azure DevOps projectName is required when enabled is true');
    });

    /**
     * Test: should fail on contract validation after Azure DevOps passes
     * 
     * Objective: Verify that contract validation runs after Azure DevOps
     * validation passes.
     */
    it('should fail on contract validation after Azure DevOps passes', async () => {
      // Arrange
      const userId = new mongoose.Types.ObjectId();
      const customer = await createTestCustomer(userId);
      const nonExistentContractId = new mongoose.Types.ObjectId();
      const projectData = createValidProjectData(
        customer._id as mongoose.Types.ObjectId,
        userId,
        {
          contractId: nonExistentContractId
          // No azureDevOps config, so Azure DevOps validation passes
        }
      );

      // Act
      const project = new Project(projectData);

      // Assert - Contract validation should fail
      await expect(project.validate()).rejects.toThrow('Contract not found');
    });

    /**
     * Test: should pass all validations with valid Azure DevOps and contract
     * 
     * Objective: Verify that a project with valid Azure DevOps config
     * and valid contract passes all validations.
     */
    it('should pass all validations with valid Azure DevOps and contract', async () => {
      // Arrange
      const userId = new mongoose.Types.ObjectId();
      const customer = await createTestCustomer(userId);
      const contract = await createTestContract(customer._id as mongoose.Types.ObjectId, userId);
      const projectData = createValidProjectData(
        customer._id as mongoose.Types.ObjectId,
        userId,
        {
          contractId: contract._id as mongoose.Types.ObjectId,
          azureDevOps: {
            enabled: true,
            projectName: 'ValidProject',
            projectId: 'abcdef12-3456-7890-abcd-ef1234567890'
          }
        }
      );

      // Act
      const project = new Project(projectData);
      const savedProject = await project.save();

      // Assert
      expect(savedProject._id).toBeDefined();
      expect(savedProject.contractId).toEqual(contract._id);
      expect(savedProject.azureDevOps?.enabled).toBe(true);
      expect(savedProject.azureDevOps?.projectName).toBe('ValidProject');
    });
  });

  describe('Error Message Verification', () => {
    /**
     * Test: should return correct error message for non-existent contract
     * 
     * Objective: Verify the exact error message when contract is not found.
     */
    it('should return correct error message for non-existent contract', async () => {
      // Arrange
      const userId = new mongoose.Types.ObjectId();
      const customer = await createTestCustomer(userId);
      const projectData = createValidProjectData(
        customer._id as mongoose.Types.ObjectId,
        userId,
        { contractId: new mongoose.Types.ObjectId() }
      );

      // Act
      const project = new Project(projectData);

      // Assert
      try {
        await project.validate();
        fail('Expected validation to throw');
      } catch (error: any) {
        expect(error.message).toBe('Contract not found');
      }
    });

    /**
     * Test: should return correct error message for mismatched customer
     * 
     * Objective: Verify the exact error message when contract belongs
     * to a different customer.
     */
    it('should return correct error message for mismatched customer', async () => {
      // Arrange
      const userId = new mongoose.Types.ObjectId();
      const customer1 = await createTestCustomer(userId);
      const customer2 = await createTestCustomer(userId);
      const contract = await createTestContract(customer2._id as mongoose.Types.ObjectId, userId);
      const projectData = createValidProjectData(
        customer1._id as mongoose.Types.ObjectId,
        userId,
        { contractId: contract._id as mongoose.Types.ObjectId }
      );

      // Act
      const project = new Project(projectData);

      // Assert
      try {
        await project.validate();
        fail('Expected validation to throw');
      } catch (error: any) {
        expect(error.message).toBe('Contract must belong to the same customer as the project');
      }
    });
  });
});
