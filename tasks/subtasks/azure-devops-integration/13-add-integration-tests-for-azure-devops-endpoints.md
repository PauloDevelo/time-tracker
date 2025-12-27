# 13. Add Integration Tests for Azure DevOps Endpoints

meta:
  id: azure-devops-integration-13
  feature: azure-devops-integration
  priority: P2
  depends_on: [azure-devops-integration-05, azure-devops-integration-06, azure-devops-integration-07]
  tags: [backend, testing, integration]

## Objective
- Create comprehensive integration tests for Azure DevOps API endpoints

## Deliverables
- New file `backend/src/__tests__/integration/azure-devops.integration.test.ts`
- Integration tests covering validation, iteration listing, and work item import
- Test fixtures and mocks for Azure DevOps API

## Steps
1. Create `backend/src/__tests__/integration/azure-devops.integration.test.ts`:
   - Set up test database connection (use test MongoDB instance)
   - Create test fixtures for users, customers, projects, and tasks
   - Mock Azure DevOps API responses using `nock` or similar library
2. Add test suite for project validation endpoint:
   - Test successful validation with valid project name
   - Test validation failure with non-existent project
   - Test validation failure when customer has no Azure DevOps config
   - Test validation failure with invalid PAT
   - Test validation requires authentication
   - Test validation requires project ownership
3. Add test suite for iterations endpoint:
   - Test successful iteration listing
   - Test iteration listing requires Azure DevOps enabled
   - Test iteration listing requires authentication
   - Test iteration listing requires project ownership
   - Test error handling when Azure DevOps API is unavailable
4. Add test suite for work item import endpoint:
   - Test successful import of work items
   - Test import filters work items by type (Bug, Task, User Story only)
   - Test import skips duplicate work items
   - Test import updates project lastSyncedAt
   - Test import requires Azure DevOps enabled
   - Test import requires authentication
   - Test import requires project ownership
   - Test error handling when iteration not found
   - Test error handling when Azure DevOps API is unavailable
5. Create helper functions for test setup:
   - `createTestUser()`: Create test user in database
   - `createTestCustomer(userId, withAzureDevOps)`: Create test customer with optional Azure DevOps config
   - `createTestProject(customerId, userId, withAzureDevOps)`: Create test project with optional Azure DevOps config
   - `mockAzureDevOpsAPI()`: Set up mocked Azure DevOps API responses
   - `cleanupTestData()`: Clean up test data after each test
6. Add test data fixtures:
   - Sample Azure DevOps project response
   - Sample iterations response
   - Sample work items response (with Bug, Task, User Story, and other types)
7. Use `beforeEach()` and `afterEach()` hooks for setup and cleanup
8. Use `supertest` for HTTP request testing
9. Assert on:
   - HTTP status codes
   - Response body structure and content
   - Database state changes (tasks created, project updated)
   - Error messages

## Tests
- Integration:
  - **Validation Endpoint:**
    - POST /api/projects/:id/validate-azure-devops with valid project name returns 200 and project details
    - POST /api/projects/:id/validate-azure-devops with invalid project name returns 404
    - POST /api/projects/:id/validate-azure-devops without Azure DevOps config returns 400
    - POST /api/projects/:id/validate-azure-devops without authentication returns 401
    - POST /api/projects/:id/validate-azure-devops for other user's project returns 403
  - **Iterations Endpoint:**
    - GET /api/projects/:id/azure-devops/iterations returns 200 and iteration list
    - GET /api/projects/:id/azure-devops/iterations without Azure DevOps enabled returns 400
    - GET /api/projects/:id/azure-devops/iterations without authentication returns 401
    - GET /api/projects/:id/azure-devops/iterations for other user's project returns 403
  - **Import Endpoint:**
    - POST /api/projects/:id/azure-devops/import-work-items creates tasks in database
    - POST /api/projects/:id/azure-devops/import-work-items filters by work item type
    - POST /api/projects/:id/azure-devops/import-work-items skips duplicates on second import
    - POST /api/projects/:id/azure-devops/import-work-items updates project lastSyncedAt
    - POST /api/projects/:id/azure-devops/import-work-items without Azure DevOps enabled returns 400
    - POST /api/projects/:id/azure-devops/import-work-items without authentication returns 401
    - POST /api/projects/:id/azure-devops/import-work-items for other user's project returns 403

## Acceptance Criteria
- [ ] Integration test file is created in `backend/src/__tests__/integration/`
- [ ] All validation endpoint scenarios are tested
- [ ] All iterations endpoint scenarios are tested
- [ ] All import endpoint scenarios are tested
- [ ] Tests use mocked Azure DevOps API responses
- [ ] Tests verify database state changes
- [ ] Tests verify HTTP status codes and response bodies
- [ ] Tests verify authentication and authorization
- [ ] Test coverage for Azure DevOps endpoints is >80%
- [ ] All integration tests pass: `cd backend && npm test -- azure-devops.integration`
- [ ] Backend builds successfully: `cd backend && npm run build`

## Validation
- Run: `cd backend && npm run build` - should complete without errors
- Run: `cd backend && npm test -- azure-devops.integration` - all tests should pass
- Check test coverage: `cd backend && npm test -- --coverage` - verify >80% coverage for Azure DevOps modules
- Manually review test output: verify all scenarios are covered
- Verify tests clean up data properly (no test data left in database)

## Notes
- Use `jest` as the test framework (already configured in backend)
- Use `supertest` for HTTP request testing
- Use `nock` or `msw` for mocking Azure DevOps API
- Use test MongoDB instance (separate from development database)
- Set `NODE_ENV=test` during test execution
- Example test structure:
  ```typescript
  describe('Azure DevOps Integration', () => {
    let testUser, testCustomer, testProject;
    
    beforeEach(async () => {
      testUser = await createTestUser();
      testCustomer = await createTestCustomer(testUser._id, true);
      testProject = await createTestProject(testCustomer._id, testUser._id, true);
      mockAzureDevOpsAPI();
    });
    
    afterEach(async () => {
      await cleanupTestData();
    });
    
    describe('POST /api/projects/:id/validate-azure-devops', () => {
      it('should validate project successfully', async () => {
        const response = await request(app)
          .post(`/api/projects/${testProject._id}/validate-azure-devops`)
          .set('Authorization', `Bearer ${testUser.token}`)
          .send({ projectName: 'TestProject' });
        
        expect(response.status).toBe(200);
        expect(response.body.valid).toBe(true);
        expect(response.body.projectId).toBeDefined();
      });
    });
  });
  ```
- Consider using `@shelf/jest-mongodb` for in-memory MongoDB testing
- Mock Azure DevOps API responses should match actual API structure
- Test both success and error scenarios for each endpoint
- Verify error messages are user-friendly and informative
- Reference: https://jestjs.io/docs/getting-started
- Reference: https://github.com/visionmedia/supertest
- Reference: https://github.com/nock/nock
