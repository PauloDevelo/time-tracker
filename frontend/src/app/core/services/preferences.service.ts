import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface UserPreferences {
  darkMode: boolean;
  // Add more preferences here in the future
}

@Injectable({
  providedIn: 'root'
})
export class PreferencesService {
  private readonly STORAGE_KEY = 'user_preferences';
  private readonly DEFAULT_PREFERENCES: UserPreferences = {
    darkMode: false
  };

  private preferencesSubject = new BehaviorSubject<UserPreferences>(this.DEFAULT_PREFERENCES);
  public preferences$ = this.preferencesSubject.asObservable();

  // Signal for theme changes
  public darkMode = signal<boolean>(false);

  constructor() {
    this.loadPreferences();
  }

  private loadPreferences(): void {
    try {
      const storedPrefs = localStorage.getItem(this.STORAGE_KEY);
      if (storedPrefs) {
        const parsedPrefs = JSON.parse(storedPrefs) as UserPreferences;
        this.preferencesSubject.next(parsedPrefs);
        this.darkMode.set(parsedPrefs.darkMode);
      }
    } catch (error) {
      console.error('Error loading preferences from localStorage:', error);
      // Fall back to default preferences
      this.resetToDefaults();
    }
  }

  public savePreferences(preferences: Partial<UserPreferences>): void {
    const currentPreferences = this.preferencesSubject.value;
    const updatedPreferences = { ...currentPreferences, ...preferences };
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedPreferences));
      this.preferencesSubject.next(updatedPreferences);
      
      // Update signals
      if (preferences.darkMode !== undefined) {
        this.darkMode.set(preferences.darkMode);
      }
    } catch (error) {
      console.error('Error saving preferences to localStorage:', error);
    }
  }

  public toggleDarkMode(): void {
    const currentDarkMode = this.preferencesSubject.value.darkMode;
    this.savePreferences({ darkMode: !currentDarkMode });
  }

  public resetToDefaults(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.preferencesSubject.next(this.DEFAULT_PREFERENCES);
    this.darkMode.set(this.DEFAULT_PREFERENCES.darkMode);
  }
} 