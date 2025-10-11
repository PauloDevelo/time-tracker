# 11. Add Azure DevOps Service in Frontend

meta:
  id: azure-devops-integration-11
  feature: azure-devops-integration
  priority: P2
  depends_on: [azure-devops-integration-05, azure-devops-integration-06]
  tags: [frontend, service, api]

## Objective
- Create Angular service to interact with Azure DevOps backend endpoints

## Deliverables
- New file `frontend/src/app/core/services/azure-devops.service.ts`
- Service methods for validation, iteration listing, and work item import
- Error handling and type definitions

## Steps
1. Create `frontend/src/app/core/services/azure-devops.service.ts`:
   - Add `@Injectable({ providedIn: 'root' })` decorator
   - Inject `HttpClient`
   - Set base URL from environment config
2. Add method `validateAzureDevOpsProject(projectId: string, projectName: string): Observable<AzureDevOpsValidationResult>`:
   - POST to `/api/projects/${projectId}/validate-azure-devops`
   - Send body: `{ projectName }`
   - Return Observable with validation result
   - Handle errors with `catchError` and return user-friendly error message
3. Add method `getIterations(projectId: string): Observable<Iteration[]>`:
   - GET from `/api/projects/${projectId}/azure-devops/iterations`
   - Return Observable with array of iterations
   - Handle errors with `catchError`
4. Add method `importWorkItems(projectId: string, iterationPath: string): Observable<ImportResult>`:
   - POST to `/api/projects/${projectId}/azure-devops/import-work-items`
   - Send body: `{ iterationPath }`
   - Return Observable with import result (imported count, skipped count, tasks)
   - Handle errors with `catchError`
5. Create TypeScript interfaces in the service file:
   ```typescript
   export interface AzureDevOpsValidationResult {
     valid: boolean;
     projectId?: string;
     projectName?: string;
     projectUrl?: string;
     error?: string;
   }
   
   export interface Iteration {
     id: string;
     name: string;
     path: string;
     startDate: string;
     finishDate: string;
   }
   
   export interface ImportResult {
     imported: number;
     skipped: number;
     tasks: Task[];
   }
   ```
6. Add error handling:
   - Map HTTP errors to user-friendly messages
   - Handle 400 (bad request), 401 (unauthorized), 404 (not found), 503 (service unavailable)
   - Use `throwError` to propagate errors to components
7. Add logging for API calls (optional, use console.log in development)

## Tests
- Unit:
  - Test `validateAzureDevOpsProject()` makes correct HTTP request (Arrange: mock HttpClient → Act: call method → Assert: POST request made with correct URL and body)
  - Test `validateAzureDevOpsProject()` returns validation result (Arrange: mock successful response → Act: call method → Assert: returns validation result)
  - Test `validateAzureDevOpsProject()` handles errors (Arrange: mock error response → Act: call method → Assert: error thrown)
  - Test `getIterations()` makes correct HTTP request (Arrange: mock HttpClient → Act: call method → Assert: GET request made with correct URL)
  - Test `getIterations()` returns iteration array (Arrange: mock successful response → Act: call method → Assert: returns iterations)
  - Test `getIterations()` handles errors (Arrange: mock error response → Act: call method → Assert: error thrown)
  - Test `importWorkItems()` makes correct HTTP request (Arrange: mock HttpClient → Act: call method → Assert: POST request made with correct URL and body)
  - Test `importWorkItems()` returns import result (Arrange: mock successful response → Act: call method → Assert: returns import result)
  - Test `importWorkItems()` handles errors (Arrange: mock error response → Act: call method → Assert: error thrown)
- Integration:
  - Test service with HttpClientTestingModule
  - Test error handling with various HTTP error codes

## Acceptance Criteria
- [ ] `AzureDevOpsService` is created in `frontend/src/app/core/services/`
- [ ] Service is injectable with `providedIn: 'root'`
- [ ] `validateAzureDevOpsProject()` method calls validation endpoint
- [ ] `getIterations()` method calls iterations endpoint
- [ ] `importWorkItems()` method calls import endpoint
- [ ] All methods return Observables with proper types
- [ ] Error handling maps HTTP errors to user-friendly messages
- [ ] TypeScript interfaces are defined for all response types
- [ ] All unit tests pass with >80% coverage
- [ ] Frontend builds successfully: `cd frontend && npm run build`

## Validation
- Run: `cd frontend && npm run build` - should complete without errors
- Run: `cd frontend && npm test -- --include='**/azure-devops.service.spec.ts'` - all tests should pass
- Manually test with browser dev tools:
  - Call `validateAzureDevOpsProject()`: verify HTTP request is made
  - Call `getIterations()`: verify HTTP request is made
  - Call `importWorkItems()`: verify HTTP request is made
  - Test error handling: mock error responses, verify errors are handled

## Notes
- The service should use the existing `AuthInterceptor` for authentication (JWT token)
- Base URL should come from environment configuration (e.g., `environment.apiUrl`)
- Consider adding retry logic for transient network errors (use RxJS `retry` operator)
- Error messages should be user-friendly and actionable:
  - 400: "Invalid request. Please check your input."
  - 401: "Azure DevOps authentication failed. Please check your PAT."
  - 404: "Project or iteration not found in Azure DevOps."
  - 503: "Azure DevOps service is unavailable. Please try again later."
- The service should be stateless (no internal state management)
- Consider adding request caching for iterations (use RxJS `shareReplay`)
- Example usage in component:
  ```typescript
  this.azureDevOpsService.validateAzureDevOpsProject(projectId, projectName)
    .subscribe({
      next: (result) => {
        if (result.valid) {
          console.log('Project validated:', result.projectId);
        } else {
          console.error('Validation failed:', result.error);
        }
      },
      error: (err) => {
        console.error('Validation error:', err);
      }
    });
  ```
- Reference: https://angular.io/guide/http
- Reference: https://rxjs.dev/api/index/function/catchError
