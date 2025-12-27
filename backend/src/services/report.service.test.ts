import {
  getDailyRate,
  getHourlyRate,
  IBillingOverride,
  IBillingDetails
} from './report.service';

/**
 * Unit tests for rate override logic in report service.
 * 
 * These tests verify the billing rate selection logic that determines
 * which daily rate to use when calculating invoice costs:
 * - Project's billingOverride.dailyRate takes precedence when set
 * - Falls back to customer's billingDetails.dailyRate when project rate is null/undefined
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
     * Positive Test: Project with billingOverride.dailyRate uses project rate
     * 
     * Objective: Verify that when a project has a billingOverride with a dailyRate set,
     * the project's rate is used instead of the customer's rate.
     */
    it('should use project rate when billingOverride.dailyRate is set', () => {
      // Arrange
      const projectBillingOverride: IBillingOverride = {
        dailyRate: 500,
        currency: 'EUR'
      };

      // Act
      const result = getDailyRate(projectBillingOverride, customerBillingDetails);

      // Assert
      expect(result).toBe(500);
    });

    /**
     * Positive Test: Project without billingOverride uses customer rate
     * 
     * Objective: Verify that when a project has no billingOverride defined,
     * the customer's dailyRate is used as the fallback.
     */
    it('should use customer rate when project has no billingOverride', () => {
      // Arrange
      const projectBillingOverride: IBillingOverride | undefined = undefined;

      // Act
      const result = getDailyRate(projectBillingOverride, customerBillingDetails);

      // Assert
      expect(result).toBe(400);
    });

    /**
     * Positive Test: Project with empty billingOverride uses customer rate
     * 
     * Objective: Verify that when a project has an empty billingOverride object
     * (no dailyRate property), the customer's dailyRate is used as the fallback.
     */
    it('should use customer rate when billingOverride is empty object', () => {
      // Arrange
      const projectBillingOverride: IBillingOverride = {};

      // Act
      const result = getDailyRate(projectBillingOverride, customerBillingDetails);

      // Assert
      expect(result).toBe(400);
    });

    /**
     * Edge Case Test: Project with dailyRate of 0 uses 0 (not customer rate)
     * 
     * Objective: Verify that nullish coalescing (??) correctly treats 0 as a valid rate.
     * A project with dailyRate: 0 should result in 0, NOT fall back to customer rate.
     * This is important for pro-bono or internal projects.
     */
    it('should use 0 when billingOverride.dailyRate is 0 (not customer rate)', () => {
      // Arrange
      const projectBillingOverride: IBillingOverride = {
        dailyRate: 0
      };

      // Act
      const result = getDailyRate(projectBillingOverride, customerBillingDetails);

      // Assert
      expect(result).toBe(0);
      expect(result).not.toBe(customerBillingDetails.dailyRate);
    });

    /**
     * Negative Test: Project with null dailyRate uses customer rate
     * 
     * Objective: Verify that when billingOverride.dailyRate is explicitly null,
     * the nullish coalescing operator falls back to customer's rate.
     */
    it('should use customer rate when billingOverride.dailyRate is null', () => {
      // Arrange
      const projectBillingOverride: IBillingOverride = {
        dailyRate: null
      };

      // Act
      const result = getDailyRate(projectBillingOverride, customerBillingDetails);

      // Assert
      expect(result).toBe(400);
    });

    /**
     * Negative Test: Project with undefined dailyRate uses customer rate
     * 
     * Objective: Verify that when billingOverride.dailyRate is explicitly undefined,
     * the nullish coalescing operator falls back to customer's rate.
     */
    it('should use customer rate when billingOverride.dailyRate is undefined', () => {
      // Arrange
      const projectBillingOverride: IBillingOverride = {
        dailyRate: undefined,
        currency: 'EUR'
      };

      // Act
      const result = getDailyRate(projectBillingOverride, customerBillingDetails);

      // Assert
      expect(result).toBe(400);
    });

    /**
     * Negative Test: Null billingOverride uses customer rate
     * 
     * Objective: Verify that when billingOverride is null (not just undefined),
     * the customer's rate is used correctly.
     */
    it('should use customer rate when billingOverride is null', () => {
      // Arrange
      const projectBillingOverride: IBillingOverride | null = null;

      // Act
      const result = getDailyRate(projectBillingOverride, customerBillingDetails);

      // Assert
      expect(result).toBe(400);
    });

    /**
     * Edge Case Test: High project rate overrides low customer rate
     * 
     * Objective: Verify rate override works correctly when project rate
     * is significantly higher than customer rate.
     */
    it('should use high project rate over low customer rate', () => {
      // Arrange
      const projectBillingOverride: IBillingOverride = {
        dailyRate: 1000
      };
      const lowCustomerRate: IBillingDetails = {
        dailyRate: 100
      };

      // Act
      const result = getDailyRate(projectBillingOverride, lowCustomerRate);

      // Assert
      expect(result).toBe(1000);
    });

    /**
     * Edge Case Test: Low project rate overrides high customer rate
     * 
     * Objective: Verify rate override works correctly when project rate
     * is lower than customer rate (discounted project).
     */
    it('should use low project rate over high customer rate', () => {
      // Arrange
      const projectBillingOverride: IBillingOverride = {
        dailyRate: 200
      };
      const highCustomerRate: IBillingDetails = {
        dailyRate: 800
      };

      // Act
      const result = getDailyRate(projectBillingOverride, highCustomerRate);

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
     * Integration Test: Full cost calculation with project override
     * 
     * Objective: Verify the complete flow of calculating cost using
     * project's billing override rate.
     */
    it('should calculate correct cost using project override rate', () => {
      // Arrange
      const projectBillingOverride: IBillingOverride = {
        dailyRate: 800
      };
      const hoursWorked = 4;

      // Act
      const dailyRate = getDailyRate(projectBillingOverride, customerBillingDetails);
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
     * customer's rate when project has no override.
     */
    it('should calculate correct cost using customer rate fallback', () => {
      // Arrange
      const projectBillingOverride: IBillingOverride | undefined = undefined;
      const hoursWorked = 8;

      // Act
      const dailyRate = getDailyRate(projectBillingOverride, customerBillingDetails);
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
     * Objective: Verify that a project with dailyRate: 0 results in zero cost,
     * even when customer has a non-zero rate.
     */
    it('should calculate zero cost for pro-bono project (dailyRate: 0)', () => {
      // Arrange
      const projectBillingOverride: IBillingOverride = {
        dailyRate: 0
      };
      const hoursWorked = 10;

      // Act
      const dailyRate = getDailyRate(projectBillingOverride, customerBillingDetails);
      const hourlyRate = getHourlyRate(dailyRate);
      const cost = hourlyRate * hoursWorked;

      // Assert
      expect(dailyRate).toBe(0);
      expect(hourlyRate).toBe(0);
      expect(cost).toBe(0);
    });
  });
});
