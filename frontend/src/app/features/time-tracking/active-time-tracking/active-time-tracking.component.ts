import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { Subject, takeUntil } from 'rxjs';

import { TimeEntryService } from '../../../core/services/time-entry.service';
import { Task } from '../../../core/models/task.model';
import { ActiveTimeTracking } from '../../../core/models/time-entry.model';

@Component({
  selector: 'app-active-time-tracking',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule
  ],
  templateUrl: './active-time-tracking.component.html',
  styleUrls: ['./active-time-tracking.component.scss']
})
export class ActiveTimeTrackingComponent implements OnInit, OnDestroy {
  @Input() tasks: Task[] | null = [];
  @Input() elapsedTime = 0;
  @Input() isTracking = false;
  @Output() refreshRequest = new EventEmitter<void>();

  taskControl = new FormControl<string>('');
  activeTracking: ActiveTimeTracking | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(private timeEntryService: TimeEntryService) {}

  ngOnInit(): void {
    this.timeEntryService.activeTimeTracking$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tracking => {
        this.activeTracking = tracking;
        
        if (tracking) {
          this.taskControl.setValue(tracking.taskId);
          this.taskControl.disable();
        } else {
          this.taskControl.setValue('');
          this.taskControl.enable();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  formatElapsedTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    const padWithZero = (num: number): string => num < 10 ? `0${num}` : `${num}`;
    
    return `${padWithZero(hours)}:${padWithZero(minutes)}:${padWithZero(remainingSeconds)}`;
  }

  startTracking(): void {
    const taskId = this.taskControl.value;
    if (taskId) {
      this.timeEntryService.startTimeTracking(taskId);
    }
  }

  stopTracking(): void {
    const timeEntryObservable = this.timeEntryService.stopTimeTracking();
    if (timeEntryObservable) {
      timeEntryObservable.subscribe({
        next: () => {
          this.refreshRequest.emit();
        },
        error: error => {
          console.error('Error stopping time tracking', error);
        }
      });
    }
  }

  getTaskName(taskId: string): string {
    if (!this.tasks) return '';
    const task = this.tasks.find(t => t._id === taskId);
    return task ? task.name : '';
  }
} 