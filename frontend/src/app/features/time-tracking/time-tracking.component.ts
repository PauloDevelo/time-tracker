import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, Subject, interval, map, takeUntil } from 'rxjs';

import { TimeEntryService } from '../../core/services/time-entry.service';
import { TaskService } from '../../core/services/task.service';
import { TimeEntry } from '../../core/models/time-entry.model';
import { TaskWithProjectName } from '../../core/models/task.model';
import { TimeEntryListComponent } from './time-entry-list/time-entry-list.component';
import { ActiveTimeTrackingComponent } from './active-time-tracking/active-time-tracking.component';

@Component({
  selector: 'app-time-tracking',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    TimeEntryListComponent,
    ActiveTimeTrackingComponent
  ],
  templateUrl: './time-tracking.component.html',
  styleUrls: ['./time-tracking.component.scss']
})
export class TimeTrackingComponent implements OnInit, OnDestroy {
  timeEntries$!: Observable<TimeEntry[]>;
  tasks$!: Observable<TaskWithProjectName[]>;
  selectedDate: Date = new Date();
  isTracking = false;
  elapsedTime = 0;
  totalDuration$!: Observable<number>;
  
  private destroy$ = new Subject<void>();

  constructor(
    private timeEntryService: TimeEntryService,
    private taskService: TaskService
  ) {}

  ngOnInit(): void {
    // Get the current selected date from the service
    this.timeEntryService.selectedDate$.subscribe(date => {
      this.selectedDate = date;
      this.loadTimeEntries();
    });

    // Load all tasks for selection
    this.tasks$ = this.taskService.getTasksWithProjectName();

    // Check if there's an active time tracking session
    this.isTracking = this.timeEntryService.hasActiveTimeTracking();
    if (this.isTracking) {
      this.startTimer();
    }

    // Subscribe to active time tracking changes
    this.timeEntryService.activeTimeTracking$.subscribe(tracking => {
      this.isTracking = !!tracking;
      if (this.isTracking) {
        this.startTimer();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onDateChange(date: Date): void {
    this.timeEntryService.setSelectedDate(date);
  }

  loadTimeEntries(): void {
    this.timeEntries$ = this.timeEntryService.getTimeEntriesByDate(this.selectedDate);
    this.totalDuration$ = this.timeEntries$.pipe(
      map(entries => {
        // Calculate total duration in hours
        return entries.reduce((total, entry) => total + entry.totalDurationInHour, 0);
      })
    );
  }

  refreshTimeEntries(): void {
    this.loadTimeEntries();
  }

  changeDate(days: number): void {
    const newDate = new Date(this.selectedDate);
    newDate.setDate(newDate.getDate() + days);
    this.onDateChange(newDate);
  }

  formatDuration(hours: number): string {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    
    return `${h}h ${m}m`;
  }

  private startTimer(): void {
    // Update timer every second
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.elapsedTime = this.timeEntryService.getActiveTrackingDuration();
      });
  }
}