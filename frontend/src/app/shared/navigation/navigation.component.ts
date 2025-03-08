import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { AuthService } from '../../core/services/auth.service';
import { ThemeToggleComponent } from '../components/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    ThemeToggleComponent
  ],
  template: `
    <mat-toolbar color="primary">
      <span routerLink="/dashboard" class="app-title">Time Tracker</span>
      
      <div class="nav-links">
        <a mat-button routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
        <a mat-button routerLink="/customers" routerLinkActive="active">Customers</a>
        <a mat-button routerLink="/projects" routerLinkActive="active">Projects</a>
        <a mat-button routerLink="/time-tracking" routerLinkActive="active">Time Tracking</a>
        <a mat-button routerLink="/reports" routerLinkActive="active">Reports</a>
      </div>
      
      <span class="spacer"></span>
      
      <!-- Theme toggle button -->
      <app-theme-toggle></app-theme-toggle>
      
      <button mat-icon-button [matMenuTriggerFor]="userMenu" aria-label="User menu">
        <mat-icon>account_circle</mat-icon>
      </button>
      <mat-menu #userMenu="matMenu">
        <button mat-menu-item routerLink="/profile">
          <mat-icon>person</mat-icon>
          <span>Profile</span>
        </button>
        <button mat-menu-item routerLink="/settings">
          <mat-icon>settings</mat-icon>
          <span>Settings</span>
        </button>
        <mat-divider></mat-divider>
        <button mat-menu-item (click)="logout()">
          <mat-icon>exit_to_app</mat-icon>
          <span>Logout</span>
        </button>
      </mat-menu>
    </mat-toolbar>
  `,
  styles: [`
    .app-title {
      cursor: pointer;
      margin-right: 16px;
    }
    
    .spacer {
      flex: 1 1 auto;
    }
    
    .nav-links {
      display: flex;
      
      a.active {
        background-color: rgba(255, 255, 255, 0.15);
      }
    }
    
    @media (max-width: 768px) {
      .nav-links {
        display: none;
      }
    }
  `]
})
export class NavigationComponent {
  constructor(private authService: AuthService) { }
  
  logout(): void {
    this.authService.logout();
  }
} 