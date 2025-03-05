import { Router } from 'express';
import {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customer.controller';
import { auth } from '../middleware/auth';

const router = Router();

// All routes are protected
router.use(auth);

// Customer routes
router.post('/', createCustomer as any);
router.get('/', getCustomers as any);
router.get('/:id', getCustomer as any);
router.put('/:id', updateCustomer as any);
router.delete('/:id', deleteCustomer as any);

export default router; 