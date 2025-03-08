import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Task, TaskCreateRequest, TaskUpdateRequest } from '../../../core/models/task.model';

export interface TaskDialogData {
  task?: Task;
  projectId: string;
  isEditing: boolean;
}

@Component({
  selector: 'app-task-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './task-dialog.component.html',
  styleUrls: ['./task-dialog.component.scss']
})
export class TaskDialogComponent implements OnInit {
  taskForm!: FormGroup;
  dialogTitle: string = 'Add Task';

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<TaskDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TaskDialogData
  ) {}

  ngOnInit(): void {
    this.initForm();

    if (this.data.isEditing && this.data.task) {
      this.dialogTitle = 'Edit Task';
      this.taskForm.patchValue({
        name: this.data.task.name,
        description: this.data.task.description || '',
        url: this.data.task.url || ''
      });
    }
  }

  initForm(): void {
    this.taskForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', Validators.maxLength(500)],
      url: ['', Validators.maxLength(255)]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.taskForm.valid) {
      if (this.data.isEditing && this.data.task) {
        const taskUpdate: TaskUpdateRequest = {
          _id: this.data.task._id,
          ...this.taskForm.value
        };
        this.dialogRef.close(taskUpdate);
      } else {
        const taskCreate: TaskCreateRequest = {
          ...this.taskForm.value,
          projectId: this.data.projectId
        };
        this.dialogRef.close(taskCreate);
      }
    }
  }
} 