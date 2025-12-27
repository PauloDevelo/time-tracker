# 08. Update Customer Form with Azure DevOps PAT Configuration

meta:
  id: azure-devops-integration-08
  feature: azure-devops-integration
  priority: P2
  depends_on: [azure-devops-integration-01]
  tags: [frontend, ui, forms]

## Objective
- Add Azure DevOps configuration section to customer form for PAT and organization URL input

## Deliverables
- Updated `frontend/src/app/features/customers/customer-form/customer-form.component.ts`
- Updated `frontend/src/app/features/customers/customer-form/customer-form.component.html`
- Updated `frontend/src/app/core/models/customer.model.ts`
- Form validation for Azure DevOps fields

## Steps
1. Update `frontend/src/app/core/models/customer.model.ts`:
   - Add `azureDevOps` property to `Customer` interface:
     ```typescript
     azureDevOps?: {
       organizationUrl: string;
       pat: string;
       enabled: boolean;
     };
     ```
   - Add same property to `CustomerCreateRequest` interface
2. Update `frontend/src/app/features/customers/customer-form/customer-form.component.ts`:
   - Add `azureDevOps` form group to `customerForm`:
     ```typescript
     azureDevOps: this.fb.group({
       organizationUrl: ['', [Validators.pattern(/^https:\/\/(dev\.azure\.com\/[^\/]+|[^\/]+\.visualstudio\.com)$/)]],
       pat: [''],
       enabled: [false]
     })
     ```
   - Add getter method for azureDevOps form group
   - Add method `toggleAzureDevOps()` to enable/disable Azure DevOps section
   - Add validation: if `enabled` is true, then `organizationUrl` and `pat` are required
   - Update `patchFormValues()` to include Azure DevOps fields
3. Update `frontend/src/app/features/customers/customer-form/customer-form.component.html`:
   - Add new section "Azure DevOps Integration" after billing details
   - Add checkbox for "Enable Azure DevOps Integration"
   - Add text input for "Organization URL" with placeholder "https://dev.azure.com/yourorg"
   - Add password input for "Personal Access Token (PAT)" with type="password"
   - Add help text explaining how to generate PAT
   - Show/hide organization URL and PAT fields based on enabled checkbox
   - Add validation error messages for invalid URL format
4. Add Material modules if needed:
   - `MatCheckboxModule` for enable checkbox
   - `MatExpansionModule` for collapsible section (optional)
5. Style the Azure DevOps section to visually separate it from other form sections

## Tests
- Unit:
  - Test form includes azureDevOps form group (Arrange: component initialized → Act: check form structure → Assert: azureDevOps group exists)
  - Test organizationUrl validates URL format (Arrange: invalid URL → Act: set value → Assert: form invalid)
  - Test organizationUrl accepts valid Azure DevOps URLs (Arrange: valid URL → Act: set value → Assert: form valid)
  - Test PAT and organizationUrl are required when enabled=true (Arrange: enabled=true, empty fields → Act: validate → Assert: form invalid)
  - Test PAT and organizationUrl are optional when enabled=false (Arrange: enabled=false, empty fields → Act: validate → Assert: form valid)
  - Test `toggleAzureDevOps()` updates enabled flag (Arrange: enabled=false → Act: toggle → Assert: enabled=true)
  - Test form patch includes Azure DevOps fields (Arrange: customer with Azure DevOps config → Act: patch form → Assert: fields populated)
- Integration:
  - Test form submission includes Azure DevOps data
  - Test validation prevents submission with invalid data

## Acceptance Criteria
- [ ] Customer model includes `azureDevOps` property
- [ ] Customer form includes Azure DevOps configuration section
- [ ] Enable checkbox toggles visibility of Azure DevOps fields
- [ ] Organization URL field validates Azure DevOps URL format
- [ ] PAT field uses password input type for security
- [ ] Help text explains how to generate Azure DevOps PAT
- [ ] Required validation applies when Azure DevOps is enabled
- [ ] Form submission includes Azure DevOps configuration
- [ ] Existing customers can be edited to add Azure DevOps config
- [ ] All unit tests pass with >80% coverage
- [ ] Frontend builds successfully: `cd frontend && npm run build`

## Validation
- Run: `cd frontend && npm run build` - should complete without errors
- Run: `cd frontend && npm test -- --include='**/customer-form.component.spec.ts'` - all tests should pass
- Manually test in browser:
  - Create new customer: verify Azure DevOps section appears
  - Enable Azure DevOps: verify organization URL and PAT fields appear
  - Enter invalid URL: verify validation error shows
  - Enter valid URL and PAT: verify form is valid
  - Submit form: verify Azure DevOps config is included in request
  - Edit existing customer: verify can add Azure DevOps config

## Notes
- PAT should be masked (password input type) for security
- Organization URL format: `https://dev.azure.com/{organization}` or `https://{organization}.visualstudio.com`
- Help text for PAT generation: "Generate a PAT in Azure DevOps: User Settings → Personal Access Tokens → New Token. Required scopes: Work Items (Read), Project and Team (Read)"
- Consider adding a "Test Connection" button in future enhancement (not in this task)
- The PAT is write-only; when editing existing customer, the PAT field should be empty (not pre-filled)
- Add note in UI: "PAT is encrypted and stored securely. It will not be displayed after saving."
- Example organization URLs:
  - `https://dev.azure.com/mycompany`
  - `https://mycompany.visualstudio.com`
- Consider using MatExpansionPanel for collapsible Azure DevOps section to reduce form clutter
- Reference: https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate
