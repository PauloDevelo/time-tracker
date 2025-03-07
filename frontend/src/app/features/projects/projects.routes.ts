import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const PROJECT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./project-list/project-list.component').then(c => c.ProjectListComponent),
    title: 'Projects - Time Tracker'
  },
  {
    path: 'create',
    loadComponent: () => import('./project-create/project-create.component').then(c => c.ProjectCreateComponent),
    title: 'Create Project - Time Tracker'
  },
  {
    path: ':id',
    loadComponent: () => import('./project-detail/project-detail.component').then(c => c.ProjectDetailComponent),
    title: 'Project Details - Time Tracker'
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./project-edit/project-edit.component').then(c => c.ProjectEditComponent),
    title: 'Edit Project - Time Tracker'
  }
]; 