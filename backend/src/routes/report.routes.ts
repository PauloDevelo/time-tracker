import express from 'express';
import { getAvailableMonths, generateReport } from '../controllers/report.controller';
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

/**
 * @swagger
 * /api/reports/generate:
 *   post:
 *     summary: Generate a report for a specific customer, month, and year
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - year
 *               - month
 *               - reportType
 *             properties:
 *               customerId:
 *                 type: string
 *                 description: The customer ID to generate the report for
 *               year:
 *                 type: number
 *                 description: The year for the report
 *               month:
 *                 type: number
 *                 description: The month for the report (1-12)
 *               reportType:
 *                 type: string
 *                 enum: [timesheet, invoice]
 *                 description: The type of report to generate
 *     responses:
 *       200:
 *         description: Report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the operation was successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     reportId:
 *                       type: string
 *                     reportType:
 *                       type: string
 *                       enum: [timesheet, invoice]
 *                     customerName:
 *                       type: string
 *                     customerAddress:
 *                       type: string
 *                     userFullName:
 *                       type: string
 *                     userEmail:
 *                       type: string
 *                     generationDate:
 *                       type: string
 *                       format: date-time
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                     totalDays:
 *                       type: number
 *                     totalHours:
 *                       type: number
 *                     totalCost:
 *                       type: number
 *                     projects:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/generate', handleAuth(generateReport));

export default router; 