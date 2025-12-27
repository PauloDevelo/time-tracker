# Azure DevOps Project Name Suggestions

Objective: Suggest previously used Azure DevOps project names when creating/editing projects

Status: completed
Started: 2025-12-26
Completed: 2025-12-26

Status legend: [ ] todo, [~] in-progress, [x] done, [!] failed

## Tasks
- [x] 01 — Add backend endpoint to get distinct Azure DevOps project names → `01-add-azure-devops-project-names-endpoint.md`
- [x] 02 — Add frontend service method to fetch suggestions → `02-add-project-service-method-frontend.md`
- [x] 03 — Integrate Material autocomplete in project form → `03-integrate-autocomplete-in-project-form.md`

## Dependencies
- 02 depends on 01
- 03 depends on 02

## Exit Criteria
- [x] Users see autocomplete with previously used Azure DevOps project names when typing
- [x] Suggestions are filtered by the selected customer (same organization)
- [x] Users can still type a new project name not in the list
- [x] Existing validation functionality continues to work

## Implementation Log
- **01**: Completed at 2025-12-26
  - Files: backend/src/controllers/project.controller.ts, backend/src/routes/project.routes.ts
  - Validation: TypeScript build passed
  - Notes: Added GET /api/projects/azure-devops-project-names endpoint with optional customerId filter

- **02**: Completed at 2025-12-26
  - Files: frontend/src/app/core/services/project.service.ts
  - Validation: TypeScript build passed
  - Notes: Added getAzureDevOpsProjectNames(customerId?: string): Observable<string[]> method

- **03**: Completed at 2025-12-26
  - Files: frontend/src/app/features/projects/project-form/project-form.component.ts, project-form.component.html
  - Validation: TypeScript build passed
  - Notes: Added MatAutocomplete with filtered suggestions, loads on customer selection
