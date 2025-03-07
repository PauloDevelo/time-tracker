import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { loginGuard } from '../../core/guards/auth.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [loginGuard],
    title: 'Login - Time Tracker'
  },
  {
    path: 'signup',
    component: SignupComponent,
    canActivate: [loginGuard],
    title: 'Sign Up - Time Tracker'
  }
]; 