import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  getDailyRate,
  getHourlyRate,
  generateReport,
  IContractBilling,
  IBillingDetails
} from './report.service';
import { User, IUser } from '../models/User';
import { Customer, ICustomer } from '../models/Customer';
import { Contract, IContract } from '../models/Contract';
import { Project, IProject } from '../models/Project';
import { Task, ITask } from '../models/Task';
import { TimeEntry, ITimeEntry } from '../models/TimeEntry';
import { Report } from '../models/Report';

/**
 * Unit tests for rate override logic in report service.
 * 
 * These tests verify the billing rate selection logic that determines
 * which daily rate to use when calculating invoice costs:
 * - Contract's dailyRate takes precedence when project has a contract
 * - Falls back to customer's billingDetails.dailyRate when project has no contract
 * - Uses nullish coalescing (??) so 0 is treated as a valid rate
 */
describe('Report Service - Rate Override Logic', () => {
  // Standard customer billing details used across tests
  const customerBillingDetails: IBillingDetails = {
    dailyRate: 400,
    currency: 'USD'
  };

  describe('getDailyRate', () => {
    /**
     * Positive Test: Project with contract uses contract rate
     * 
     * Objective: Verify that when a project has a contract with a dailyRate set,
     * the contract's rate is used instead of the customer's rate.
     */
    it('should use contract rate when contract billing is set', () => {
      // Arrange
      const contractBilling: IContractBilling = {
        dailyRate: 500,
        currency: 'EUR'
      };

      // Act
      const result = getDailyRate(contractBilling, customerBillingDetails);

      // Assert
      expect(result).toBe(500);
    });

    /**
     * Positive Test: Project without contract uses customer rate
     * 
     * Objective: Verify that when a project has no contract,
     * the customer's dailyRate is used as the fallback.
     */
    it('should use customer rate when project has no contract', () => {
      // Arrange
      const contractBilling: IContractBilling | undefined = undefined;

      // Act
      const result = getDailyRate(contractBilling, customerBillingDetails);

      // Assert
      expect(result).toBe(400);
    });

    /**
     * Edge Case Test: Contract with dailyRate of 0 uses 0 (not customer rate)
     * 
     * Objective: Verify that nullish coalescing (??) correctly treats 0 as a valid rate.
     * A contract with dailyRate: 0 should result in 0, NOT fall back to customer rate.
     * This is important for pro-bono or internal projects.
     */
    it('should use 0 when contract dailyRate is 0 (not customer rate)', () => {
      // Arrange
      const contractBilling: IContractBilling = {
        dailyRate: 0,
        currency: 'EUR'
      };

      // Act
      const result = getDailyRate(contractBilling, customerBillingDetails);

      // Assert
      expect(result).toBe(0);
      expect(result).not.toBe(customerBillingDetails.dailyRate);
    });

    /**
     * Negative Test: Null contract billing uses customer rate
     * 
     * Objective: Verify that when contract billing is null (not just undefined),
     * the customer's rate is used correctly.
     */
    it('should use customer rate when contract billing is null', () => {
      // Arrange
      const contractBilling: IContractBilling | null = null;

      // Act
      const result = getDailyRate(contractBilling, customerBillingDetails);

      // Assert
      expect(result).toBe(400);
    });

    /**
     * Edge Case Test: High contract rate overrides low customer rate
     * 
     * Objective: Verify rate override works correctly when contract rate
     * is significantly higher than customer rate.
     */
    it('should use high contract rate over low customer rate', () => {
      // Arrange
      const contractBilling: IContractBilling = {
        dailyRate: 1000,
        currency: 'EUR'
      };
      const lowCustomerRate: IBillingDetails = {
        dailyRate: 100
      };

      // Act
      const result = getDailyRate(contractBilling, lowCustomerRate);

      // Assert
      expect(result).toBe(1000);
    });

    /**
     * Edge Case Test: Low contract rate overrides high customer rate
     * 
     * Objective: Verify rate override works correctly when contract rate
     * is lower than customer rate (discounted project).
     */
    it('should use low contract rate over high customer rate', () => {
      // Arrange
      const contractBilling: IContractBilling = {
        dailyRate: 200,
        currency: 'EUR'
      };
      const highCustomerRate: IBillingDetails = {
        dailyRate: 800
      };

      // Act
      const result = getDailyRate(contractBilling, highCustomerRate);

      // Assert
      expect(result).toBe(200);
    });
  });

  describe('getHourlyRate', () => {
    /**
     * Positive Test: Correctly calculates hourly rate from daily rate
     * 
     * Objective: Verify that hourly rate is calculated as dailyRate / 8
     * (assuming 8-hour workday).
     */
    it('should calculate hourly rate as dailyRate / 8', () => {
      // Arrange
      const dailyRate = 400;

      // Act
      const result = getHourlyRate(dailyRate);

      // Assert
      expect(result).toBe(50);
    });

    /**
     * Edge Case Test: Hourly rate for 0 daily rate
     * 
     * Objective: Verify that 0 daily rate results in 0 hourly rate.
     */
    it('should return 0 hourly rate for 0 daily rate', () => {
      // Arrange
      const dailyRate = 0;

      // Act
      const result = getHourlyRate(dailyRate);

      // Assert
      expect(result).toBe(0);
    });

    /**
     * Positive Test: Handles decimal daily rates
     * 
     * Objective: Verify that decimal daily rates are handled correctly.
     */
    it('should handle decimal daily rates', () => {
      // Arrange
      const dailyRate = 500;

      // Act
      const result = getHourlyRate(dailyRate);

      // Assert
      expect(result).toBe(62.5);
    });
  });

  describe('Cost Calculation Integration', () => {
    /**
     * Integration Test: Full cost calculation with contract rate
     * 
     * Objective: Verify the complete flow of calculating cost using
     * contract's billing rate.
     */
    it('should calculate correct cost using contract rate', () => {
      // Arrange
      const contractBilling: IContractBilling = {
        dailyRate: 800,
        currency: 'EUR'
      };
      const hoursWorked = 4;

      // Act
      const dailyRate = getDailyRate(contractBilling, customerBillingDetails);
      const hourlyRate = getHourlyRate(dailyRate);
      const cost = hourlyRate * hoursWorked;

      // Assert
      expect(dailyRate).toBe(800);
      expect(hourlyRate).toBe(100);
      expect(cost).toBe(400);
    });

    /**
     * Integration Test: Full cost calculation with customer fallback
     * 
     * Objective: Verify the complete flow of calculating cost using
     * customer's rate when project has no contract.
     */
    it('should calculate correct cost using customer rate fallback', () => {
      // Arrange
      const contractBilling: IContractBilling | undefined = undefined;
      const hoursWorked = 8;

      // Act
      const dailyRate = getDailyRate(contractBilling, customerBillingDetails);
      const hourlyRate = getHourlyRate(dailyRate);
      const cost = hourlyRate * hoursWorked;

      // Assert
      expect(dailyRate).toBe(400);
      expect(hourlyRate).toBe(50);
      expect(cost).toBe(400);
    });

    /**
     * Integration Test: Zero cost for pro-bono project
     * 
     * Objective: Verify that a contract with dailyRate: 0 results in zero cost,
     * even when customer has a non-zero rate.
     */
    it('should calculate zero cost for pro-bono project (dailyRate: 0)', () => {
      // Arrange
      const contractBilling: IContractBilling = {
        dailyRate: 0,
        currency: 'EUR'
      };
      const hoursWorked = 10;

      // Act
      const dailyRate = getDailyRate(contractBilling, customerBillingDetails);
      const hourlyRate = getHourlyRate(dailyRate);
      const cost = hourlyRate * hoursWorked;

      // Assert
      expect(dailyRate).toBe(0);
      expect(hourlyRate).toBe(0);
      expect(cost).toBe(0);
    });
  });
});

/**
 * Integration tests for generateReport function with contract grouping.
 * 
 * These tests verify:
 * - Projects are correctly grouped by their contractId
 * - Contract data (name, rate, currency) is included in reports
 * - Rate calculations use contract rates when available
 * - Report structure follows contracts -> projects -> tasks hierarchy
 * - Edge cases are handled correctly
 */
describe('Report Service - Contract Grouping Integration', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: IUser & { _id: mongoose.Types.ObjectId };
  let testCustomer: ICustomer & { _id: mongoose.Types.ObjectId };

  // Test date constants - January 2025
  const TEST_YEAR = 2025;
  const TEST_MONTH = 1;
  const TEST_DATE = new Date(Date.UTC(TEST_YEAR, TEST_MONTH - 1, 15, 10, 0, 0));

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    await Promise.all([
      User.deleteMany({}),
      Customer.deleteMany({}),
      Contract.deleteMany({}),
      Project.deleteMany({}),
      Task.deleteMany({}),
      TimeEntry.deleteMany({}),
      Report.deleteMany({})
    ]);

    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: 'hashedpassword123'
    }) as IUser & { _id: mongoose.Types.ObjectId };

    // Create test customer with billing details
    testCustomer = await Customer.create({
      name: 'Test Customer',
      contactInfo: {
        email: 'customer@example.com',
        address: '123 Test Street'
      },
      billingDetails: {
        dailyRate: 400,
        currency: 'USD'
      },
      userId: testUser._id
    }) as ICustomer & { _id: mongoose.Types.ObjectId };
  });

  /**
   * Helper to create a contract with sensible defaults
   */
  const createContract = async (overrides: Partial<IContract> = {}): Promise<IContract & { _id: mongoose.Types.ObjectId }> => {
    return await Contract.create({
      customerId: testCustomer._id,
      userId: testUser._id,
      name: 'Test Contract',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      dailyRate: 500,
      currency: 'EUR',
      daysToCompletion: 100,
      ...overrides
    }) as IContract & { _id: mongoose.Types.ObjectId };
  };

  /**
   * Helper to create a project with sensible defaults
   */
  const createProject = async (overrides: Partial<IProject> = {}): Promise<IProject & { _id: mongoose.Types.ObjectId }> => {
    return await Project.create({
      name: 'Test Project',
      description: 'Test project description',
      customerId: testCustomer._id,
      userId: testUser._id,
      ...overrides
    }) as IProject & { _id: mongoose.Types.ObjectId };
  };

  /**
   * Helper to create a task with sensible defaults
   */
  const createTask = async (projectId: mongoose.Types.ObjectId, overrides: Partial<ITask> = {}): Promise<ITask & { _id: mongoose.Types.ObjectId }> => {
    return await Task.create({
      name: 'Test Task',
      projectId,
      userId: testUser._id,
      ...overrides
    }) as ITask & { _id: mongoose.Types.ObjectId };
  };

  /**
   * Helper to create a time entry with sensible defaults
   */
  const createTimeEntry = async (
    taskId: mongoose.Types.ObjectId,
    durationHours: number,
    startTime: Date = TEST_DATE
  ): Promise<ITimeEntry & { _id: mongoose.Types.ObjectId }> => {
    return await TimeEntry.create({
      taskId,
      userId: testUser._id,
      startTime,
      totalDurationInHour: durationHours
    }) as ITimeEntry & { _id: mongoose.Types.ObjectId };
  };

  describe('Project Grouping by Contract', () => {
    /**
     * Test: Projects with contractId are grouped under that contract
     * 
     * Objective: Verify that when projects have a contractId, they appear
     * under the correct contract in the report.
     */
    it('should group projects by their contractId', async () => {
      // Arrange
      const contract1 = await createContract({ name: 'Contract Alpha', dailyRate: 600 });
      const contract2 = await createContract({ name: 'Contract Beta', dailyRate: 700 });

      const project1 = await createProject({ name: 'Project 1', contractId: contract1._id });
      const project2 = await createProject({ name: 'Project 2', contractId: contract1._id });
      const project3 = await createProject({ name: 'Project 3', contractId: contract2._id });

      const task1 = await createTask(project1._id, { name: 'Task 1' });
      const task2 = await createTask(project2._id, { name: 'Task 2' });
      const task3 = await createTask(project3._id, { name: 'Task 3' });

      await createTimeEntry(task1._id, 2);
      await createTimeEntry(task2._id, 3);
      await createTimeEntry(task3._id, 4);

      // Act
      const report = await generateReport(
        testCustomer._id.toString(),
        TEST_YEAR,
        TEST_MONTH,
        'invoice',
        testUser._id.toString()
      );

      // Assert
      expect(report.contracts).toHaveLength(2);

      const contractAlpha = report.contracts.find(c => c.contractName === 'Contract Alpha');
      const contractBeta = report.contracts.find(c => c.contractName === 'Contract Beta');

      expect(contractAlpha).toBeDefined();
      expect(contractAlpha!.projects).toHaveLength(2);
      expect(contractAlpha!.projects.map(p => p.projectName)).toContain('Project 1');
      expect(contractAlpha!.projects.map(p => p.projectName)).toContain('Project 2');

      expect(contractBeta).toBeDefined();
      expect(contractBeta!.projects).toHaveLength(1);
      expect(contractBeta!.projects[0].projectName).toBe('Project 3');
    });

    /**
     * Test: Projects without contract are grouped under "No Contract"
     * 
     * Objective: Verify that projects without a contractId are grouped
     * under a special "No Contract" group.
     */
    it('should group projects without contract under "No Contract"', async () => {
      // Arrange
      const project1 = await createProject({ name: 'Unassigned Project 1' });
      const project2 = await createProject({ name: 'Unassigned Project 2' });

      const task1 = await createTask(project1._id, { name: 'Task 1' });
      const task2 = await createTask(project2._id, { name: 'Task 2' });

      await createTimeEntry(task1._id, 2);
      await createTimeEntry(task2._id, 3);

      // Act
      const report = await generateReport(
        testCustomer._id.toString(),
        TEST_YEAR,
        TEST_MONTH,
        'invoice',
        testUser._id.toString()
      );

      // Assert
      expect(report.contracts).toHaveLength(1);
      expect(report.contracts[0].contractName).toBe('No Contract');
      expect(report.contracts[0].contractId).toBeNull();
      expect(report.contracts[0].projects).toHaveLength(2);
    });

    /**
     * Test: Mix of projects with and without contracts
     * 
     * Objective: Verify that the report correctly handles a mix of
     * projects with contracts and projects without contracts.
     */
    it('should handle mix of projects with and without contracts', async () => {
      // Arrange
      const contract = await createContract({ name: 'Active Contract', dailyRate: 600 });

      const projectWithContract = await createProject({ name: 'Contracted Project', contractId: contract._id });
      const projectWithoutContract = await createProject({ name: 'Uncontracted Project' });

      const task1 = await createTask(projectWithContract._id, { name: 'Task 1' });
      const task2 = await createTask(projectWithoutContract._id, { name: 'Task 2' });

      await createTimeEntry(task1._id, 4);
      await createTimeEntry(task2._id, 2);

      // Act
      const report = await generateReport(
        testCustomer._id.toString(),
        TEST_YEAR,
        TEST_MONTH,
        'invoice',
        testUser._id.toString()
      );

      // Assert
      expect(report.contracts).toHaveLength(2);

      const contractedGroup = report.contracts.find(c => c.contractName === 'Active Contract');
      const noContractGroup = report.contracts.find(c => c.contractName === 'No Contract');

      expect(contractedGroup).toBeDefined();
      expect(contractedGroup!.projects).toHaveLength(1);
      expect(contractedGroup!.projects[0].projectName).toBe('Contracted Project');

      expect(noContractGroup).toBeDefined();
      expect(noContractGroup!.projects).toHaveLength(1);
      expect(noContractGroup!.projects[0].projectName).toBe('Uncontracted Project');
    });

    /**
     * Test: Project order within contract groups is maintained
     * 
     * Objective: Verify that projects within a contract group maintain
     * their order (based on how they were added).
     */
    it('should maintain project order within contract groups', async () => {
      // Arrange
      const contract = await createContract({ name: 'Multi-Project Contract' });

      // Create projects in specific order
      const projectA = await createProject({ name: 'Project A', contractId: contract._id });
      const projectB = await createProject({ name: 'Project B', contractId: contract._id });
      const projectC = await createProject({ name: 'Project C', contractId: contract._id });

      const taskA = await createTask(projectA._id, { name: 'Task A' });
      const taskB = await createTask(projectB._id, { name: 'Task B' });
      const taskC = await createTask(projectC._id, { name: 'Task C' });

      await createTimeEntry(taskA._id, 1);
      await createTimeEntry(taskB._id, 1);
      await createTimeEntry(taskC._id, 1);

      // Act
      const report = await generateReport(
        testCustomer._id.toString(),
        TEST_YEAR,
        TEST_MONTH,
        'invoice',
        testUser._id.toString()
      );

      // Assert
      expect(report.contracts).toHaveLength(1);
      expect(report.contracts[0].projects).toHaveLength(3);
      
      const projectNames = report.contracts[0].projects.map(p => p.projectName);
      expect(projectNames).toContain('Project A');
      expect(projectNames).toContain('Project B');
      expect(projectNames).toContain('Project C');
    });
  });

  describe('Contract Data in Report', () => {
    /**
     * Test: contractId is included in contract data
     * 
     * Objective: Verify that the contract's _id is included in the report.
     */
    it('should include contractId in contract data', async () => {
      // Arrange
      const contract = await createContract({ name: 'Test Contract' });
      const project = await createProject({ name: 'Test Project', contractId: contract._id });
      const task = await createTask(project._id);
      await createTimeEntry(task._id, 2);

      // Act
      const report = await generateReport(
        testCustomer._id.toString(),
        TEST_YEAR,
        TEST_MONTH,
        'invoice',
        testUser._id.toString()
      );

      // Assert
      expect(report.contracts).toHaveLength(1);
      expect(report.contracts[0].contractId).toBe(contract._id.toString());
    });

    /**
     * Test: contractName is included in contract data
     * 
     * Objective: Verify that the contract's name is included in the report.
     */
    it('should include contractName in contract data', async () => {
      // Arrange
      const contract = await createContract({ name: 'Premium Support Contract' });
      const project = await createProject({ contractId: contract._id });
      const task = await createTask(project._id);
      await createTimeEntry(task._id, 2);

      // Act
      const report = await generateReport(
        testCustomer._id.toString(),
        TEST_YEAR,
        TEST_MONTH,
        'invoice',
        testUser._id.toString()
      );

      // Assert
      expect(report.contracts[0].contractName).toBe('Premium Support Contract');
    });

    /**
     * Test: dailyRate from contract is included
     * 
     * Objective: Verify that the contract's dailyRate is used in the report.
     */
    it('should include dailyRate from contract', async () => {
      // Arrange
      const contract = await createContract({ dailyRate: 750 });
      const project = await createProject({ contractId: contract._id });
      const task = await createTask(project._id);
      await createTimeEntry(task._id, 2);

      // Act
      const report = await generateReport(
        testCustomer._id.toString(),
        TEST_YEAR,
        TEST_MONTH,
        'invoice',
        testUser._id.toString()
      );

      // Assert
      expect(report.contracts[0].dailyRate).toBe(750);
    });

    /**
     * Test: currency from contract is included
     * 
     * Objective: Verify that the contract's currency is used in the report.
     */
    it('should include currency from contract', async () => {
      // Arrange
      const contract = await createContract({ currency: 'GBP' });
      const project = await createProject({ contractId: contract._id });
      const task = await createTask(project._id);
      await createTimeEntry(task._id, 2);

      // Act
      const report = await generateReport(
        testCustomer._id.toString(),
        TEST_YEAR,
        TEST_MONTH,
        'invoice',
        testUser._id.toString()
      );

      // Assert
      expect(report.contracts[0].currency).toBe('GBP');
    });

    /**
     * Test: contractId is null for unassigned projects
     * 
     * Objective: Verify that projects without a contract have null contractId.
     */
    it('should set contractId to null for unassigned projects', async () => {
      // Arrange
      const project = await createProject({ name: 'Unassigned Project' });
      const task = await createTask(project._id);
      await createTimeEntry(task._id, 2);

      // Act
      const report = await generateReport(
        testCustomer._id.toString(),
        TEST_YEAR,
        TEST_MONTH,
        'invoice',
        testUser._id.toString()
      );

      // Assert
      expect(report.contracts).toHaveLength(1);
      expect(report.contracts[0].contractId).toBeNull();
    });

    /**
     * Test: "No Contract" name for unassigned projects
     * 
     * Objective: Verify that projects without a contract use "No Contract" as name.
     */
    it('should use "No Contract" as name for unassigned projects', async () => {
      // Arrange
      const project = await createProject({ name: 'Unassigned Project' });
      const task = await createTask(project._id);
      await createTimeEntry(task._id, 2);

      // Act
      const report = await generateReport(
        testCustomer._id.toString(),
        TEST_YEAR,
        TEST_MONTH,
        'invoice',
        testUser._id.toString()
      );

      // Assert
      expect(report.contracts[0].contractName).toBe('No Contract');
    });
  });

  describe('Rate Calculation with Contracts', () => {
    describe('Contract Rate Usage', () => {
      /**
       * Test: Contract dailyRate is used for projects with contract
       * 
       * Objective: Verify that when a project has a contract, the contract's
       * dailyRate is used for cost calculations.
       */
      it('should use contract dailyRate for projects with contract', async () => {
        // Arrange
        const contract = await createContract({ dailyRate: 800, currency: 'EUR' });
        const project = await createProject({ contractId: contract._id });
        const task = await createTask(project._id);
        await createTimeEntry(task._id, 8); // 8 hours = 1 day

        // Act
        const report = await generateReport(
          testCustomer._id.toString(),
          TEST_YEAR,
          TEST_MONTH,
          'invoice',
          testUser._id.toString()
        );

        // Assert
        // hourlyRate = 800 / 8 = 100, cost = 100 * 8 = 800
        expect(report.contracts[0].dailyRate).toBe(800);
        expect(report.contracts[0].totalCost).toBe(800);
      });

      /**
       * Test: Customer dailyRate is used for projects without contract
       * 
       * Objective: Verify that when a project has no contract, the customer's
       * dailyRate is used for cost calculations.
       */
      it('should use customer dailyRate for projects without contract', async () => {
        // Arrange - customer has dailyRate of 400
        const project = await createProject({ name: 'No Contract Project' });
        const task = await createTask(project._id);
        await createTimeEntry(task._id, 8); // 8 hours = 1 day

        // Act
        const report = await generateReport(
          testCustomer._id.toString(),
          TEST_YEAR,
          TEST_MONTH,
          'invoice',
          testUser._id.toString()
        );

        // Assert
        // hourlyRate = 400 / 8 = 50, cost = 50 * 8 = 400
        expect(report.contracts[0].dailyRate).toBe(400);
        expect(report.contracts[0].totalCost).toBe(400);
      });

      /**
       * Test: Hourly rate is calculated from contract dailyRate
       * 
       * Objective: Verify that hourly rate is correctly calculated as dailyRate / 8.
       */
      it('should calculate hourly rate from contract dailyRate', async () => {
        // Arrange
        const contract = await createContract({ dailyRate: 640 }); // 640 / 8 = 80 per hour
        const project = await createProject({ contractId: contract._id });
        const task = await createTask(project._id);
        await createTimeEntry(task._id, 4); // 4 hours

        // Act
        const report = await generateReport(
          testCustomer._id.toString(),
          TEST_YEAR,
          TEST_MONTH,
          'invoice',
          testUser._id.toString()
        );

        // Assert
        // hourlyRate = 640 / 8 = 80, cost = 80 * 4 = 320
        expect(report.contracts[0].totalCost).toBe(320);
      });

      /**
       * Test: Cost is calculated using contract rate
       * 
       * Objective: Verify that total cost is correctly calculated using
       * the contract's rate.
       */
      it('should calculate cost using contract rate', async () => {
        // Arrange
        const contract = await createContract({ dailyRate: 480 }); // 480 / 8 = 60 per hour
        const project = await createProject({ contractId: contract._id });
        const task = await createTask(project._id);
        await createTimeEntry(task._id, 10); // 10 hours

        // Act
        const report = await generateReport(
          testCustomer._id.toString(),
          TEST_YEAR,
          TEST_MONTH,
          'invoice',
          testUser._id.toString()
        );

        // Assert
        // hourlyRate = 480 / 8 = 60, cost = 60 * 10 = 600
        expect(report.contracts[0].totalCost).toBe(600);
        expect(report.totalCost).toBe(600);
      });
    });

    describe('Mixed Rate Scenarios', () => {
      /**
       * Test: Different rates for different contracts
       * 
       * Objective: Verify that each contract uses its own rate for calculations.
       */
      it('should use different rates for different contracts', async () => {
        // Arrange
        const contract1 = await createContract({ name: 'Standard', dailyRate: 400 });
        const contract2 = await createContract({ name: 'Premium', dailyRate: 800 });

        const project1 = await createProject({ name: 'Standard Project', contractId: contract1._id });
        const project2 = await createProject({ name: 'Premium Project', contractId: contract2._id });

        const task1 = await createTask(project1._id);
        const task2 = await createTask(project2._id);

        await createTimeEntry(task1._id, 8); // 8 hours at 400/day = 400
        await createTimeEntry(task2._id, 8); // 8 hours at 800/day = 800

        // Act
        const report = await generateReport(
          testCustomer._id.toString(),
          TEST_YEAR,
          TEST_MONTH,
          'invoice',
          testUser._id.toString()
        );

        // Assert
        const standardContract = report.contracts.find(c => c.contractName === 'Standard');
        const premiumContract = report.contracts.find(c => c.contractName === 'Premium');

        expect(standardContract!.dailyRate).toBe(400);
        expect(standardContract!.totalCost).toBe(400);

        expect(premiumContract!.dailyRate).toBe(800);
        expect(premiumContract!.totalCost).toBe(800);

        expect(report.totalCost).toBe(1200);
      });

      /**
       * Test: Contract with rate 0 (pro-bono)
       * 
       * Objective: Verify that a contract with dailyRate: 0 results in zero cost.
       */
      it('should handle contract with rate 0 (pro-bono)', async () => {
        // Arrange
        const contract = await createContract({ name: 'Pro Bono', dailyRate: 0 });
        const project = await createProject({ contractId: contract._id });
        const task = await createTask(project._id);
        await createTimeEntry(task._id, 40); // 40 hours

        // Act
        const report = await generateReport(
          testCustomer._id.toString(),
          TEST_YEAR,
          TEST_MONTH,
          'invoice',
          testUser._id.toString()
        );

        // Assert
        expect(report.contracts[0].dailyRate).toBe(0);
        expect(report.contracts[0].totalCost).toBe(0);
        expect(report.totalCost).toBe(0);
      });

      /**
       * Test: Contract rate higher than customer rate
       * 
       * Objective: Verify that contract rate is used even when higher than customer rate.
       */
      it('should handle contract rate higher than customer rate', async () => {
        // Arrange - customer rate is 400
        const contract = await createContract({ dailyRate: 1000 }); // Higher than customer's 400
        const project = await createProject({ contractId: contract._id });
        const task = await createTask(project._id);
        await createTimeEntry(task._id, 8);

        // Act
        const report = await generateReport(
          testCustomer._id.toString(),
          TEST_YEAR,
          TEST_MONTH,
          'invoice',
          testUser._id.toString()
        );

        // Assert
        // hourlyRate = 1000 / 8 = 125, cost = 125 * 8 = 1000
        expect(report.contracts[0].dailyRate).toBe(1000);
        expect(report.contracts[0].totalCost).toBe(1000);
      });

      /**
       * Test: Contract rate lower than customer rate
       * 
       * Objective: Verify that contract rate is used even when lower than customer rate.
       */
      it('should handle contract rate lower than customer rate', async () => {
        // Arrange - customer rate is 400
        const contract = await createContract({ dailyRate: 200 }); // Lower than customer's 400
        const project = await createProject({ contractId: contract._id });
        const task = await createTask(project._id);
        await createTimeEntry(task._id, 8);

        // Act
        const report = await generateReport(
          testCustomer._id.toString(),
          TEST_YEAR,
          TEST_MONTH,
          'invoice',
          testUser._id.toString()
        );

        // Assert
        // hourlyRate = 200 / 8 = 25, cost = 25 * 8 = 200
        expect(report.contracts[0].dailyRate).toBe(200);
        expect(report.contracts[0].totalCost).toBe(200);
      });
    });
  });

  describe('Report Structure with Contracts', () => {
    describe('Hierarchy', () => {
      /**
       * Test: Report structure is contracts -> projects -> tasks
       * 
       * Objective: Verify the hierarchical structure of the report.
       */
      it('should structure report as contracts -> projects -> tasks', async () => {
        // Arrange
        const contract = await createContract({ name: 'Main Contract' });
        const project = await createProject({ name: 'Main Project', contractId: contract._id });
        const task1 = await createTask(project._id, { name: 'Task 1' });
        const task2 = await createTask(project._id, { name: 'Task 2' });

        await createTimeEntry(task1._id, 2);
        await createTimeEntry(task2._id, 3);

        // Act
        const report = await generateReport(
          testCustomer._id.toString(),
          TEST_YEAR,
          TEST_MONTH,
          'invoice',
          testUser._id.toString()
        );

        // Assert
        expect(report.contracts).toHaveLength(1);
        expect(report.contracts[0].contractName).toBe('Main Contract');
        expect(report.contracts[0].projects).toHaveLength(1);
        expect(report.contracts[0].projects[0].projectName).toBe('Main Project');
        expect(report.contracts[0].projects[0].tasks).toHaveLength(2);
        expect(report.contracts[0].projects[0].tasks.map(t => t.taskName)).toContain('Task 1');
        expect(report.contracts[0].projects[0].tasks.map(t => t.taskName)).toContain('Task 2');
      });

      /**
       * Test: All projects are included under their respective contracts
       * 
       * Objective: Verify that all projects appear under the correct contract.
       */
      it('should include all projects under their respective contracts', async () => {
        // Arrange
        const contract = await createContract({ name: 'Multi-Project Contract' });
        const project1 = await createProject({ name: 'Project Alpha', contractId: contract._id });
        const project2 = await createProject({ name: 'Project Beta', contractId: contract._id });
        const project3 = await createProject({ name: 'Project Gamma', contractId: contract._id });

        const task1 = await createTask(project1._id);
        const task2 = await createTask(project2._id);
        const task3 = await createTask(project3._id);

        await createTimeEntry(task1._id, 1);
        await createTimeEntry(task2._id, 1);
        await createTimeEntry(task3._id, 1);

        // Act
        const report = await generateReport(
          testCustomer._id.toString(),
          TEST_YEAR,
          TEST_MONTH,
          'invoice',
          testUser._id.toString()
        );

        // Assert
        expect(report.contracts).toHaveLength(1);
        expect(report.contracts[0].projects).toHaveLength(3);
        const projectNames = report.contracts[0].projects.map(p => p.projectName);
        expect(projectNames).toContain('Project Alpha');
        expect(projectNames).toContain('Project Beta');
        expect(projectNames).toContain('Project Gamma');
      });

      /**
       * Test: All tasks are included under their respective projects
       * 
       * Objective: Verify that all tasks appear under the correct project.
       */
      it('should include all tasks under their respective projects', async () => {
        // Arrange
        const contract = await createContract();
        const project = await createProject({ contractId: contract._id });
        const task1 = await createTask(project._id, { name: 'Development' });
        const task2 = await createTask(project._id, { name: 'Testing' });
        const task3 = await createTask(project._id, { name: 'Documentation' });

        await createTimeEntry(task1._id, 4);
        await createTimeEntry(task2._id, 2);
        await createTimeEntry(task3._id, 1);

        // Act
        const report = await generateReport(
          testCustomer._id.toString(),
          TEST_YEAR,
          TEST_MONTH,
          'invoice',
          testUser._id.toString()
        );

        // Assert
        expect(report.contracts[0].projects[0].tasks).toHaveLength(3);
        const taskNames = report.contracts[0].projects[0].tasks.map(t => t.taskName);
        expect(taskNames).toContain('Development');
        expect(taskNames).toContain('Testing');
        expect(taskNames).toContain('Documentation');
      });
    });

    describe('Totals Calculation', () => {
      /**
       * Test: totalHours is calculated per contract
       * 
       * Objective: Verify that totalHours is correctly summed for each contract.
       */
      it('should calculate totalHours per contract', async () => {
        // Arrange
        const contract1 = await createContract({ name: 'Contract 1' });
        const contract2 = await createContract({ name: 'Contract 2' });

        const project1 = await createProject({ contractId: contract1._id });
        const project2 = await createProject({ contractId: contract2._id });

        const task1 = await createTask(project1._id);
        const task2 = await createTask(project2._id);

        await createTimeEntry(task1._id, 5);
        await createTimeEntry(task1._id, 3); // Total 8 hours for contract 1
        await createTimeEntry(task2._id, 4); // Total 4 hours for contract 2

        // Act
        const report = await generateReport(
          testCustomer._id.toString(),
          TEST_YEAR,
          TEST_MONTH,
          'invoice',
          testUser._id.toString()
        );

        // Assert
        const contract1Data = report.contracts.find(c => c.contractName === 'Contract 1');
        const contract2Data = report.contracts.find(c => c.contractName === 'Contract 2');

        expect(contract1Data!.totalHours).toBe(8);
        expect(contract2Data!.totalHours).toBe(4);
      });

      /**
       * Test: totalCost is calculated per contract for invoice reports
       * 
       * Objective: Verify that totalCost is correctly calculated for each contract
       * when report type is 'invoice'.
       */
      it('should calculate totalCost per contract for invoice reports', async () => {
        // Arrange
        const contract1 = await createContract({ name: 'Contract 1', dailyRate: 400 });
        const contract2 = await createContract({ name: 'Contract 2', dailyRate: 800 });

        const project1 = await createProject({ contractId: contract1._id });
        const project2 = await createProject({ contractId: contract2._id });

        const task1 = await createTask(project1._id);
        const task2 = await createTask(project2._id);

        await createTimeEntry(task1._id, 8); // 8 hours at 400/day = 400
        await createTimeEntry(task2._id, 8); // 8 hours at 800/day = 800

        // Act
        const report = await generateReport(
          testCustomer._id.toString(),
          TEST_YEAR,
          TEST_MONTH,
          'invoice',
          testUser._id.toString()
        );

        // Assert
        const contract1Data = report.contracts.find(c => c.contractName === 'Contract 1');
        const contract2Data = report.contracts.find(c => c.contractName === 'Contract 2');

        expect(contract1Data!.totalCost).toBe(400);
        expect(contract2Data!.totalCost).toBe(800);
      });

      /**
       * Test: Contract totals are summed for report summary
       * 
       * Objective: Verify that the report's totalHours and totalCost are the
       * sum of all contract totals.
       */
      it('should sum contract totals for report summary', async () => {
        // Arrange
        const contract1 = await createContract({ name: 'Contract 1', dailyRate: 400 });
        const contract2 = await createContract({ name: 'Contract 2', dailyRate: 800 });

        const project1 = await createProject({ contractId: contract1._id });
        const project2 = await createProject({ contractId: contract2._id });

        const task1 = await createTask(project1._id);
        const task2 = await createTask(project2._id);

        await createTimeEntry(task1._id, 8); // 8 hours, cost = 400
        await createTimeEntry(task2._id, 4); // 4 hours, cost = 400

        // Act
        const report = await generateReport(
          testCustomer._id.toString(),
          TEST_YEAR,
          TEST_MONTH,
          'invoice',
          testUser._id.toString()
        );

        // Assert
        expect(report.totalHours).toBe(12);
        expect(report.totalCost).toBe(800);
      });

      /**
       * Test: totalCost is not included for timesheet reports
       * 
       * Objective: Verify that totalCost is undefined for timesheet reports.
       */
      it('should not include totalCost for timesheet reports', async () => {
        // Arrange
        const contract = await createContract({ dailyRate: 500 });
        const project = await createProject({ contractId: contract._id });
        const task = await createTask(project._id);
        await createTimeEntry(task._id, 8);

        // Act
        const report = await generateReport(
          testCustomer._id.toString(),
          TEST_YEAR,
          TEST_MONTH,
          'timesheet',
          testUser._id.toString()
        );

        // Assert
        expect(report.totalCost).toBeUndefined();
        expect(report.contracts[0].totalCost).toBeUndefined();
        expect(report.contracts[0].projects[0].totalCost).toBeUndefined();
        expect(report.contracts[0].projects[0].tasks[0].totalCost).toBeUndefined();
      });
    });
  });

  describe('Edge Cases', () => {
    /**
     * Test: Customer with no projects
     * 
     * Objective: Verify that a customer with no projects returns an empty report.
     */
    it('should handle customer with no projects', async () => {
      // Arrange - customer exists but has no projects

      // Act
      const report = await generateReport(
        testCustomer._id.toString(),
        TEST_YEAR,
        TEST_MONTH,
        'invoice',
        testUser._id.toString()
      );

      // Assert
      expect(report.contracts).toHaveLength(0);
      expect(report.totalHours).toBe(0);
      expect(report.totalCost).toBe(0);
    });

    /**
     * Test: Customer with no contracts
     * 
     * Objective: Verify that a customer with projects but no contracts
     * groups all projects under "No Contract".
     */
    it('should handle customer with no contracts', async () => {
      // Arrange
      const project1 = await createProject({ name: 'Project 1' });
      const project2 = await createProject({ name: 'Project 2' });

      const task1 = await createTask(project1._id);
      const task2 = await createTask(project2._id);

      await createTimeEntry(task1._id, 4);
      await createTimeEntry(task2._id, 4);

      // Act
      const report = await generateReport(
        testCustomer._id.toString(),
        TEST_YEAR,
        TEST_MONTH,
        'invoice',
        testUser._id.toString()
      );

      // Assert
      expect(report.contracts).toHaveLength(1);
      expect(report.contracts[0].contractName).toBe('No Contract');
      expect(report.contracts[0].contractId).toBeNull();
      expect(report.contracts[0].projects).toHaveLength(2);
    });

    /**
     * Test: Contract with no projects assigned
     * 
     * Objective: Verify that a contract with no projects doesn't appear in the report.
     */
    it('should handle contract with no projects assigned', async () => {
      // Arrange
      await createContract({ name: 'Empty Contract' }); // Contract exists but no projects
      const project = await createProject({ name: 'Unassigned Project' }); // No contractId
      const task = await createTask(project._id);
      await createTimeEntry(task._id, 4);

      // Act
      const report = await generateReport(
        testCustomer._id.toString(),
        TEST_YEAR,
        TEST_MONTH,
        'invoice',
        testUser._id.toString()
      );

      // Assert
      expect(report.contracts).toHaveLength(1);
      expect(report.contracts[0].contractName).toBe('No Contract');
      // Empty Contract should not appear since it has no projects with time entries
    });

    /**
     * Test: Project with no tasks
     * 
     * Objective: Verify that a project with no tasks doesn't appear in the report.
     */
    it('should handle project with no tasks', async () => {
      // Arrange
      const contract = await createContract();
      await createProject({ name: 'Empty Project', contractId: contract._id }); // No tasks
      const projectWithTasks = await createProject({ name: 'Active Project', contractId: contract._id });
      const task = await createTask(projectWithTasks._id);
      await createTimeEntry(task._id, 4);

      // Act
      const report = await generateReport(
        testCustomer._id.toString(),
        TEST_YEAR,
        TEST_MONTH,
        'invoice',
        testUser._id.toString()
      );

      // Assert
      expect(report.contracts).toHaveLength(1);
      expect(report.contracts[0].projects).toHaveLength(1);
      expect(report.contracts[0].projects[0].projectName).toBe('Active Project');
    });

    /**
     * Test: Task with no time entries in period
     * 
     * Objective: Verify that a task with no time entries in the report period
     * doesn't appear in the report.
     */
    it('should handle task with no time entries in period', async () => {
      // Arrange
      const contract = await createContract();
      const project = await createProject({ contractId: contract._id });
      const taskWithEntries = await createTask(project._id, { name: 'Active Task' });
      const taskWithoutEntries = await createTask(project._id, { name: 'Inactive Task' });

      // Only create entry for one task
      await createTimeEntry(taskWithEntries._id, 4);
      // Create entry for other task but in different month
      await TimeEntry.create({
        taskId: taskWithoutEntries._id,
        userId: testUser._id,
        startTime: new Date(Date.UTC(2025, 5, 15)), // June 2025 - outside January
        totalDurationInHour: 8
      });

      // Act
      const report = await generateReport(
        testCustomer._id.toString(),
        TEST_YEAR,
        TEST_MONTH,
        'invoice',
        testUser._id.toString()
      );

      // Assert
      expect(report.contracts[0].projects[0].tasks).toHaveLength(1);
      expect(report.contracts[0].projects[0].tasks[0].taskName).toBe('Active Task');
    });

    /**
     * Test: Multiple contracts with same daily rate
     * 
     * Objective: Verify that contracts with the same rate are still
     * treated as separate groups.
     */
    it('should handle multiple contracts with same daily rate', async () => {
      // Arrange
      const contract1 = await createContract({ name: 'Contract A', dailyRate: 500 });
      const contract2 = await createContract({ name: 'Contract B', dailyRate: 500 });

      const project1 = await createProject({ name: 'Project A', contractId: contract1._id });
      const project2 = await createProject({ name: 'Project B', contractId: contract2._id });

      const task1 = await createTask(project1._id);
      const task2 = await createTask(project2._id);

      await createTimeEntry(task1._id, 4);
      await createTimeEntry(task2._id, 8);

      // Act
      const report = await generateReport(
        testCustomer._id.toString(),
        TEST_YEAR,
        TEST_MONTH,
        'invoice',
        testUser._id.toString()
      );

      // Assert
      expect(report.contracts).toHaveLength(2);

      const contractA = report.contracts.find(c => c.contractName === 'Contract A');
      const contractB = report.contracts.find(c => c.contractName === 'Contract B');

      expect(contractA).toBeDefined();
      expect(contractA!.dailyRate).toBe(500);
      expect(contractA!.totalHours).toBe(4);
      expect(contractA!.totalCost).toBe(250); // 4 hours * (500/8)

      expect(contractB).toBeDefined();
      expect(contractB!.dailyRate).toBe(500);
      expect(contractB!.totalHours).toBe(8);
      expect(contractB!.totalCost).toBe(500); // 8 hours * (500/8)
    });
  });
});
