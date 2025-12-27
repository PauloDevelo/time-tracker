# Task 03: Integrate Material Autocomplete in Project Form

## Objective
Replace the plain text input for Azure DevOps project name with a Material Autocomplete that suggests previously used project names.

## Deliverables
1. Import MatAutocompleteModule in project-form component
2. Add property to store suggestions
3. Load suggestions when customer is selected and Azure DevOps is enabled
4. Filter suggestions as user types
5. Update template to use mat-autocomplete

## Steps
1. Add MatAutocompleteModule to component imports
2. Add properties:
   - `azureDevOpsProjectSuggestions: string[]`
   - `filteredProjectSuggestions$: Observable<string[]>`
3. Create method to load suggestions when customer changes
4. Create filter method for autocomplete
5. Update template:
   - Add `[matAutocomplete]` directive to input
   - Add `<mat-autocomplete>` with options
6. Ensure existing validation still works

## Files to Modify
- `frontend/src/app/features/projects/project-form/project-form.component.ts`
- `frontend/src/app/features/projects/project-form/project-form.component.html`

## Dependencies
- Task 02 must be completed (service method exists)

## Acceptance Criteria
- Autocomplete shows previously used Azure DevOps project names
- Suggestions filter as user types
- User can still enter a new name not in the list
- Suggestions load when customer is selected
- Existing validation flow continues to work
- TypeScript compiles without errors
