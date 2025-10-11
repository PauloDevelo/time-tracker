# 14. Add Unit Tests for Azure DevOps Services

meta:
  id: azure-devops-integration-14
  feature: azure-devops-integration
  priority: P2
  depends_on: [azure-devops-integration-04, azure-devops-integration-07]
  tags: [backend, testing, unit]

## Objective
- Create comprehensive unit tests for Azure DevOps client and sync services

## Deliverables
- New file `backend/src/services/__tests__/azure-devops-client.service.test.ts`
- New file `backend/src/services/__tests__/azure-devops-sync.service.test.ts`
- Unit tests with >80% code coverage for both services

## Steps
1. Create `backend/src/services/__tests__/azure-devops-client.service.test.ts`:
   - Mock axios for HTTP requests
   - Create test suite for `AzureDevOpsClient` class
   - Test constructor initializes axios correctly
   - Test `validateConnection()` method:
     - Returns true for successful connection
     - Returns false for authentication failure
     - Handles network errors gracefully
   - Test `getProject()` method:
     - Returns project details for valid project name
     - Throws error for non-existent project
     - Handles API errors
   - Test `getIterations()` method:
     - Returns array of iterations
     - Handles empty iteration list
     - Handles API errors
   - Test `getWorkItemsByIteration()` method:
     - Returns filtered work items (Bug, Task, User Story only)
     - Excludes other work item types
     - Handles empty work item list
     - Handles WIQL query errors
   - Test error handling for various HTTP status codes (401, 404, 429, 503)
2. Create `backend/src/services/__tests__/azure-devops-sync.service.test.ts`:
   - Mock Task model for database operations
   - Create test suite for `AzureDevOpsSyncService` class
   - Test `transformWorkItemToTask()` method:
     - Maps all work item fields correctly to task fields
     - Handles missing optional fields (description, assignedTo)
     - Sets Azure DevOps metadata correctly
     - Generates correct source URL
   - Test `importWorkItems()` method:
     - Creates new tasks for new work items
     - Skips duplicate work items
     - Returns correct import statistics (imported, skipped counts)
     - Handles database errors
   - Test `shouldUpdateExistingTask()` method:
     - Returns true when state has changed
     - Returns true when last sync was >24 hours ago
     - Returns false when state unchanged and recently synced
   - Test `updateTaskFromWorkItem()` method:
     - Updates task fields from work item
     - Updates lastSyncedAt timestamp
     - Preserves non-Azure DevOps fields
3. Create test fixtures:
   - Sample Azure DevOps work item objects (Bug, Task, User Story, Epic)
   - Sample project response
   - Sample iteration response
   - Sample WIQL query response
4. Use `jest.mock()` to mock external dependencies (axios, mongoose models)
5. Use `beforeEach()` to reset mocks before each test
6. Assert on:
   - Method return values
   - Method call arguments
   - Error handling behavior
   - Data transformations

## Tests
- Unit:
  - **AzureDevOpsClient:**
    - Constructor initializes axios with correct base URL and headers
    - `validateConnection()` returns true for 200 response
    - `validateConnection()` returns false for 401 response
    - `validateConnection()` handles network errors
    - `getProject()` returns project object for valid project
    - `getProject()` throws error for 404 response
    - `getIterations()` returns iteration array
    - `getIterations()` handles empty response
    - `getWorkItemsByIteration()` returns filtered work items
    - `getWorkItemsByIteration()` excludes non-Bug/Task/UserStory types
    - Error handling for 429 (rate limit) response
    - Error handling for 503 (service unavailable) response
  - **AzureDevOpsSyncService:**
    - `transformWorkItemToTask()` maps title to name
    - `transformWorkItemToTask()` maps description correctly
    - `transformWorkItemToTask()` handles missing description
    - `transformWorkItemToTask()` sets workItemId correctly
    - `transformWorkItemToTask()` sets workItemType correctly
    - `transformWorkItemToTask()` sets state correctly
    - `transformWorkItemToTask()` sets iterationPath correctly
    - `transformWorkItemToTask()` handles missing assignedTo
    - `transformWorkItemToTask()` sets sourceUrl correctly
    - `importWorkItems()` creates tasks for new work items
    - `importWorkItems()` skips existing work items
    - `importWorkItems()` returns correct statistics
    - `importWorkItems()` handles database errors
    - `shouldUpdateExistingTask()` returns true for state change
    - `shouldUpdateExistingTask()` returns true for old sync
    - `shouldUpdateExistingTask()` returns false for recent sync
    - `updateTaskFromWorkItem()` updates task fields
    - `updateTaskFromWorkItem()` updates lastSyncedAt

## Acceptance Criteria
- [ ] Unit test file for `AzureDevOpsClient` is created
- [ ] Unit test file for `AzureDevOpsSyncService` is created
- [ ] All client service methods are tested
- [ ] All sync service methods are tested
- [ ] Tests use mocked dependencies (axios, mongoose)
- [ ] Tests verify correct behavior for success scenarios
- [ ] Tests verify correct error handling for failure scenarios
- [ ] Test coverage for both services is >80%
- [ ] All unit tests pass: `cd backend && npm test -- azure-devops`
- [ ] Backend builds successfully: `cd backend && npm run build`

## Validation
- Run: `cd backend && npm run build` - should complete without errors
- Run: `cd backend && npm test -- azure-devops-client.service` - all tests should pass
- Run: `cd backend && npm test -- azure-devops-sync.service` - all tests should pass
- Check test coverage: `cd backend && npm test -- --coverage azure-devops` - verify >80% coverage
- Manually review test output: verify all methods are tested
- Verify mocks are properly reset between tests (no test pollution)

## Notes
- Use `jest.mock()` to mock axios and mongoose models
- Use `jest.spyOn()` to spy on method calls
- Example test structure for client:
  ```typescript
  import axios from 'axios';
  import { AzureDevOpsClient } from '../azure-devops-client.service';
  
  jest.mock('axios');
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  
  describe('AzureDevOpsClient', () => {
    let client: AzureDevOpsClient;
    
    beforeEach(() => {
      jest.clearAllMocks();
      client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
    });
    
    describe('validateConnection', () => {
      it('should return true for successful connection', async () => {
        mockedAxios.get.mockResolvedValue({ status: 200, data: {} });
        const result = await client.validateConnection();
        expect(result).toBe(true);
      });
      
      it('should return false for authentication failure', async () => {
        mockedAxios.get.mockRejectedValue({ response: { status: 401 } });
        const result = await client.validateConnection();
        expect(result).toBe(false);
      });
    });
  });
  ```
- Example test structure for sync service:
  ```typescript
  import { AzureDevOpsSyncService } from '../azure-devops-sync.service';
  import { Task } from '../../models/Task';
  
  jest.mock('../../models/Task');
  
  describe('AzureDevOpsSyncService', () => {
    let service: AzureDevOpsSyncService;
    
    beforeEach(() => {
      jest.clearAllMocks();
      service = new AzureDevOpsSyncService();
    });
    
    describe('transformWorkItemToTask', () => {
      it('should map work item fields to task fields', () => {
        const workItem = {
          id: 123,
          url: 'https://dev.azure.com/myorg/_workitems/123',
          fields: {
            'System.Title': 'Test Bug',
            'System.WorkItemType': 'Bug',
            'System.State': 'Active'
          }
        };
        
        const task = service.transformWorkItemToTask(workItem, 'project-id', 'user-id');
        
        expect(task.name).toBe('Test Bug');
        expect(task.azureDevOps.workItemId).toBe(123);
        expect(task.azureDevOps.workItemType).toBe('Bug');
      });
    });
  });
  ```
- Mock Azure DevOps API responses should match actual API structure
- Test edge cases: empty strings, null values, missing fields
- Test error scenarios: network errors, invalid data, database errors
- Use descriptive test names that explain what is being tested
- Group related tests using `describe()` blocks
- Reference: https://jestjs.io/docs/mock-functions
- Reference: https://jestjs.io/docs/asynchronous
