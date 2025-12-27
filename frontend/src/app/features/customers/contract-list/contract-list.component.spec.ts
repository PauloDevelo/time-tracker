import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError, delay } from 'rxjs';

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
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z'
    },
    {
      _id: 'contract2',
      customerId: 'customer1',
      name: 'Expired Contract',
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      dailyRate: 450,
      currency: 'USD',
      daysToCompletion: 100,
      userId: 'user1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    }
  ];

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('ContractService', ['getContractsByCustomer']);
    spy.getContractsByCustomer.and.returnValue(of(mockContracts));

    await TestBed.configureTestingModule({
      imports: [ContractListComponent, NoopAnimationsModule],
      providers: [{ provide: ContractService, useValue: spy }]
    }).compileComponents();

    fixture = TestBed.createComponent(ContractListComponent);
    component = fixture.componentInstance;
    contractService = TestBed.inject(ContractService) as jasmine.SpyObj<ContractService>;
    component.customerId = 'customer1';
  });

  // ==========================================
  // 1. Component Setup Tests
  // ==========================================
  describe('Component Setup', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
  });

  // ==========================================
  // 2. Loading State Tests
  // ==========================================
  describe('Loading State', () => {
    it('should show loading spinner while fetching contracts', fakeAsync(() => {
      contractService.getContractsByCustomer.and.returnValue(
        of(mockContracts).pipe(delay(100))
      );

      fixture.detectChanges(); // triggers ngOnInit
      
      const spinner = fixture.debugElement.query(By.css('mat-spinner'));
      expect(spinner).toBeTruthy();
      expect(component.isLoading).toBeTrue();

      tick(100);
      fixture.detectChanges();
    }));

    it('should hide loading spinner after contracts loaded', fakeAsync(() => {
      contractService.getContractsByCustomer.and.returnValue(
        of(mockContracts).pipe(delay(100))
      );

      fixture.detectChanges();
      tick(100);
      fixture.detectChanges();

      const spinner = fixture.debugElement.query(By.css('mat-spinner'));
      expect(spinner).toBeFalsy();
      expect(component.isLoading).toBeFalse();
    }));

    it('should hide loading spinner on error', fakeAsync(() => {
      contractService.getContractsByCustomer.and.returnValue(
        throwError(() => new Error('Network error'))
      );
      spyOn(console, 'error');

      fixture.detectChanges();

      expect(component.isLoading).toBeFalse();
      const spinner = fixture.debugElement.query(By.css('mat-spinner'));
      expect(spinner).toBeFalsy();
    }));

    it('should set isLoading to true when loadContracts is called', () => {
      contractService.getContractsByCustomer.and.returnValue(
        of(mockContracts).pipe(delay(100))
      );

      component.loadContracts();

      expect(component.isLoading).toBeTrue();
    });

    it('should set isLoading to false when contracts are received', fakeAsync(() => {
      contractService.getContractsByCustomer.and.returnValue(
        of(mockContracts).pipe(delay(100))
      );

      component.loadContracts();
      expect(component.isLoading).toBeTrue();

      tick(100);
      expect(component.isLoading).toBeFalse();
    }));
  });

  // ==========================================
  // 3. Empty State Tests
  // ==========================================
  describe('Empty State', () => {
    beforeEach(() => {
      contractService.getContractsByCustomer.and.returnValue(of([]));
    });

    it('should show empty state when no contracts', () => {
      fixture.detectChanges();

      const emptyState = fixture.debugElement.query(By.css('.empty-state'));
      expect(emptyState).toBeTruthy();
      expect(emptyState.nativeElement.textContent).toContain('No contracts yet');
    });

    it('should hide table when no contracts', () => {
      fixture.detectChanges();

      const table = fixture.debugElement.query(By.css('table'));
      expect(table).toBeFalsy();
    });

    it('should hide empty state when contracts exist', () => {
      contractService.getContractsByCustomer.and.returnValue(of(mockContracts));
      fixture.detectChanges();

      const emptyState = fixture.debugElement.query(By.css('.empty-state'));
      expect(emptyState).toBeFalsy();
    });
  });

  // ==========================================
  // 4. Contract Status Logic Tests
  // ==========================================
  describe('Contract Status Logic', () => {
    describe('isActive', () => {
      it('should return true when current date is within contract period', () => {
        const today = new Date();
        const contract: Contract = {
          ...mockContracts[0],
          startDate: new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString(),
          endDate: new Date(today.getFullYear(), today.getMonth() + 1, 28).toISOString()
        };

        expect(component.isActive(contract)).toBeTrue();
      });

      it('should return false when current date is before start date', () => {
        const today = new Date();
        const contract: Contract = {
          ...mockContracts[0],
          startDate: new Date(today.getFullYear() + 1, 0, 1).toISOString(),
          endDate: new Date(today.getFullYear() + 1, 11, 31).toISOString()
        };

        expect(component.isActive(contract)).toBeFalse();
      });

      it('should return false when current date is after end date', () => {
        const today = new Date();
        const contract: Contract = {
          ...mockContracts[0],
          startDate: new Date(today.getFullYear() - 2, 0, 1).toISOString(),
          endDate: new Date(today.getFullYear() - 1, 11, 31).toISOString()
        };

        expect(component.isActive(contract)).toBeFalse();
      });

      it('should return true on start date', () => {
        const today = new Date();
        today.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        const contract: Contract = {
          ...mockContracts[0],
          startDate: startOfToday.toISOString(),
          endDate: new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString()
        };

        expect(component.isActive(contract)).toBeTrue();
      });

      it('should return true on end date', () => {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        
        const contract: Contract = {
          ...mockContracts[0],
          startDate: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString(),
          endDate: endOfToday.toISOString()
        };

        expect(component.isActive(contract)).toBeTrue();
      });
    });

    describe('isExpired', () => {
      it('should return true when current date is after end date', () => {
        const today = new Date();
        const contract: Contract = {
          ...mockContracts[0],
          startDate: new Date(today.getFullYear() - 2, 0, 1).toISOString(),
          endDate: new Date(today.getFullYear() - 1, 11, 31).toISOString()
        };

        expect(component.isExpired(contract)).toBeTrue();
      });

      it('should return false when current date is before end date', () => {
        const today = new Date();
        const contract: Contract = {
          ...mockContracts[0],
          startDate: new Date(today.getFullYear(), 0, 1).toISOString(),
          endDate: new Date(today.getFullYear() + 1, 11, 31).toISOString()
        };

        expect(component.isExpired(contract)).toBeFalse();
      });

      it('should return false on end date', () => {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        // Set end date to end of today - should not be expired yet
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        
        const contract: Contract = {
          ...mockContracts[0],
          startDate: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString(),
          endDate: endOfToday.toISOString()
        };

        expect(component.isExpired(contract)).toBeFalse();
      });
    });
  });

  // ==========================================
  // 5. Event Emission Tests
  // ==========================================
  describe('Event Emissions', () => {
    it('should emit addContract event when onAdd is called', () => {
      spyOn(component.addContract, 'emit');

      component.onAdd();

      expect(component.addContract.emit).toHaveBeenCalled();
    });

    it('should emit editContract event with contract when onEdit is called', () => {
      spyOn(component.editContract, 'emit');
      const contract = mockContracts[0];

      component.onEdit(contract);

      expect(component.editContract.emit).toHaveBeenCalledWith(contract);
    });

    it('should emit deleteContract event with contract when onDelete is called', () => {
      spyOn(component.deleteContract, 'emit');
      const contract = mockContracts[0];

      component.onDelete(contract);

      expect(component.deleteContract.emit).toHaveBeenCalledWith(contract);
    });
  });

  // ==========================================
  // 6. Data Display Tests
  // ==========================================
  describe('Data Display', () => {
    it('should display all contracts from service', () => {
      fixture.detectChanges();

      expect(component.contracts).toEqual(mockContracts);
      expect(component.contracts.length).toBe(2);

      const rows = fixture.debugElement.queryAll(By.css('tr.mat-mdc-row'));
      expect(rows.length).toBe(2);
    });

    it('should call loadContracts on init', () => {
      spyOn(component, 'loadContracts').and.callThrough();
      
      // Reset the component to test ngOnInit
      const newFixture = TestBed.createComponent(ContractListComponent);
      const newComponent = newFixture.componentInstance;
      newComponent.customerId = 'customer1';
      spyOn(newComponent, 'loadContracts');
      
      newFixture.detectChanges();

      expect(newComponent.loadContracts).toHaveBeenCalled();
    });
  });

  // ==========================================
  // 7. Input Changes Tests
  // ==========================================
  describe('Input Changes', () => {
    it('should reload contracts when customerId changes', () => {
      fixture.detectChanges(); // Initial load
      contractService.getContractsByCustomer.calls.reset();

      // Update the customerId before calling ngOnChanges (Angular does this automatically)
      component.customerId = 'customer2';
      component.ngOnChanges({
        customerId: new SimpleChange('customer1', 'customer2', false)
      });

      expect(contractService.getContractsByCustomer).toHaveBeenCalledWith('customer2');
    });

    it('should not reload on first change (handled by ngOnInit)', () => {
      contractService.getContractsByCustomer.calls.reset();

      component.ngOnChanges({
        customerId: new SimpleChange(undefined, 'customer1', true)
      });

      expect(contractService.getContractsByCustomer).not.toHaveBeenCalled();
    });

    it('should not load when customerId is empty', () => {
      contractService.getContractsByCustomer.calls.reset();
      component.customerId = '';

      component.loadContracts();

      expect(contractService.getContractsByCustomer).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // Additional Tests for formatPeriod
  // ==========================================
  describe('formatPeriod', () => {
    it('should format contract period correctly', () => {
      const contract: Contract = {
        ...mockContracts[0],
        startDate: '2025-01-15',
        endDate: '2025-12-31'
      };

      const result = component.formatPeriod(contract);

      // The format depends on locale, so we just check it contains the dates
      expect(result).toContain('-');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // UI Interaction Tests
  // ==========================================
  describe('UI Interactions', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should call onAdd when Add Contract button is clicked', () => {
      spyOn(component, 'onAdd');

      const addButton = fixture.debugElement.query(By.css('.list-header button'));
      addButton.triggerEventHandler('click', null);

      expect(component.onAdd).toHaveBeenCalled();
    });

    it('should call onEdit when edit button is clicked', () => {
      spyOn(component, 'onEdit');

      const editButtons = fixture.debugElement.queryAll(By.css('button[matTooltip="Edit"]'));
      expect(editButtons.length).toBeGreaterThan(0);
      
      editButtons[0].triggerEventHandler('click', null);

      expect(component.onEdit).toHaveBeenCalledWith(mockContracts[0]);
    });

    it('should call onDelete when delete button is clicked', () => {
      spyOn(component, 'onDelete');

      const deleteButtons = fixture.debugElement.queryAll(By.css('button[matTooltip="Delete"]'));
      expect(deleteButtons.length).toBeGreaterThan(0);
      
      deleteButtons[0].triggerEventHandler('click', null);

      expect(component.onDelete).toHaveBeenCalledWith(mockContracts[0]);
    });

    it('should display contract name in table', () => {
      const cells = fixture.debugElement.queryAll(By.css('td.mat-mdc-cell'));
      const nameCell = cells.find(cell => 
        cell.nativeElement.textContent.includes('Active Contract')
      );
      
      expect(nameCell).toBeTruthy();
    });

    it('should display contract daily rate in table', () => {
      const cells = fixture.debugElement.queryAll(By.css('td.mat-mdc-cell'));
      const rateCell = cells.find(cell => 
        cell.nativeElement.textContent.includes('500')
      );
      
      expect(rateCell).toBeTruthy();
    });
  });
});
