import {
  getDailyRate,
  getHourlyRate,
  IContractBilling,
  IBillingDetails
} from './report.service';

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
