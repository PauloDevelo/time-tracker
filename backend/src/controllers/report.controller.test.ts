import { Response } from 'express';
import mongoose from 'mongoose';
import { getAvailableMonths, generateReport } from './report.controller';
import * as reportService from '../services/report.service';
import { AuthenticatedRequest } from '../middleware/authenticated-request.model';

// Mock the report service
jest.mock('../services/report.service');

/**
 * Unit tests for the Report controller.
 * 
 * These tests verify:
 * - getAvailableMonths endpoint functionality
 * - generateReport endpoint functionality
 * - Input validation (customerId, year, month, reportType)
 * - Error handling (400, 500 responses)
 * - Response format with success flag
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

// Helper to create mock report summary
const createMockReportSummary = (overrides = {}) => ({
  reportId: createObjectId().toString(),
  reportType: 'timesheet' as const,
  customerName: 'Test Customer',
  customerAddress: '123 Test St',
  userFullName: 'John Doe',
  userEmail: 'john@example.com',
  generationDate: new Date(),
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  totalDays: 23,
  totalHours: 160,
  totalCost: undefined,
  contracts: [],
  ...overrides
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Report Controller', () => {
  describe('getAvailableMonths', () => {
    /**
     * Test: should return available months for customer
     * 
     * Objective: Verify that available months are returned successfully
     * when a valid customer ID is provided.
     */
    it('should return available months for customer', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const mockMonths = [
        { year: 2024, month: 12 },
        { year: 2024, month: 11 },
        { year: 2024, month: 10 }
      ];

      const req = createMockRequest({
        params: { customerId: customerId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (reportService.getAvailableMonths as jest.Mock).mockResolvedValue(mockMonths);

      // Act
      await getAvailableMonths(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(reportService.getAvailableMonths).toHaveBeenCalledWith(
        customerId.toString(),
        userId.toString()
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockMonths);
    });

    /**
     * Test: should return 400 for invalid customer ID
     * 
     * Objective: Verify that an invalid customer ID returns 400 status.
     */
    it('should return 400 for invalid customer ID', async () => {
      // Arrange
      const req = createMockRequest({
        params: { customerId: 'invalid-id' }
      });
      const res = createMockResponse();

      // Act
      await getAvailableMonths(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(reportService.getAvailableMonths).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid customer ID' });
    });

    /**
     * Test: should return 500 on database error
     * 
     * Objective: Verify that database errors are handled gracefully
     * and return 500 status with error message.
     */
    it('should return 500 on database error', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();
      const dbError = new Error('Database connection failed');

      const req = createMockRequest({
        params: { customerId: customerId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (reportService.getAvailableMonths as jest.Mock).mockRejectedValue(dbError);

      // Act
      await getAvailableMonths(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to fetch available months',
        error: 'Database connection failed'
      });
    });

    /**
     * Test: should return empty array when no months available
     * 
     * Objective: Verify that an empty array is returned when
     * no time entries exist for the customer.
     */
    it('should return empty array when no months available', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();

      const req = createMockRequest({
        params: { customerId: customerId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (reportService.getAvailableMonths as jest.Mock).mockResolvedValue([]);

      // Act
      await getAvailableMonths(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    /**
     * Test: should handle non-Error exceptions
     * 
     * Objective: Verify that non-Error exceptions are converted to strings.
     */
    it('should handle non-Error exceptions', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId();

      const req = createMockRequest({
        params: { customerId: customerId.toString() },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (reportService.getAvailableMonths as jest.Mock).mockRejectedValue('String error');

      // Act
      await getAvailableMonths(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to fetch available months',
        error: 'String error'
      });
    });
  });

  describe('generateReport', () => {
    /**
     * Test: should generate invoice report successfully
     * 
     * Objective: Verify that an invoice report is generated successfully
     * with all required parameters.
     */
    it('should generate invoice report successfully', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId().toString();
      const mockReportSummary = createMockReportSummary({
        reportType: 'invoice',
        totalCost: 5000
      });

      const req = createMockRequest({
        body: {
          customerId,
          year: 2024,
          month: 12,
          reportType: 'invoice'
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (reportService.generateReport as jest.Mock).mockResolvedValue(mockReportSummary);

      // Act
      await generateReport(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(reportService.generateReport).toHaveBeenCalledWith(
        customerId,
        2024,
        12,
        'invoice',
        userId.toString()
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReportSummary
      });
    });

    /**
     * Test: should generate timesheet report successfully
     * 
     * Objective: Verify that a timesheet report is generated successfully
     * with all required parameters.
     */
    it('should generate timesheet report successfully', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId().toString();
      const mockReportSummary = createMockReportSummary({
        reportType: 'timesheet'
      });

      const req = createMockRequest({
        body: {
          customerId,
          year: 2024,
          month: 6,
          reportType: 'timesheet'
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (reportService.generateReport as jest.Mock).mockResolvedValue(mockReportSummary);

      // Act
      await generateReport(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(reportService.generateReport).toHaveBeenCalledWith(
        customerId,
        2024,
        6,
        'timesheet',
        userId.toString()
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReportSummary
      });
    });

    /**
     * Test: should return 400 when customerId is missing
     * 
     * Objective: Verify that missing customerId returns 400 status
     * with appropriate error message.
     */
    it('should return 400 when customerId is missing', async () => {
      // Arrange
      const req = createMockRequest({
        body: {
          year: 2024,
          month: 12,
          reportType: 'invoice'
        }
      });
      const res = createMockResponse();

      // Act
      await generateReport(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(reportService.generateReport).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Customer ID is required'
      });
    });

    /**
     * Test: should return 400 when year is invalid
     * 
     * Objective: Verify that invalid year returns 400 status.
     */
    it('should return 400 when year is invalid', async () => {
      // Arrange
      const customerId = createObjectId().toString();
      const req = createMockRequest({
        body: {
          customerId,
          year: 'invalid',
          month: 12,
          reportType: 'invoice'
        }
      });
      const res = createMockResponse();

      // Act
      await generateReport(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(reportService.generateReport).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Valid year is required'
      });
    });

    /**
     * Test: should return 400 when year is missing
     * 
     * Objective: Verify that missing year returns 400 status.
     */
    it('should return 400 when year is missing', async () => {
      // Arrange
      const customerId = createObjectId().toString();
      const req = createMockRequest({
        body: {
          customerId,
          month: 12,
          reportType: 'invoice'
        }
      });
      const res = createMockResponse();

      // Act
      await generateReport(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(reportService.generateReport).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Valid year is required'
      });
    });

    /**
     * Test: should return 400 when month is invalid (not 1-12)
     * 
     * Objective: Verify that month outside 1-12 range returns 400 status.
     */
    it('should return 400 when month is invalid (not 1-12)', async () => {
      // Arrange
      const customerId = createObjectId().toString();
      const req = createMockRequest({
        body: {
          customerId,
          year: 2024,
          month: 13,
          reportType: 'invoice'
        }
      });
      const res = createMockResponse();

      // Act
      await generateReport(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(reportService.generateReport).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Valid month is required (1-12)'
      });
    });

    /**
     * Test: should return 400 when month is zero
     * 
     * Objective: Verify that month of 0 returns 400 status.
     */
    it('should return 400 when month is zero', async () => {
      // Arrange
      const customerId = createObjectId().toString();
      const req = createMockRequest({
        body: {
          customerId,
          year: 2024,
          month: 0,
          reportType: 'invoice'
        }
      });
      const res = createMockResponse();

      // Act
      await generateReport(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(reportService.generateReport).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Valid month is required (1-12)'
      });
    });

    /**
     * Test: should return 400 when reportType is invalid
     * 
     * Objective: Verify that invalid reportType returns 400 status.
     */
    it('should return 400 when reportType is invalid', async () => {
      // Arrange
      const customerId = createObjectId().toString();
      const req = createMockRequest({
        body: {
          customerId,
          year: 2024,
          month: 12,
          reportType: 'summary' // Invalid type
        }
      });
      const res = createMockResponse();

      // Act
      await generateReport(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(reportService.generateReport).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Valid report type is required (timesheet or invoice)'
      });
    });

    /**
     * Test: should return 400 when reportType is missing
     * 
     * Objective: Verify that missing reportType returns 400 status.
     */
    it('should return 400 when reportType is missing', async () => {
      // Arrange
      const customerId = createObjectId().toString();
      const req = createMockRequest({
        body: {
          customerId,
          year: 2024,
          month: 12
        }
      });
      const res = createMockResponse();

      // Act
      await generateReport(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(reportService.generateReport).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Valid report type is required (timesheet or invoice)'
      });
    });

    /**
     * Test: should return 500 on service error
     * 
     * Objective: Verify that service errors are handled gracefully
     * and return 500 status with success: false.
     */
    it('should return 500 on service error', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId().toString();
      const serviceError = new Error('Customer not found');

      const req = createMockRequest({
        body: {
          customerId,
          year: 2024,
          month: 12,
          reportType: 'invoice'
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (reportService.generateReport as jest.Mock).mockRejectedValue(serviceError);

      // Act
      await generateReport(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Customer not found'
      });
    });

    /**
     * Test: should include success: true in response
     * 
     * Objective: Verify that successful report generation includes
     * success: true in the response.
     */
    it('should include success: true in response', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId().toString();
      const mockReportSummary = createMockReportSummary();

      const req = createMockRequest({
        body: {
          customerId,
          year: 2024,
          month: 1,
          reportType: 'timesheet'
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (reportService.generateReport as jest.Mock).mockResolvedValue(mockReportSummary);

      // Act
      await generateReport(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    /**
     * Test: should handle non-Error exceptions in generateReport
     * 
     * Objective: Verify that non-Error exceptions are converted to strings.
     */
    it('should handle non-Error exceptions in generateReport', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId().toString();

      const req = createMockRequest({
        body: {
          customerId,
          year: 2024,
          month: 12,
          reportType: 'invoice'
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (reportService.generateReport as jest.Mock).mockRejectedValue('String error');

      // Act
      await generateReport(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'String error'
      });
    });

    /**
     * Test: should pass correct parameters to reportService.generateReport
     * 
     * Objective: Verify that all parameters are correctly passed to the service.
     */
    it('should pass correct parameters to reportService.generateReport', async () => {
      // Arrange
      const userId = createObjectId();
      const customerId = createObjectId().toString();
      const mockReportSummary = createMockReportSummary();

      const req = createMockRequest({
        body: {
          customerId,
          year: 2023,
          month: 7,
          reportType: 'invoice'
        },
        user: { _id: userId } as any
      });
      const res = createMockResponse();

      (reportService.generateReport as jest.Mock).mockResolvedValue(mockReportSummary);

      // Act
      await generateReport(req as AuthenticatedRequest, res as Response);

      // Assert
      expect(reportService.generateReport).toHaveBeenCalledTimes(1);
      expect(reportService.generateReport).toHaveBeenCalledWith(
        customerId,
        2023,
        7,
        'invoice',
        userId.toString()
      );
    });
  });
});
