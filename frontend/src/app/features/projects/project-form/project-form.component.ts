import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Project, ProjectCreateRequest } from '../../../core/models/project.model';
import { Customer } from '../../../core/models/customer.model';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatCardModule
  ],
  templateUrl: './project-form.component.html',
  styleUrls: ['./project-form.component.scss']
})
export class ProjectFormComponent implements OnInit {
  @Input() project: Project | null = null;
  @Input() customers: Customer[] = [];
  @Input() loading = false;
  @Input() submitButtonText = 'Save';
  @Output() formSubmit = new EventEmitter<ProjectCreateRequest>();
  @Output() cancel = new EventEmitter<void>();

  projectForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.projectForm = this.fb.group({
      name: [this.project?.name || '', [Validators.required, Validators.maxLength(100)]],
      description: [this.project?.description || ''],
      customerId: [this.project?.customerId._id || '', [Validators.required]],
    });
  }

  onSubmit(): void {
    if (this.projectForm.valid) {
      const formValue = this.projectForm.value;
      
      // Format dates to ISO string if they exist
      const projectData: ProjectCreateRequest = {
        ...formValue,
        startDate: formValue.startDate ? formValue.startDate.toISOString() : undefined,
        endDate: formValue.endDate ? formValue.endDate.toISOString() : undefined
      };
      
      this.formSubmit.emit(projectData);
    } else {
      this.projectForm.markAllAsTouched();
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }
} 