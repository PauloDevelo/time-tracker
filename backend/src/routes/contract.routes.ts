import { Router } from 'express';
import {
  getContractsByCustomer,
  getContract,
  createContract,
  updateContract,
  deleteContract
} from '../controllers/contract.controller';
import { auth } from '../middleware/auth';
import { handleAuth } from './routes.helpers';

const router = Router();

// All routes are protected
router.use(auth);

/**
 * @swagger
 * /api/customers/{customerId}/contracts:
 *   get:
 *     summary: Get all contracts for a customer
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: List of contracts
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Server error
 */
router.get('/customers/:customerId/contracts', handleAuth(getContractsByCustomer));

/**
 * @swagger
 * /api/customers/{customerId}/contracts:
 *   post:
 *     summary: Create a new contract for a customer
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - startDate
 *               - endDate
 *               - dailyRate
 *               - daysToCompletion
 *             properties:
 *               name:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               dailyRate:
 *                 type: number
 *               currency:
 *                 type: string
 *                 default: EUR
 *               daysToCompletion:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Contract created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer not found
 */
router.post('/customers/:customerId/contracts', handleAuth(createContract));

/**
 * @swagger
 * /api/customers/{customerId}/contracts/{contractId}:
 *   get:
 *     summary: Get a contract by ID
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *       - in: path
 *         name: contractId
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract ID
 *     responses:
 *       200:
 *         description: Contract details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer or contract not found
 */
router.get('/customers/:customerId/contracts/:contractId', handleAuth(getContract));

/**
 * @swagger
 * /api/customers/{customerId}/contracts/{contractId}:
 *   put:
 *     summary: Update a contract
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *       - in: path
 *         name: contractId
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               dailyRate:
 *                 type: number
 *               currency:
 *                 type: string
 *               daysToCompletion:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated contract
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer or contract not found
 */
router.put('/customers/:customerId/contracts/:contractId', handleAuth(updateContract));

/**
 * @swagger
 * /api/customers/{customerId}/contracts/{contractId}:
 *   delete:
 *     summary: Delete a contract
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *       - in: path
 *         name: contractId
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract ID
 *     responses:
 *       200:
 *         description: Contract deleted successfully
 *       400:
 *         description: Contract is in use by projects
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer or contract not found
 */
router.delete('/customers/:customerId/contracts/:contractId', handleAuth(deleteContract));

export default router;
