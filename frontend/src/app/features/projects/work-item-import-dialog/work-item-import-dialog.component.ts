import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { FormsModule } from '@angular/forms';
import { AzureDevOpsService, Iteration, ImportResult } from '../../../core/services/azure-devops.service';

export interface WorkItemImportDialogData {
  projectId: string;
  projectName: string;
}

@Component({
  selector: 'app-work-item-import-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatRadioModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatListModule
  ],
  templateUrl: './work-item-import-dialog.component.html',
  styleUrls: ['./work-item-import-dialog.component.scss']
})
export class WorkItemImportDialogComponent implements OnInit {
  iterations: Iteration[] = [];
  selectedIteration: Iteration | null = null;
  loadingIterations = false;
  importing = false;
  importResult: { imported: number; skipped: number } | null = null;
  error: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<WorkItemImportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: WorkItemImportDialogData,
    private azureDevOpsService: AzureDevOpsService
  ) {}

  ngOnInit(): void {
    this.loadIterations();
  }

  loadIterations(): void {
    this.loadingIterations = true;
    this.error = null;

    this.azureDevOpsService.getIterations(this.data.projectId).subscribe({
      next: (iterations) => {
        this.iterations = iterations;
        this.loadingIterations = false;
      },
      error: (error) => {
        this.error = error.message || 'Failed to load iterations';
        this.loadingIterations = false;
      }
    });
  }

  onIterationSelect(iteration: Iteration): void {
    this.selectedIteration = iteration;
    this.importResult = null;
    this.error = null;
  }

  importWorkItems(): void {
    if (!this.selectedIteration) {
      return;
    }

    this.importing = true;
    this.error = null;

    this.azureDevOpsService.importWorkItems(this.data.projectId, this.selectedIteration.path).subscribe({
      next: (result: ImportResult) => {
        this.importing = false;
        this.importResult = {
          imported: result.imported,
          skipped: result.skipped
        };
      },
      error: (error) => {
        this.importing = false;
        this.error = error.message || 'Failed to import work items';
      }
    });
  }

  close(): void {
    this.dialogRef.close(this.importResult);
  }

  formatDate(dateString?: string): string {
    if (!dateString) {
      return 'N/A';
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  isCurrentIteration(iteration: Iteration): boolean {
    if (!iteration.startDate || !iteration.finishDate) {
      return false;
    }
    const now = new Date();
    const start = new Date(iteration.startDate);
    const finish = new Date(iteration.finishDate);
    return now >= start && now <= finish;
  }

  get canImport(): boolean {
    return !!this.selectedIteration && !this.importing && !this.importResult;
  }
}
