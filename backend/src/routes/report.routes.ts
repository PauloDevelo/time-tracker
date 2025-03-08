import express from 'express';
import { getAvailableMonths } from '../controllers/report.controller';
import { auth } from '../middleware/auth';
import { handleAuth } from './routes.helpers';

const router = express.Router();

router.use(auth);

/**
 * @swagger
 * /api/reports/available-months/{customerId}:
 *   get:
 *     summary: Get all months that have time entries for a specific customer
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: The customer ID
 *     responses:
 *       200:
 *         description: List of months with time entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   year:
 *                     type: number
 *                   month:
 *                     type: number
 *       400:
 *         description: Invalid customer ID
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/available-months/:customerId', handleAuth(getAvailableMonths));

export default router; 