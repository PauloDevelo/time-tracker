import express from 'express';
import {
  startTimeEntry,
  stopTimeEntry,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getTimeEntries
} from '../controllers/entry.controller';
import { auth } from '../middleware/auth';
import { handleAuth } from './routes.helpers';

const router = express.Router();

router.use(auth);

/**
 * @swagger
 * /api/time-entries:
 *   get:
 *     summary: Get all time entries
 *     tags: [TimeEntries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: taskId
 *         schema:
 *           type: string
 *         description: Filter entries by task ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter entries by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter entries by end date
 *       - in: query
 *         name: inProgressOnly
 *         schema:
 *           type: boolean
 *           default: 'false'
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of time entries
 *       401:
 *         description: Unauthorized
 */
router.get('/', handleAuth(getTimeEntries));

/**
 * @swagger
 * /api/time-entries:
 *   post:
 *     summary: Create a new time entry
 *     tags: [TimeEntries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TimeEntry'
 *     responses:
 *       201:
 *         description: Time entry created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/', handleAuth(createTimeEntry));

/**
 * @swagger
 * /api/time-entries/{timeEntryId}/start:
 *   put:
 *     summary: Start a new time entry
 *     tags: [TimeEntries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: timeEntryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Time entry started successfully
 *       404:
 *         description: Time entry not found
 *       400:
 *         description: You already have a time entry in progress
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to start time entry
 */
router.put('/:timeEntryId/start', handleAuth(startTimeEntry));

/**
 * @swagger
 * /api/time-entries/{timeEntryId}/stop:
 *   put:
 *     summary: Stop a running time entry
 *     tags: [TimeEntries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: timeEntryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Time entry stopped successfully
 *       404:
 *         description: Time entry not found
 *       400:
 *         description: Time entry is not running
 *       401:
 *         description: Unauthorized
 */
router.put('/:timeEntryId/stop', handleAuth(stopTimeEntry));

/**
 * @swagger
 * /api/time-entries/{timeEntryId}:
 *   put:
 *     summary: Update a time entry
 *     tags: [TimeEntries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: timeEntryId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TimeEntry'
 *     responses:
 *       200:
 *         description: Time entry updated successfully
 *       404:
 *         description: Time entry not found
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.put('/:timeEntryId', handleAuth(updateTimeEntry));

/**
 * @swagger
 * /api/time-entries/{timeEntryId}:
 *   delete:
 *     summary: Delete a time entry
 *     tags: [TimeEntries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: timeEntryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Time entry deleted successfully
 *       404:
 *         description: Time entry not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:timeEntryId', handleAuth(deleteTimeEntry));

export default router;