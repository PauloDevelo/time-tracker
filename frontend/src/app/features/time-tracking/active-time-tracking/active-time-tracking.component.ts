import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule, MatSelect } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { Subject, startWith, takeUntil } from 'rxjs';

import { TimeEntryService } from '../../../core/services/time-entry.service';
import { Task, TaskWithProjectName } from '../../../core/models/task.model';
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
    MatSelectModule,
    MatInputModule
  ],
  templateUrl: './active-time-tracking.component.html',
  styleUrls: ['./active-time-tracking.component.scss']
})
export class ActiveTimeTrackingComponent implements OnInit, OnDestroy {
  @Input() selectedDate: Date = new Date();
  @Input() tasks: TaskWithProjectName[] | null = [];
  @Output() refreshRequest = new EventEmitter<void>();
  @ViewChild('taskSelect') taskSelect!: MatSelect;

  get isTracking(): boolean {
    return !!this.activeTracking?.startProgressTime;
  }

  get elapsedTime(): number {
    return this.timeEntryService.getActiveTrackingDuration();
  }

  taskControl = new FormControl<string>('');
  searchControl = new FormControl<string>('');
  activeTracking: ActiveTimeTracking | null = null;
  
  filteredTasks: TaskWithProjectName[] = [];
  taskActivityMap = new Map<string, Date>();
  selectedTask: TaskWithProjectName | null = null;
  highlightedIndex = -1;
  
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
          this.updateSelectedTask(tracking.taskId);
        } else {
          this.taskControl.setValue('');
          this.taskControl.enable();
          this.selectedTask = null;
        }
      });
    
    // Get recent task activity for sorting
    this.timeEntryService.getRecentTaskActivity()
      .pipe(takeUntil(this.destroy$))
      .subscribe(taskActivities => {
        // Create a map of task ID to last activity date
        this.taskActivityMap.clear();
        taskActivities.forEach(activity => {
          this.taskActivityMap.set(activity.taskId, activity.lastActivity);
        });
        
        this.updateFilteredTasks();
      });
    
    // Set up search filtering
    this.searchControl.valueChanges
      .pipe(
        startWith(''),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.updateFilteredTasks();
        // Reset the highlighted index when search changes
        this.highlightedIndex = -1;
      });
      
    // Track selected task changes
    this.taskControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(taskId => {
        if (taskId) {
          this.updateSelectedTask(taskId);
        } else {
          this.selectedTask = null;
        }
      });
  }

  ngOnChanges(): void {
    this.updateFilteredTasks();
    
    // Update selected task if tasks input changes
    if (this.taskControl.value) {
      this.updateSelectedTask(this.taskControl.value);
    }
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
      this.timeEntryService.startTimeTracking(taskId, this.selectedDate);
    }
  }

  async stopTracking(): Promise<void> {
    try{
      const updatedTimeEntry = await this.timeEntryService.stopTimeTracking();
      this.refreshRequest.emit();
    } catch (error) {
      console.error('Error stopping time tracking', error);
    }
  }

  getTaskName(taskId: string): string {
    if (!this.tasks) return '';
    const task = this.tasks.find(t => t._id === taskId);
    return task ? task.name : '';
  }
  
  /**
   * Handles keyboard navigation through task options
   */
  navigateTaskOptions(event: KeyboardEvent, direction: 'up' | 'down'): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (this.filteredTasks.length === 0) {
      return;
    }
    
    if (direction === 'down') {
      // Move highlight down (or to first item if not highlighted)
      if (this.highlightedIndex < this.filteredTasks.length - 1) {
        this.highlightedIndex++;
      } else {
        this.highlightedIndex = 0; // Wrap around to beginning
      }
    } else {
      // Move highlight up (or to last item if not highlighted)
      if (this.highlightedIndex > 0) {
        this.highlightedIndex--;
      } else {
        this.highlightedIndex = this.filteredTasks.length - 1; // Wrap around to end
      }
    }
    
    // Select the highlighted task when Enter is pressed
    if (event.key === 'Enter' && this.highlightedIndex >= 0) {
      this.selectHighlightedTask();
    }
    
    // Scroll to the highlighted option (needs DOM manipulation)
    this.scrollToHighlightedOption();
  }
  
  /**
   * Selects the currently highlighted task
   */
  selectHighlightedTask(): void {
    if (this.highlightedIndex >= 0 && this.highlightedIndex < this.filteredTasks.length) {
      const selectedTask = this.filteredTasks[this.highlightedIndex];
      this.taskControl.setValue(selectedTask._id);
      this.taskSelect.close();
    }
  }
  
  /**
   * Scrolls to the highlighted option in the dropdown
   */
  private scrollToHighlightedOption(): void {
    setTimeout(() => {
      const optionElement = document.getElementById(`task-option-${this.highlightedIndex}`);
      if (optionElement) {
        optionElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 0);
  }
  
  private updateSelectedTask(taskId: string): void {
    if (!this.tasks) return;
    
    const task = this.tasks.find(t => t._id === taskId);
    if (task) {
      this.selectedTask = task;
    }
  }

  private updateFilteredTasks(): void {
    if (!this.tasks) {
      this.filteredTasks = [];
      return;
    }

    const searchTerm = (this.searchControl.value || '').toLowerCase();
    
    // Filter tasks by search term
    const filtered = searchTerm 
      ? this.tasks.filter(task => 
          task.name.toLowerCase().includes(searchTerm) || 
          task.projectName.toLowerCase().includes(searchTerm))
      : [...this.tasks];
    
    // Sort tasks by last activity date (most recent first)
    this.filteredTasks = filtered.sort((a, b) => {
      const dateA = this.taskActivityMap.get(a._id);
      const dateB = this.taskActivityMap.get(b._id);
      
      if (dateA && dateB) {
        return dateB.getTime() - dateA.getTime();
      } else if (dateA) {
        return -1;
      } else if (dateB) {
        return 1;
      } else {
        // If no activity data, sort by name
        return a.name.localeCompare(b.name);
      }
    });
  }
}