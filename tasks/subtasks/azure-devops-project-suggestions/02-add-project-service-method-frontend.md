# Task 02: Add Frontend Service Method for Suggestions

## Objective
Add a method to the ProjectService to fetch Azure DevOps project name suggestions from the backend.

## Deliverables
1. New method `getAzureDevOpsProjectNames(customerId?: string)` in `ProjectService`
2. Return type interface if needed

## Steps
1. Add method to `project.service.ts` that calls the new backend endpoint
2. Handle optional `customerId` parameter as query string
3. Return Observable<string[]>

## Files to Modify
- `frontend/src/app/core/services/project.service.ts`

## Dependencies
- Task 01 must be completed (backend endpoint exists)

## Acceptance Criteria
- Method returns Observable<string[]>
- Optional customerId parameter is passed as query param
- Follows existing service patterns
- TypeScript compiles without errors
