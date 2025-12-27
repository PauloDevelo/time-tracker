# 02. Extend Project Model with Azure DevOps Metadata

meta:
  id: azure-devops-integration-02
  feature: azure-devops-integration
  priority: P1
  depends_on: [azure-devops-integration-01]
  tags: [backend, model, database]

## Objective
- Add Azure DevOps project metadata to the Project model to link application projects with Azure DevOps projects

## Deliverables
- Updated `backend/src/models/Project.ts` with Azure DevOps metadata schema
- Support for storing Azure DevOps project name and ID
- Database migration support for existing projects

## Steps
1. Add `azureDevOps` nested object to `IProject` interface with fields:
   - `projectName: string` (Azure DevOps project name as entered by user)
   - `projectId: string` (Azure DevOps project GUID, populated after validation)
   - `enabled: boolean` (flag to enable/disable Azure DevOps sync for this project)
   - `lastSyncedAt: Date` (timestamp of last work item import)
2. Update `projectSchema` to include the new fields with appropriate validation:
   - `projectName`: optional, trimmed string
   - `projectId`: optional, UUID format
   - `enabled`: default false
   - `lastSyncedAt`: optional Date
3. Add validation to ensure if `azureDevOps.enabled` is true, then `projectName` and `projectId` must be set
4. Add index on `azureDevOps.projectId` for efficient lookups
5. Add method to Project model: `isAzureDevOpsEnabled(): boolean` to check if integration is active
6. Add method to Project model: `getAzureDevOpsUrl(): string` to construct Azure DevOps project URL
7. Update existing Project controller to handle new fields in create/update operations

## Tests
- Unit:
  - Test Project model saves with Azure DevOps metadata (Arrange: project with Azure DevOps fields → Act: save → Assert: fields persisted)
  - Test `isAzureDevOpsEnabled()` returns correct boolean (Arrange: project with enabled=true → Act: call method → Assert: returns true)
  - Test `getAzureDevOpsUrl()` constructs correct URL (Arrange: project with projectName → Act: call method → Assert: returns valid Azure DevOps URL)
  - Test validation rejects enabled=true without projectName/projectId
  - Test default values for `enabled` field (false)
  - Test `lastSyncedAt` updates correctly
- Integration:
  - Test creating project with Azure DevOps metadata via API
  - Test updating project Azure DevOps metadata
  - Test querying projects by Azure DevOps projectId

## Acceptance Criteria
- [ ] Project model includes `azureDevOps` metadata object
- [ ] Azure DevOps project name and ID are stored correctly
- [ ] `enabled` flag defaults to false
- [ ] Validation ensures projectName and projectId are set when enabled=true
- [ ] `lastSyncedAt` timestamp tracks last import operation
- [ ] Helper methods `isAzureDevOpsEnabled()` and `getAzureDevOpsUrl()` work correctly
- [ ] Index on `azureDevOps.projectId` exists for performance
- [ ] Existing projects can be updated with Azure DevOps metadata
- [ ] All unit tests pass with >80% coverage
- [ ] Backend builds successfully: `cd backend && npm run build`

## Validation
- Run: `cd backend && npm run build` - should complete without errors
- Run: `cd backend && npm test -- project.model` - all tests should pass
- Manually test: create project with Azure DevOps metadata, verify fields are saved
- Manually test: call `getAzureDevOpsUrl()`, verify returns correct Azure DevOps project URL format
- Verify database index on `azureDevOps.projectId` exists

## Notes
- Azure DevOps project URL format: `{organizationUrl}/{projectName}`
- Project ID is a GUID assigned by Azure DevOps (e.g., "6ce954b1-ce1f-45d1-b94d-e6bf2464ba2c")
- The `projectName` is user-facing and may contain spaces/special characters
- The `projectId` is the internal GUID used for API calls
- `lastSyncedAt` will be updated by the sync service in task 07
- Reference: https://learn.microsoft.com/en-us/rest/api/azure/devops/core/projects
