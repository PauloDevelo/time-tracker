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
import { ProjectService } from '../../../core/services/project.service';
import { Project } from '../../../core/models/project.model';

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
    MatProgressSpinnerModule
  ],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss']
})
export class ProjectDetailComponent implements OnInit {
  project: Project | null = null;
  loading = true;
  error = false;
  projectId: string = '';

  constructor(
    private projectService: ProjectService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
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
  }

  loadProject(): void {
    this.loading = true;
    this.error = false;
    
    this.projectService.getProject(this.projectId).subscribe({
      next: (project) => {
        this.project = project;
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
} 