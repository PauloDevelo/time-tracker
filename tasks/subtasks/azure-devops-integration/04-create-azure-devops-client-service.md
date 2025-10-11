# 04. Create Azure DevOps API Client Service

meta:
  id: azure-devops-integration-04
  feature: azure-devops-integration
  priority: P1
  depends_on: [azure-devops-integration-01]
  tags: [backend, service, api-integration]

## Objective
- Create a service to interact with Azure DevOps REST API using customer PAT for authentication

## Deliverables
- New file `backend/src/services/azure-devops-client.service.ts`
- HTTP client configured with PAT authentication
- Methods to fetch projects, work items, and iterations

## Steps
1. Create `backend/src/services/azure-devops-client.service.ts` with class `AzureDevOpsClient`
2. Install dependency: `npm install axios` (if not already installed)
3. Implement constructor that accepts:
   - `organizationUrl: string`
   - `pat: string` (decrypted PAT)
4. Configure axios instance with:
   - Base URL: `{organizationUrl}/_apis`
   - Headers: `Authorization: Basic {base64(`:${pat}`)}`
   - Default API version: `api-version=7.1`
5. Implement method `validateConnection(): Promise<boolean>`:
   - Test connection by fetching organization details
   - Return true if successful, false otherwise
   - Handle authentication errors gracefully
6. Implement method `getProject(projectName: string): Promise<IAzureDevOpsProject>`:
   - Fetch project details by name
   - Return project object with id, name, description, url
   - Throw error if project not found
7. Implement method `getIterations(projectId: string): Promise<IAzureDevOpsIteration[]>`:
   - Fetch all iterations for a project
   - Return array of iterations with id, name, path, startDate, finishDate
   - Filter to only return iterations (not releases)
8. Implement method `getWorkItemsByIteration(projectId: string, iterationPath: string): Promise<IAzureDevOpsWorkItem[]>`:
   - Use WIQL (Work Item Query Language) to fetch work items
   - Filter by iteration path and work item types: ["Bug", "Task", "User Story"]
   - Return array of work items with id, title, type, state, assignedTo, url
   - Include fields: System.Id, System.Title, System.WorkItemType, System.State, System.AssignedTo, System.IterationPath
9. Create TypeScript interfaces for Azure DevOps entities:
   - `IAzureDevOpsProject`
   - `IAzureDevOpsIteration`
   - `IAzureDevOpsWorkItem`
10. Implement error handling for:
    - Authentication failures (401)
    - Not found errors (404)
    - Rate limiting (429)
    - Network errors
11. Add logging for API calls (use existing logger if available)

## Tests
- Unit:
  - Test constructor initializes axios with correct config (Arrange: org URL and PAT → Act: create client → Assert: axios configured correctly)
  - Test `validateConnection()` returns true for valid PAT (Arrange: mock successful API response → Act: call method → Assert: returns true)
  - Test `validateConnection()` returns false for invalid PAT (Arrange: mock 401 response → Act: call method → Assert: returns false)
  - Test `getProject()` returns project details (Arrange: mock project API response → Act: call method → Assert: returns project object)
  - Test `getProject()` throws error for non-existent project (Arrange: mock 404 response → Act: call method → Assert: throws error)
  - Test `getIterations()` returns iteration list (Arrange: mock iterations API response → Act: call method → Assert: returns array)
  - Test `getWorkItemsByIteration()` returns filtered work items (Arrange: mock WIQL response → Act: call method → Assert: returns bugs/tasks/stories only)
  - Test error handling for network failures
- Integration:
  - Test with real Azure DevOps API (optional, requires test PAT)
  - Test rate limiting handling

## Acceptance Criteria
- [ ] `AzureDevOpsClient` service is created in `backend/src/services/`
- [ ] Client authenticates using PAT with Basic Auth
- [ ] `validateConnection()` method tests PAT validity
- [ ] `getProject()` method fetches project details by name
- [ ] `getIterations()` method returns all iterations for a project
- [ ] `getWorkItemsByIteration()` method returns work items filtered by type (Bug, Task, User Story)
- [ ] TypeScript interfaces defined for Azure DevOps entities
- [ ] Error handling covers authentication, not found, rate limiting, and network errors
- [ ] All unit tests pass with >80% coverage
- [ ] Backend builds successfully: `cd backend && npm run build`

## Validation
- Run: `cd backend && npm run build` - should complete without errors
- Run: `cd backend && npm test -- azure-devops-client.service` - all tests should pass
- Manually test with valid PAT: verify `validateConnection()` returns true
- Manually test with invalid PAT: verify `validateConnection()` returns false
- Manually test `getProject()`: verify returns correct project details
- Manually test `getWorkItemsByIteration()`: verify returns only Bug/Task/User Story types

## Notes
- Azure DevOps REST API base URL: `https://dev.azure.com/{organization}/_apis`
- Authentication: Basic Auth with empty username and PAT as password: `Authorization: Basic {base64(':' + pat)}`
- API version 7.1 is the latest stable version as of 2024
- WIQL query example for work items:
  ```sql
  SELECT [System.Id], [System.Title], [System.WorkItemType], [System.State], [System.AssignedTo]
  FROM WorkItems
  WHERE [System.IterationPath] = '{iterationPath}'
  AND [System.WorkItemType] IN ('Bug', 'Task', 'User Story')
  ```
- Rate limiting: Azure DevOps has rate limits (200 requests per user per minute)
- Consider implementing request caching for iterations and projects
- Reference: https://learn.microsoft.com/en-us/rest/api/azure/devops/
- Reference: https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/wiql
