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
    // Check local storage for any ongoing time tracking when service initializes
    this.loadActiveTimeTrackingFromStorage();
  }

  // Get all time entries
  getTimeEntries(): Observable<TimeEntry[]> {
    return this.http.get<{ timeEntries: TimeEntry[] }>(this.apiUrl)
      .pipe(map(response => response.timeEntries));
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

  // Get a specific time entry
  getTimeEntry(id: string): Observable<TimeEntry> {
    return this.http.get<TimeEntry>(`${this.apiUrl}/${id}`);
  }

  // Create a time entry
  createTimeEntry(timeEntry: TimeEntryCreateRequest): Observable<TimeEntry> {
    return this.http.post<TimeEntry>(this.apiUrl, timeEntry);
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
    var currentTime = new Date();

    var entry = await lastValueFrom(this.createTimeEntry({ 
      startTime: currentTime.toISOString(),
      totalDurationInHour: 0,
      taskId
    }));
    
    const activeTracking: ActiveTimeTracking = {
      entryId: entry._id,
      taskId,
      startedAt: currentTime
    };

    this.activeTimeTrackingSubject.next(activeTracking);
    this.saveActiveTimeTrackingToStorage(activeTracking);

    await lastValueFrom(this.http.put(`${this.apiUrl}/${entry._id}/start`, {}));
  }

  async restartTimeTracking(entry: TimeEntry): Promise<void> {
    var currentTime = new Date();

    const activeTracking: ActiveTimeTracking = {
      entryId: entry._id,
      taskId: entry.taskId,
      startedAt: currentTime
    };

    this.activeTimeTrackingSubject.next(activeTracking);
    this.saveActiveTimeTrackingToStorage(activeTracking);

    await lastValueFrom(this.http.put(`${this.apiUrl}/${entry._id}/start`, {}));
  }

  // Stop time tracking and create a time entry
  stopTimeTracking(): Observable<TimeEntry> | null {
    const activeTracking = this.activeTimeTrackingSubject.value;
    
    if (!activeTracking) {
      return null;
    }

    // Clear active tracking
    this.activeTimeTrackingSubject.next(null);
    this.clearActiveTimeTrackingFromStorage();
    
    return this.http.put<TimeEntry>(`${this.apiUrl}/${activeTracking.entryId}/stop`, {});
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
    return Math.floor((now.getTime() - activeTracking.startedAt.getTime()) / 1000);
  }

  // Change the selected date for viewing time entries
  setSelectedDate(date: Date): void {
    this.selectedDateSubject.next(date);
  }

  // Save active time tracking to localStorage
  private saveActiveTimeTrackingToStorage(tracking: ActiveTimeTracking): void {
    localStorage.setItem('activeTimeTracking', JSON.stringify({
      entryId: tracking.entryId,
      startedAt: tracking.startedAt.toISOString()
    }));
  }

  // Load active time tracking from localStorage
  private loadActiveTimeTrackingFromStorage(): void {
    const storedTracking = localStorage.getItem('activeTimeTracking');
    if (storedTracking) {
      try {
        const parsed = JSON.parse(storedTracking);
        const tracking: ActiveTimeTracking = {
          taskId: parsed.taskId,
          entryId: parsed.entryId,
          startedAt: new Date(parsed.startedAt)
        };
        this.activeTimeTrackingSubject.next(tracking);
      } catch (error) {
        console.error('Error loading active time tracking', error);
        this.clearActiveTimeTrackingFromStorage();
      }
    }
  }

  // Clear active time tracking from localStorage
  private clearActiveTimeTrackingFromStorage(): void {
    localStorage.removeItem('activeTimeTracking');
  }
} 