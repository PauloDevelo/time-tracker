import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Contract, IContract } from './Contract';

/**
 * Unit tests for the Contract Mongoose model.
 * 
 * These tests verify:
 * - Schema validation for required fields
 * - Field constraints (min values, defaults, trim)
 * - Pre-validate hook for date validation (endDate > startDate)
 * - Valid contract creation with all fields
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
  await Contract.deleteMany({});
});

/**
 * Helper to create valid contract data with optional overrides.
 * Provides sensible defaults for all required fields.
 */
const createValidContractData = (overrides: Partial<IContract> = {}): Partial<IContract> => ({
  customerId: new mongoose.Types.ObjectId(),
  userId: new mongoose.Types.ObjectId(),
  name: 'Test Contract 2025',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  dailyRate: 500,
  currency: 'EUR',
  daysToCompletion: 220,
  ...overrides
});

describe('Contract Model', () => {
  describe('Schema Validation - Required Fields', () => {
    /**
     * Test: should require customerId
     * 
     * Objective: Verify that customerId is a required field and
     * validation fails when it's missing.
     */
    it('should require customerId', async () => {
      // Arrange
      const contractData = createValidContractData();
      delete (contractData as any).customerId;
      const contract = new Contract(contractData);

      // Act & Assert
      await expect(contract.validate()).rejects.toThrow(/customerId.*required/i);
    });

    /**
     * Test: should require name
     * 
     * Objective: Verify that name is a required field and
     * validation fails when it's missing.
     */
    it('should require name', async () => {
      // Arrange
      const contractData = createValidContractData();
      delete (contractData as any).name;
      const contract = new Contract(contractData);

      // Act & Assert
      await expect(contract.validate()).rejects.toThrow(/name.*required/i);
    });

    /**
     * Test: should require startDate
     * 
     * Objective: Verify that startDate is a required field and
     * validation fails when it's missing.
     */
    it('should require startDate', async () => {
      // Arrange
      const contractData = createValidContractData();
      delete (contractData as any).startDate;
      const contract = new Contract(contractData);

      // Act & Assert
      await expect(contract.validate()).rejects.toThrow(/startDate.*required/i);
    });

    /**
     * Test: should require endDate
     * 
     * Objective: Verify that endDate is a required field and
     * validation fails when it's missing.
     */
    it('should require endDate', async () => {
      // Arrange
      const contractData = createValidContractData();
      delete (contractData as any).endDate;
      const contract = new Contract(contractData);

      // Act & Assert
      await expect(contract.validate()).rejects.toThrow(/endDate.*required/i);
    });

    /**
     * Test: should require dailyRate
     * 
     * Objective: Verify that dailyRate is a required field and
     * validation fails when it's missing.
     */
    it('should require dailyRate', async () => {
      // Arrange
      const contractData = createValidContractData();
      delete (contractData as any).dailyRate;
      const contract = new Contract(contractData);

      // Act & Assert
      await expect(contract.validate()).rejects.toThrow(/dailyRate.*required/i);
    });

    /**
     * Test: should require daysToCompletion
     * 
     * Objective: Verify that daysToCompletion is a required field and
     * validation fails when it's missing.
     */
    it('should require daysToCompletion', async () => {
      // Arrange
      const contractData = createValidContractData();
      delete (contractData as any).daysToCompletion;
      const contract = new Contract(contractData);

      // Act & Assert
      await expect(contract.validate()).rejects.toThrow(/daysToCompletion.*required/i);
    });

    /**
     * Test: should require userId
     * 
     * Objective: Verify that userId is a required field and
     * validation fails when it's missing.
     */
    it('should require userId', async () => {
      // Arrange
      const contractData = createValidContractData();
      delete (contractData as any).userId;
      const contract = new Contract(contractData);

      // Act & Assert
      await expect(contract.validate()).rejects.toThrow(/userId.*required/i);
    });

    /**
     * Test: should not require description (optional)
     * 
     * Objective: Verify that description is optional and
     * validation passes when it's missing.
     */
    it('should not require description (optional)', async () => {
      // Arrange
      const contractData = createValidContractData();
      delete (contractData as any).description;
      const contract = new Contract(contractData);

      // Act & Assert
      await expect(contract.validate()).resolves.toBeUndefined();
    });
  });

  describe('Schema Validation - Field Constraints', () => {
    /**
     * Test: should reject negative dailyRate
     * 
     * Objective: Verify that dailyRate has a minimum value of 0
     * and negative values are rejected.
     */
    it('should reject negative dailyRate', async () => {
      // Arrange
      const contractData = createValidContractData({ dailyRate: -100 });
      const contract = new Contract(contractData);

      // Act & Assert
      await expect(contract.validate()).rejects.toThrow(/dailyRate.*minimum/i);
    });

    /**
     * Test: should accept dailyRate of 0
     * 
     * Objective: Verify that dailyRate of 0 is valid (for pro-bono projects).
     */
    it('should accept dailyRate of 0', async () => {
      // Arrange
      const contractData = createValidContractData({ dailyRate: 0 });
      const contract = new Contract(contractData);

      // Act & Assert
      await expect(contract.validate()).resolves.toBeUndefined();
      expect(contract.dailyRate).toBe(0);
    });

    /**
     * Test: should reject negative daysToCompletion
     * 
     * Objective: Verify that daysToCompletion has a minimum value of 0
     * and negative values are rejected.
     */
    it('should reject negative daysToCompletion', async () => {
      // Arrange
      const contractData = createValidContractData({ daysToCompletion: -10 });
      const contract = new Contract(contractData);

      // Act & Assert
      await expect(contract.validate()).rejects.toThrow(/daysToCompletion.*minimum/i);
    });

    /**
     * Test: should accept daysToCompletion of 0
     * 
     * Objective: Verify that daysToCompletion of 0 is valid.
     */
    it('should accept daysToCompletion of 0', async () => {
      // Arrange
      const contractData = createValidContractData({ daysToCompletion: 0 });
      const contract = new Contract(contractData);

      // Act & Assert
      await expect(contract.validate()).resolves.toBeUndefined();
      expect(contract.daysToCompletion).toBe(0);
    });

    /**
     * Test: should default currency to EUR
     * 
     * Objective: Verify that currency defaults to 'EUR' when not provided.
     */
    it('should default currency to EUR', async () => {
      // Arrange
      const contractData = createValidContractData();
      delete (contractData as any).currency;
      const contract = new Contract(contractData);

      // Act
      await contract.validate();

      // Assert
      expect(contract.currency).toBe('EUR');
    });

    /**
     * Test: should trim name field
     * 
     * Objective: Verify that the name field is trimmed of leading/trailing whitespace.
     */
    it('should trim name field', async () => {
      // Arrange
      const contractData = createValidContractData({ name: '  Test Contract  ' });
      const contract = new Contract(contractData);

      // Act
      await contract.validate();

      // Assert
      expect(contract.name).toBe('Test Contract');
    });

    /**
     * Test: should trim description field
     * 
     * Objective: Verify that the description field is trimmed of leading/trailing whitespace.
     */
    it('should trim description field', async () => {
      // Arrange
      const contractData = createValidContractData({ description: '  Some description  ' });
      const contract = new Contract(contractData);

      // Act
      await contract.validate();

      // Assert
      expect(contract.description).toBe('Some description');
    });
  });

  describe('Date Validation (pre-validate hook)', () => {
    /**
     * Test: should reject when endDate equals startDate
     * 
     * Objective: Verify that the pre-validate hook rejects contracts
     * where endDate equals startDate.
     */
    it('should reject when endDate equals startDate', async () => {
      // Arrange
      const sameDate = new Date('2025-06-15');
      const contractData = createValidContractData({
        startDate: sameDate,
        endDate: sameDate
      });
      const contract = new Contract(contractData);

      // Act & Assert
      await expect(contract.validate()).rejects.toThrow(/endDate must be after startDate/i);
    });

    /**
     * Test: should reject when endDate is before startDate
     * 
     * Objective: Verify that the pre-validate hook rejects contracts
     * where endDate is before startDate.
     */
    it('should reject when endDate is before startDate', async () => {
      // Arrange
      const contractData = createValidContractData({
        startDate: new Date('2025-12-31'),
        endDate: new Date('2025-01-01')
      });
      const contract = new Contract(contractData);

      // Act & Assert
      await expect(contract.validate()).rejects.toThrow(/endDate must be after startDate/i);
    });

    /**
     * Test: should accept when endDate is after startDate
     * 
     * Objective: Verify that the pre-validate hook accepts contracts
     * where endDate is after startDate.
     */
    it('should accept when endDate is after startDate', async () => {
      // Arrange
      const contractData = createValidContractData({
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31')
      });
      const contract = new Contract(contractData);

      // Act & Assert
      await expect(contract.validate()).resolves.toBeUndefined();
    });

    /**
     * Test: should accept dates spanning multiple years
     * 
     * Objective: Verify that contracts spanning multiple years are valid.
     */
    it('should accept dates spanning multiple years', async () => {
      // Arrange
      const contractData = createValidContractData({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2027-12-31')
      });
      const contract = new Contract(contractData);

      // Act & Assert
      await expect(contract.validate()).resolves.toBeUndefined();
    });

    /**
     * Test: should accept dates one day apart
     * 
     * Objective: Verify that contracts with endDate one day after startDate are valid.
     */
    it('should accept dates one day apart', async () => {
      // Arrange
      const contractData = createValidContractData({
        startDate: new Date('2025-06-15'),
        endDate: new Date('2025-06-16')
      });
      const contract = new Contract(contractData);

      // Act & Assert
      await expect(contract.validate()).resolves.toBeUndefined();
    });
  });

  describe('Valid Contract Creation', () => {
    /**
     * Test: should create a contract with all required fields
     * 
     * Objective: Verify that a contract can be created and saved
     * with all required fields.
     */
    it('should create a contract with all required fields', async () => {
      // Arrange
      const contractData = createValidContractData();
      const contract = new Contract(contractData);

      // Act
      const savedContract = await contract.save();

      // Assert
      expect(savedContract._id).toBeDefined();
      expect(savedContract.customerId).toEqual(contractData.customerId);
      expect(savedContract.userId).toEqual(contractData.userId);
      expect(savedContract.name).toBe(contractData.name);
      expect(savedContract.startDate).toEqual(contractData.startDate);
      expect(savedContract.endDate).toEqual(contractData.endDate);
      expect(savedContract.dailyRate).toBe(contractData.dailyRate);
      expect(savedContract.currency).toBe(contractData.currency);
      expect(savedContract.daysToCompletion).toBe(contractData.daysToCompletion);
    });

    /**
     * Test: should create a contract with optional description
     * 
     * Objective: Verify that a contract can be created with the optional
     * description field.
     */
    it('should create a contract with optional description', async () => {
      // Arrange
      const contractData = createValidContractData({
        description: 'This is a test contract description'
      });
      const contract = new Contract(contractData);

      // Act
      const savedContract = await contract.save();

      // Assert
      expect(savedContract.description).toBe('This is a test contract description');
    });

    /**
     * Test: should set timestamps automatically
     * 
     * Objective: Verify that createdAt and updatedAt timestamps are
     * automatically set when a contract is created.
     */
    it('should set timestamps automatically', async () => {
      // Arrange
      const contractData = createValidContractData();
      const contract = new Contract(contractData);
      const beforeSave = new Date();

      // Act
      const savedContract = await contract.save();
      const afterSave = new Date();

      // Assert
      expect(savedContract.createdAt).toBeDefined();
      expect(savedContract.updatedAt).toBeDefined();
      expect(savedContract.createdAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
      expect(savedContract.createdAt.getTime()).toBeLessThanOrEqual(afterSave.getTime());
      expect(savedContract.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
      expect(savedContract.updatedAt.getTime()).toBeLessThanOrEqual(afterSave.getTime());
    });

    /**
     * Test: should generate _id automatically
     * 
     * Objective: Verify that _id is automatically generated when
     * a contract is created.
     */
    it('should generate _id automatically', async () => {
      // Arrange
      const contractData = createValidContractData();
      const contract = new Contract(contractData);

      // Act
      const savedContract = await contract.save();

      // Assert
      expect(savedContract._id).toBeDefined();
      expect(mongoose.Types.ObjectId.isValid(savedContract._id)).toBe(true);
    });
  });
});
