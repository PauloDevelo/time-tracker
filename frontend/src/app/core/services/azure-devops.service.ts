import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Task } from '../models/task.model';

export interface AzureDevOpsValidationResult {
  valid: boolean;
  projectId?: string;
  projectName?: string;
  projectUrl?: string;
  error?: string;
}

export interface Iteration {
  id: string;
  name: string;
  path: string;
  displayName: string; // Formatted name showing parent folder context (e.g., "Team Sprint / Sprint 1")
  startDate?: string;
  finishDate?: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  tasks: Task[];
}

@Injectable({
  providedIn: 'root'
})
export class AzureDevOpsService {
  private apiUrl = `${environment.apiUrl}/api/projects`;
  private customerApiUrl = `${environment.apiUrl}/api/customers`;

  constructor(private http: HttpClient) { }

  validateAzureDevOpsProject(projectId: string, projectName: string): Observable<AzureDevOpsValidationResult> {
    return this.http.post<AzureDevOpsValidationResult>(
      `${this.apiUrl}/${projectId}/validate-azure-devops`,
      { projectName }
    ).pipe(
      catchError(this.handleError)
    );
  }

  validateAzureDevOpsProjectByCustomer(customerId: string, projectName: string): Observable<AzureDevOpsValidationResult> {
    return this.http.post<AzureDevOpsValidationResult>(
      `${this.customerApiUrl}/${customerId}/validate-azure-devops`,
      { projectName }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getIterations(projectId: string): Observable<Iteration[]> {
    return this.http.get<Iteration[]>(
      `${this.apiUrl}/${projectId}/azure-devops/iterations`
    ).pipe(
      map(iterations => this.sortIterationsAlphabetically(iterations)),
      catchError(this.handleError)
    );
  }

  importWorkItems(projectId: string, iterationPath: string): Observable<ImportResult> {
    return this.http.post<ImportResult>(
      `${this.apiUrl}/${projectId}/azure-devops/import-work-items`,
      { iterationPath }
    ).pipe(
      catchError(this.handleError)
    );
  }

  private sortIterationsAlphabetically(iterations: Iteration[]): Iteration[] {
    return iterations.sort((a, b) => {
      const nameA = (a.displayName || a.name).toLowerCase();
      const nameB = (b.displayName || b.name).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Network error: ${error.error.message}`;
    } else {
      // Backend error
      switch (error.status) {
        case 400:
          errorMessage = error.error?.error || 'Invalid request. Please check your input.';
          break;
        case 401:
          errorMessage = 'Azure DevOps authentication failed. Please check your PAT.';
          break;
        case 404:
          errorMessage = error.error?.error || 'Project or iteration not found in Azure DevOps.';
          break;
        case 429:
          errorMessage = 'Too many requests. Please try again later.';
          break;
        case 503:
          errorMessage = 'Azure DevOps service is unavailable. Please try again later.';
          break;
        default:
          errorMessage = error.error?.error || `Server error: ${error.status}`;
      }
    }

    console.error('Azure DevOps Service Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
