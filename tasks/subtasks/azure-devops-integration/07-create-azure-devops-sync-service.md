# 07. Create Azure DevOps Sync Service for Work Item Transformation

meta:
  id: azure-devops-integration-07
  feature: azure-devops-integration
  priority: P2
  depends_on: [azure-devops-integration-03, azure-devops-integration-04]
  tags: [backend, service, business-logic]

## Objective
- Create a service to transform Azure DevOps work items into application tasks with proper field mapping

## Deliverables
- New file `backend/src/services/azure-devops-sync.service.ts`
- Business logic for work item to task transformation
- Duplicate detection and conflict resolution

## Steps
1. Create `backend/src/services/azure-devops-sync.service.ts` with class `AzureDevOpsSyncService`
2. Implement method `transformWorkItemToTask(workItem: IAzureDevOpsWorkItem, projectId: string, userId: string): ITaskCreateData`:
   - Map work item fields to task fields:
     - `name` ← `workItem.fields['System.Title']`
     - `description` ← `workItem.fields['System.Description']` (or empty string if not present)
     - `url` ← `workItem.url` (Azure DevOps work item URL)
     - `projectId` ← provided projectId
     - `userId` ← provided userId
   - Map Azure DevOps specific fields:
     - `azureDevOps.workItemId` ← `workItem.id`
     - `azureDevOps.workItemType` ← `workItem.fields['System.WorkItemType']`
     - `azureDevOps.state` ← `workItem.fields['System.State']`
     - `azureDevOps.iterationPath` ← `workItem.fields['System.IterationPath']`
     - `azureDevOps.assignedTo` ← `workItem.fields['System.AssignedTo']?.displayName` (if present)
     - `azureDevOps.lastSyncedAt` ← current timestamp
     - `azureDevOps.sourceUrl` ← `workItem.url`
   - Return task creation data object
3. Implement method `importWorkItems(workItems: IAzureDevOpsWorkItem[], projectId: string, userId: string): Promise<IImportResult>`:
   - Transform each work item to task using `transformWorkItemToTask()`
   - Check for existing tasks with same workItemId (use Task.findOne with compound index)
   - For new work items: create task in database
   - For existing work items: optionally update state and lastSyncedAt (configurable)
   - Track imported count and skipped count
   - Return result: `{ imported: number, skipped: number, tasks: Task[] }`
4. Implement method `shouldUpdateExistingTask(existingTask: ITask, workItem: IAzureDevOpsWorkItem): boolean`:
   - Compare work item state with existing task state
   - Return true if state has changed or if last sync was >24 hours ago
   - Return false otherwise (skip update)
5. Implement method `updateTaskFromWorkItem(task: ITask, workItem: IAzureDevOpsWorkItem): ITask`:
   - Update task fields from work item (name, description, state)
   - Update `azureDevOps.lastSyncedAt` timestamp
   - Return updated task
6. Add error handling for:
   - Invalid work item data
   - Database errors during save
   - Missing required fields
7. Add logging for import operations (number of items processed, errors)

## Tests
- Unit:
  - Test `transformWorkItemToTask()` maps fields correctly (Arrange: work item object → Act: transform → Assert: task has correct fields)
  - Test `transformWorkItemToTask()` handles missing optional fields (Arrange: work item without description → Act: transform → Assert: task has empty description)
  - Test `importWorkItems()` creates new tasks (Arrange: work items not in database → Act: import → Assert: tasks created)
  - Test `importWorkItems()` skips duplicate work items (Arrange: work items already in database → Act: import → Assert: returns skipped count)
  - Test `shouldUpdateExistingTask()` returns true for state changes (Arrange: task with old state, work item with new state → Act: call method → Assert: returns true)
  - Test `shouldUpdateExistingTask()` returns false for unchanged state (Arrange: task and work item with same state → Act: call method → Assert: returns false)
  - Test `updateTaskFromWorkItem()` updates task fields (Arrange: existing task, work item with changes → Act: update → Assert: task fields updated)
  - Test error handling for invalid work item data
- Integration:
  - Test full import flow with database
  - Test importing batch of work items
  - Test duplicate detection with database queries

## Acceptance Criteria
- [ ] `AzureDevOpsSyncService` is created in `backend/src/services/`
- [ ] `transformWorkItemToTask()` correctly maps all work item fields to task fields
- [ ] `importWorkItems()` creates new tasks and skips duplicates
- [ ] `shouldUpdateExistingTask()` determines when to update existing tasks
- [ ] `updateTaskFromWorkItem()` updates task fields from work item
- [ ] Service handles missing optional fields gracefully
- [ ] Service logs import operations and errors
- [ ] All unit tests pass with >80% coverage
- [ ] Backend builds successfully: `cd backend && npm run build`

## Validation
- Run: `cd backend && npm run build` - should complete without errors
- Run: `cd backend && npm test -- azure-devops-sync.service` - all tests should pass
- Manually test transformation: verify work item fields map correctly to task fields
- Manually test import: verify new tasks are created with correct Azure DevOps metadata
- Manually test duplicate handling: import same work items twice, verify second import skips them
- Verify logs show import statistics (imported count, skipped count)

## Notes
- The transformation should preserve all Azure DevOps metadata for future sync operations
- Consider making update behavior configurable (always update, never update, update if changed)
- The service should be stateless and reusable across different projects
- Work item description may contain HTML; consider stripping HTML tags or converting to plain text
- The `assignedTo` field in Azure DevOps is an object with displayName, uniqueName, etc.
- Example work item structure from Azure DevOps API:
  ```json
  {
    "id": 123,
    "url": "https://dev.azure.com/myorg/_apis/wit/workItems/123",
    "fields": {
      "System.Id": 123,
      "System.Title": "Fix login bug",
      "System.WorkItemType": "Bug",
      "System.State": "Active",
      "System.IterationPath": "MyProject\\Sprint 1",
      "System.AssignedTo": {
        "displayName": "John Doe",
        "uniqueName": "john@example.com"
      },
      "System.Description": "<div>Bug description</div>"
    }
  }
  ```
- Consider adding a "sync mode" parameter: "create-only" vs "create-and-update"
- Future enhancement: bidirectional sync (update Azure DevOps when task changes)
- Reference: https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/get-work-item
