import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProjectFormComponent } from '../project-form/project-form.component';
import { ProjectService } from '../../../core/services/project.service';
import { CustomerService } from '../../../core/services/customer.service';
import { Project, ProjectCreateRequest, ProjectUpdateRequest } from '../../../core/models/project.model';
import { Customer } from '../../../core/models/customer.model';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-project-edit',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ProjectFormComponent,
    MatProgressSpinnerModule
  ],
  templateUrl: './project-edit.component.html',
  styleUrls: ['./project-edit.component.scss']
})
export class ProjectEditComponent implements OnInit {
  project: Project | null = null;
  customers: Customer[] = [];
  loading = false;
  loadingData = true;
  error = false;
  projectId = '';

  constructor(
    private projectService: ProjectService,
    private customerService: CustomerService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.projectId) {
      this.error = true;
      this.loadingData = false;
      this.snackBar.open('Invalid project ID', 'Close', { duration: 5000 });
      return;
    }
    
    this.loadData();
  }

  loadData(): void {
    this.loadingData = true;
    this.error = false;
    
    // Load both project and customers in parallel
    forkJoin({
      project: this.projectService.getProject(this.projectId),
      customers: this.customerService.getCustomers()
    }).subscribe({
      next: (data) => {
        this.project = data.project;
        this.customers = data.customers;
        this.loadingData = false;
      },
      error: (err) => {
        console.error('Error loading data', err);
        this.error = true;
        this.loadingData = false;
        this.snackBar.open('Failed to load project data. Please try again.', 'Close', {
          duration: 5000
        });
      }
    });
  }

  onSubmit(projectData: ProjectCreateRequest): void {
    this.loading = true;
    
    // Add the project ID to the update request
    const updateData: ProjectUpdateRequest = {
      ...projectData,
      _id: this.projectId
    };
    
    this.projectService.updateProject(this.projectId, updateData).subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open('Project updated successfully', 'Close', {
          duration: 3000
        });
        this.router.navigate(['/projects']);
      },
      error: (err) => {
        console.error('Error updating project', err);
        this.loading = false;
        this.snackBar.open('Failed to update project. Please try again.', 'Close', {
          duration: 5000
        });
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/projects']);
  }
} 