import { Routes } from '@angular/router';
import { TimeTrackingComponent } from './time-tracking.component';
import { authGuard } from '../../core/guards/auth.guard';

export const TIME_TRACKING_ROUTES: Routes = [
  {
    path: '',
    component: TimeTrackingComponent,
    canActivate: [authGuard],
    title: 'Time Tracking - Time Tracker'
  }
]; 