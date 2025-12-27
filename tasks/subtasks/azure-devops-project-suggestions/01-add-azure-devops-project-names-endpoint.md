# Task 01: Add Backend Endpoint for Azure DevOps Project Names

## Objective
Create a new endpoint that returns distinct Azure DevOps project names already used by the current user, optionally filtered by customer.

## Deliverables
1. New controller function `getAzureDevOpsProjectNames` in `project.controller.ts`
2. New route `GET /api/projects/azure-devops-project-names` in `project.routes.ts`
3. Swagger documentation for the endpoint

## Steps
1. Add controller function that:
   - Queries projects for the current user where `azureDevOps.projectName` exists
   - Optionally filters by `customerId` query parameter
   - Returns distinct project names sorted alphabetically
2. Add route with proper authentication
3. Add Swagger documentation

## Files to Modify
- `backend/src/controllers/project.controller.ts`
- `backend/src/routes/project.routes.ts`

## Acceptance Criteria
- Endpoint returns array of distinct Azure DevOps project names
- Results are filtered by current user
- Optional `customerId` query parameter filters by customer
- Proper authentication required
- TypeScript compiles without errors

## Technical Notes
- Use MongoDB `distinct()` or aggregation for efficiency
- Return format: `{ projectNames: string[] }`
