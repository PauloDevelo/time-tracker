import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { TimeEntryService } from '../../../../core/services/time-entry.service';
import { Task } from '../../../../core/models/task.model';
import { TimeEntry, TimeEntryUpdateRequest } from '../../../../core/models/time-entry.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

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
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule
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
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    const timeEntry = this.data.timeEntry;
    const startTime = new Date(timeEntry.startTime);
    
    // Format time for the time input (HH:MM)
    const hours = startTime.getHours().toString().padStart(2, '0');
    const minutes = startTime.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    
    // Convert duration from hours to HH:MM format
    const durationHours = Math.floor(timeEntry.totalDurationInHour);
    const durationMinutes = Math.round((timeEntry.totalDurationInHour - durationHours) * 60);
    const durationString = `${durationHours.toString().padStart(2, '0')}:${durationMinutes.toString().padStart(2, '0')}`;

    this.editForm = this.fb.group({
      taskId: [timeEntry.taskId, Validators.required],
      startDate: [startTime, Validators.required],
      startTime: [timeString, [Validators.required, Validators.pattern('^([01]?[0-9]|2[0-3]):[0-5][0-9]$')]],
      duration: [durationString, [Validators.required, Validators.pattern('^([01]?[0-9]|2[0-3]):[0-5][0-9]$')]]
    });
  }

  onSubmit(): void {
    if (this.editForm.invalid) {
      return;
    }

    const formValues = this.editForm.value;
    const timeEntry = this.data.timeEntry;
    
    // Combine date and time inputs
    const startDate = formValues.startDate;
    const [hours, minutes] = formValues.startTime.split(':').map(Number);
    
    // Create a new date with the selected date and time
    const combinedDateTime = new Date(startDate);
    combinedDateTime.setHours(hours, minutes, 0, 0);
    
    // Parse the duration string (HH:MM) to decimal hours
    const [durationHours, durationMinutes] = formValues.duration.split(':').map(Number);
    const totalDurationInHour = durationHours + (durationMinutes / 60);
    
    const updateRequest: TimeEntryUpdateRequest = {
      _id: timeEntry._id,
      taskId: formValues.taskId,
      startTime: combinedDateTime.toISOString(),
      totalDurationInHour: parseFloat(totalDurationInHour.toFixed(2))
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

  onDelete(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Time Entry',
        message: 'Are you sure you want to delete this time entry?',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.timeEntryService.deleteTimeEntry(this.data.timeEntry._id).subscribe({
          next: () => {
            this.snackBar.open('Time entry deleted successfully', 'Close', { duration: 3000 });
            this.dialogRef.close(true);
          },
          error: error => {
            console.error('Error deleting time entry', error);
            this.snackBar.open('Error deleting time entry', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }
}