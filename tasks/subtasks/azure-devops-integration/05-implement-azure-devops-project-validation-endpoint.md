# 05. Implement Azure DevOps Project Validation Endpoint

meta:
  id: azure-devops-integration-05
  feature: azure-devops-integration
  priority: P2
  depends_on: [azure-devops-integration-04]
  tags: [backend, api, controller, routes]

## Objective
- Create API endpoint to validate Azure DevOps project name and retrieve project ID before saving

## Deliverables
- New endpoint `POST /api/projects/:id/validate-azure-devops`
- Updated `backend/src/controllers/project.controller.ts`
- Updated `backend/src/routes/project.routes.ts`
- Swagger documentation for new endpoint

## Steps
1. Add method `validateAzureDevOpsProject` to `backend/src/controllers/project.controller.ts`:
   - Accept request with body: `{ projectName: string }`
   - Validate that project exists in database and belongs to authenticated user
   - Fetch project's customer to get Azure DevOps configuration
   - Validate customer has Azure DevOps enabled and PAT configured
   - Decrypt customer PAT using helper from task 01
   - Create `AzureDevOpsClient` instance with customer's org URL and PAT
   - Call `client.getProject(projectName)` to validate project exists
   - Return response: `{ valid: true, projectId: string, projectName: string, projectUrl: string }`
   - Handle errors: return `{ valid: false, error: string }` with appropriate HTTP status
2. Add route in `backend/src/routes/project.routes.ts`:
   - `POST /api/projects/:id/validate-azure-devops`
   - Apply authentication middleware
   - Call `projectController.validateAzureDevOpsProject`
3. Add error handling for:
   - Project not found (404)
   - Customer not found (404)
   - Azure DevOps not configured for customer (400)
   - Invalid PAT (401)
   - Azure DevOps project not found (404)
   - Network errors (503)
4. Update Swagger documentation in `backend/src/swagger/schemas.ts`:
   - Add request schema for validation
   - Add response schemas for success and error cases
   - Document endpoint in Swagger

## Tests
- Unit:
  - Test validation succeeds for valid project name (Arrange: valid project and customer → Act: call endpoint → Assert: returns valid=true with projectId)
  - Test validation fails for non-existent project (Arrange: invalid project name → Act: call endpoint → Assert: returns valid=false)
  - Test validation fails when customer has no Azure DevOps config (Arrange: customer without Azure DevOps → Act: call endpoint → Assert: returns 400 error)
  - Test validation fails for invalid PAT (Arrange: customer with invalid PAT → Act: call endpoint → Assert: returns 401 error)
  - Test validation fails for unauthorized user (Arrange: project owned by different user → Act: call endpoint → Assert: returns 403 error)
- Integration:
  - Test full validation flow with database and mocked Azure DevOps API
  - Test error responses have correct HTTP status codes
  - Test authentication middleware protects endpoint

## Acceptance Criteria
- [ ] Endpoint `POST /api/projects/:id/validate-azure-devops` is implemented
- [ ] Endpoint validates project name against Azure DevOps API
- [ ] Endpoint returns project ID and URL on successful validation
- [ ] Endpoint returns appropriate error messages for various failure scenarios
- [ ] Authentication middleware protects endpoint
- [ ] User can only validate their own projects
- [ ] Customer must have Azure DevOps configured (PAT and org URL)
- [ ] Swagger documentation is updated
- [ ] All unit tests pass with >80% coverage
- [ ] Backend builds successfully: `cd backend && npm run build`

## Validation
- Run: `cd backend && npm run build` - should complete without errors
- Run: `cd backend && npm test -- project.controller` - all tests should pass
- Manually test with Postman/curl:
  - Valid project name: verify returns `{ valid: true, projectId, projectName, projectUrl }`
  - Invalid project name: verify returns `{ valid: false, error }`
  - Customer without Azure DevOps config: verify returns 400 error
  - Unauthorized user: verify returns 403 error
- Check Swagger UI: verify endpoint is documented at `/api-docs`

## Notes
- This endpoint is called from the frontend project form to validate Azure DevOps project name in real-time
- The endpoint should be fast (<2 seconds) to provide good UX
- Consider caching validation results for a short period (e.g., 5 minutes)
- The projectId returned should be stored in the Project model (task 02)
- Error messages should be user-friendly and actionable
- Example request:
  ```json
  POST /api/projects/507f1f77bcf86cd799439011/validate-azure-devops
  {
    "projectName": "MyAzureDevOpsProject"
  }
  ```
- Example success response:
  ```json
  {
    "valid": true,
    "projectId": "6ce954b1-ce1f-45d1-b94d-e6bf2464ba2c",
    "projectName": "MyAzureDevOpsProject",
    "projectUrl": "https://dev.azure.com/myorg/MyAzureDevOpsProject"
  }
  ```
- Example error response:
  ```json
  {
    "valid": false,
    "error": "Azure DevOps project 'MyAzureDevOpsProject' not found"
  }
  ```
