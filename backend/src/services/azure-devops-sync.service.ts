import { Task, ITask } from '../models/Task';
import { IAzureDevOpsWorkItem } from './azure-devops-client.service';
import mongoose from 'mongoose';

export interface IImportResult {
  imported: number;
  skipped: number;
  tasks: ITask[];
}

/**
 * Azure DevOps Sync Service
 * Handles transformation of Azure DevOps work items to application tasks
 */
export class AzureDevOpsSyncService {
  /**
   * Transform Azure DevOps work item to task data
   * @param workItem - Azure DevOps work item
   * @param projectId - Project ID
   * @param userId - User ID
   * @returns Task data ready for creation
   */
  transformWorkItemToTask(
    workItem: IAzureDevOpsWorkItem,
    projectId: string,
    userId: string
  ): any {
    const fields = workItem.fields;
    
    return {
      name: fields['System.Title'],
      description: fields['System.Description'] || '',
      url: workItem.url,
      projectId: new mongoose.Types.ObjectId(projectId),
      userId: new mongoose.Types.ObjectId(userId),
      azureDevOps: {
        workItemId: fields['System.Id'],
        workItemType: fields['System.WorkItemType'] as 'Bug' | 'Task' | 'User Story',
        iterationPath: fields['System.IterationPath'],
        assignedTo: fields['System.AssignedTo']?.displayName,
        lastSyncedAt: new Date(),
        sourceUrl: workItem.url,
      },
    };
  }

  /**
   * Import work items as tasks
   * @param workItems - Array of Azure DevOps work items
   * @param projectId - Project ID
   * @param userId - User ID
   * @returns Import result with counts and created tasks
   */
  async importWorkItems(
    workItems: IAzureDevOpsWorkItem[],
    projectId: string,
    userId: string
  ): Promise<IImportResult> {
    const result: IImportResult = {
      imported: 0,
      skipped: 0,
      tasks: [],
    };

    for (const workItem of workItems) {
      try {
        const workItemId = workItem.fields['System.Id'];
        
        // Check if task already exists
        const existingTask = await Task.findOne({
          projectId: new mongoose.Types.ObjectId(projectId),
          'azureDevOps.workItemId': workItemId,
        });

        if (existingTask) {
          // Task already exists, skip it
          result.skipped++;
          console.log(`Skipping duplicate work item ${workItemId}`);
          continue;
        }

        // Transform and create new task
        const taskData = this.transformWorkItemToTask(workItem, projectId, userId);
        const task = await Task.create(taskData);
        
        result.imported++;
        result.tasks.push(task);
        console.log(`Imported work item ${workItemId} as task ${task._id}`);
      } catch (error) {
        console.error(`Error importing work item ${workItem.id}:`, error);
        // Continue with next work item even if one fails
        result.skipped++;
      }
    }

    return result;
  }

  /**
   * Check if existing task should be updated
   * @param existingTask - Existing task in database
   * @param _workItem - Azure DevOps work item
   * @returns true if task should be updated
   */
  shouldUpdateExistingTask(existingTask: ITask, _workItem: IAzureDevOpsWorkItem): boolean {
    // Check if last sync was more than 24 hours ago
    const lastSyncedAt = existingTask.azureDevOps?.lastSyncedAt;
    if (lastSyncedAt) {
      const hoursSinceSync = (Date.now() - lastSyncedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceSync > 24) {
        return true;
      }
    }

    return false;
  }

  /**
   * Update task from work item
   * @param task - Existing task
   * @param workItem - Azure DevOps work item
   * @returns Updated task
   */
  updateTaskFromWorkItem(task: ITask, workItem: IAzureDevOpsWorkItem): ITask {
    const fields = workItem.fields;
    
    task.name = fields['System.Title'];
    task.description = fields['System.Description'] || task.description;
    
    if (task.azureDevOps) {
      task.azureDevOps.iterationPath = fields['System.IterationPath'];
      task.azureDevOps.assignedTo = fields['System.AssignedTo']?.displayName;
      task.azureDevOps.lastSyncedAt = new Date();
    }
    
    return task;
  }
}
