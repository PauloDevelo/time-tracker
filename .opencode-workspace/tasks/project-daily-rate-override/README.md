# Project-Level Daily Rate Override

Objective: Enable projects to optionally override the customer's default daily rate for invoice calculations

Status: completed
Started: 2025-12-26
Completed: 2025-12-26

Status legend: [ ] todo, [~] in-progress, [x] done, [!] failed

## Tasks
- [x] 01 — Extend Backend Project Model with Billing Override → `01-extend-project-model-backend.md`
- [x] 02 — Update Report Service to Use Project Rate Override → `02-update-report-service-rate-logic.md`
- [x] 03 — Extend Frontend Project Model Interfaces → `03-extend-project-model-frontend.md`
- [x] 04 — Add Billing Override Fields to Project Form → `04-add-billing-override-form-fields.md`
- [x] 05 — Add Styling for Billing Override Section → `05-add-billing-override-ui-styling.md`
- [x] 06 — Add Unit Tests for Rate Override Logic → `06-add-unit-tests.md`

## Dependencies
- 02 depends on 01
- 04 depends on 03
- 05 depends on 04
- 06 depends on 01, 02

## Exit Criteria
- [x] Projects can optionally have a `billingOverride.dailyRate` field
- [x] Invoice reports correctly use project rate when set, otherwise fall back to customer rate
- [x] Project form UI shows collapsible billing override section with inherited rate hint
- [x] All existing tests pass (15 new tests added, all passing)
- [x] TypeScript compiles without errors on both frontend and backend
- [x] Existing projects without override continue to work unchanged

## Implementation Log

### Task 01: Completed
- Files: `backend/src/models/Project.ts`
- Added `billingOverride` interface and schema with optional `dailyRate` and `currency` fields
- Validation: TypeScript build passed

### Task 02: Completed
- Files: `backend/src/services/report.service.ts`
- Updated invoice calculation to use `project.billingOverride?.dailyRate ?? customer.billingDetails.dailyRate`
- Added exported helper functions: `getDailyRate()`, `getHourlyRate()`
- Validation: TypeScript build passed

### Task 03: Completed
- Files: `frontend/src/app/core/models/project.model.ts`
- Added `billingOverride` to `Project` and `ProjectCreateRequest` interfaces
- Validation: TypeScript build passed

### Task 04: Completed
- Files: `frontend/src/app/features/projects/project-form/project-form.component.ts`, `.html`
- Added billing override expansion panel with checkbox and daily rate input
- Shows customer's default rate as reference
- Validation: TypeScript build passed

### Task 05: Completed
- Files: `frontend/src/app/features/projects/project-form/project-form.component.scss`
- Added styling consistent with Azure DevOps section
- Responsive design for mobile

### Task 06: Completed
- Files: `backend/jest.config.js`, `backend/src/services/report.service.test.ts`
- Added 15 unit tests covering all rate override scenarios
- All tests passing

## Files Modified

### Backend
- `backend/src/models/Project.ts` - Added billingOverride schema
- `backend/src/services/report.service.ts` - Updated rate calculation logic
- `backend/src/services/report.service.test.ts` - New test file (15 tests)
- `backend/jest.config.js` - New Jest configuration

### Frontend
- `frontend/src/app/core/models/project.model.ts` - Added billingOverride interface
- `frontend/src/app/features/projects/project-form/project-form.component.ts` - Form logic
- `frontend/src/app/features/projects/project-form/project-form.component.html` - UI template
- `frontend/src/app/features/projects/project-form/project-form.component.scss` - Styling
