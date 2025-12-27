import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Project, ProjectCreateRequest } from '../../../core/models/project.model';
import { Customer } from '../../../core/models/customer.model';
import { Contract } from '../../../core/models/contract.model';
import { ProjectService } from '../../../core/services/project.service';
import { ContractService } from '../../../core/services/contract.service';
import { AzureDevOpsService, AzureDevOpsValidationResult } from '../../../core/services/azure-devops.service';
import { debounceTime, distinctUntilChanged, map, Observable, of, startWith, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatExpansionModule,
    MatAutocompleteModule
  ],
  templateUrl: './project-form.component.html',
  styleUrls: ['./project-form.component.scss']
})
export class ProjectFormComponent implements OnInit, OnChanges {
  @Input() project: Project | null = null;
  @Input() customers: Customer[] = [];
  @Input() loading = false;
  @Input() submitButtonText = 'Save';
  @Output() formSubmit = new EventEmitter<ProjectCreateRequest>();
  @Output() cancel = new EventEmitter<void>();

  projectForm!: FormGroup;
  customerHasAzureDevOps = false;
  validatingAzureDevOps = false;
  azureDevOpsValidationResult: AzureDevOpsValidationResult | null = null;
  azureDevOpsProjectSuggestions: string[] = [];
  filteredProjectSuggestions$: Observable<string[]> = of([]);
  
  // Contract selection
  contracts: Contract[] = [];
  contractsLoading = false;
  
  private destroy$ = new Subject<void>();
  private projectNameChange$ = new Subject<string>();

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private contractService: ContractService,
    private azureDevOpsService: AzureDevOpsService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.setupAzureDevOpsValidation();
    this.setupFilteredProjectSuggestions();
    this.setupContractLoading();
    
    // If editing, load contracts for the project's customer
    if (this.project?.customerId._id) {
      this.loadContracts(this.project.customerId._id);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project'] && this.projectForm) {
      this.initForm();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initForm(): void {
    this.projectForm = this.fb.group({
      name: [this.project?.name || '', [Validators.required, Validators.maxLength(100)]],
      description: [this.project?.description || '', [Validators.required]],
      customerId: [this.project?.customerId._id || '', [Validators.required]],
      azureDevOps: this.fb.group({
        projectName: [this.project?.azureDevOps?.projectName || ''],
        projectId: [this.project?.azureDevOps?.projectId || ''],
        enabled: [this.project?.azureDevOps?.enabled || false]
      }),
      contractId: [this.getContractIdValue()]
    });

    // Check if customer has Azure DevOps when form is initialized
    if (this.project?.customerId._id) {
      this.checkCustomerAzureDevOps(this.project.customerId._id);
      // Load Azure DevOps project suggestions for the customer
      this.loadAzureDevOpsProjectSuggestions(this.project.customerId._id);
    }

    // If editing existing project with Azure DevOps, mark as validated
    if (this.project?.azureDevOps?.enabled && this.project?.azureDevOps?.projectId) {
      this.azureDevOpsValidationResult = {
        valid: true,
        projectId: this.project.azureDevOps.projectId,
        projectName: this.project.azureDevOps.projectName
      };
    }
  }

  setupAzureDevOpsValidation(): void {
    // Debounced validation on project name change
    this.projectNameChange$
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(projectName => {
        const customerId = this.projectForm.get('customerId')?.value;
        if (projectName && this.isAzureDevOpsEnabled && customerId) {
          this.validateAzureDevOpsProject();
        }
      });
  }

  setupFilteredProjectSuggestions(): void {
    const projectNameControl = this.projectForm.get('azureDevOps.projectName');
    if (projectNameControl) {
      this.filteredProjectSuggestions$ = projectNameControl.valueChanges.pipe(
        startWith(projectNameControl.value || ''),
        map(value => this.filterProjectSuggestions(value || ''))
      );
    }
  }

  private filterProjectSuggestions(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.azureDevOpsProjectSuggestions.filter(
      suggestion => suggestion.toLowerCase().includes(filterValue)
    );
  }

  loadAzureDevOpsProjectSuggestions(customerId: string): void {
    if (!customerId) {
      this.azureDevOpsProjectSuggestions = [];
      return;
    }

    this.projectService.getAzureDevOpsProjectNames(customerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projectNames) => {
          this.azureDevOpsProjectSuggestions = projectNames;
        },
        error: () => {
          this.azureDevOpsProjectSuggestions = [];
        }
      });
  }

  setupContractLoading(): void {
    // Load contracts when customer changes
    this.projectForm.get('customerId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(customerId => {
        if (customerId) {
          this.loadContracts(customerId);
          // Clear contract selection when customer changes
          this.projectForm.patchValue({ contractId: '' });
        } else {
          this.contracts = [];
        }
      });
  }

  loadContracts(customerId: string): void {
    this.contractsLoading = true;
    this.contractService.getContractsByCustomer(customerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (contracts) => {
          this.contracts = contracts;
          this.contractsLoading = false;
          
          // If editing and project has a contract, ensure it's selected
          if (this.project?.contractId) {
            const contractId = typeof this.project.contractId === 'string' 
              ? this.project.contractId 
              : this.project.contractId._id;
            this.projectForm.patchValue({ contractId });
          }
        },
        error: (error) => {
          console.error('Error loading contracts:', error);
          this.contractsLoading = false;
        }
      });
  }

  onSubmit(): void {
    // If Azure DevOps is enabled, validation is required (for both new and existing projects)
    if (this.isAzureDevOpsEnabled && !this.azureDevOpsValidationResult?.valid) {
      this.projectForm.get('azureDevOps')?.setErrors({ notValidated: true });
      this.projectForm.markAllAsTouched();
      return;
    }

    if (this.projectForm.valid) {
      const formValue = this.projectForm.value;
      
      // Format dates to ISO string if they exist
      const projectData: ProjectCreateRequest = {
        ...formValue,
        startDate: formValue.startDate ? formValue.startDate.toISOString() : undefined,
        endDate: formValue.endDate ? formValue.endDate.toISOString() : undefined
      };

      // Remove azureDevOps if not enabled or not validated
      if (!formValue.azureDevOps?.enabled || !this.azureDevOpsValidationResult?.valid) {
        delete projectData.azureDevOps;
      }

      // Handle contractId - only include if set
      if (!formValue.contractId) {
        delete projectData.contractId;
      }
      
      this.formSubmit.emit(projectData);
    } else {
      this.projectForm.markAllAsTouched();
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onCustomerChange(customerId: string): void {
    this.checkCustomerAzureDevOps(customerId);
    // Reset Azure DevOps validation when customer changes
    this.azureDevOpsValidationResult = null;
    this.projectForm.get('azureDevOps')?.patchValue({
      projectName: '',
      projectId: '',
      enabled: false
    });
    // Load Azure DevOps project suggestions for the new customer
    this.loadAzureDevOpsProjectSuggestions(customerId);
  }

  checkCustomerAzureDevOps(customerId: string): void {
    const customer = this.customers.find(c => c._id === customerId);
    this.customerHasAzureDevOps = !!(customer?.azureDevOps?.enabled);
  }

  toggleAzureDevOps(): void {
    const enabled = this.isAzureDevOpsEnabled;
    if (!enabled) {
      // Reset validation when disabled
      this.azureDevOpsValidationResult = null;
      this.projectForm.get('azureDevOps')?.patchValue({
        projectName: '',
        projectId: ''
      });
    }
  }

  onAzureDevOpsProjectNameChange(projectName: string): void {
    // Reset validation result when project name changes
    this.azureDevOpsValidationResult = null;
    this.projectNameChange$.next(projectName);
  }

  onAzureDevOpsProjectSelected(projectName: string): void {
    // When a suggestion is selected, trigger validation immediately
    this.azureDevOpsValidationResult = null;
    this.validateAzureDevOpsProject();
  }

  validateAzureDevOpsProject(): void {
    const projectName = this.projectForm.get('azureDevOps.projectName')?.value;
    const customerId = this.projectForm.get('customerId')?.value;
    
    if (!projectName || !customerId) {
      return;
    }

    this.validatingAzureDevOps = true;
    this.azureDevOpsValidationResult = null;

    // For new projects, use customer-based validation
    // For existing projects, use project-based validation
    const validation$ = this.project?._id
      ? this.azureDevOpsService.validateAzureDevOpsProject(this.project._id, projectName)
      : this.azureDevOpsService.validateAzureDevOpsProjectByCustomer(customerId, projectName);

    validation$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.validatingAzureDevOps = false;
          this.azureDevOpsValidationResult = result;
          
          if (result.valid && result.projectId) {
            // Populate projectId automatically
            this.projectForm.get('azureDevOps.projectId')?.setValue(result.projectId);
          }
        },
        error: (error) => {
          this.validatingAzureDevOps = false;
          this.azureDevOpsValidationResult = {
            valid: false,
            error: error.message || 'Failed to validate Azure DevOps project'
          };
        }
      });
  }

  get isAzureDevOpsEnabled(): boolean {
    return this.projectForm.get('azureDevOps.enabled')?.value || false;
  }

  get azureDevOpsProjectName(): string {
    return this.projectForm.get('azureDevOps.projectName')?.value || '';
  }

  // Helper to extract contractId value from project (handles populated or string)
  private getContractIdValue(): string {
    if (!this.project?.contractId) {
      return '';
    }
    if (typeof this.project.contractId === 'string') {
      return this.project.contractId;
    }
    return this.project.contractId._id;
  }
}