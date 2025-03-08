import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';

import { TimeEntryService } from '../../../../core/services/time-entry.service';
import { Task } from '../../../../core/models/task.model';
import { TimeEntry, TimeEntryUpdateRequest } from '../../../../core/models/time-entry.model';

interface DialogData {
  timeEntry: TimeEntry;
  tasks: Task[] | null;
}

@Component({
  selector: 'app-time-entry-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './time-entry-edit-dialog.component.html',
  styleUrls: ['./time-entry-edit-dialog.component.scss']
})
export class TimeEntryEditDialogComponent implements OnInit {
  editForm!: FormGroup;
  
  constructor(
    private fb: FormBuilder,
    private timeEntryService: TimeEntryService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<TimeEntryEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) { }

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    const timeEntry = this.data.timeEntry;
    const startTime = new Date(timeEntry.startTime);
    
    // Format time as HH:MM for the input
    const hours = startTime.getHours().toString().padStart(2, '0');
    const minutes = startTime.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;

    this.editForm = this.fb.group({
      taskId: [timeEntry.taskId, Validators.required],
      startTime: [timeString, Validators.required],
      totalDurationInHour: [timeEntry.totalDurationInHour, [Validators.required, Validators.min(0.01), Validators.max(24)]]
    });
  }

  onSubmit(): void {
    if (this.editForm.invalid) {
      return;
    }

    const formValues = this.editForm.value;
    const timeEntry = this.data.timeEntry;
    
    // Parse the time string and create a new date with the same date but updated time
    const [hours, minutes] = formValues.startTime.split(':').map(Number);
    const startDate = new Date(timeEntry.startTime);
    startDate.setHours(hours, minutes, 0, 0);
    
    const updateRequest: TimeEntryUpdateRequest = {
      _id: timeEntry._id,
      taskId: formValues.taskId,
      startTime: startDate.toISOString(),
      totalDurationInHour: parseFloat(formValues.totalDurationInHour)
    };

    this.timeEntryService.updateTimeEntry(timeEntry._id, updateRequest).subscribe({
      next: () => {
        this.snackBar.open('Time entry updated successfully', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: error => {
        console.error('Error updating time entry', error);
        this.snackBar.open('Error updating time entry', 'Close', { duration: 3000 });
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
} 