import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { ProjectService } from '../../../core/services/project.service';
import { TaskService } from '../../../core/services/task.service';
import { Project } from '../../../core/models/project.model';
import { Task, TaskCreateRequest, TaskUpdateRequest } from '../../../core/models/task.model';
import { TaskDialogComponent } from '../task-dialog/task-dialog.component';
import { WorkItemImportDialogComponent } from '../work-item-import-dialog/work-item-import-dialog.component';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTableModule,
    MatTooltipModule,
    MatBadgeModule
  ],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss']
})
export class ProjectDetailComponent implements OnInit {
  project: Project | null = null;
  tasks: Task[] = [];
  loading = true;
  loadingTasks = true;
  error = false;
  projectId: string = '';
  isAzureDevOpsEnabled = false;
  displayedColumns: string[] = ['name', 'description', 'url', 'actions'];

  constructor(
    private projectService: ProjectService,
    private taskService: TaskService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.projectId) {
      this.error = true;
      this.loading = false;
      this.snackBar.open('Invalid project ID', 'Close', { duration: 5000 });
      return;
    }
    
    this.loadProject();
    this.loadTasks();
  }

  loadProject(): void {
    this.loading = true;
    this.error = false;
    
    this.projectService.getProject(this.projectId).subscribe({
      next: (project) => {
        this.project = project;
        this.isAzureDevOpsEnabled = project.azureDevOps?.enabled || false;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading project', err);
        this.error = true;
        this.loading = false;
        this.snackBar.open('Failed to load project. Please try again.', 'Close', {
          duration: 5000
        });
      }
    });
  }

  loadTasks(): void {
    this.loadingTasks = true;
    this.taskService.getTasksByProject(this.projectId).subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.loadingTasks = false;
      },
      error: (err) => {
        console.error('Error loading tasks', err);
        this.loadingTasks = false;
        this.snackBar.open('Failed to load tasks. Please try again.', 'Close', {
          duration: 5000
        });
      }
    });
  }

  deleteProject(): void {
    if (confirm('Are you sure you want to delete this project?')) {
      this.projectService.deleteProject(this.projectId).subscribe({
        next: () => {
          this.snackBar.open('Project deleted successfully', 'Close', {
            duration: 3000
          });
          this.router.navigate(['/projects']);
        },
        error: (err) => {
          console.error('Error deleting project', err);
          this.snackBar.open('Failed to delete project. Please try again.', 'Close', {
            duration: 5000
          });
        }
      });
    }
  }

  openTaskDialog(task?: Task): void {
    const dialogRef = this.dialog.open(TaskDialogComponent, {
      width: '500px',
      data: {
        task: task,
        projectId: this.projectId,
        isEditing: !!task
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result._id) {
          // Update existing task
          this.updateTask(result);
        } else {
          // Create new task
          this.createTask(result);
        }
      }
    });
  }

  createTask(taskRequest: TaskCreateRequest): void {
    this.taskService.createTask(taskRequest).subscribe({
      next: (createdTask) => {
        this.snackBar.open('Task created successfully', 'Close', {
          duration: 3000
        });
        this.loadTasks(); // Reload tasks after creating a new task
      },
      error: (err) => {
        console.error('Error creating task', err);
        this.snackBar.open('Failed to create task. Please try again.', 'Close', {
          duration: 5000
        });
      }
    });
  }

  updateTask(taskRequest: TaskUpdateRequest): void {
    this.taskService.updateTask(taskRequest._id, taskRequest).subscribe({
      next: (updatedTask) => {
        this.snackBar.open('Task updated successfully', 'Close', {
          duration: 3000
        });
        this.loadTasks(); // Reload tasks after updating a task
      },
      error: (err) => {
        console.error('Error updating task', err);
        this.snackBar.open('Failed to update task. Please try again.', 'Close', {
          duration: 5000
        });
      }
    });
  }

  deleteTask(taskId: string): void {
    if (confirm('Are you sure you want to delete this task?')) {
      this.taskService.deleteTask(taskId).subscribe({
        next: () => {
          this.tasks = this.tasks.filter(t => t._id !== taskId);
          this.snackBar.open('Task deleted successfully', 'Close', {
            duration: 3000
          });
        },
        error: (err) => {
          console.error('Error deleting task', err);
          this.snackBar.open('Failed to delete task. Please try again.', 'Close', {
            duration: 5000
          });
        }
      });
    }
  }

  openTaskUrl(url: string): void {
    window.open(url, '_blank');
  }

  openImportDialog(): void {
    if (!this.project) {
      return;
    }

    const dialogRef = this.dialog.open(WorkItemImportDialogComponent, {
      width: '600px',
      data: {
        projectId: this.project._id,
        projectName: this.project.name
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Refresh task list after successful import
        this.loadTasks();
        
        // Show success message
        const message = `Successfully imported ${result.imported} work item${result.imported !== 1 ? 's' : ''}` +
          (result.skipped > 0 ? ` (${result.skipped} skipped)` : '');
        
        this.snackBar.open(message, 'Close', {
          duration: 5000
        });

        // Reload project to update last sync timestamp
        this.loadProject();
      }
    });
  }

  isAzureDevOpsTask(task: Task): boolean {
    return !!(task.azureDevOps?.workItemId);
  }

  getWorkItemTypeColor(type: string): string {
    switch (type) {
      case 'Bug':
        return 'warn';
      case 'Task':
        return 'primary';
      case 'User Story':
        return 'accent';
      default:
        return 'primary';
    }
  }

  getAzureDevOpsTaskCount(): number {
    return this.tasks.filter(task => this.isAzureDevOpsTask(task)).length;
  }

  formatLastSyncDate(dateString?: string): string {
    if (!dateString) {
      return 'Never';
    }
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}