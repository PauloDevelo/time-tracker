import { Component, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { PreferencesService } from '../../../core/services/preferences.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule, MatButtonModule],
  template: `
    <button 
      mat-icon-button 
      class="theme-toggle" 
      [matTooltip]="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
      (click)="toggleTheme()">
      <mat-icon>{{ isDarkMode ? 'light_mode' : 'dark_mode' }}</mat-icon>
    </button>
  `,
  styles: [`
    .theme-toggle {
      transition: transform 0.3s ease;
    }
    .theme-toggle:hover {
      transform: rotate(30deg);
    }
  `]
})
export class ThemeToggleComponent implements OnInit {
  isDarkMode = false;

  constructor(private preferencesService: PreferencesService) {
    // Use effect to react to signal changes
    effect(() => {
      this.isDarkMode = this.preferencesService.darkMode();
    });
  }

  ngOnInit(): void {
    // Initialize from the current value
    this.isDarkMode = this.preferencesService.darkMode();
  }

  toggleTheme(): void {
    this.preferencesService.toggleDarkMode();
  }
} 