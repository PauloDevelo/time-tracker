import axios, { AxiosInstance, AxiosError } from 'axios';

// TypeScript interfaces for Azure DevOps entities
export interface IAzureDevOpsProject {
  id: string;
  name: string;
  description?: string;
  url: string;
}

export interface IAzureDevOpsIteration {
  id: string;
  name: string;
  path: string;
  attributes: {
    startDate?: string;
    finishDate?: string;
  };
}

export interface IAzureDevOpsWorkItem {
  id: number;
  url: string;
  fields: {
    'System.Id': number;
    'System.Title': string;
    'System.WorkItemType': string;
    'System.State'?: string;
    'System.AssignedTo'?: {
      displayName: string;
      uniqueName: string;
    };
    'System.IterationPath': string;
    'System.Description'?: string;
  };
}

/**
 * Azure DevOps REST API Client
 * Handles authentication and communication with Azure DevOps services
 */
export class AzureDevOpsClient {
  private axiosInstance: AxiosInstance;

  /**
   * Create Azure DevOps client
   * @param organizationUrl - Azure DevOps organization URL (e.g., https://dev.azure.com/myorg)
   * @param pat - Personal Access Token (decrypted)
   */
  constructor(organizationUrl: string, pat: string) {
    console.log('Creating Azure DevOps client:', {
      organizationUrl,
      patLength: pat?.length || 0,
      patPreview: pat ? `${pat.substring(0, 4)}...${pat.substring(pat.length - 4)}` : 'empty'
    });

    // Create base64 encoded auth token (Basic Auth with empty username)
    const authToken = Buffer.from(`:${pat}`).toString('base64');

    // Determine API version based on domain
    // visualstudio.com uses older API versions
    const isVisualStudio = organizationUrl.includes('visualstudio.com');
    const apiVersion = isVisualStudio ? '5.0' : '7.1';

    console.log('Using API version:', apiVersion, 'for domain:', organizationUrl);

    // Configure axios instance
    this.axiosInstance = axios.create({
      baseURL: `${organizationUrl}/_apis`,
      headers: {
        'Authorization': `Basic ${authToken}`,
        'Content-Type': 'application/json',
      },
      params: {
        'api-version': apiVersion,
      },
    });
  }

  /**
   * Validate connection to Azure DevOps
   * @returns true if connection is valid, false otherwise
   */
  async validateConnection(): Promise<boolean> {
    try {
      // Test connection by fetching projects list
      await this.axiosInstance.get('/projects', {
        params: { '$top': 1 },
      });
      return true;
    } catch (error) {
      if (this.isAxiosError(error)) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.error('Azure DevOps authentication failed');
          return false;
        }
      }
      console.error('Error validating Azure DevOps connection:', error);
      return false;
    }
  }

  /**
   * Get project details by name
   * @param projectName - Name of the Azure DevOps project
   * @returns Project details
   * @throws Error if project not found
   */
  async getProject(projectName: string): Promise<IAzureDevOpsProject> {
    try {
      const response = await this.axiosInstance.get(`/projects/${encodeURIComponent(projectName)}`);
      return response.data;
    } catch (error) {
      if (this.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Azure DevOps project '${projectName}' not found`);
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error('Azure DevOps authentication failed');
        }
      }
      throw new Error(`Failed to fetch Azure DevOps project: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Get all iterations for a project
   * @param projectId - Azure DevOps project ID (GUID)
   * @returns Array of iterations
   */
  async getIterations(projectId: string): Promise<IAzureDevOpsIteration[]> {
    try {
      // First, get the project details to get the project name
      console.log(`Fetching project details for: ${projectId}`);
      const projectResponse = await this.axiosInstance.get(`/projects/${projectId}`);
      const projectName = projectResponse.data.name;
      console.log(`Project name: ${projectName}`);
      
      // Get the default team
      const defaultTeam = projectResponse.data.defaultTeam;
      if (!defaultTeam) {
        throw new Error('No default team found for the project');
      }
      console.log(`Using team: ${defaultTeam.name} (${defaultTeam.id})`);
      
      // For visualstudio.com, we need to use project name and team name, not IDs
      // The baseURL already has /_apis, so we need to go back to root
      const orgUrl = this.axiosInstance.defaults.baseURL?.replace('/_apis', '') || '';
      const iterationsUrl = `${orgUrl}/${encodeURIComponent(projectName)}/${encodeURIComponent(defaultTeam.name)}/_apis/work/teamsettings/iterations`;
      
      console.log('Fetching team iterations from:', iterationsUrl);
      
      // Extract authorization header from the instance
      const authHeader = this.axiosInstance.defaults.headers['Authorization'];
      const apiVersion = this.axiosInstance.defaults.params?.['api-version'];
      
      const response = await axios.get(iterationsUrl, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        params: {
          'api-version': apiVersion,
        },
      });
      
      const iterations = response.data.value || [];
      console.log(`Found ${iterations.length} iterations`);
      return iterations;
    } catch (error) {
      if (this.isAxiosError(error)) {
        console.error('Azure DevOps API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          fullUrl: `${error.config?.baseURL || ''}${error.config?.url || ''}`
        });
        if (error.response?.status === 404) {
          throw new Error(`Azure DevOps project with ID '${projectId}' not found`);
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error('Azure DevOps authentication failed. Please ensure your PAT has "Work Items (Read)" scope.');
        }
      }
      throw new Error(`Failed to fetch iterations: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Get work items by iteration using WIQL (Work Item Query Language)
   * @param projectId - Azure DevOps project ID (GUID)
   * @param iterationPath - Iteration path (e.g., "MyProject\\Sprint 1")
   * @returns Array of work items filtered by type (Bug, Task, User Story)
   */
  async getWorkItemsByIteration(
    projectId: string,
    iterationPath: string
  ): Promise<IAzureDevOpsWorkItem[]> {
    try {
      // Step 1: Execute WIQL query to get work item IDs
      const wiqlQuery = {
        query: `SELECT [System.Id], [System.Title], [System.WorkItemType], [System.State], [System.AssignedTo], [System.IterationPath]
                FROM WorkItems
                WHERE [System.IterationPath] = '${iterationPath.replace(/'/g, "''")}'
                AND [System.WorkItemType] IN ('Bug', 'Task', 'User Story')
                ORDER BY [System.Id]`,
      };

      const wiqlResponse = await this.axiosInstance.post(
        `/wit/wiql`,
        wiqlQuery,
        {
          params: {
            project: projectId,
          },
        }
      );

      const workItemRefs = wiqlResponse.data.workItems || [];

      if (workItemRefs.length === 0) {
        return [];
      }

      // Step 2: Fetch full work item details
      const workItemIds = workItemRefs.map((ref: any) => ref.id).join(',');
      const workItemsResponse = await this.axiosInstance.get(
        `/wit/workitems`,
        {
          params: {
            ids: workItemIds,
            fields: 'System.Id,System.Title,System.WorkItemType,System.State,System.AssignedTo,System.IterationPath,System.Description',
          },
        }
      );

      return workItemsResponse.data.value || [];
    } catch (error) {
      if (this.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Iteration '${iterationPath}' not found in project`);
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error('Azure DevOps authentication failed');
        }
        if (error.response?.status === 429) {
          throw new Error('Azure DevOps rate limit exceeded. Please try again later.');
        }
      }
      throw new Error(`Failed to fetch work items: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Type guard to check if error is AxiosError
   */
  private isAxiosError(error: any): error is AxiosError {
    return error.isAxiosError === true;
  }

  /**
   * Extract error message from various error types
   */
  private getErrorMessage(error: any): string {
    if (this.isAxiosError(error)) {
      const data = error.response?.data as any;
      return data?.message || error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
