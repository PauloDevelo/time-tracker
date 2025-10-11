# 03. Extend Task Model with Azure DevOps Work Item Mapping

meta:
  id: azure-devops-integration-03
  feature: azure-devops-integration
  priority: P1
  depends_on: [azure-devops-integration-02]
  tags: [backend, model, database]

## Objective
- Add Azure DevOps work item mapping to the Task model to track synchronization between application tasks and Azure DevOps work items

## Deliverables
- Updated `backend/src/models/Task.ts` with Azure DevOps work item mapping schema
- Support for storing work item ID, type, state, and sync metadata
- Database migration support for existing tasks

## Steps
1. Add `azureDevOps` nested object to `ITask` interface with fields:
   - `workItemId: number` (Azure DevOps work item ID)
   - `workItemType: string` (e.g., "Bug", "Task", "User Story")
   - `state: string` (e.g., "New", "Active", "Resolved", "Closed")
   - `iterationPath: string` (e.g., "MyProject\\Sprint 1")
   - `assignedTo: string` (display name of assigned user)
   - `lastSyncedAt: Date` (timestamp of last sync from Azure DevOps)
   - `sourceUrl: string` (direct link to work item in Azure DevOps)
2. Update `taskSchema` to include the new fields with appropriate validation:
   - `workItemId`: optional, positive integer, unique per project
   - `workItemType`: optional, enum ["Bug", "Task", "User Story"]
   - `state`: optional, string
   - `iterationPath`: optional, string
   - `assignedTo`: optional, string
   - `lastSyncedAt`: optional Date
   - `sourceUrl`: optional, URL format
3. Add compound unique index on `[projectId, azureDevOps.workItemId]` to prevent duplicate imports
4. Add method to Task model: `isImportedFromAzureDevOps(): boolean` to check if task is synced
5. Add method to Task model: `getWorkItemUrl(): string` to return Azure DevOps work item URL
6. Add virtual field `isAzureDevOpsTask` that returns true if `workItemId` exists
7. Update Task controller to handle new fields in create/update operations

## Tests
- Unit:
  - Test Task model saves with Azure DevOps work item mapping (Arrange: task with work item fields → Act: save → Assert: fields persisted)
  - Test `isImportedFromAzureDevOps()` returns correct boolean (Arrange: task with workItemId → Act: call method → Assert: returns true)
  - Test `getWorkItemUrl()` returns correct URL (Arrange: task with sourceUrl → Act: call method → Assert: returns URL)
  - Test unique constraint on [projectId, workItemId] prevents duplicates (Arrange: two tasks with same projectId and workItemId → Act: save second → Assert: throws duplicate error)
  - Test workItemType enum validation accepts valid types
  - Test workItemType enum validation rejects invalid types
  - Test virtual field `isAzureDevOpsTask` works correctly
- Integration:
  - Test creating task with Azure DevOps work item mapping via API
  - Test updating task Azure DevOps work item state
  - Test querying tasks by work item ID
  - Test duplicate work item import is rejected

## Acceptance Criteria
- [ ] Task model includes `azureDevOps` work item mapping object
- [ ] Work item ID, type, state, and metadata are stored correctly
- [ ] `workItemType` validates against enum ["Bug", "Task", "User Story"]
- [ ] Compound unique index on [projectId, workItemId] prevents duplicate imports
- [ ] `lastSyncedAt` timestamp tracks last sync operation
- [ ] Helper methods `isImportedFromAzureDevOps()` and `getWorkItemUrl()` work correctly
- [ ] Virtual field `isAzureDevOpsTask` returns correct boolean
- [ ] Existing tasks (manually created) continue to work without Azure DevOps fields
- [ ] All unit tests pass with >80% coverage
- [ ] Backend builds successfully: `cd backend && npm run build`

## Validation
- Run: `cd backend && npm run build` - should complete without errors
- Run: `cd backend && npm test -- task.model` - all tests should pass
- Manually test: create task with work item mapping, verify fields are saved
- Manually test: attempt to create duplicate work item, verify unique constraint works
- Verify database compound index on [projectId, azureDevOps.workItemId] exists
- Manually test: call `getWorkItemUrl()`, verify returns correct Azure DevOps work item URL

## Notes
- Azure DevOps work item URL format: `{organizationUrl}/{projectName}/_workitems/edit/{workItemId}`
- Work item IDs are positive integers assigned by Azure DevOps
- The `state` field values depend on the work item type and process template (Agile, Scrum, CMMI)
- Common states: "New", "Active", "Resolved", "Closed", "Removed"
- The `iterationPath` follows format: "{ProjectName}\\{IterationName}" (e.g., "MyProject\\Sprint 1")
- Tasks without `workItemId` are considered manually created (not imported)
- The `sourceUrl` should be stored during import for quick access
- Reference: https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items
