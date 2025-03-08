import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';

import { TimeEntryService } from '../../../core/services/time-entry.service';
import { Task } from '../../../core/models/task.model';
import { TimeEntryCreateRequest } from '../../../core/models/time-entry.model';

@Component({
  selector: 'app-time-entry-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './time-entry-form.component.html',
  styleUrls: ['./time-entry-form.component.scss']
})
export class TimeEntryFormComponent implements OnInit, OnChanges {
  @Input() tasks: Task[] | null = [];
  @Input() selectedDate: Date = new Date();
  @Output() refreshRequest = new EventEmitter<void>();

  timeEntryForm!: FormGroup;
  
  constructor(
    private fb: FormBuilder, 
    private timeEntryService: TimeEntryService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDate'] && !changes['selectedDate'].firstChange) {
      // Update the form when selected date changes
      this.initForm();
    }
  }

  private initForm(): void {
    // Create a date at the beginning of the selected day (8:00 AM)
    const defaultStartTime = new Date(this.selectedDate);
    defaultStartTime.setHours(8, 0, 0, 0);

    this.timeEntryForm = this.fb.group({
      taskId: ['', Validators.required],
      startTime: [defaultStartTime, Validators.required],
      totalDurationInHour: ['', [Validators.required, Validators.min(0.01), Validators.max(24)]]
    });
  }

  onSubmit(): void {
    if (this.timeEntryForm.invalid) {
      return;
    }

    const formValues = this.timeEntryForm.value;
    
    // Create time entry request
    const timeEntry: TimeEntryCreateRequest = {
      taskId: formValues.taskId,
      startTime: formValues.startTime.toISOString(),
      totalDurationInHour: parseFloat(formValues.totalDurationInHour)
    };

    // Send to API
    this.timeEntryService.createTimeEntry(timeEntry).subscribe({
      next: () => {
        this.snackBar.open('Time entry created successfully', 'Close', { duration: 3000 });
        this.timeEntryForm.reset({ 
          taskId: '', 
          startTime: formValues.startTime,
          totalDurationInHour: ''
        });
        this.refreshRequest.emit();
      },
      error: error => {
        console.error('Error creating time entry', error);
        this.snackBar.open('Error creating time entry', 'Close', { duration: 3000 });
      }
    });
  }
} 