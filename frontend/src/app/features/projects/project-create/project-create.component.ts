import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProjectFormComponent } from '../project-form/project-form.component';
import { ProjectService } from '../../../core/services/project.service';
import { CustomerService } from '../../../core/services/customer.service';
import { ProjectCreateRequest } from '../../../core/models/project.model';
import { Customer } from '../../../core/models/customer.model';

@Component({
  selector: 'app-project-create',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ProjectFormComponent
  ],
  templateUrl: './project-create.component.html',
  styleUrls: ['./project-create.component.scss']
})
export class ProjectCreateComponent implements OnInit {
  customers: Customer[] = [];
  loading = false;
  loadingCustomers = true;

  constructor(
    private projectService: ProjectService,
    private customerService: CustomerService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.loadingCustomers = true;
    this.customerService.getCustomers().subscribe({
      next: (customers) => {
        this.customers = customers;
        this.loadingCustomers = false;
      },
      error: (err) => {
        console.error('Error loading customers', err);
        this.loadingCustomers = false;
        this.snackBar.open('Failed to load customers. Please try again.', 'Close', {
          duration: 5000
        });
      }
    });
  }

  onSubmit(projectData: ProjectCreateRequest): void {
    this.loading = true;
    this.projectService.createProject(projectData).subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open('Project created successfully', 'Close', {
          duration: 3000
        });
        this.router.navigate(['/projects']);
      },
      error: (err) => {
        console.error('Error creating project', err);
        this.loading = false;
        this.snackBar.open('Failed to create project. Please try again.', 'Close', {
          duration: 5000
        });
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/projects']);
  }
} 