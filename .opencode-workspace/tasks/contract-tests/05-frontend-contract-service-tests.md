# Task 05: Frontend Contract Service Unit Tests

## Objective
Create unit tests for the Contract Angular service to verify API method calls and error handling.

## Dependencies
- None (frontend tests are independent)

## Deliverables

### Create `frontend/src/app/core/services/contract.service.spec.ts`

Test all 5 service methods with mocked HttpClient.

### 1. Service Setup Tests

```typescript
describe('ContractService', () => {
  let service: ContractService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ContractService]
    });
    service = TestBed.inject(ContractService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
```

### 2. getContractsByCustomer Tests

```typescript
describe('getContractsByCustomer', () => {
  it('should call GET /api/customers/:customerId/contracts');
  it('should return array of contracts');
  it('should return empty array when no contracts');
  it('should handle HTTP error');
});
```

### 3. getContract Tests

```typescript
describe('getContract', () => {
  it('should call GET /api/customers/:customerId/contracts/:contractId');
  it('should return single contract');
  it('should handle 404 error');
});
```

### 4. createContract Tests

```typescript
describe('createContract', () => {
  it('should call POST /api/customers/:customerId/contracts');
  it('should send contract data in request body');
  it('should return created contract');
  it('should handle validation error');
});
```

### 5. updateContract Tests

```typescript
describe('updateContract', () => {
  it('should call PUT /api/customers/:customerId/contracts/:contractId');
  it('should send updated data in request body');
  it('should return updated contract');
  it('should handle 404 error');
});
```

### 6. deleteContract Tests

```typescript
describe('deleteContract', () => {
  it('should call DELETE /api/customers/:customerId/contracts/:contractId');
  it('should return success message');
  it('should handle error when contract in use');
});
```

## Test Implementation

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ContractService } from './contract.service';
import { Contract, ContractCreateRequest } from '../models/contract.model';
import { environment } from '../../../environments/environment';

describe('ContractService', () => {
  let service: ContractService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/api/customers`;

  const mockContract: Contract = {
    _id: 'contract123',
    customerId: 'customer123',
    name: 'Test Contract 2025',
    startDate: '2025-01-01T00:00:00.000Z',
    endDate: '2025-12-31T23:59:59.000Z',
    dailyRate: 500,
    currency: 'EUR',
    daysToCompletion: 220,
    userId: 'user123',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ContractService]
    });
    service = TestBed.inject(ContractService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getContractsByCustomer', () => {
    it('should return array of contracts', () => {
      const customerId = 'customer123';
      const mockContracts = [mockContract];

      service.getContractsByCustomer(customerId).subscribe(contracts => {
        expect(contracts).toEqual(mockContracts);
        expect(contracts.length).toBe(1);
      });

      const req = httpMock.expectOne(`${apiUrl}/${customerId}/contracts`);
      expect(req.request.method).toBe('GET');
      req.flush(mockContracts);
    });
  });

  describe('createContract', () => {
    it('should send contract data and return created contract', () => {
      const customerId = 'customer123';
      const createRequest: ContractCreateRequest = {
        name: 'New Contract',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        dailyRate: 600,
        currency: 'EUR',
        daysToCompletion: 200
      };

      service.createContract(customerId, createRequest).subscribe(contract => {
        expect(contract).toEqual(mockContract);
      });

      const req = httpMock.expectOne(`${apiUrl}/${customerId}/contracts`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createRequest);
      req.flush(mockContract);
    });
  });

  // ... more tests
});
```

## Implementation Notes

- Use `HttpClientTestingModule` for mocking HTTP calls
- Use `HttpTestingController` to verify requests
- Call `httpMock.verify()` in `afterEach` to ensure no unexpected requests
- Test both success and error scenarios
- Verify request method, URL, and body

## Reference Files
- `frontend/src/app/core/services/contract.service.ts` - Service to test
- `frontend/src/app/core/models/contract.model.ts` - Contract interfaces
- `frontend/src/environments/environment.ts` - API URL

## Acceptance Criteria

- [ ] All 5 service methods are tested
- [ ] HTTP request method is verified
- [ ] HTTP request URL is verified
- [ ] Request body is verified for POST/PUT
- [ ] Response handling is tested
- [ ] Error handling is tested
- [ ] All tests pass with `cd frontend && npm test`

## Validation Commands

```bash
cd frontend && npm test -- --include='**/contract.service.spec.ts'
```

## Estimated Time
35 minutes
