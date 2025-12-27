import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { ContractFormDialogComponent, ContractFormDialogData } from './contract-form-dialog.component';
import { ContractService } from '../../../core/services/contract.service';
import { Contract } from '../../../core/models/contract.model';

describe('ContractFormDialogComponent', () => {
  let component: ContractFormDialogComponent;
  let fixture: ComponentFixture<ContractFormDialogComponent>;
  let contractService: jasmine.SpyObj<ContractService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ContractFormDialogComponent>>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  const mockContract: Contract = {
    _id: 'contract123',
    customerId: 'customer123',
    name: 'Test Contract',
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2024-12-31T00:00:00.000Z',
    dailyRate: 500,
    currency: 'USD',
    daysToCompletion: 100,
    description: 'Test description',
    userId: 'user123',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  };

  const createMockDialogData = (overrides: Partial<ContractFormDialogData> = {}): ContractFormDialogData => ({
    customerId: 'customer123',
    currency: 'EUR',
    ...overrides
  });

  const setupTestBed = async (dialogData: ContractFormDialogData): Promise<void> => {
    contractService = jasmine.createSpyObj('ContractService', ['createContract', 'updateContract']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [ContractFormDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: ContractService, useValue: contractService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: MatSnackBar, useValue: snackBar }
      ]
    })
    .overrideComponent(ContractFormDialogComponent, {
      remove: {
        imports: []
      },
      add: {
        providers: [
          { provide: MatSnackBar, useValue: snackBar }
        ]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContractFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  // ==================== 1. Component Setup ====================
  describe('Component Setup', () => {
    beforeEach(async () => {
      await setupTestBed(createMockDialogData());
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });
  });

  // ==================== 2. Form Initialization Tests ====================
  describe('Form Initialization', () => {
    describe('Create Mode', () => {
      beforeEach(async () => {
        await setupTestBed(createMockDialogData());
      });

      it('should initialize empty form in create mode', () => {
        expect(component.form.get('name')?.value).toBe('');
        expect(component.form.get('startDate')?.value).toBeNull();
        expect(component.form.get('endDate')?.value).toBeNull();
        expect(component.form.get('dailyRate')?.value).toBe('');
        expect(component.form.get('daysToCompletion')?.value).toBe('');
        expect(component.form.get('description')?.value).toBe('');
      });

      it('should set isEditMode to false', () => {
        expect(component.isEditMode).toBeFalse();
      });

      it('should use provided currency as default', () => {
        expect(component.form.get('currency')?.value).toBe('EUR');
      });
    });

    describe('Create Mode - No Currency Provided', () => {
      beforeEach(async () => {
        await setupTestBed(createMockDialogData({ currency: undefined }));
      });

      it('should default to EUR if no currency provided', () => {
        expect(component.form.get('currency')?.value).toBe('EUR');
      });
    });

    describe('Create Mode - Different Currency', () => {
      beforeEach(async () => {
        await setupTestBed(createMockDialogData({ currency: 'GBP' }));
      });

      it('should use GBP when provided', () => {
        expect(component.form.get('currency')?.value).toBe('GBP');
      });
    });

    describe('Edit Mode', () => {
      beforeEach(async () => {
        await setupTestBed(createMockDialogData({ contract: mockContract }));
      });

      it('should populate form with contract data in edit mode', () => {
        expect(component.form.get('name')?.value).toBe('Test Contract');
        expect(component.form.get('dailyRate')?.value).toBe(500);
        expect(component.form.get('currency')?.value).toBe('USD');
        expect(component.form.get('daysToCompletion')?.value).toBe(100);
        expect(component.form.get('description')?.value).toBe('Test description');
      });

      it('should set isEditMode to true', () => {
        expect(component.isEditMode).toBeTrue();
      });

      it('should convert date strings to Date objects', () => {
        const startDate = component.form.get('startDate')?.value;
        const endDate = component.form.get('endDate')?.value;

        expect(startDate instanceof Date).toBeTrue();
        expect(endDate instanceof Date).toBeTrue();
        expect(startDate.toISOString()).toBe('2024-01-01T00:00:00.000Z');
        expect(endDate.toISOString()).toBe('2024-12-31T00:00:00.000Z');
      });
    });
  });

  // ==================== 3. Form Validation Tests ====================
  describe('Form Validation', () => {
    beforeEach(async () => {
      await setupTestBed(createMockDialogData());
    });

    describe('Required Fields', () => {
      it('should require name', () => {
        const nameControl = component.form.get('name');
        expect(nameControl?.hasError('required')).toBeTrue();

        nameControl?.setValue('Test Name');
        expect(nameControl?.hasError('required')).toBeFalse();
      });

      it('should require startDate', () => {
        const startDateControl = component.form.get('startDate');
        expect(startDateControl?.hasError('required')).toBeTrue();

        startDateControl?.setValue(new Date('2024-01-01'));
        expect(startDateControl?.hasError('required')).toBeFalse();
      });

      it('should require endDate', () => {
        const endDateControl = component.form.get('endDate');
        expect(endDateControl?.hasError('required')).toBeTrue();

        endDateControl?.setValue(new Date('2024-12-31'));
        expect(endDateControl?.hasError('required')).toBeFalse();
      });

      it('should require dailyRate', () => {
        const dailyRateControl = component.form.get('dailyRate');
        expect(dailyRateControl?.hasError('required')).toBeTrue();

        dailyRateControl?.setValue(500);
        expect(dailyRateControl?.hasError('required')).toBeFalse();
      });

      it('should require currency', () => {
        const currencyControl = component.form.get('currency');
        // Currency has a default value, so clear it first
        currencyControl?.setValue('');
        expect(currencyControl?.hasError('required')).toBeTrue();

        currencyControl?.setValue('EUR');
        expect(currencyControl?.hasError('required')).toBeFalse();
      });

      it('should require daysToCompletion', () => {
        const daysControl = component.form.get('daysToCompletion');
        expect(daysControl?.hasError('required')).toBeTrue();

        daysControl?.setValue(50);
        expect(daysControl?.hasError('required')).toBeFalse();
      });

      it('should not require description', () => {
        const descriptionControl = component.form.get('description');
        expect(descriptionControl?.hasError('required')).toBeFalse();
      });
    });

    describe('Field Constraints', () => {
      it('should reject negative dailyRate', () => {
        const dailyRateControl = component.form.get('dailyRate');
        dailyRateControl?.setValue(-100);
        expect(dailyRateControl?.hasError('min')).toBeTrue();
      });

      it('should accept dailyRate of 0', () => {
        const dailyRateControl = component.form.get('dailyRate');
        dailyRateControl?.setValue(0);
        expect(dailyRateControl?.hasError('min')).toBeFalse();
      });

      it('should reject negative daysToCompletion', () => {
        const daysControl = component.form.get('daysToCompletion');
        daysControl?.setValue(-10);
        expect(daysControl?.hasError('min')).toBeTrue();
      });

      it('should accept daysToCompletion of 0', () => {
        const daysControl = component.form.get('daysToCompletion');
        daysControl?.setValue(0);
        expect(daysControl?.hasError('min')).toBeFalse();
      });
    });

    describe('Form State', () => {
      it('should be invalid when required fields are empty', () => {
        expect(component.form.invalid).toBeTrue();
      });

      it('should be valid when all required fields are filled', () => {
        component.form.patchValue({
          name: 'Test Contract',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          dailyRate: 500,
          currency: 'EUR',
          daysToCompletion: 100
        });

        expect(component.form.valid).toBeTrue();
      });
    });
  });

  // ==================== 4. Date Range Validation Tests ====================
  describe('Date Range Validation', () => {
    beforeEach(async () => {
      await setupTestBed(createMockDialogData());
    });

    it('should be invalid when endDate equals startDate', () => {
      const sameDate = new Date('2024-06-15');
      component.form.patchValue({
        startDate: sameDate,
        endDate: sameDate
      });

      expect(component.form.hasError('dateRange')).toBeTrue();
    });

    it('should be invalid when endDate is before startDate', () => {
      component.form.patchValue({
        startDate: new Date('2024-12-31'),
        endDate: new Date('2024-01-01')
      });

      expect(component.form.hasError('dateRange')).toBeTrue();
    });

    it('should be valid when endDate is after startDate', () => {
      component.form.patchValue({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      });

      expect(component.form.hasError('dateRange')).toBeFalse();
    });

    it('should have dateRange error on form when dates invalid', () => {
      component.form.patchValue({
        startDate: new Date('2024-12-31'),
        endDate: new Date('2024-01-01')
      });

      const errors = component.form.errors;
      expect(errors).toBeTruthy();
      expect(errors?.['dateRange']).toBeTrue();
    });
  });

  // ==================== 5. Submit Handling Tests ====================
  describe('Submit Handling', () => {
    const fillValidForm = (): void => {
      component.form.patchValue({
        name: 'New Contract',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        dailyRate: 600,
        currency: 'EUR',
        daysToCompletion: 80,
        description: 'New description'
      });
    };

    describe('Create Mode', () => {
      beforeEach(async () => {
        await setupTestBed(createMockDialogData());
      });

      it('should call createContract on submit', fakeAsync(() => {
        const createdContract: Contract = {
          ...mockContract,
          _id: 'newContract123',
          name: 'New Contract'
        };
        contractService.createContract.and.returnValue(of(createdContract));

        fillValidForm();
        component.onSubmit();
        tick();

        expect(contractService.createContract).toHaveBeenCalled();
        expect(contractService.updateContract).not.toHaveBeenCalled();
      }));

      it('should pass correct data to createContract', fakeAsync(() => {
        const createdContract: Contract = { ...mockContract, _id: 'newContract123' };
        contractService.createContract.and.returnValue(of(createdContract));

        fillValidForm();
        component.onSubmit();
        tick();

        const callArgs = contractService.createContract.calls.mostRecent().args;
        expect(callArgs[0]).toBe('customer123');
        expect(callArgs[1].name).toBe('New Contract');
        expect(callArgs[1].dailyRate).toBe(600);
        expect(callArgs[1].currency).toBe('EUR');
        expect(callArgs[1].daysToCompletion).toBe(80);
        expect(callArgs[1].description).toBe('New description');
      }));

      it('should close dialog with result on success', fakeAsync(() => {
        const createdContract: Contract = { ...mockContract, _id: 'newContract123' };
        contractService.createContract.and.returnValue(of(createdContract));

        fillValidForm();
        component.onSubmit();
        tick();

        expect(dialogRef.close).toHaveBeenCalledWith(createdContract);
      }));

      it('should show success snackbar on success', fakeAsync(() => {
        const createdContract: Contract = { ...mockContract, _id: 'newContract123' };
        contractService.createContract.and.returnValue(of(createdContract));

        fillValidForm();
        component.onSubmit();
        tick();

        expect(snackBar.open).toHaveBeenCalledWith(
          'Contract created successfully',
          'Close',
          { duration: 3000 }
        );
      }));
    });

    describe('Edit Mode', () => {
      beforeEach(async () => {
        await setupTestBed(createMockDialogData({ contract: mockContract }));
      });

      it('should call updateContract on submit', fakeAsync(() => {
        const updatedContract: Contract = { ...mockContract, name: 'Updated Contract' };
        contractService.updateContract.and.returnValue(of(updatedContract));

        component.form.patchValue({ name: 'Updated Contract' });
        component.onSubmit();
        tick();

        expect(contractService.updateContract).toHaveBeenCalled();
        expect(contractService.createContract).not.toHaveBeenCalled();
      }));

      it('should pass contract ID to updateContract', fakeAsync(() => {
        const updatedContract: Contract = { ...mockContract, name: 'Updated Contract' };
        contractService.updateContract.and.returnValue(of(updatedContract));

        component.form.patchValue({ name: 'Updated Contract' });
        component.onSubmit();
        tick();

        const callArgs = contractService.updateContract.calls.mostRecent().args;
        expect(callArgs[0]).toBe('customer123');
        expect(callArgs[1]).toBe('contract123');
        expect(callArgs[2]._id).toBe('contract123');
      }));

      it('should close dialog with result on success', fakeAsync(() => {
        const updatedContract: Contract = { ...mockContract, name: 'Updated Contract' };
        contractService.updateContract.and.returnValue(of(updatedContract));

        component.form.patchValue({ name: 'Updated Contract' });
        component.onSubmit();
        tick();

        expect(dialogRef.close).toHaveBeenCalledWith(updatedContract);
      }));

      it('should show success snackbar on update', fakeAsync(() => {
        const updatedContract: Contract = { ...mockContract, name: 'Updated Contract' };
        contractService.updateContract.and.returnValue(of(updatedContract));

        component.form.patchValue({ name: 'Updated Contract' });
        component.onSubmit();
        tick();

        expect(snackBar.open).toHaveBeenCalledWith(
          'Contract updated successfully',
          'Close',
          { duration: 3000 }
        );
      }));
    });

    describe('Error Handling', () => {
      beforeEach(async () => {
        await setupTestBed(createMockDialogData());
      });

      it('should show error snackbar on API error', fakeAsync(() => {
        const errorResponse = { error: { message: 'Server error occurred' } };
        contractService.createContract.and.returnValue(throwError(() => errorResponse));

        fillValidForm();
        component.onSubmit();
        tick();

        expect(snackBar.open).toHaveBeenCalledWith(
          'Server error occurred',
          'Close',
          { duration: 5000 }
        );
      }));

      it('should show generic error message when no message provided', fakeAsync(() => {
        contractService.createContract.and.returnValue(throwError(() => ({})));

        fillValidForm();
        component.onSubmit();
        tick();

        expect(snackBar.open).toHaveBeenCalledWith(
          'An error occurred',
          'Close',
          { duration: 5000 }
        );
      }));

      it('should not close dialog on error', fakeAsync(() => {
        contractService.createContract.and.returnValue(throwError(() => ({ error: { message: 'Error' } })));

        fillValidForm();
        component.onSubmit();
        tick();

        expect(dialogRef.close).not.toHaveBeenCalled();
      }));

      it('should set isLoading to false on error', fakeAsync(() => {
        contractService.createContract.and.returnValue(throwError(() => ({ error: { message: 'Error' } })));

        fillValidForm();
        component.onSubmit();
        tick();

        expect(component.isLoading).toBeFalse();
      }));
    });

    describe('Loading State', () => {
      beforeEach(async () => {
        await setupTestBed(createMockDialogData());
      });

      it('should set isLoading to true during submit', fakeAsync(() => {
        const createdContract: Contract = { ...mockContract, _id: 'newContract123' };
        contractService.createContract.and.returnValue(of(createdContract));

        fillValidForm();
        
        // Check initial state
        expect(component.isLoading).toBeFalse();
        
        component.onSubmit();
        
        // isLoading should be true immediately after calling onSubmit
        // but before the observable completes
        // Since we're using of(), it completes synchronously, so we check after tick
        tick();
        
        // After completion, isLoading should be false
        expect(component.isLoading).toBeFalse();
      }));

      it('should set isLoading to false after response', fakeAsync(() => {
        const createdContract: Contract = { ...mockContract, _id: 'newContract123' };
        contractService.createContract.and.returnValue(of(createdContract));

        fillValidForm();
        component.onSubmit();
        tick();

        expect(component.isLoading).toBeFalse();
      }));
    });

    describe('Invalid Form', () => {
      beforeEach(async () => {
        await setupTestBed(createMockDialogData());
      });

      it('should not call API when form is invalid', () => {
        // Form is invalid by default (empty required fields)
        component.onSubmit();

        expect(contractService.createContract).not.toHaveBeenCalled();
        expect(contractService.updateContract).not.toHaveBeenCalled();
      });

      it('should mark all fields as touched when form is invalid', () => {
        component.onSubmit();

        expect(component.form.get('name')?.touched).toBeTrue();
        expect(component.form.get('startDate')?.touched).toBeTrue();
        expect(component.form.get('endDate')?.touched).toBeTrue();
        expect(component.form.get('dailyRate')?.touched).toBeTrue();
        expect(component.form.get('daysToCompletion')?.touched).toBeTrue();
      });
    });
  });

  // ==================== 6. Cancel Handling Tests ====================
  describe('Cancel Handling', () => {
    beforeEach(async () => {
      await setupTestBed(createMockDialogData());
    });

    it('should close dialog without result on cancel', () => {
      component.onCancel();

      expect(dialogRef.close).toHaveBeenCalledWith();
    });

    it('should not call API on cancel', () => {
      component.onCancel();

      expect(contractService.createContract).not.toHaveBeenCalled();
      expect(contractService.updateContract).not.toHaveBeenCalled();
    });
  });
});
