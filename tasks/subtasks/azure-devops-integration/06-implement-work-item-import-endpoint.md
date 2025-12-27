# 06. Implement Work Item Import Endpoint for Iterations

meta:
  id: azure-devops-integration-06
  feature: azure-devops-integration
  priority: P2
  depends_on: [azure-devops-integration-04, azure-devops-integration-07]
  tags: [backend, api, controller, routes]

## Objective
- Create API endpoints to list iterations and import Azure DevOps work items as tasks for a specific iteration

## Deliverables
- New endpoint `GET /api/projects/:id/azure-devops/iterations`
- New endpoint `POST /api/projects/:id/azure-devops/import-work-items`
- Updated `backend/src/controllers/project.controller.ts`
- Updated `backend/src/routes/project.routes.ts`
- Swagger documentation for new endpoints

## Steps
1. Add method `getAzureDevOpsIterations` to `backend/src/controllers/project.controller.ts`:
   - Validate project exists and belongs to authenticated user
   - Validate project has Azure DevOps enabled
   - Fetch customer and validate Azure DevOps configuration
   - Create `AzureDevOpsClient` instance
   - Call `client.getIterations(projectId)` to fetch iterations
   - Return array of iterations with id, name, path, startDate, finishDate
   - Handle errors appropriately
2. Add method `importWorkItems` to `backend/src/controllers/project.controller.ts`:
   - Accept request with body: `{ iterationPath: string }`
   - Validate project exists and belongs to authenticated user
   - Validate project has Azure DevOps enabled
   - Fetch customer and validate Azure DevOps configuration
   - Create `AzureDevOpsClient` instance
   - Call `client.getWorkItemsByIteration(projectId, iterationPath)` to fetch work items
   - Use `AzureDevOpsSyncService` (from task 07) to transform work items to tasks
   - Save tasks to database (skip duplicates based on workItemId)
   - Update project's `lastSyncedAt` timestamp
   - Return response: `{ imported: number, skipped: number, tasks: Task[] }`
3. Add routes in `backend/src/routes/project.routes.ts`:
   - `GET /api/projects/:id/azure-devops/iterations`
   - `POST /api/projects/:id/azure-devops/import-work-items`
   - Apply authentication middleware to both routes
4. Add error handling for:
   - Project not found (404)
   - Azure DevOps not enabled for project (400)
   - Customer Azure DevOps not configured (400)
   - Invalid PAT (401)
   - Iteration not found (404)
   - Network errors (503)
   - Database errors (500)
5. Update Swagger documentation in `backend/src/swagger/schemas.ts`:
   - Document both endpoints with request/response schemas
   - Include example requests and responses

## Tests
- Unit:
  - Test `getAzureDevOpsIterations()` returns iteration list (Arrange: project with Azure DevOps → Act: call endpoint → Assert: returns iterations array)
  - Test `getAzureDevOpsIterations()` fails for project without Azure DevOps (Arrange: project without Azure DevOps → Act: call endpoint → Assert: returns 400 error)
  - Test `importWorkItems()` imports work items successfully (Arrange: valid iteration path → Act: call endpoint → Assert: tasks created in database)
  - Test `importWorkItems()` skips duplicate work items (Arrange: work items already imported → Act: call endpoint again → Assert: returns skipped count)
  - Test `importWorkItems()` updates project lastSyncedAt (Arrange: project before import → Act: call endpoint → Assert: lastSyncedAt updated)
  - Test unauthorized user cannot import work items (Arrange: project owned by different user → Act: call endpoint → Assert: returns 403 error)
- Integration:
  - Test full import flow with database and mocked Azure DevOps API
  - Test importing multiple work items in single request
  - Test error responses have correct HTTP status codes

## Acceptance Criteria
- [ ] Endpoint `GET /api/projects/:id/azure-devops/iterations` returns iteration list
- [ ] Endpoint `POST /api/projects/:id/azure-devops/import-work-items` imports work items as tasks
- [ ] Import endpoint filters work items by type (Bug, Task, User Story only)
- [ ] Import endpoint skips duplicate work items (based on workItemId)
- [ ] Import endpoint updates project's `lastSyncedAt` timestamp
- [ ] Import endpoint returns count of imported and skipped work items
- [ ] Authentication middleware protects both endpoints
- [ ] User can only access their own projects
- [ ] Swagger documentation is updated for both endpoints
- [ ] All unit tests pass with >80% coverage
- [ ] Backend builds successfully: `cd backend && npm run build`

## Validation
- Run: `cd backend && npm run build` - should complete without errors
- Run: `cd backend && npm test -- project.controller` - all tests should pass
- Manually test with Postman/curl:
  - GET iterations: verify returns array of iterations
  - POST import: verify creates tasks in database
  - POST import again: verify skips duplicates
  - Verify project `lastSyncedAt` is updated after import
- Check Swagger UI: verify endpoints are documented at `/api-docs`
- Verify imported tasks have Azure DevOps metadata populated

## Notes
- The import operation should be idempotent (safe to run multiple times)
- Duplicate detection uses compound index [projectId, workItemId] from task 03
- Consider adding rate limiting to prevent abuse (e.g., max 10 imports per minute)
- Large imports (>100 work items) should be handled efficiently (consider batch inserts)
- The `lastSyncedAt` timestamp helps users know when data was last refreshed
- Example GET iterations response:
  ```json
  [
    {
      "id": "a589a806-bf11-4d4e-a031-c52ac8d5f7e0",
      "name": "Sprint 1",
      "path": "MyProject\\Sprint 1",
      "startDate": "2024-01-01T00:00:00Z",
      "finishDate": "2024-01-14T00:00:00Z"
    }
  ]
  ```
- Example POST import request:
  ```json
  {
    "iterationPath": "MyProject\\Sprint 1"
  }
  ```
- Example POST import response:
  ```json
  {
    "imported": 15,
    "skipped": 3,
    "tasks": [...]
  }
  ```
- Reference: https://learn.microsoft.com/en-us/rest/api/azure/devops/work/iterations
