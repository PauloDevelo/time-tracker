# 12. Update Project Detail View with Import Functionality

meta:
  id: azure-devops-integration-12
  feature: azure-devops-integration
  priority: P2
  depends_on: [azure-devops-integration-10]
  tags: [frontend, ui, component]

## Objective
- Add "Import Work Items" button to project detail view and integrate work item import dialog

## Deliverables
- Updated `frontend/src/app/features/projects/project-detail/project-detail.component.ts`
- Updated `frontend/src/app/features/projects/project-detail/project-detail.component.html`
- Updated `frontend/src/app/features/projects/project-detail/project-detail.component.scss`
- Visual indicators for Azure DevOps-imported tasks

## Steps
1. Update `frontend/src/app/features/projects/project-detail/project-detail.component.ts`:
   - Import `WorkItemImportDialogComponent`
   - Add property `isAzureDevOpsEnabled: boolean = false`
   - In `loadProject()`, check if project has Azure DevOps enabled:
     ```typescript
     this.isAzureDevOpsEnabled = project.azureDevOps?.enabled || false;
     ```
   - Add method `openImportDialog()`:
     - Open `WorkItemImportDialogComponent` with MatDialog
     - Pass project ID and name as dialog data
     - On dialog close, if result exists, call `loadTasks()` to refresh task list
     - Show success snackbar with import result (imported count, skipped count)
   - Update `displayedColumns` to include Azure DevOps indicator column (optional)
2. Update `frontend/src/app/features/projects/project-detail/project-detail.component.html`:
   - Add "Import Work Items" button next to "Add Task" button
   - Show button only if `isAzureDevOpsEnabled` is true
   - Add icon to button (e.g., `cloud_download` or `sync`)
   - Add tooltip: "Import work items from Azure DevOps"
   - In task table, add visual indicator for Azure DevOps tasks:
     - Add badge or icon in task name column for imported tasks
     - Show Azure DevOps work item type (Bug, Task, User Story)
     - Make task name clickable to open Azure DevOps work item URL
   - Show last sync timestamp if available:
     - Display "Last synced: {timestamp}" below project description
3. Update `frontend/src/app/features/projects/project-detail/project-detail.component.scss`:
   - Style "Import Work Items" button to distinguish from "Add Task"
   - Style Azure DevOps badge/icon in task list
   - Add hover effect for Azure DevOps task links
   - Style last sync timestamp
4. Add Material modules if needed:
   - `MatBadgeModule` for Azure DevOps indicator
   - `MatTooltipModule` for button tooltip
5. Update task display logic:
   - Check if task has `azureDevOps.workItemId` to determine if it's imported
   - Display work item type badge (Bug, Task, User Story) with appropriate color
   - Make task name a link to `azureDevOps.sourceUrl` if available

## Tests
- Unit:
  - Test `isAzureDevOpsEnabled` is set correctly (Arrange: project with Azure DevOps enabled → Act: load project → Assert: isAzureDevOpsEnabled = true)
  - Test "Import Work Items" button shows when Azure DevOps enabled (Arrange: isAzureDevOpsEnabled = true → Act: render component → Assert: button visible)
  - Test "Import Work Items" button hides when Azure DevOps disabled (Arrange: isAzureDevOpsEnabled = false → Act: render component → Assert: button hidden)
  - Test `openImportDialog()` opens dialog (Arrange: component initialized → Act: call method → Assert: dialog opened)
  - Test dialog close refreshes task list (Arrange: dialog closed with result → Act: handle close → Assert: loadTasks called)
  - Test success snackbar shows after import (Arrange: import completed → Act: dialog closed → Assert: snackbar shown with result)
  - Test Azure DevOps badge shows for imported tasks (Arrange: task with workItemId → Act: render task → Assert: badge visible)
  - Test task name is clickable for Azure DevOps tasks (Arrange: task with sourceUrl → Act: render task → Assert: link present)
- Integration:
  - Test full import flow from button click to task list refresh
  - Test dialog integration with component

## Acceptance Criteria
- [ ] "Import Work Items" button is added to project detail view
- [ ] Button only shows when project has Azure DevOps enabled
- [ ] Button opens work item import dialog
- [ ] Dialog close refreshes task list if import was successful
- [ ] Success snackbar shows import result (imported and skipped counts)
- [ ] Azure DevOps tasks display visual indicator (badge or icon)
- [ ] Azure DevOps tasks show work item type (Bug, Task, User Story)
- [ ] Azure DevOps task names are clickable links to work item URL
- [ ] Last sync timestamp is displayed if available
- [ ] Manual task creation remains available (Add Task button)
- [ ] All unit tests pass with >80% coverage
- [ ] Frontend builds successfully: `cd frontend && npm run build`

## Validation
- Run: `cd frontend && npm run build` - should complete without errors
- Run: `cd frontend && npm test -- --include='**/project-detail.component.spec.ts'` - all tests should pass
- Manually test in browser:
  - Open project with Azure DevOps enabled: verify "Import Work Items" button shows
  - Open project without Azure DevOps: verify button does not show
  - Click "Import Work Items": verify dialog opens
  - Import work items: verify dialog closes, task list refreshes, snackbar shows
  - Verify imported tasks show Azure DevOps badge
  - Click task name: verify opens Azure DevOps work item in new tab
  - Verify last sync timestamp displays correctly
  - Verify "Add Task" button still works for manual task creation

## Notes
- The "Import Work Items" button should be visually distinct from "Add Task" button
- Consider using different colors for work item type badges:
  - Bug: red/pink
  - Task: blue
  - User Story: green
- The Azure DevOps icon/badge should be subtle but noticeable
- Task name link should open in new tab (`target="_blank"`)
- Last sync timestamp should use relative time (e.g., "2 hours ago") with MatMomentModule or date pipe
- Consider adding a refresh icon next to last sync timestamp to trigger re-import
- Example button layout:
  ```
  [Add Task] [Import Work Items]
  ```
- Example task display with Azure DevOps indicator:
  ```
  [Bug] Fix login issue 🔗
  [Task] Update documentation 🔗
  Create new feature (manual task, no icon)
  ```
- Consider showing import statistics in project detail:
  - "15 tasks imported from Azure DevOps"
  - "Last synced: 2 hours ago"
- Future enhancement: Add "Sync" button to re-import and update existing tasks
- Reference: https://material.angular.io/components/badge/overview
- Reference: https://material.angular.io/components/tooltip/overview
