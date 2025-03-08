import { Component, OnInit, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavigationComponent } from './shared/navigation/navigation.component';
import { AuthService } from './core/services/auth.service';
import { PreferencesService } from './core/services/preferences.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavigationComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  isAuthenticated = false;
  
  constructor(
    private authService: AuthService,
    private preferencesService: PreferencesService
  ) {
    // Effect to apply theme changes
    effect(() => {
      this.applyTheme(this.preferencesService.darkMode());
    });
  }
  
  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
    });
    
    // Initialize theme based on stored preferences
    this.applyTheme(this.preferencesService.darkMode());
  }

  /**
   * Apply theme by adding or removing the dark-theme class from the body
   */
  private applyTheme(isDarkMode: boolean): void {
    if (isDarkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }
}
