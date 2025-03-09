import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { UserSettingsService } from '../../../core/services/user-settings.service';
import { UserSettings } from '../../../core/models/user-settings.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-user-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressBarModule
  ],
  template: `
    <div class="settings-container">
      <h1>Company Settings</h1>
      
      <mat-card>
        <mat-card-header>
          <mat-card-title>Company Information</mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <form [formGroup]="companyForm" (ngSubmit)="saveCompanyInfo()">
            <mat-progress-bar *ngIf="loading" mode="indeterminate"></mat-progress-bar>
            
            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Company Name</mat-label>
                <input matInput formControlName="name" placeholder="Enter company name">
                <mat-error *ngIf="companyForm.get('name')?.hasError('required')">
                  Company name is required
                </mat-error>
              </mat-form-field>
            </div>
            
            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Company Address</mat-label>
                <textarea 
                  matInput 
                  formControlName="address" 
                  placeholder="Enter company address"
                  rows="3">
                </textarea>
              </mat-form-field>
            </div>
            
            <div class="form-row two-cols">
              <mat-form-field appearance="outline">
                <mat-label>Business Number</mat-label>
                <input 
                  matInput 
                  formControlName="businessNumber" 
                  placeholder="Enter business number">
              </mat-form-field>
              
              <mat-form-field appearance="outline">
                <mat-label>Incorporation Number</mat-label>
                <input 
                  matInput 
                  formControlName="incorporationNumber" 
                  placeholder="Enter incorporation number">
              </mat-form-field>
            </div>
            
            <div class="form-actions">
              <button 
                mat-raised-button 
                color="primary" 
                type="submit"
                [disabled]="companyForm.invalid || loading">
                Save Changes
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .settings-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }
    
    .full-width {
      width: 100%;
    }
    
    .form-row {
      margin-bottom: 16px;
    }
    
    .two-cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    
    .form-actions {
      margin-top: 24px;
      display: flex;
      justify-content: flex-end;
    }
    
    @media (max-width: 600px) {
      .two-cols {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class UserSettingsComponent implements OnInit {
  companyForm: FormGroup;
  loading = false;
  
  constructor(
    private fb: FormBuilder,
    private userSettingsService: UserSettingsService,
    private snackBar: MatSnackBar
  ) {
    this.companyForm = this.fb.group({
      name: ['', Validators.required],
      address: [''],
      businessNumber: [''],
      incorporationNumber: ['']
    });
  }
  
  ngOnInit(): void {
    this.loadUserSettings();
  }
  
  loadUserSettings(): void {
    this.loading = true;
    this.userSettingsService.getUserSettings()
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (settings: UserSettings) => {
          if (settings.companyInformation) {
            this.companyForm.patchValue(settings.companyInformation);
          }
        },
        error: (error) => {
          this.snackBar.open('Error loading settings. Please try again later.', 'Close', {
            duration: 5000
          });
          console.error('Error loading settings:', error);
        }
      });
  }
  
  saveCompanyInfo(): void {
    if (this.companyForm.invalid) return;
    
    this.loading = true;
    
    const updatedSettings: Partial<UserSettings> = {
      companyInformation: this.companyForm.value
    };
    
    this.userSettingsService.updateUserSettings(updatedSettings)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: () => {
          this.snackBar.open('Company information updated successfully', 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          this.snackBar.open('Error updating company information. Please try again.', 'Close', {
            duration: 5000
          });
          console.error('Error updating company info:', error);
        }
      });
  }
}