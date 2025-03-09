import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserSettings } from '../models/user-settings.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserSettingsService {
  private apiUrl = `${environment.apiUrl}/api/user-settings`;

  constructor(private http: HttpClient) { }

  /**
   * Get the user settings
   */
  getUserSettings(): Observable<UserSettings> {
    return this.http.get<UserSettings>(this.apiUrl);
  }

  /**
   * Update user settings
   * @param settings The settings to update
   * @param image Optional profile image file
   */
  updateUserSettings(settings: Partial<UserSettings>, image?: File): Observable<UserSettings> {
    // If there's an image, use FormData to send multipart/form-data
    if (image) {
      const formData = new FormData();
      
      // Convert objects to JSON strings
      if (settings.companyInformation) {
        formData.append('companyInformation', JSON.stringify(settings.companyInformation));
      }
      
      if (settings.personalInformation) {
        const { image: _, ...personalInfo } = settings.personalInformation;
        formData.append('personalInformation', JSON.stringify(personalInfo));
      }
      
      // Append the image file
      formData.append('image', image);
      
      return this.http.post<UserSettings>(this.apiUrl, formData);
    } 
    
    // Otherwise, send as JSON
    return this.http.post<UserSettings>(this.apiUrl, settings);
  }
}