import { Router } from 'express';

import { auth } from '../middleware/auth'; // Assuming you have an auth middleware
import { createProject, deleteProject, getAllProjects, getProjectById, updateProject, validateAzureDevOpsProject, getAzureDevOpsIterations, importWorkItems, getAzureDevOpsProjectNames } from '../controllers/project.controller';
import { handleAuth } from './routes.helpers';

const router = Router();

// Apply authentication middleware to all project routes
router.use(auth);

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Project'
 *     responses:
 *       201:
 *         description: Project created successfully
 *       400:
 *         description: Error creating project
 *       401:
 *         description: Unauthorized
 */
router.post('/', handleAuth(createProject));

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Get all projects
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of projects
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', handleAuth(getAllProjects));

/**
 * @swagger
 * /api/projects/azure-devops-project-names:
 *   get:
 *     summary: Get distinct Azure DevOps project names for the current user
 *     description: Returns a list of unique Azure DevOps project names that have been used by the current user, optionally filtered by customer.
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *         description: Optional customer ID to filter project names
 *     responses:
 *       200:
 *         description: List of distinct Azure DevOps project names
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 projectNames:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["MyProject", "AnotherProject", "TeamProject"]
 *       400:
 *         description: Invalid customer ID
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/azure-devops-project-names', handleAuth(getAzureDevOpsProjectNames));

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get a project by ID
 *     tags: [Projects]
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
 *         description: Project details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
router.get('/:id', handleAuth(getProjectById));

/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     summary: Update a project
 *     tags: [Projects]
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
 *         description: Updated project
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
router.put('/:id', handleAuth(updateProject));

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Delete a project
 *     tags: [Projects]
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
 *         description: Project deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
router.delete('/:id', handleAuth(deleteProject));

/**
 * @swagger
 * /api/projects/{id}/validate-azure-devops:
 *   post:
 *     summary: Validate Azure DevOps project name
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectName
 *             properties:
 *               projectName:
 *                 type: string
 *                 description: Azure DevOps project name to validate
 *                 example: MyAzureDevOpsProject
 *     responses:
 *       200:
 *         description: Validation successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *                 projectId:
 *                   type: string
 *                   format: uuid
 *                   example: 6ce954b1-ce1f-45d1-b94d-e6bf2464ba2c
 *                 projectName:
 *                   type: string
 *                   example: MyAzureDevOpsProject
 *                 projectUrl:
 *                   type: string
 *                   format: uri
 *                   example: https://dev.azure.com/myorg/MyAzureDevOpsProject
 *       400:
 *         description: Bad request or Azure DevOps not configured
 *       401:
 *         description: Unauthorized or invalid Azure DevOps PAT
 *       404:
 *         description: Project not found
 *       503:
 *         description: Azure DevOps service unavailable
 */
router.post('/:id/validate-azure-devops', handleAuth(validateAzureDevOpsProject));

/**
 * @swagger
 * /api/projects/{id}/azure-devops/iterations:
 *   get:
 *     summary: Get Azure DevOps iterations for a project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: List of iterations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: a589a806-bf11-4d4e-a031-c52ac8d5f7e0
 *                   name:
 *                     type: string
 *                     example: Sprint 1
 *                   path:
 *                     type: string
 *                     example: MyProject\\Sprint 1
 *                   startDate:
 *                     type: string
 *                     format: date-time
 *                   finishDate:
 *                     type: string
 *                     format: date-time
 *       400:
 *         description: Azure DevOps not enabled for project
 *       401:
 *         description: Unauthorized or invalid Azure DevOps PAT
 *       404:
 *         description: Project not found
 *       503:
 *         description: Azure DevOps service unavailable
 */
router.get('/:id/azure-devops/iterations', handleAuth(getAzureDevOpsIterations));

/**
 * @swagger
 * /api/projects/{id}/azure-devops/import-work-items:
 *   post:
 *     summary: Import work items from Azure DevOps iteration
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - iterationPath
 *             properties:
 *               iterationPath:
 *                 type: string
 *                 description: Azure DevOps iteration path
 *                 example: MyProject\\Sprint 1
 *     responses:
 *       200:
 *         description: Work items imported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 imported:
 *                   type: integer
 *                   example: 15
 *                 skipped:
 *                   type: integer
 *                   example: 3
 *                 tasks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *       400:
 *         description: Bad request or Azure DevOps not enabled
 *       401:
 *         description: Unauthorized or invalid Azure DevOps PAT
 *       404:
 *         description: Project or iteration not found
 *       429:
 *         description: Rate limit exceeded
 *       503:
 *         description: Azure DevOps service unavailable
 */
router.post('/:id/azure-devops/import-work-items', handleAuth(importWorkItems));

export default router;