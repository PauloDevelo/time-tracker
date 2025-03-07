import { Router } from 'express';
import {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customer.controller';
import { auth } from '../middleware/auth';
import { handleAuth } from './routes.helpers';

const router = Router();

// All routes are protected
router.use(auth);

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Create a new customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Customer'
 *     responses:
 *       201:
 *         description: Customer created successfully
 *       400:
 *         description: Error creating customer
 *       401:
 *         description: Unauthorized
 */
router.post('/', handleAuth(createCustomer));

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Get all customers
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of customers
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', handleAuth(getCustomers));

/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     summary: Get a customer by ID
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer not found
 */
router.get('/:id', handleAuth(getCustomer));

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     summary: Update a customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated customer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer not found
 */
router.put('/:id', handleAuth(updateCustomer));

/**
 * @swagger
 * /api/customers/{id}:
 *   delete:
 *     summary: Delete a customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer not found
 */
router.delete('/:id', handleAuth(deleteCustomer));

export default router;