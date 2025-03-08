import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, lastValueFrom, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TimeEntry, TimeEntryCreateRequest, TimeEntryUpdateRequest, ActiveTimeTracking } from '../models/time-entry.model';

@Injectable({
  providedIn: 'root'
})
export class TimeEntryService {
  private apiUrl = `${environment.apiUrl}/api/time-entries`;
  
  // Track currently active time entry
  private activeTimeTrackingSubject = new BehaviorSubject<ActiveTimeTracking | null>(null);
  activeTimeTracking$ = this.activeTimeTrackingSubject.asObservable();
  
  // Current selected date for time entries view
  private selectedDateSubject = new BehaviorSubject<Date>(new Date());
  selectedDate$ = this.selectedDateSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadActiveTimeTracking();
  }

  // Get time entries for a specific date
  getTimeEntriesByDate(date: Date): Observable<TimeEntry[]> {
    // Format the beginning of the day in this format 2023-06-22T08:00:00Z
    const beginningOfDay = new Date(date.setHours(0, 0, 0, 0));
    const formattedBeginningOfDay = beginningOfDay.toISOString();
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
    const formattedEndOfDay = endOfDay.toISOString();

    // pass the formatted date to the api into the query params
    return this.http.get<{ timeEntries: TimeEntry[] }>(`${this.apiUrl}?startDate=${formattedBeginningOfDay}&endDate=${formattedEndOfDay}`)
      .pipe(map(response => response.timeEntries));
  }

  // Update a time entry
  updateTimeEntry(id: string, timeEntry: TimeEntryUpdateRequest): Observable<TimeEntry> {
    return this.http.put<TimeEntry>(`${this.apiUrl}/${id}`, timeEntry);
  }

  // Delete a time entry
  deleteTimeEntry(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  // Start time tracking for a task
  async startTimeTracking(taskId: string): Promise<void> {
    if (this.activeTimeTrackingSubject.value) {
      await this.stopTimeTracking();
    }

    var currentTime = new Date();
    var entry = await lastValueFrom(this.createTimeEntry({ 
      startTime: currentTime.toISOString(),
      totalDurationInHour: 0,
      taskId
    }));

    await this.restartTimeTracking(entry);
  }

  async restartTimeTracking(entry: TimeEntry): Promise<void> {
    if (this.activeTimeTrackingSubject.value) {
      await this.stopTimeTracking();
    }

    await lastValueFrom(this.http.put(`${this.apiUrl}/${entry._id}/start`, {}));
    await this.loadActiveTimeTracking();
  }

  // Stop time tracking and create a time entry
  async stopTimeTracking(): Promise<TimeEntry | null> {
    const activeTracking = this.activeTimeTrackingSubject.value;
    
    if (!activeTracking) {
      return null;
    }

    const updatedEntry = await lastValueFrom(this.http.put<TimeEntry>(`${this.apiUrl}/${activeTracking.entryId}/stop`, {}));
    await this.loadActiveTimeTracking();
    return updatedEntry;
  }

  // Check if there's an active time tracking session
  hasActiveTimeTracking(): boolean {
    return !!this.activeTimeTrackingSubject.value;
  }

  // Get the current active tracking time in seconds
  getActiveTrackingDuration(): number {
    const activeTracking = this.activeTimeTrackingSubject.value;
    if (!activeTracking) {
      return 0;
    }
    
    const now = new Date();
    if (activeTracking.startProgressTime) {
      return Math.floor(activeTracking.totalDurationInHour * 3600 + (now.getTime() - activeTracking.startProgressTime.getTime()) / 1000);
    }
    else{
      return Math.floor(activeTracking.totalDurationInHour * 3600);
    }
  }

  // Change the selected date for viewing time entries
  setSelectedDate(date: Date): void {
    this.selectedDateSubject.next(date);
  }

  // Create a time entry
  private createTimeEntry(timeEntry: TimeEntryCreateRequest): Observable<TimeEntry> {
    return this.http.post<TimeEntry>(this.apiUrl, timeEntry);
  }

  // Get time entries for a specific date
  private getInProgressTimeEntry(): Observable<TimeEntry | undefined> {
    // pass the formatted date to the api into the query params
    return this.http.get<{ timeEntries: TimeEntry[] }>(`${this.apiUrl}?inProgressOnly=true`)
      .pipe(map(response => response.timeEntries.length > 0 ? response.timeEntries[0] : undefined));
  }

  // Load active time tracking from localStorage
  private async loadActiveTimeTracking(): Promise<void> {
    const inProgressEntry = await lastValueFrom(this.getInProgressTimeEntry());

    if (inProgressEntry) {
        const tracking: ActiveTimeTracking = {
          taskId: inProgressEntry.taskId,
          entryId: inProgressEntry._id,
          startedAt: new Date(inProgressEntry.startTime),
          startProgressTime: new Date(inProgressEntry.startProgressTime!),
          totalDurationInHour: inProgressEntry.totalDurationInHour
        };
        this.activeTimeTrackingSubject.next(tracking);
    }
  }
} 