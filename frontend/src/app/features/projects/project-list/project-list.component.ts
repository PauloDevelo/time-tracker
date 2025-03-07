import { Component, OnInit } from '@angular/core';
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
import { ProjectsByCustomer } from '../../../core/models/project.model';
import { lastValueFrom } from 'rxjs';

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
  projectsByCustomer: ProjectsByCustomer[] = [];
  loading = true;
  error = false;

  constructor(
    private projectService: ProjectService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  async loadProjects(): Promise<void> {
    this.loading = true;
    this.error = false;
    
    try {
      this.projectsByCustomer = await lastValueFrom(this.projectService.getProjectsByCustomer());
      this.loading = false;
    }
    catch (err) {
      console.error('Error loading projects', err);
        this.error = true;
        this.loading = false;
        this.snackBar.open('Failed to load projects. Please try again.', 'Close', {
          duration: 5000
        });
    }
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
}