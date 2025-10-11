# 09. Update Project Form with Azure DevOps Project Linking

meta:
  id: azure-devops-integration-09
  feature: azure-devops-integration
  priority: P2
  depends_on: [azure-devops-integration-02, azure-devops-integration-05]
  tags: [frontend, ui, forms]

## Objective
- Add Azure DevOps project name field to project form with real-time validation

## Deliverables
- Updated `frontend/src/app/features/projects/project-form/project-form.component.ts`
- Updated `frontend/src/app/features/projects/project-form/project-form.component.html`
- Updated `frontend/src/app/core/models/project.model.ts`
- Real-time validation against Azure DevOps API

## Steps
1. Update `frontend/src/app/core/models/project.model.ts`:
   - Add `azureDevOps` property to `Project` interface:
     ```typescript
     azureDevOps?: {
       projectName: string;
       projectId: string;
       enabled: boolean;
       lastSyncedAt?: Date;
     };
     ```
   - Add same property to `ProjectCreateRequest` interface
2. Update `frontend/src/app/features/projects/project-form/project-form.component.ts`:
   - Inject `ProjectService` and `CustomerService`
   - Add `azureDevOps` form group to `projectForm`:
     ```typescript
     azureDevOps: this.fb.group({
       projectName: [''],
       projectId: [''],
       enabled: [false]
     })
     ```
   - Add property `customerHasAzureDevOps: boolean = false`
   - Add property `validatingAzureDevOps: boolean = false`
   - Add property `azureDevOpsValidationResult: { valid: boolean, error?: string } | null = null`
   - In `ngOnInit()`, check if selected customer has Azure DevOps enabled
   - Add method `onCustomerChange()` to check if customer has Azure DevOps when customer is selected
   - Add method `validateAzureDevOpsProject()` to call validation endpoint:
     - Set `validatingAzureDevOps = true`
     - Call `projectService.validateAzureDevOpsProject(projectId, projectName)`
     - On success: set `azureDevOpsValidationResult = { valid: true }`, populate `projectId` field
     - On error: set `azureDevOpsValidationResult = { valid: false, error: message }`
     - Set `validatingAzureDevOps = false`
   - Add debounced validation on projectName input change (500ms delay)
   - Update `initForm()` to include Azure DevOps fields
3. Update `frontend/src/app/features/projects/project-form/project-form.component.html`:
   - Add new section "Azure DevOps Integration" after customer selection
   - Show section only if `customerHasAzureDevOps` is true
   - Add checkbox for "Link to Azure DevOps Project"
   - Add text input for "Azure DevOps Project Name"
   - Add "Validate" button next to project name field
   - Show loading spinner when `validatingAzureDevOps` is true
   - Show success icon (checkmark) when validation succeeds
   - Show error message when validation fails
   - Disable form submission if Azure DevOps is enabled but not validated
4. Add Material modules if needed:
   - `MatCheckboxModule` for enable checkbox
   - `MatProgressSpinnerModule` for validation loading
   - `MatIconModule` for success/error icons
5. Style validation feedback (green checkmark for success, red error message for failure)

## Tests
- Unit:
  - Test form includes azureDevOps form group (Arrange: component initialized → Act: check form structure → Assert: azureDevOps group exists)
  - Test Azure DevOps section shows only if customer has Azure DevOps (Arrange: customer with Azure DevOps → Act: select customer → Assert: section visible)
  - Test Azure DevOps section hides if customer has no Azure DevOps (Arrange: customer without Azure DevOps → Act: select customer → Assert: section hidden)
  - Test `validateAzureDevOpsProject()` calls service (Arrange: project name entered → Act: call validate → Assert: service called)
  - Test validation success updates form (Arrange: valid project name → Act: validate → Assert: projectId populated, valid=true)
  - Test validation failure shows error (Arrange: invalid project name → Act: validate → Assert: error message shown)
  - Test debounced validation triggers after delay (Arrange: project name typed → Act: wait 500ms → Assert: validation called)
  - Test form submission disabled when Azure DevOps enabled but not validated (Arrange: enabled=true, not validated → Act: check form validity → Assert: form invalid)
- Integration:
  - Test full validation flow with mocked service
  - Test form submission includes Azure DevOps data

## Acceptance Criteria
- [ ] Project model includes `azureDevOps` property
- [ ] Project form includes Azure DevOps project linking section
- [ ] Section only shows if selected customer has Azure DevOps configured
- [ ] Enable checkbox toggles Azure DevOps project name field
- [ ] Validate button triggers real-time validation against Azure DevOps API
- [ ] Validation shows loading spinner during API call
- [ ] Validation shows success icon when project is found
- [ ] Validation shows error message when project is not found
- [ ] Form submission disabled if Azure DevOps enabled but not validated
- [ ] Debounced validation triggers automatically on project name change
- [ ] Form submission includes Azure DevOps configuration
- [ ] All unit tests pass with >80% coverage
- [ ] Frontend builds successfully: `cd frontend && npm run build`

## Validation
- Run: `cd frontend && npm run build` - should complete without errors
- Run: `cd frontend && npm test -- --include='**/project-form.component.spec.ts'` - all tests should pass
- Manually test in browser:
  - Create new project: select customer with Azure DevOps, verify section appears
  - Select customer without Azure DevOps: verify section does not appear
  - Enable Azure DevOps: verify project name field appears
  - Enter valid project name: verify validation succeeds, checkmark appears
  - Enter invalid project name: verify validation fails, error message appears
  - Submit form with validated project: verify Azure DevOps config included
  - Try to submit with enabled but not validated: verify form is invalid

## Notes
- The validation endpoint is `POST /api/projects/:id/validate-azure-devops` (from task 05)
- For new projects (create mode), use a temporary project ID or validate without project ID
- Consider showing a list of available Azure DevOps projects as a dropdown (future enhancement)
- Debouncing prevents excessive API calls while user is typing
- The `projectId` (GUID) is populated automatically after successful validation
- Validation should be re-triggered if project name changes after initial validation
- Show helpful message: "This project will be linked to Azure DevOps. Work items can be imported from iterations."
- Example validation flow:
  1. User selects customer with Azure DevOps configured
  2. User enables "Link to Azure DevOps Project"
  3. User types project name "MyProject"
  4. After 500ms, validation triggers automatically
  5. Loading spinner shows during validation
  6. On success: checkmark appears, projectId populated
  7. On failure: error message shows "Project 'MyProject' not found in Azure DevOps"
- Consider caching validation results to avoid redundant API calls
- The validation button allows manual re-validation if needed
- Reference: https://material.angular.io/components/progress-spinner/overview
