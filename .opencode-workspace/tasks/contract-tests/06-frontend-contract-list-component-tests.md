# Task 06: Frontend Contract List Component Tests

## Objective
Create unit tests for the Contract List component to verify loading states, empty states, status logic, and event emissions.

## Dependencies
- Task 05: Frontend contract service tests (for mocking patterns)

## Deliverables

### Create `frontend/src/app/features/customers/contract-list/contract-list.component.spec.ts`

### 1. Component Setup Tests

```typescript
describe('ContractListComponent', () => {
  let component: ContractListComponent;
  let fixture: ComponentFixture<ContractListComponent>;
  let contractService: jasmine.SpyObj<ContractService>;

  beforeEach(async () => {
    const contractServiceSpy = jasmine.createSpyObj('ContractService', ['getContractsByCustomer']);

    await TestBed.configureTestingModule({
      imports: [ContractListComponent],
      providers: [
        { provide: ContractService, useValue: contractServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ContractListComponent);
    component = fixture.componentInstance;
    contractService = TestBed.inject(ContractService) as jasmine.SpyObj<ContractService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

### 2. Loading State Tests

```typescript
describe('Loading State', () => {
  it('should show loading spinner while fetching contracts');
  it('should hide loading spinner after contracts loaded');
  it('should hide loading spinner on error');
  it('should set isLoading to true when loadContracts is called');
  it('should set isLoading to false when contracts are received');
});
```

### 3. Empty State Tests

```typescript
describe('Empty State', () => {
  it('should show empty state when no contracts');
  it('should show add button in empty state');
  it('should hide table when no contracts');
  it('should hide empty state when contracts exist');
});
```

### 4. Contract Status Logic Tests

```typescript
describe('Contract Status', () => {
  describe('isActive', () => {
    it('should return true when current date is within contract period');
    it('should return false when current date is before start date');
    it('should return false when current date is after end date');
    it('should return true on start date');
    it('should return true on end date');
  });

  describe('isExpired', () => {
    it('should return true when current date is after end date');
    it('should return false when current date is before end date');
    it('should return false on end date');
  });

  describe('Status Display', () => {
    it('should show Active chip for active contracts');
    it('should show Expired chip for expired contracts');
    it('should show Upcoming chip for future contracts');
  });
});
```

### 5. Event Emission Tests

```typescript
describe('Event Emissions', () => {
  describe('addContract', () => {
    it('should emit addContract event when add button clicked');
    it('should emit addContract event when empty state add button clicked');
  });

  describe('editContract', () => {
    it('should emit editContract event with contract when edit clicked');
  });

  describe('deleteContract', () => {
    it('should emit deleteContract event with contract when delete clicked');
  });
});
```

### 6. Data Display Tests

```typescript
describe('Data Display', () => {
  it('should display contract name in table');
  it('should display formatted period in table');
  it('should display formatted daily rate with currency');
  it('should display days to completion');
  it('should display all contracts from service');
});
```

### 7. Input Changes Tests

```typescript
describe('Input Changes', () => {
  it('should reload contracts when customerId changes');
  it('should not reload on first change (handled by ngOnInit)');
  it('should clear contracts when customerId is empty');
});
```

## Test Implementation

```typescript
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ContractListComponent } from './contract-list.component';
import { ContractService } from '../../../core/services/contract.service';
import { Contract } from '../../../core/models/contract.model';

describe('ContractListComponent', () => {
  let component: ContractListComponent;
  let fixture: ComponentFixture<ContractListComponent>;
  let contractService: jasmine.SpyObj<ContractService>;

  const mockContracts: Contract[] = [
    {
      _id: 'contract1',
      customerId: 'customer1',
      name: 'Active Contract',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      dailyRate: 500,
      currency: 'EUR',
      daysToCompletion: 220,
      userId: 'user1',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01'
    }
  ];

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('ContractService', ['getContractsByCustomer']);
    spy.getContractsByCustomer.and.returnValue(of(mockContracts));

    await TestBed.configureTestingModule({
      imports: [ContractListComponent],
      providers: [{ provide: ContractService, useValue: spy }]
    }).compileComponents();

    fixture = TestBed.createComponent(ContractListComponent);
    component = fixture.componentInstance;
    contractService = TestBed.inject(ContractService) as jasmine.SpyObj<ContractService>;
    component.customerId = 'customer1';
  });

  describe('isActive', () => {
    it('should return true when current date is within contract period', () => {
      const contract: Contract = {
        ...mockContracts[0],
        startDate: new Date(Date.now() - 86400000).toISOString(), // yesterday
        endDate: new Date(Date.now() + 86400000).toISOString()    // tomorrow
      };
      
      expect(component.isActive(contract)).toBeTrue();
    });
  });

  describe('Event Emissions', () => {
    it('should emit addContract event when add button clicked', () => {
      spyOn(component.addContract, 'emit');
      
      component.onAdd();
      
      expect(component.addContract.emit).toHaveBeenCalled();
    });

    it('should emit editContract event with contract', () => {
      spyOn(component.editContract, 'emit');
      const contract = mockContracts[0];
      
      component.onEdit(contract);
      
      expect(component.editContract.emit).toHaveBeenCalledWith(contract);
    });
  });
});
```

## Implementation Notes

- Use `jasmine.createSpyObj` for service mocking
- Use `fakeAsync` and `tick` for async operations
- Test DOM elements using `fixture.nativeElement`
- Use `fixture.detectChanges()` to trigger change detection
- Mock dates for status testing

## Reference Files
- `frontend/src/app/features/customers/contract-list/contract-list.component.ts` - Component to test
- `frontend/src/app/core/services/contract.service.ts` - Service to mock

## Acceptance Criteria

- [ ] Component creation is tested
- [ ] Loading state is tested
- [ ] Empty state is tested
- [ ] Contract status logic (isActive, isExpired) is tested
- [ ] Event emissions are tested
- [ ] Data display is tested
- [ ] Input changes are tested
- [ ] All tests pass with `cd frontend && npm test`

## Validation Commands

```bash
cd frontend && npm test -- --include='**/contract-list.component.spec.ts'
```

## Estimated Time
50 minutes
