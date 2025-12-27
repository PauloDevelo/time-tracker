import { Component, EventEmitter, Input, OnInit, Output, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TimeEntryService } from '../../../core/services/time-entry.service';
import { TimeEntry } from '../../../core/models/time-entry.model';
import { TaskWithProjectName } from '../../../core/models/task.model';
import { TimeEntryEditDialogComponent } from './time-entry-edit-dialog/time-entry-edit-dialog.component';

import { ActiveTimeTracking } from '../../../core/models/time-entry.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-time-entry-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule
  ],
  templateUrl: './time-entry-list.component.html',
  styleUrls: ['./time-entry-list.component.scss']
})
export class TimeEntryListComponent implements OnInit, OnDestroy {
  @Input() timeEntries: TimeEntry[] | null = [];
  @Input() tasks: TaskWithProjectName[] | null = [];
  @Output() refreshRequest = new EventEmitter<void>();

  displayedColumns: string[] = ['task', 'duration', 'actions'];
  activeTimeTracking: ActiveTimeTracking | null = null;
  private subscription: Subscription = new Subscription();

  constructor(
    private timeEntryService: TimeEntryService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.subscription.add(
      this.timeEntryService.activeTimeTracking$.subscribe(tracking => {
        this.activeTimeTracking = tracking;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  getTaskName(taskId: string): string {
    if (!this.tasks) return '';
    const task = this.tasks.find(t => t._id === taskId);
    return task ? `${task.projectName} - ${task.name}` : '';
  }

  formatDuration(hours: number): string {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    
    return `${h}h ${m}m`;
  }

  editTimeEntry(timeEntry: TimeEntry): void {
    const dialogRef = this.dialog.open(TimeEntryEditDialogComponent, {
      width: '500px',
      data: {
        timeEntry,
        tasks: this.tasks
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refreshRequest.emit();
      }
    });
  }

  isEntryActive(entry: TimeEntry): boolean {
    return !!this.activeTimeTracking && this.activeTimeTracking.entryId === entry._id;
  }

  startTimeEntry(timeEntry: TimeEntry): void {
    this.timeEntryService.restartTimeTracking(timeEntry);
    this.snackBar.open('Time entry started', 'Close', { duration: 3000 });
    this.refreshRequest.emit();
  }

  async stopTimeEntry(_timeEntry: TimeEntry): Promise<void> {
    try{
      const updatedTimeEntry = await this.timeEntryService.stopTimeTracking();
      if (updatedTimeEntry) {
        this.snackBar.open('Time entry stopped', 'Close', { duration: 3000 });
        this.refreshRequest.emit();
      } else {
        this.snackBar.open('No active time entry to stop', 'Close', { duration: 3000 });
      }
    } catch (error) {
      console.error('Error stopping time entry', error);
      this.snackBar.open('Error stopping time entry', 'Close', { duration: 3000 });
    }
  }
}