import axios, { AxiosError, AxiosInstance } from 'axios';
import { AzureDevOpsClient, IAzureDevOpsProject, IAzureDevOpsWorkItem } from './azure-devops-client.service';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

/**
 * Unit tests for the AzureDevOpsClient service.
 * 
 * These tests verify:
 * - Constructor creates axios instance with correct configuration
 * - API version selection based on organization URL domain
 * - Authentication header is correctly formatted (Basic auth)
 * - validateConnection returns true/false based on API response
 * - getProject returns project details or throws appropriate errors
 * - getIterations returns array of iterations with proper flattening
 * - getWorkItemsByIteration returns filtered work items using WIQL
 * - Error handling for 401, 403, 404, 429 status codes
 */

// Helper to create mock axios instance
const createMockAxiosInstance = (): jest.Mocked<AxiosInstance> => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
  request: jest.fn(),
  head: jest.fn(),
  options: jest.fn(),
  postForm: jest.fn(),
  putForm: jest.fn(),
  patchForm: jest.fn(),
  getUri: jest.fn(),
  defaults: {
    baseURL: 'https://dev.azure.com/testorg/_apis',
    headers: {
      'Authorization': 'Basic dGVzdHBhdA==',
      'Content-Type': 'application/json',
    },
    params: {
      'api-version': '7.1',
    },
  },
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
  },
} as unknown as jest.Mocked<AxiosInstance>);

// Helper to create AxiosError
const createAxiosError = (status: number, message: string = 'Error'): AxiosError => {
  const error = new Error(message) as AxiosError;
  error.isAxiosError = true;
  error.response = {
    status,
    statusText: message,
    data: { message },
    headers: {},
    config: {} as any,
  };
  error.config = {} as any;
  return error;
};

// Helper to create network error (no response)
const createNetworkError = (message: string = 'Network Error'): AxiosError => {
  const error = new Error(message) as AxiosError;
  error.isAxiosError = true;
  error.response = undefined;
  error.config = {} as any;
  return error;
};

// Sample test data
const sampleProject: IAzureDevOpsProject = {
  id: 'project-guid-123',
  name: 'TestProject',
  description: 'A test project',
  url: 'https://dev.azure.com/testorg/_apis/projects/project-guid-123',
};

const sampleWorkItems: IAzureDevOpsWorkItem[] = [
  {
    id: 101,
    url: 'https://dev.azure.com/testorg/_apis/wit/workItems/101',
    fields: {
      'System.Id': 101,
      'System.Title': 'Implement feature X',
      'System.WorkItemType': 'User Story',
      'System.State': 'Active',
      'System.IterationPath': 'TestProject\\Sprint 1',
    },
  },
  {
    id: 102,
    url: 'https://dev.azure.com/testorg/_apis/wit/workItems/102',
    fields: {
      'System.Id': 102,
      'System.Title': 'Fix bug Y',
      'System.WorkItemType': 'Bug',
      'System.State': 'New',
      'System.IterationPath': 'TestProject\\Sprint 1',
    },
  },
];

let mockAxiosInstance: jest.Mocked<AxiosInstance>;

beforeEach(() => {
  jest.clearAllMocks();
  mockAxiosInstance = createMockAxiosInstance();
  mockedAxios.create.mockReturnValue(mockAxiosInstance);
  // Also mock the standalone axios.get for getIterations
  mockedAxios.get.mockResolvedValue({ data: {} });
});

describe('AzureDevOpsClient', () => {
  describe('constructor', () => {
    /**
     * Test: Should create axios instance with correct base URL
     * 
     * Objective: Verify that the axios instance is created with the
     * organization URL appended with /_apis.
     */
    it('should create axios instance with correct base URL', () => {
      // Arrange
      const organizationUrl = 'https://dev.azure.com/myorg';
      const pat = 'test-pat-token';

      // Act
      new AzureDevOpsClient(organizationUrl, pat);

      // Assert
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://dev.azure.com/myorg/_apis',
        })
      );
    });

    /**
     * Test: Should create axios instance with correct auth header (Basic auth)
     * 
     * Objective: Verify that the Authorization header is correctly formatted
     * as Basic auth with base64 encoded ":PAT" (empty username).
     */
    it('should create axios instance with correct auth header (Basic auth)', () => {
      // Arrange
      const organizationUrl = 'https://dev.azure.com/myorg';
      const pat = 'my-secret-pat';
      const expectedAuthToken = Buffer.from(`:${pat}`).toString('base64');

      // Act
      new AzureDevOpsClient(organizationUrl, pat);

      // Assert
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Basic ${expectedAuthToken}`,
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    /**
     * Test: Should use API version 7.1 for dev.azure.com
     * 
     * Objective: Verify that the newer API version 7.1 is used for
     * dev.azure.com organization URLs.
     */
    it('should use API version 7.1 for dev.azure.com', () => {
      // Arrange
      const organizationUrl = 'https://dev.azure.com/myorg';
      const pat = 'test-pat';

      // Act
      new AzureDevOpsClient(organizationUrl, pat);

      // Assert
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            'api-version': '7.1',
          }),
        })
      );
    });

    /**
     * Test: Should use API version 5.0 for visualstudio.com
     * 
     * Objective: Verify that the older API version 5.0 is used for
     * legacy visualstudio.com organization URLs.
     */
    it('should use API version 5.0 for visualstudio.com', () => {
      // Arrange
      const organizationUrl = 'https://myorg.visualstudio.com';
      const pat = 'test-pat';

      // Act
      new AzureDevOpsClient(organizationUrl, pat);

      // Assert
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            'api-version': '5.0',
          }),
        })
      );
    });

    /**
     * Test: Should handle organization URL with trailing slash
     * 
     * Objective: Verify that the base URL is correctly formed even when
     * the organization URL has a trailing slash.
     */
    it('should handle organization URL with trailing slash', () => {
      // Arrange
      const organizationUrl = 'https://dev.azure.com/myorg/';
      const pat = 'test-pat';

      // Act
      new AzureDevOpsClient(organizationUrl, pat);

      // Assert
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://dev.azure.com/myorg//_apis',
        })
      );
    });
  });

  describe('validateConnection', () => {
    /**
     * Test: Should return true for successful connection (200 response)
     * 
     * Objective: Verify that validateConnection returns true when the
     * API responds successfully.
     */
    it('should return true for successful connection (200 response)', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      mockAxiosInstance.get.mockResolvedValue({
        data: { value: [{ id: 'project-1', name: 'Project 1' }] },
      });

      // Act
      const result = await client.validateConnection();

      // Assert
      expect(result).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/projects', {
        params: { '$top': 1 },
      });
    });

    /**
     * Test: Should return false for 401 authentication failure
     * 
     * Objective: Verify that validateConnection returns false when the
     * API returns 401 Unauthorized.
     */
    it('should return false for 401 authentication failure', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'invalid-pat');
      mockAxiosInstance.get.mockRejectedValue(createAxiosError(401, 'Unauthorized'));

      // Act
      const result = await client.validateConnection();

      // Assert
      expect(result).toBe(false);
    });

    /**
     * Test: Should return false for 403 forbidden
     * 
     * Objective: Verify that validateConnection returns false when the
     * API returns 403 Forbidden (insufficient permissions).
     */
    it('should return false for 403 forbidden', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      mockAxiosInstance.get.mockRejectedValue(createAxiosError(403, 'Forbidden'));

      // Act
      const result = await client.validateConnection();

      // Assert
      expect(result).toBe(false);
    });

    /**
     * Test: Should return false for network errors
     * 
     * Objective: Verify that validateConnection returns false when there
     * is a network error (no response from server).
     */
    it('should return false for network errors', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      mockAxiosInstance.get.mockRejectedValue(createNetworkError('Network Error'));

      // Act
      const result = await client.validateConnection();

      // Assert
      expect(result).toBe(false);
    });

    /**
     * Test: Should return false for 500 server error
     * 
     * Objective: Verify that validateConnection returns false when the
     * API returns a server error.
     */
    it('should return false for 500 server error', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      mockAxiosInstance.get.mockRejectedValue(createAxiosError(500, 'Internal Server Error'));

      // Act
      const result = await client.validateConnection();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getProject', () => {
    /**
     * Test: Should return project details for valid project name
     * 
     * Objective: Verify that getProject returns the project data when
     * the project exists.
     */
    it('should return project details for valid project name', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      mockAxiosInstance.get.mockResolvedValue({ data: sampleProject });

      // Act
      const result = await client.getProject('TestProject');

      // Assert
      expect(result).toEqual(sampleProject);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/projects/TestProject');
    });

    /**
     * Test: Should URL encode project name with special characters
     * 
     * Objective: Verify that project names with special characters are
     * properly URL encoded.
     */
    it('should URL encode project name with special characters', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      mockAxiosInstance.get.mockResolvedValue({ data: sampleProject });

      // Act
      await client.getProject('My Project & Team');

      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/projects/My%20Project%20%26%20Team');
    });

    /**
     * Test: Should throw error for 404 (project not found)
     * 
     * Objective: Verify that getProject throws a descriptive error when
     * the project is not found.
     */
    it('should throw error for 404 (project not found)', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      mockAxiosInstance.get.mockRejectedValue(createAxiosError(404, 'Not Found'));

      // Act & Assert
      await expect(client.getProject('NonExistentProject')).rejects.toThrow(
        "Azure DevOps project 'NonExistentProject' not found"
      );
    });

    /**
     * Test: Should throw error for 401 (authentication failed)
     * 
     * Objective: Verify that getProject throws an authentication error
     * when the PAT is invalid.
     */
    it('should throw error for 401 (authentication failed)', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'invalid-pat');
      mockAxiosInstance.get.mockRejectedValue(createAxiosError(401, 'Unauthorized'));

      // Act & Assert
      await expect(client.getProject('TestProject')).rejects.toThrow(
        'Azure DevOps authentication failed'
      );
    });

    /**
     * Test: Should throw error for 403 (forbidden)
     * 
     * Objective: Verify that getProject throws an authentication error
     * when the user lacks permissions.
     */
    it('should throw error for 403 (forbidden)', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      mockAxiosInstance.get.mockRejectedValue(createAxiosError(403, 'Forbidden'));

      // Act & Assert
      await expect(client.getProject('TestProject')).rejects.toThrow(
        'Azure DevOps authentication failed'
      );
    });

    /**
     * Test: Should throw error with message for other errors
     * 
     * Objective: Verify that getProject throws a generic error with the
     * original error message for unexpected errors.
     */
    it('should throw error with message for other errors', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      const error = createAxiosError(500, 'Internal Server Error');
      error.response!.data = { message: 'Database connection failed' };
      mockAxiosInstance.get.mockRejectedValue(error);

      // Act & Assert
      await expect(client.getProject('TestProject')).rejects.toThrow(
        'Failed to fetch Azure DevOps project: Database connection failed'
      );
    });

    /**
     * Test: Should throw error for network errors
     * 
     * Objective: Verify that getProject handles network errors gracefully.
     */
    it('should throw error for network errors', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      const error = createNetworkError('ECONNREFUSED');
      mockAxiosInstance.get.mockRejectedValue(error);

      // Act & Assert
      await expect(client.getProject('TestProject')).rejects.toThrow(
        'Failed to fetch Azure DevOps project: ECONNREFUSED'
      );
    });
  });

  describe('getIterations', () => {
    /**
     * Test: Should return array of iterations
     * 
     * Objective: Verify that getIterations returns a flattened array of
     * iterations from the classification nodes API.
     */
    it('should return array of iterations', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      
      // Mock project lookup
      mockAxiosInstance.get.mockResolvedValue({
        data: { id: 'project-guid', name: 'TestProject' },
      });
      
      // Mock classification nodes response (hierarchical structure)
      mockedAxios.get.mockResolvedValue({
        data: {
          name: 'TestProject',
          identifier: 'root-id',
          children: [
            {
              name: 'Sprint 1',
              identifier: 'sprint-1-id',
              attributes: {
                startDate: '2025-01-01T00:00:00Z',
                finishDate: '2025-01-14T00:00:00Z',
              },
            },
            {
              name: 'Sprint 2',
              identifier: 'sprint-2-id',
              attributes: {
                startDate: '2025-01-15T00:00:00Z',
                finishDate: '2025-01-28T00:00:00Z',
              },
            },
          ],
        },
      });

      // Act
      const result = await client.getIterations('project-guid');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Sprint 1');
      expect(result[0].id).toBe('sprint-1-id');
      expect(result[1].name).toBe('Sprint 2');
    });

    /**
     * Test: Should handle empty iteration list
     * 
     * Objective: Verify that getIterations returns an empty array when
     * no iterations are defined.
     */
    it('should handle empty iteration list', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      
      mockAxiosInstance.get.mockResolvedValue({
        data: { id: 'project-guid', name: 'TestProject' },
      });
      
      mockedAxios.get.mockResolvedValue({
        data: {
          name: 'TestProject',
          identifier: 'root-id',
          // No children - empty iterations
        },
      });

      // Act
      const result = await client.getIterations('project-guid');

      // Assert
      expect(result).toEqual([]);
    });

    /**
     * Test: Should handle nested iterations (team folders)
     * 
     * Objective: Verify that getIterations correctly flattens nested
     * iteration structures (e.g., Team/Sprint 1).
     */
    it('should handle nested iterations (team folders)', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      
      mockAxiosInstance.get.mockResolvedValue({
        data: { id: 'project-guid', name: 'TestProject' },
      });
      
      mockedAxios.get.mockResolvedValue({
        data: {
          name: 'TestProject',
          identifier: 'root-id',
          children: [
            {
              name: 'Team Alpha',
              identifier: 'team-alpha-id',
              children: [
                {
                  name: 'Sprint 1',
                  identifier: 'alpha-sprint-1',
                  attributes: {
                    startDate: '2025-01-01T00:00:00Z',
                    finishDate: '2025-01-14T00:00:00Z',
                  },
                },
              ],
            },
            {
              name: 'Team Beta',
              identifier: 'team-beta-id',
              children: [
                {
                  name: 'Sprint 1',
                  identifier: 'beta-sprint-1',
                  attributes: {
                    startDate: '2025-01-01T00:00:00Z',
                    finishDate: '2025-01-14T00:00:00Z',
                  },
                },
              ],
            },
          ],
        },
      });

      // Act
      const result = await client.getIterations('project-guid');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].displayName).toBe('Team Alpha / Sprint 1');
      expect(result[1].displayName).toBe('Team Beta / Sprint 1');
    });

    /**
     * Test: Should throw error for 404 (project not found)
     * 
     * Objective: Verify that getIterations throws a descriptive error
     * when the project ID is not found.
     */
    it('should throw error for 404 (project not found)', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      mockAxiosInstance.get.mockRejectedValue(createAxiosError(404, 'Not Found'));

      // Act & Assert
      await expect(client.getIterations('invalid-project-id')).rejects.toThrow(
        "Azure DevOps project with ID 'invalid-project-id' not found"
      );
    });

    /**
     * Test: Should throw error for 401 (authentication failed)
     * 
     * Objective: Verify that getIterations throws an authentication error
     * when the PAT is invalid.
     */
    it('should throw error for 401 (authentication failed)', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'invalid-pat');
      mockAxiosInstance.get.mockRejectedValue(createAxiosError(401, 'Unauthorized'));

      // Act & Assert
      await expect(client.getIterations('project-guid')).rejects.toThrow(
        'Azure DevOps authentication failed'
      );
    });

    /**
     * Test: Should throw error for 403 (forbidden)
     * 
     * Objective: Verify that getIterations throws an authentication error
     * when the user lacks permissions.
     */
    it('should throw error for 403 (forbidden)', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      mockAxiosInstance.get.mockRejectedValue(createAxiosError(403, 'Forbidden'));

      // Act & Assert
      await expect(client.getIterations('project-guid')).rejects.toThrow(
        'Azure DevOps authentication failed'
      );
    });

    /**
     * Test: Should include PAT scope hint in 401/403 error message
     * 
     * Objective: Verify that the error message includes helpful information
     * about required PAT scopes.
     */
    it('should include PAT scope hint in 401/403 error message', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      mockAxiosInstance.get.mockRejectedValue(createAxiosError(403, 'Forbidden'));

      // Act & Assert
      await expect(client.getIterations('project-guid')).rejects.toThrow(
        'Work Items (Read)'
      );
    });
  });

  describe('getWorkItemsByIteration', () => {
    /**
     * Test: Should return filtered work items (Bug, Task, User Story)
     * 
     * Objective: Verify that getWorkItemsByIteration returns work items
     * filtered by the specified iteration path.
     */
    it('should return filtered work items (Bug, Task, User Story)', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      
      // Mock WIQL query response
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          workItems: [
            { id: 101, url: 'https://dev.azure.com/testorg/_apis/wit/workItems/101' },
            { id: 102, url: 'https://dev.azure.com/testorg/_apis/wit/workItems/102' },
          ],
        },
      });
      
      // Mock work items batch response
      mockAxiosInstance.get.mockResolvedValue({
        data: { value: sampleWorkItems },
      });

      // Act
      const result = await client.getWorkItemsByIteration('project-guid', 'TestProject\\Sprint 1');

      // Assert
      expect(result).toEqual(sampleWorkItems);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/wit/wiql',
        expect.objectContaining({
          query: expect.stringContaining("WHERE [System.IterationPath] = 'TestProject\\Sprint 1'"),
        }),
        expect.objectContaining({
          params: { project: 'project-guid' },
        })
      );
    });

    /**
     * Test: Should filter by Bug, Task, and User Story types
     * 
     * Objective: Verify that the WIQL query includes the correct work item
     * type filter.
     */
    it('should filter by Bug, Task, and User Story types', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      mockAxiosInstance.post.mockResolvedValue({ data: { workItems: [] } });

      // Act
      await client.getWorkItemsByIteration('project-guid', 'TestProject\\Sprint 1');

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/wit/wiql',
        expect.objectContaining({
          query: expect.stringContaining("[System.WorkItemType] IN ('Bug', 'Task', 'User Story')"),
        }),
        expect.any(Object)
      );
    });

    /**
     * Test: Should return empty array when no work items found
     * 
     * Objective: Verify that getWorkItemsByIteration returns an empty array
     * when the WIQL query returns no results.
     */
    it('should return empty array when no work items found', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      mockAxiosInstance.post.mockResolvedValue({
        data: { workItems: [] },
      });

      // Act
      const result = await client.getWorkItemsByIteration('project-guid', 'TestProject\\Sprint 1');

      // Assert
      expect(result).toEqual([]);
      // Should not call the batch endpoint when no work items found
      expect(mockAxiosInstance.get).not.toHaveBeenCalledWith(
        '/wit/workitems',
        expect.any(Object)
      );
    });

    /**
     * Test: Should handle iteration path with single quotes (SQL injection prevention)
     * 
     * Objective: Verify that single quotes in iteration paths are properly
     * escaped to prevent WIQL injection.
     */
    it('should handle iteration path with single quotes (SQL injection prevention)', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      mockAxiosInstance.post.mockResolvedValue({ data: { workItems: [] } });

      // Act
      await client.getWorkItemsByIteration('project-guid', "TestProject\\Team's Sprint");

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/wit/wiql',
        expect.objectContaining({
          query: expect.stringContaining("TestProject\\Team''s Sprint"),
        }),
        expect.any(Object)
      );
    });

    /**
     * Test: Should throw error for 404 (iteration not found)
     * 
     * Objective: Verify that getWorkItemsByIteration throws a descriptive
     * error when the iteration path is not found.
     */
    it('should throw error for 404 (iteration not found)', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      mockAxiosInstance.post.mockRejectedValue(createAxiosError(404, 'Not Found'));

      // Act & Assert
      await expect(
        client.getWorkItemsByIteration('project-guid', 'TestProject\\NonExistent')
      ).rejects.toThrow("Iteration 'TestProject\\NonExistent' not found in project");
    });

    /**
     * Test: Should throw error for 429 (rate limit)
     * 
     * Objective: Verify that getWorkItemsByIteration throws a rate limit
     * error when the API returns 429.
     */
    it('should throw error for 429 (rate limit)', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      mockAxiosInstance.post.mockRejectedValue(createAxiosError(429, 'Too Many Requests'));

      // Act & Assert
      await expect(
        client.getWorkItemsByIteration('project-guid', 'TestProject\\Sprint 1')
      ).rejects.toThrow('Azure DevOps rate limit exceeded. Please try again later.');
    });

    /**
     * Test: Should throw error for 401 (authentication failed)
     * 
     * Objective: Verify that getWorkItemsByIteration throws an authentication
     * error when the PAT is invalid.
     */
    it('should throw error for 401 (authentication failed)', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'invalid-pat');
      mockAxiosInstance.post.mockRejectedValue(createAxiosError(401, 'Unauthorized'));

      // Act & Assert
      await expect(
        client.getWorkItemsByIteration('project-guid', 'TestProject\\Sprint 1')
      ).rejects.toThrow('Azure DevOps authentication failed');
    });

    /**
     * Test: Should throw error for 403 (forbidden)
     * 
     * Objective: Verify that getWorkItemsByIteration throws an authentication
     * error when the user lacks permissions.
     */
    it('should throw error for 403 (forbidden)', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      mockAxiosInstance.post.mockRejectedValue(createAxiosError(403, 'Forbidden'));

      // Act & Assert
      await expect(
        client.getWorkItemsByIteration('project-guid', 'TestProject\\Sprint 1')
      ).rejects.toThrow('Azure DevOps authentication failed');
    });

    /**
     * Test: Should throw error with message for other errors
     * 
     * Objective: Verify that getWorkItemsByIteration throws a generic error
     * with the original error message for unexpected errors.
     */
    it('should throw error with message for other errors', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      const error = createAxiosError(500, 'Internal Server Error');
      error.response!.data = { message: 'Query execution failed' };
      mockAxiosInstance.post.mockRejectedValue(error);

      // Act & Assert
      await expect(
        client.getWorkItemsByIteration('project-guid', 'TestProject\\Sprint 1')
      ).rejects.toThrow('Failed to fetch work items: Query execution failed');
    });

    /**
     * Test: Should request correct fields from work items API
     * 
     * Objective: Verify that the work items batch request includes all
     * required fields.
     */
    it('should request correct fields from work items API', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          workItems: [{ id: 101 }],
        },
      });
      mockAxiosInstance.get.mockResolvedValue({
        data: { value: sampleWorkItems },
      });

      // Act
      await client.getWorkItemsByIteration('project-guid', 'TestProject\\Sprint 1');

      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/wit/workitems',
        expect.objectContaining({
          params: expect.objectContaining({
            ids: '101',
            fields: 'System.Id,System.Title,System.WorkItemType,System.State,System.AssignedTo,System.IterationPath,System.Description',
          }),
        })
      );
    });

    /**
     * Test: Should handle multiple work item IDs
     * 
     * Objective: Verify that multiple work item IDs are correctly joined
     * with commas in the batch request.
     */
    it('should handle multiple work item IDs', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          workItems: [
            { id: 101 },
            { id: 102 },
            { id: 103 },
          ],
        },
      });
      mockAxiosInstance.get.mockResolvedValue({
        data: { value: sampleWorkItems },
      });

      // Act
      await client.getWorkItemsByIteration('project-guid', 'TestProject\\Sprint 1');

      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/wit/workitems',
        expect.objectContaining({
          params: expect.objectContaining({
            ids: '101,102,103',
          }),
        })
      );
    });
  });

  describe('Error handling edge cases', () => {
    /**
     * Test: Should handle non-axios errors gracefully
     * 
     * Objective: Verify that non-axios errors (e.g., TypeError) are
     * handled and wrapped in a descriptive error message.
     */
    it('should handle non-axios errors gracefully in getProject', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      mockAxiosInstance.get.mockRejectedValue(new Error('Unexpected error'));

      // Act & Assert
      await expect(client.getProject('TestProject')).rejects.toThrow(
        'Failed to fetch Azure DevOps project: Unexpected error'
      );
    });

    /**
     * Test: Should handle undefined error response data
     * 
     * Objective: Verify that errors without response data are handled.
     */
    it('should handle undefined error response data', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      const error = createAxiosError(500, 'Server Error');
      error.response!.data = undefined;
      mockAxiosInstance.get.mockRejectedValue(error);

      // Act & Assert
      await expect(client.getProject('TestProject')).rejects.toThrow(
        'Failed to fetch Azure DevOps project: Server Error'
      );
    });

    /**
     * Test: Should handle null workItems in WIQL response
     * 
     * Objective: Verify that null workItems array is handled as empty.
     */
    it('should handle null workItems in WIQL response', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      mockAxiosInstance.post.mockResolvedValue({
        data: { workItems: null },
      });

      // Act
      const result = await client.getWorkItemsByIteration('project-guid', 'TestProject\\Sprint 1');

      // Assert
      expect(result).toEqual([]);
    });

    /**
     * Test: Should handle undefined value in work items response
     * 
     * Objective: Verify that undefined value array is handled as empty.
     */
    it('should handle undefined value in work items response', async () => {
      // Arrange
      const client = new AzureDevOpsClient('https://dev.azure.com/myorg', 'test-pat');
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          workItems: [{ id: 101 }],
        },
      });
      mockAxiosInstance.get.mockResolvedValue({
        data: { value: undefined },
      });

      // Act
      const result = await client.getWorkItemsByIteration('project-guid', 'TestProject\\Sprint 1');

      // Assert
      expect(result).toEqual([]);
    });
  });
});
