import { Routes } from '@angular/router';
import { ReportGeneratorComponent } from './report-generator/report-generator.component';
import { ReportViewerComponent } from './report-viewer/report-viewer.component';

export const REPORT_ROUTES: Routes = [
  {
    path: '',
    component: ReportGeneratorComponent,
    title: 'Generate Reports - Time Tracker'
  },
  {
    path: 'view',
    component: ReportViewerComponent,
    title: 'View Report - Time Tracker'
  }
]; 