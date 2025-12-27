# 10. Create Work Item Import UI Component for Project Detail View

meta:
  id: azure-devops-integration-10
  feature: azure-devops-integration
  priority: P2
  depends_on: [azure-devops-integration-06, azure-devops-integration-11]
  tags: [frontend, ui, component, dialog]

## Objective
- Create a dialog component for importing Azure DevOps work items with iteration selection

## Deliverables
- New component `frontend/src/app/features/projects/work-item-import-dialog/work-item-import-dialog.component.ts`
- New component HTML template
- New component SCSS styles
- Dialog for iteration selection and import preview

## Steps
1. Generate new component:
   - `ng generate component features/projects/work-item-import-dialog --standalone`
2. Create `work-item-import-dialog.component.ts`:
   - Make component standalone with necessary imports
   - Inject `MAT_DIALOG_DATA`, `MatDialogRef`, `AzureDevOpsService`
   - Accept dialog data: `{ projectId: string, projectName: string }`
   - Add properties:
     - `iterations: Iteration[] = []`
     - `selectedIteration: Iteration | null = null`
     - `loadingIterations: boolean = false`
     - `importing: boolean = false`
     - `importResult: { imported: number, skipped: number } | null = null`
     - `error: string | null = null`
   - In `ngOnInit()`, load iterations by calling `azureDevOpsService.getIterations(projectId)`
   - Add method `onIterationSelect(iteration: Iteration)` to set selected iteration
   - Add method `importWorkItems()`:
     - Set `importing = true`
     - Call `azureDevOpsService.importWorkItems(projectId, selectedIteration.path)`
     - On success: set `importResult`, show success message
     - On error: set `error`, show error message
     - Set `importing = false`
   - Add method `close()` to close dialog with result
3. Create `work-item-import-dialog.component.html`:
   - Add dialog title: "Import Work Items from Azure DevOps"
   - Add dialog content:
     - Show loading spinner while loading iterations
     - Show iteration list as radio buttons or dropdown
     - Display iteration details (name, date range)
     - Show selected iteration summary
     - Show import button (disabled if no iteration selected)
   - Add dialog actions:
     - "Cancel" button to close dialog
     - "Import" button to trigger import (disabled during import)
   - Show import progress (spinner) during import
   - Show import result (imported count, skipped count) after success
   - Show error message if import fails
4. Create `work-item-import-dialog.component.scss`:
   - Style iteration list for easy selection
   - Style import result display
   - Add loading and error state styles
5. Add Material modules:
   - `MatDialogModule` for dialog
   - `MatRadioModule` or `MatSelectModule` for iteration selection
   - `MatButtonModule` for action buttons
   - `MatProgressSpinnerModule` for loading states
   - `MatIconModule` for icons
   - `MatListModule` for iteration list (optional)
6. Create interface for Iteration:
   ```typescript
   interface Iteration {
     id: string;
     name: string;
     path: string;
     startDate: string;
     finishDate: string;
   }
   ```

## Tests
- Unit:
  - Test component initializes and loads iterations (Arrange: dialog opened → Act: ngOnInit → Assert: service called to load iterations)
  - Test iteration selection updates selectedIteration (Arrange: iterations loaded → Act: select iteration → Assert: selectedIteration set)
  - Test import button disabled when no iteration selected (Arrange: no iteration selected → Act: check button state → Assert: disabled)
  - Test import button enabled when iteration selected (Arrange: iteration selected → Act: check button state → Assert: enabled)
  - Test `importWorkItems()` calls service (Arrange: iteration selected → Act: click import → Assert: service called)
  - Test import success shows result (Arrange: successful import → Act: import completes → Assert: result displayed)
  - Test import error shows error message (Arrange: failed import → Act: import completes → Assert: error displayed)
  - Test close dialog returns result (Arrange: import completed → Act: close dialog → Assert: result returned)
- Integration:
  - Test full import flow with mocked service
  - Test dialog can be opened and closed

## Acceptance Criteria
- [ ] Work item import dialog component is created
- [ ] Dialog loads and displays available iterations on open
- [ ] User can select an iteration from the list
- [ ] Iteration details (name, date range) are displayed
- [ ] Import button is disabled until iteration is selected
- [ ] Import button triggers work item import
- [ ] Loading spinner shows during import operation
- [ ] Import result shows count of imported and skipped work items
- [ ] Error message displays if import fails
- [ ] Dialog can be closed with cancel button
- [ ] Dialog returns import result when closed after successful import
- [ ] All unit tests pass with >80% coverage
- [ ] Frontend builds successfully: `cd frontend && npm run build`

## Validation
- Run: `cd frontend && npm run build` - should complete without errors
- Run: `cd frontend && npm test -- --include='**/work-item-import-dialog.component.spec.ts'` - all tests should pass
- Manually test in browser:
  - Open dialog: verify iterations load and display
  - Select iteration: verify import button enables
  - Click import: verify loading spinner shows
  - After import: verify result shows imported and skipped counts
  - Test error case: verify error message displays
  - Click cancel: verify dialog closes without importing

## Notes
- The dialog should be opened from the project detail view (task 12)
- Iterations should be sorted by start date (most recent first)
- Consider showing iteration status (current, past, future) with visual indicators
- The import operation may take several seconds for large iterations (show progress)
- After successful import, the dialog should remain open to show results
- User can close dialog manually after reviewing results
- Consider adding a "View Imported Tasks" button that closes dialog and scrolls to task list
- Example iteration display:
  ```
  ○ Sprint 1 (Jan 1 - Jan 14, 2024)
  ○ Sprint 2 (Jan 15 - Jan 28, 2024) [Current]
  ○ Sprint 3 (Jan 29 - Feb 11, 2024)
  ```
- Show work item type filter info: "Only Bug, Task, and User Story work items will be imported"
- Consider adding a preview step that shows work items before importing (future enhancement)
- Reference: https://material.angular.io/components/dialog/overview
- Reference: https://material.angular.io/components/radio/overview
