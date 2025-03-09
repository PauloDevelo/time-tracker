import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/authenticated-request.model';
import * as reportService from '../services/report.service';
import { GenerateReportRequest } from '../models/ReportDto';

/**
 * Get available months with time entries for a specific customer
 * @param req Request with customerId parameter
 * @param res Response
 */
export const getAvailableMonths = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;
    const userId = req.user._id.toString();

    // Validate customerId
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      res.status(400).json({ message: 'Invalid customer ID' });
      return;
    }

    const availableMonths = await reportService.getAvailableMonths(customerId, userId);
    
    res.status(200).json(availableMonths);
  } catch (error) {
    console.error('Error fetching available months:', error);
    res.status(500).json({ 
      message: 'Failed to fetch available months',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Generate a report for a customer for a specific month and year
 * @param req Request with report generation parameters
 * @param res Response
 */
export const generateReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { customerId, year, month, reportType } = req.body as GenerateReportRequest;
    const userId = req.user._id.toString();

    // Validate request body
    if (!customerId) {
      res.status(400).json({ 
        success: false,
        error: 'Customer ID is required' 
      });
      return;
    }

    if (!year || typeof year !== 'number') {
      res.status(400).json({ 
        success: false,
        error: 'Valid year is required' 
      });
      return;
    }

    if (!month || typeof month !== 'number' || month < 1 || month > 12) {
      res.status(400).json({ 
        success: false,
        error: 'Valid month is required (1-12)' 
      });
      return;
    }

    if (!reportType || !['timesheet', 'invoice'].includes(reportType)) {
      res.status(400).json({ 
        success: false,
        error: 'Valid report type is required (timesheet or invoice)' 
      });
      return;
    }

    // Generate the report
    const reportSummary = await reportService.generateReport(
      customerId,
      year,
      month,
      reportType as 'timesheet' | 'invoice',
      userId
    );
    
    res.status(200).json({
      success: true,
      data: reportSummary
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}; 