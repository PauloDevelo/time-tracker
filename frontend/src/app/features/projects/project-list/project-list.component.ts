import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProjectService } from '../../../core/services/project.service';
import { Project, ProjectsByCustomer } from '../../../core/models/project.model';
import { TimeEntryService } from '../../../core/services/time-entry.service';
import { TaskService } from '../../../core/services/task.service';
import { lastValueFrom, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

interface ProjectWithActivity extends Project {
  lastActivity?: Date;
}

interface ProjectsByCustomerWithActivity extends ProjectsByCustomer {
  projects: ProjectWithActivity[];
  activeProjects: ProjectWithActivity[];
  otherProjects: ProjectWithActivity[];
}

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatExpansionModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss']
})
export class ProjectListComponent implements OnInit {
  projectsByCustomer: ProjectsByCustomerWithActivity[] = [];
  loading = true;
  error = false;
  
  // Map to store expanded status for each customer
  expandedStatus = new Map<string, boolean>();
  
  // Map to store expanded status for "Other Projects" section for each customer
  otherProjectsExpandedStatus = new Map<string, boolean>();

  constructor(
    private projectService: ProjectService,
    private timeEntryService: TimeEntryService,
    private taskService: TaskService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadProjects();
  }

  async loadProjects(): Promise<void> {
    this.loading = true;
    this.error = false;
    
    try {
      // Get all projects by customer
      const projectsByCustomer = await lastValueFrom(this.projectService.getProjectsByCustomer());
      
      const taskProjectMap = await lastValueFrom(this.taskService.getTasks().pipe(
        map(tasks => {
          const taskProjectMap = new Map<string, string>();
          tasks.forEach(task => {
            taskProjectMap.set(task._id, task.projectId);
          });
          return taskProjectMap;
        }),
        catchError(error => {
          console.error('Error loading tasks', error);
          return of(new Map<string, string>());
        })
      ));
      
      // Get recent activity data
      const recentActivity = await lastValueFrom(this.timeEntryService.getRecentTaskActivity().pipe(
        catchError(error => {
          console.error('Error loading recent activity', error);
          return of([]);
        })
      ));
      
      // Create a map of projectId -> lastActivity date
      const projectActivityMap = new Map<string, Date>();
      recentActivity.forEach(activity => {
        const projectId = taskProjectMap.get(activity.taskId);
        if (projectId) {
          const currentLastActivity = projectActivityMap.get(projectId);
          if (!currentLastActivity || activity.lastActivity > currentLastActivity) {
            projectActivityMap.set(projectId, activity.lastActivity);
          }
        }
      });
      
      // Enhance projects with activity data and split into active/other
      this.projectsByCustomer = projectsByCustomer.map(group => {
        const projectsWithActivity: ProjectWithActivity[] = group.projects.map(project => ({
          ...project,
          lastActivity: projectActivityMap.get(project._id)
        }));
        
        // Sort by last activity (most recent first)
        projectsWithActivity.sort((a, b) => {
          if (a.lastActivity && b.lastActivity) {
            return b.lastActivity.getTime() - a.lastActivity.getTime();
          } 
          return a.lastActivity ? -1 : b.lastActivity ? 1 : 0;
        });
        
        // Get the 9 most recently active projects
        const activeProjects = projectsWithActivity
          .filter(p => p.lastActivity)
          .slice(0, 9);
        
        // Get the remaining projects (no recent activity or beyond the top 9)
        const otherProjects = projectsWithActivity.filter(p => 
          !activeProjects.some(ap => ap._id === p._id)
        );
        
        return {
          ...group,
          projects: projectsWithActivity,
          activeProjects,
          otherProjects
        };
      });
      
      this.loading = false;
      this.cdr.detectChanges();
    }
    catch (err) {
      console.error('Error loading projects', err);
      this.error = true;
      this.loading = false;
      this.cdr.detectChanges();
      this.snackBar.open('Failed to load projects. Please try again.', 'Close', {
        duration: 5000
      });
    }
  }

  isExpanded(customerId: string): boolean {
    if (this.expandedStatus.has(customerId)) {
      return this.expandedStatus.get(customerId) as boolean;
    }
    
    const savedState = localStorage.getItem(`customer-${customerId}-expanded`);
    const expanded = savedState === 'true';
    this.expandedStatus.set(customerId, expanded);
    
    return expanded;
  }

  setExpanded(customerId: string, expanded: boolean): void {
    localStorage.setItem(`customer-${customerId}-expanded`, expanded.toString());
    this.expandedStatus.set(customerId, expanded);
  }
  
  isOtherProjectsExpanded(customerId: string): boolean {
    if (this.otherProjectsExpandedStatus.has(customerId)) {
      return this.otherProjectsExpandedStatus.get(customerId) as boolean;
    }
    
    const savedState = localStorage.getItem(`customer-${customerId}-other-projects-expanded`);
    // Default to collapsed (false)
    const expanded = savedState === 'true';
    this.otherProjectsExpandedStatus.set(customerId, expanded);
    
    return expanded;
  }
  
  toggleOtherProjects(customerId: string): void {
    const currentState = this.isOtherProjectsExpanded(customerId);
    const newState = !currentState;
    localStorage.setItem(`customer-${customerId}-other-projects-expanded`, newState.toString());
    this.otherProjectsExpandedStatus.set(customerId, newState);
  }

  deleteProject(projectId: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (confirm('Are you sure you want to delete this project?')) {
      this.projectService.deleteProject(projectId).subscribe({
        next: () => {
          this.snackBar.open('Project deleted successfully', 'Close', {
            duration: 3000
          });
          this.loadProjects();
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
  
  formatLastActivity(date?: Date): string {
    if (!date) return 'No recent activity';
    
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}