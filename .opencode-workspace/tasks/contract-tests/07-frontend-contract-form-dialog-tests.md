# Task 07: Frontend Contract Form Dialog Component Tests

## Objective
Create unit tests for the Contract Form Dialog component to verify form validation, date range validation, create/edit modes, and submit handling.

## Dependencies
- Task 05: Frontend contract service tests (for mocking patterns)

## Deliverables

### Create `frontend/src/app/features/customers/contract-form-dialog/contract-form-dialog.component.spec.ts`

### 1. Component Setup Tests

```typescript
describe('ContractFormDialogComponent', () => {
  let component: ContractFormDialogComponent;
  let fixture: ComponentFixture<ContractFormDialogComponent>;
  let contractService: jasmine.SpyObj<ContractService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ContractFormDialogComponent>>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  const mockDialogData: ContractFormDialogData = {
    customerId: 'customer123',
    currency: 'EUR'
  };

  beforeEach(async () => {
    const contractSpy = jasmine.createSpyObj('ContractService', ['createContract', 'updateContract']);
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [ContractFormDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: ContractService, useValue: contractSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ContractFormDialogComponent);
    component = fixture.componentInstance;
    contractService = TestBed.inject(ContractService) as jasmine.SpyObj<ContractService>;
    dialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<ContractFormDialogComponent>>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

### 2. Form Initialization Tests

```typescript
describe('Form Initialization', () => {
  describe('Create Mode', () => {
    it('should initialize empty form in create mode');
    it('should set isEditMode to false');
    it('should use provided currency as default');
    it('should default to EUR if no currency provided');
  });

  describe('Edit Mode', () => {
    it('should populate form with contract data in edit mode');
    it('should set isEditMode to true');
    it('should convert date strings to Date objects');
  });
});
```

### 3. Form Validation Tests

```typescript
describe('Form Validation', () => {
  describe('Required Fields', () => {
    it('should require name');
    it('should require startDate');
    it('should require endDate');
    it('should require dailyRate');
    it('should require currency');
    it('should require daysToCompletion');
    it('should not require description');
  });

  describe('Field Constraints', () => {
    it('should reject negative dailyRate');
    it('should accept dailyRate of 0');
    it('should reject negative daysToCompletion');
    it('should accept daysToCompletion of 0');
  });

  describe('Form State', () => {
    it('should be invalid when required fields are empty');
    it('should be valid when all required fields are filled');
    it('should mark fields as touched on submit attempt');
  });
});
```

### 4. Date Range Validation Tests

```typescript
describe('Date Range Validation', () => {
  it('should be invalid when endDate equals startDate');
  it('should be invalid when endDate is before startDate');
  it('should be valid when endDate is after startDate');
  it('should show error message for invalid date range');
  it('should clear error when dates are corrected');
});
```

### 5. Submit Handling Tests

```typescript
describe('Submit Handling', () => {
  describe('Create Mode', () => {
    it('should call createContract on submit');
    it('should pass correct data to createContract');
    it('should convert dates to ISO strings');
    it('should close dialog with result on success');
    it('should show success snackbar on success');
  });

  describe('Edit Mode', () => {
    it('should call updateContract on submit');
    it('should pass contract ID to updateContract');
    it('should close dialog with result on success');
    it('should show success snackbar on success');
  });

  describe('Error Handling', () => {
    it('should show error snackbar on API error');
    it('should not close dialog on error');
    it('should set isLoading to false on error');
    it('should display error message from API');
  });

  describe('Loading State', () => {
    it('should set isLoading to true during submit');
    it('should disable submit button while loading');
    it('should show spinner while loading');
    it('should set isLoading to false after response');
  });
});
```

### 6. Cancel Handling Tests

```typescript
describe('Cancel Handling', () => {
  it('should close dialog without result on cancel');
  it('should not call API on cancel');
});
```

## Test Implementation

```typescript
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { ContractFormDialogComponent, ContractFormDialogData } from './contract-form-dialog.component';
import { ContractService } from '../../../core/services/contract.service';
import { Contract } from '../../../core/models/contract.model';

describe('ContractFormDialogComponent', () => {
  // ... setup code from above

  describe('Date Range Validation', () => {
    it('should be invalid when endDate is before startDate', () => {
      component.form.patchValue({
        name: 'Test',
        startDate: new Date('2025-12-31'),
        endDate: new Date('2025-01-01'),
        dailyRate: 500,
        currency: 'EUR',
        daysToCompletion: 220
      });

      expect(component.form.hasError('dateRange')).toBeTrue();
      expect(component.form.valid).toBeFalse();
    });

    it('should be valid when endDate is after startDate', () => {
      component.form.patchValue({
        name: 'Test',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        dailyRate: 500,
        currency: 'EUR',
        daysToCompletion: 220
      });

      expect(component.form.hasError('dateRange')).toBeFalse();
      expect(component.form.valid).toBeTrue();
    });
  });

  describe('Submit Handling', () => {
    beforeEach(() => {
      component.form.patchValue({
        name: 'Test Contract',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        dailyRate: 500,
        currency: 'EUR',
        daysToCompletion: 220
      });
    });

    it('should call createContract on submit in create mode', fakeAsync(() => {
      const mockResult: Contract = { ...component.form.value, _id: 'new123' };
      contractService.createContract.and.returnValue(of(mockResult));

      component.onSubmit();
      tick();

      expect(contractService.createContract).toHaveBeenCalled();
      expect(dialogRef.close).toHaveBeenCalledWith(mockResult);
      expect(snackBar.open).toHaveBeenCalledWith(
        'Contract created successfully',
        'Close',
        { duration: 3000 }
      );
    }));

    it('should show error snackbar on API error', fakeAsync(() => {
      const error = { error: { message: 'Validation failed' } };
      contractService.createContract.and.returnValue(throwError(() => error));

      component.onSubmit();
      tick();

      expect(snackBar.open).toHaveBeenCalledWith(
        'Validation failed',
        'Close',
        { duration: 5000 }
      );
      expect(dialogRef.close).not.toHaveBeenCalled();
    }));
  });
});
```

## Implementation Notes

- Use `NoopAnimationsModule` to disable animations in tests
- Mock `MAT_DIALOG_DATA` with appropriate test data
- Use `fakeAsync` and `tick` for async operations
- Test both create and edit modes by providing different dialog data
- Verify form validation states and error messages

## Reference Files
- `frontend/src/app/features/customers/contract-form-dialog/contract-form-dialog.component.ts` - Component to test
- `frontend/src/app/core/services/contract.service.ts` - Service to mock

## Acceptance Criteria

- [ ] Component creation is tested
- [ ] Form initialization (create/edit modes) is tested
- [ ] Required field validation is tested
- [ ] Field constraints (min values) are tested
- [ ] Date range validation is tested
- [ ] Submit handling (success/error) is tested
- [ ] Loading state is tested
- [ ] Cancel handling is tested
- [ ] All tests pass with `cd frontend && npm test`

## Validation Commands

```bash
cd frontend && npm test -- --include='**/contract-form-dialog.component.spec.ts'
```

## Estimated Time
55 minutes
