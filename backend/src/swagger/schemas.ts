export const components = {
    schemas: {
        Customer: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              contactInfo: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  phone: { type: 'string' },
                  address: { type: 'string' }
                }
              },
              billingDetails: {
                type: 'object',
                properties: {
                  dailyRate: { type: 'number' },
                  currency: { type: 'string' },
                  paymentTerms: { type: 'string' }
                }
              },
              azureDevOps: {
                type: 'object',
                properties: {
                  organizationUrl: { 
                    type: 'string', 
                    format: 'uri',
                    description: 'Azure DevOps organization URL (e.g., https://dev.azure.com/myorg)',
                    example: 'https://dev.azure.com/myorg'
                  },
                  pat: { 
                    type: 'string', 
                    writeOnly: true,
                    description: 'Personal Access Token (write-only, never returned in responses)'
                  },
                  enabled: { 
                    type: 'boolean',
                    default: false,
                    description: 'Enable Azure DevOps integration for this customer'
                  }
                },
                description: 'Azure DevOps integration configuration'
              }
            }
        },
        User: {
            type: 'object',
            properties: {
                email: { type: 'string', format: 'email', required: true },
                password: { type: 'string', format: 'password', minLength: 8, required: true },
                firstName: { type: 'string', required: true },
                lastName: { type: 'string', required: true }
            },
        },
        LoginInput: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email', required: true },
            password: { type: 'string', format: 'password', required: true }
          }
        },
        Project: {
            type: 'object',
            properties: {
                name: { type: 'string', required: true },
                description: { type: 'string' },
                url: { type: 'string', format: 'url' },
                customerId: { type: 'string', format: 'uuid' },
                azureDevOps: {
                  type: 'object',
                  properties: {
                    projectName: {
                      type: 'string',
                      description: 'Azure DevOps project name',
                      example: 'MyAzureDevOpsProject'
                    },
                    projectId: {
                      type: 'string',
                      format: 'uuid',
                      description: 'Azure DevOps project GUID (populated after validation)',
                      example: '6ce954b1-ce1f-45d1-b94d-e6bf2464ba2c'
                    },
                    enabled: {
                      type: 'boolean',
                      default: false,
                      description: 'Enable Azure DevOps sync for this project'
                    },
                    lastSyncedAt: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Timestamp of last work item import'
                    }
                  },
                  description: 'Azure DevOps project metadata'
                }
            }
        },
        Task: {
          type: 'object',
          properties: {
            name: { type: 'string', required: true },
            description: { type: 'string', required: true },
            url: { type: 'string', format: 'url' },
            projectId: { type: 'string', format: 'uuid', required: true },
            azureDevOps: {
              type: 'object',
              properties: {
                workItemId: {
                  type: 'integer',
                  minimum: 1,
                  description: 'Azure DevOps work item ID',
                  example: 123
                },
                workItemType: {
                  type: 'string',
                  enum: ['Bug', 'Task', 'User Story'],
                  description: 'Type of Azure DevOps work item',
                  example: 'Bug'
                },
                iterationPath: {
                  type: 'string',
                  description: 'Iteration path in Azure DevOps',
                  example: 'MyProject\\Sprint 1'
                },
                assignedTo: {
                  type: 'string',
                  description: 'Display name of assigned user',
                  example: 'John Doe'
                },
                lastSyncedAt: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Timestamp of last sync from Azure DevOps'
                },
                sourceUrl: {
                  type: 'string',
                  format: 'uri',
                  description: 'Direct link to work item in Azure DevOps',
                  example: 'https://dev.azure.com/myorg/MyProject/_workitems/edit/123'
                }
              },
              description: 'Azure DevOps work item mapping (present only for imported tasks)'
            },
            isAzureDevOpsTask: {
              type: 'boolean',
              readOnly: true,
              description: 'Virtual field indicating if task is imported from Azure DevOps'
            }
          }
        },
        TimeEntry:{
          type: 'object',
          properties: {
            startTime: { type: 'string', format: 'date-time', required: true, description: 'The date the time entry is applicable to in UTC', example: "2023-06-22T08:00:00Z" },
            totalDurationInHour: { type: 'number', minimum: 0, required: true, description: 'The duration of the time entry in hours', example: 2.5  },
            taskId: { type: 'string', format: 'uuid', required: true }
          }
        }
    }
};