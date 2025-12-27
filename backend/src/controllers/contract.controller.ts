import { Response } from 'express';
import mongoose from 'mongoose';
import { Contract } from '../models/Contract';
import { Customer } from '../models/Customer';
import { Project } from '../models/Project';
import { AuthenticatedRequest } from '../middleware/authenticated-request.model';

/**
 * Get all contracts for a customer
 */
export const getContractsByCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;
    const userId = req.user._id;

    // Validate customerId format
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      res.status(400).json({ message: 'Invalid customer ID' });
      return;
    }

    // Validate customer exists and belongs to user
    const customer = await Customer.findOne({ _id: customerId, userId });

    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }

    // Get all contracts for the customer, sorted by startDate desc
    const contracts = await Contract.find({ customerId, userId })
      .sort({ startDate: -1 });

    res.status(200).json(contracts);
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({
      message: 'Failed to fetch contracts',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Get a single contract by ID
 */
export const getContract = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { customerId, contractId } = req.params;
    const userId = req.user._id;

    // Validate IDs format
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      res.status(400).json({ message: 'Invalid customer ID' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(contractId)) {
      res.status(400).json({ message: 'Invalid contract ID' });
      return;
    }

    // Validate customer exists and belongs to user
    const customer = await Customer.findOne({ _id: customerId, userId });

    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }

    // Find contract
    const contract = await Contract.findOne({
      _id: contractId,
      customerId,
      userId
    });

    if (!contract) {
      res.status(404).json({ message: 'Contract not found' });
      return;
    }

    res.status(200).json(contract);
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({
      message: 'Failed to fetch contract',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Create a new contract
 */
export const createContract = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;
    const userId = req.user._id;
    const { name, startDate, endDate, dailyRate, currency, daysToCompletion, description } = req.body;

    // Validate customerId format
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      res.status(400).json({ message: 'Invalid customer ID' });
      return;
    }

    // Validate required fields
    if (!name || !startDate || !endDate || dailyRate === undefined || daysToCompletion === undefined) {
      res.status(400).json({
        message: 'Missing required fields: name, startDate, endDate, dailyRate, and daysToCompletion are required'
      });
      return;
    }

    // Validate date logic
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ message: 'Invalid date format' });
      return;
    }

    if (end <= start) {
      res.status(400).json({ message: 'End date must be after start date' });
      return;
    }

    // Validate customer exists and belongs to user
    const customer = await Customer.findOne({ _id: customerId, userId });

    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }

    // Create contract
    const contract = new Contract({
      customerId,
      userId,
      name,
      startDate: start,
      endDate: end,
      dailyRate,
      currency: currency || 'EUR',
      daysToCompletion,
      description
    });

    const savedContract = await contract.save();

    res.status(201).json(savedContract);
  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(400).json({
      message: 'Failed to create contract',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Update a contract
 */
export const updateContract = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { customerId, contractId } = req.params;
    const userId = req.user._id;
    const { name, startDate, endDate, dailyRate, currency, daysToCompletion, description } = req.body;

    // Validate IDs format
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      res.status(400).json({ message: 'Invalid customer ID' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(contractId)) {
      res.status(400).json({ message: 'Invalid contract ID' });
      return;
    }

    // Validate customer exists and belongs to user
    const customer = await Customer.findOne({ _id: customerId, userId });

    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }

    // Find existing contract
    const contract = await Contract.findOne({
      _id: contractId,
      customerId,
      userId
    });

    if (!contract) {
      res.status(404).json({ message: 'Contract not found' });
      return;
    }

    // Validate date logic if dates are being updated
    const start = startDate ? new Date(startDate) : contract.startDate;
    const end = endDate ? new Date(endDate) : contract.endDate;

    if (startDate && isNaN(start.getTime())) {
      res.status(400).json({ message: 'Invalid start date format' });
      return;
    }

    if (endDate && isNaN(end.getTime())) {
      res.status(400).json({ message: 'Invalid end date format' });
      return;
    }

    if (end <= start) {
      res.status(400).json({ message: 'End date must be after start date' });
      return;
    }

    // Build update object
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (startDate !== undefined) updateData.startDate = start;
    if (endDate !== undefined) updateData.endDate = end;
    if (dailyRate !== undefined) updateData.dailyRate = dailyRate;
    if (currency !== undefined) updateData.currency = currency;
    if (daysToCompletion !== undefined) updateData.daysToCompletion = daysToCompletion;
    if (description !== undefined) updateData.description = description;

    const updatedContract = await Contract.findByIdAndUpdate(
      contractId,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedContract);
  } catch (error) {
    console.error('Error updating contract:', error);
    res.status(400).json({
      message: 'Failed to update contract',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Delete a contract
 */
export const deleteContract = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { customerId, contractId } = req.params;
    const userId = req.user._id;

    // Validate IDs format
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      res.status(400).json({ message: 'Invalid customer ID' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(contractId)) {
      res.status(400).json({ message: 'Invalid contract ID' });
      return;
    }

    // Validate customer exists and belongs to user
    const customer = await Customer.findOne({ _id: customerId, userId });

    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }

    // Find contract
    const contract = await Contract.findOne({
      _id: contractId,
      customerId,
      userId
    });

    if (!contract) {
      res.status(404).json({ message: 'Contract not found' });
      return;
    }

    // Check if any projects are using this contract
    const projectsUsingContract = await Project.countDocuments({
      contractId,
      userId
    });

    if (projectsUsingContract > 0) {
      res.status(400).json({
        message: `Cannot delete contract: ${projectsUsingContract} project(s) are using this contract`
      });
      return;
    }

    await Contract.findByIdAndDelete(contractId);

    res.status(200).json({ message: 'Contract deleted successfully' });
  } catch (error) {
    console.error('Error deleting contract:', error);
    res.status(500).json({
      message: 'Failed to delete contract',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
