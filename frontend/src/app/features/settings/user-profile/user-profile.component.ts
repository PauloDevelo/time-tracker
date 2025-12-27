import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { UserSettingsService } from '../../../core/services/user-settings.service';
import { UserSettings } from '../../../core/models/user-settings.model';
import { finalize, Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatIconModule,
    MatDividerModule
  ],
  template: `
    <div class="profile-container">
      <h1>User Profile</h1>
      
      <mat-card>
        <mat-card-header>
          <mat-card-title>Personal Information</mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
            <mat-progress-bar *ngIf="loading" mode="indeterminate"></mat-progress-bar>
            
            <div class="profile-image-container">
              <div class="profile-image" [class.has-image]="profileImageSrc">
                <img *ngIf="profileImageSrc" [src]="profileImageSrc" alt="Profile Image">
                <mat-icon *ngIf="!profileImageSrc">account_circle</mat-icon>
              </div>
              
              <div class="image-upload-actions">
                <input 
                  type="file" 
                  #fileInput 
                  style="display: none" 
                  accept="image/*"
                  (change)="onFileSelected($event)">
                
                <button 
                  type="button" 
                  mat-raised-button 
                  color="primary"
                  (click)="fileInput.click()">
                  {{ profileImageSrc ? 'Change' : 'Upload' }} Photo
                </button>
                
                <button 
                  *ngIf="profileImageSrc" 
                  type="button" 
                  mat-button 
                  color="warn"
                  (click)="removeProfileImage()">
                  Remove
                </button>
              </div>
            </div>
            
            <mat-divider class="section-divider"></mat-divider>
            
            <div class="user-info">
              <p><strong>Email:</strong> {{ userEmail }}</p>
            </div>
            
            <mat-divider class="section-divider"></mat-divider>
            
            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Address</mat-label>
                <textarea 
                  matInput 
                  formControlName="address" 
                  placeholder="Enter your address"
                  rows="3">
                </textarea>
              </mat-form-field>
            </div>
            
            <div class="form-actions">
              <button 
                mat-raised-button 
                color="primary" 
                type="submit"
                [disabled]="!isProfileChanged() || loading">
                Save Changes
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .profile-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }
    
    .profile-image-container {
      display: flex;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    
    .profile-image {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #e0e0e0;
    }
    
    .profile-image.has-image {
      background-color: transparent;
    }
    
    .profile-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .profile-image mat-icon {
      font-size: 80px;
      height: 80px;
      width: 80px;
      color: #9e9e9e;
    }
    
    .image-upload-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .section-divider {
      margin: 24px 0;
    }
    
    .user-info {
      margin: 16px 0;
    }
    
    .full-width {
      width: 100%;
    }
    
    .form-row {
      margin-bottom: 16px;
    }
    
    .form-actions {
      margin-top: 24px;
      display: flex;
      justify-content: flex-end;
    }
  `]
})
export class UserProfileComponent implements OnInit, OnDestroy {
  profileForm: FormGroup;
  loading = false;
  userEmail = '';
  profileImageSrc: string | null = null;
  selectedFile: File | null = null;
  private originalAddress = '';
  private imageRemoved = false;
  private destroy$ = new Subject<void>();
  
  constructor(
    private fb: FormBuilder,
    private userSettingsService: UserSettingsService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.profileForm = this.fb.group({
      address: ['']
    });
    
    // Get user email from auth service using the observable
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.userEmail = user.email;
        }
      });
  }
  
  ngOnInit(): void {
    this.loadUserProfile();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadUserProfile(): void {
    this.loading = true;
    this.userSettingsService.getUserSettings()
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (settings: UserSettings) => {
          if (settings.personalInformation) {
            const { address } = settings.personalInformation;
            this.profileForm.patchValue({ address });
            this.originalAddress = address;
            
            // Load profile image if available
            if (settings.personalInformation.image) {
                const base64 = btoa(
                    settings.personalInformation.image.data.data
                      .reduce((data, byte) => data + String.fromCharCode(byte), '')
                  );
              const { contentType } = settings.personalInformation.image;
              this.profileImageSrc = `data:${contentType};base64,${base64}`;
            }
          }
        },
        error: (error) => {
          this.snackBar.open('Error loading profile. Please try again later.', 'Close', {
            duration: 5000
          });
          console.error('Error loading profile:', error);
        }
      });
  }
  
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      
      // Preview the image
      const reader = new FileReader();
      reader.onload = () => {
        this.profileImageSrc = reader.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
      
      this.imageRemoved = false;
    }
  }
  
  removeProfileImage(): void {
    this.profileImageSrc = null;
    this.selectedFile = null;
    this.imageRemoved = true;
  }
  
  isProfileChanged(): boolean {
    return this.profileForm.get('address')?.value !== this.originalAddress ||
           this.selectedFile !== null || 
           this.imageRemoved;
  }
  
  saveProfile(): void {
    this.loading = true;
    
    const personalInformation = {
      address: this.profileForm.get('address')?.value
    };
    
    const settings: Partial<UserSettings> = {
      personalInformation
    };
    
    // If image was removed but no new image selected, send empty image
    if (this.imageRemoved && !this.selectedFile) {
      // The backend will handle removing the image when no new image is provided
      this.userSettingsService.updateUserSettings(settings)
        .pipe(finalize(() => this.loading = false))
        .subscribe(this.handleProfileUpdateResponse.bind(this));
      return;
    }
    
    // If there's a new image file, use it for update
    if (this.selectedFile) {
      this.userSettingsService.updateUserSettings(settings, this.selectedFile)
        .pipe(finalize(() => this.loading = false))
        .subscribe(this.handleProfileUpdateResponse.bind(this));
      return;
    }
    
    // Otherwise just update the text fields
    this.userSettingsService.updateUserSettings(settings)
      .pipe(finalize(() => this.loading = false))
      .subscribe(this.handleProfileUpdateResponse.bind(this));
  }
  
  private handleProfileUpdateResponse(response?: UserSettings): void {
    // Update our local state with server values
    if (response?.personalInformation) {
      const { address } = response.personalInformation;
      this.originalAddress = address;
    }
    
    // Clear the selected file reference
    this.selectedFile = null;
    this.imageRemoved = false;
    
    this.snackBar.open('Profile updated successfully', 'Close', {
      duration: 3000
    });
  }
}