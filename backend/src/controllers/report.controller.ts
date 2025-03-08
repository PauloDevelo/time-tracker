import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/authenticated-request.model';
import * as reportService from '../services/report.service';

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