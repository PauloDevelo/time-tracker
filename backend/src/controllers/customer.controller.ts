import { NextFunction, Response } from 'express';
import { Customer } from '../models/Customer';
import { AuthenticatedRequest } from '../middleware/authenticated-request.model';

export const createCustomer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = await Customer.create({
      ...req.body,
      userId: req.user._id,
    });
    return res.status(201).json(customer);
  } catch (error) {
    return res.status(400).json({ message: 'Error creating customer', error });
  }
};

export const getCustomers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const customers = await Customer.find({ userId: req.user._id })
      .sort({ name: 1 });
    res.json(customers);
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customers', error });
  }
};

export const getCustomer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    return res.json(customer);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching customer', error });
  }
};

export const updateCustomer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    return res.json(customer);
  } catch (error) {
    return res.status(400).json({ message: 'Error updating customer', error });
  }
};

export const deleteCustomer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = await Customer.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    return res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting customer', error });
  }
}; 