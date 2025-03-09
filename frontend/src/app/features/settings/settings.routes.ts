import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./user-settings/user-settings.component').then(m => m.UserSettingsComponent),
    canActivate: [authGuard],
    title: 'Settings - Time Tracker'
  },
  {
    path: 'profile',
    loadComponent: () => import('./user-profile/user-profile.component').then(m => m.UserProfileComponent),
    canActivate: [authGuard],
    title: 'Profile - Time Tracker'
  }
];