# Azure DevOps Integration

Objective: Integrate Azure DevOps to sync projects and import work items as tasks, replacing manual task creation with automated iteration-based imports

Status legend: [ ] todo, [~] in-progress, [x] done

## Tasks
- [x] 01 — Extend Customer model with Azure DevOps configuration → `01-extend-customer-model-with-azure-devops-config.md`
- [x] 02 — Extend Project model with Azure DevOps metadata → `02-extend-project-model-with-azure-devops-metadata.md`
- [ ] 03 — Extend Task model with Azure DevOps work item mapping → `03-extend-task-model-with-azure-devops-work-item-mapping.md`
- [ ] 04 — Create Azure DevOps API client service → `04-create-azure-devops-client-service.md`
- [ ] 05 — Implement Azure DevOps project validation endpoint → `05-implement-azure-devops-project-validation-endpoint.md`
- [ ] 06 — Implement work item import endpoint for iterations → `06-implement-work-item-import-endpoint.md`
- [ ] 07 — Create Azure DevOps sync service for work item transformation → `07-create-azure-devops-sync-service.md`
- [ ] 08 — Update customer form with Azure DevOps PAT configuration → `08-update-customer-form-with-azure-devops-fields.md`
- [ ] 09 — Update project form with Azure DevOps project linking → `09-update-project-form-with-azure-devops-fields.md`
- [ ] 10 — Create work item import UI component for project detail view → `10-create-work-item-import-ui-component.md`
- [ ] 11 — Add Azure DevOps service in frontend → `11-add-azure-devops-service-frontend.md`
- [ ] 12 — Update project detail view with import functionality → `12-update-project-detail-view-with-import-functionality.md`
- [ ] 13 — Add integration tests for Azure DevOps endpoints → `13-add-integration-tests-for-azure-devops-endpoints.md`
- [ ] 14 — Add unit tests for Azure DevOps services → `14-add-unit-tests-for-azure-devops-services.md`

## Dependencies
- 02 depends on 01 (Project model needs Customer's Azure DevOps config)
- 03 depends on 02 (Task model needs Project's Azure DevOps metadata)
- 04 depends on 01 (Client needs Customer PAT configuration)
- 05 depends on 04 (Validation endpoint needs client service)
- 06 depends on 04, 07 (Import endpoint needs client and sync service)
- 07 depends on 03, 04 (Sync service needs Task model and client)
- 08 depends on 01 (Frontend form needs backend Customer model)
- 09 depends on 02, 05 (Frontend form needs backend Project model and validation)
- 10 depends on 06, 11 (Import UI needs backend endpoint and frontend service)
- 11 depends on 05, 06 (Frontend service needs backend endpoints)
- 12 depends on 10 (Project detail integrates import component)
- 13 depends on 05, 06, 07 (Integration tests need all backend endpoints)
- 14 depends on 04, 07 (Unit tests need services)

## Exit Criteria
- Customer model stores encrypted Azure DevOps PAT and organization URL
- Project model stores Azure DevOps project name and validates against Azure DevOps API
- Task model stores Azure DevOps work item ID, type, and state for synchronization
- Backend can authenticate with Azure DevOps API using customer PAT
- Backend can fetch and filter work items by iteration (bugs, tasks, user stories only)
- Backend transforms Azure DevOps work items into application tasks with proper mapping
- Customer form includes secure PAT input field with validation
- Project form includes Azure DevOps project name field with real-time validation
- Project detail view has "Import Work Items" button with iteration selector
- Imported tasks display Azure DevOps work item metadata and link back to Azure DevOps
- All backend endpoints have integration tests with >80% coverage
- All services have unit tests with >80% coverage
- Manual task creation remains available as fallback option
- Build and tests pass for both frontend and backend
