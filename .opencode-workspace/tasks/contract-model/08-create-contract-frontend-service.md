# Task 08: Create Contract Frontend Service

## Objective
Create an Angular service for Contract API communication.

## Dependencies
- Task 07: Contract frontend model must exist

## Deliverables

### 1. Create `frontend/src/app/core/services/contract.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { 
  Contract, 
  ContractCreateRequest, 
  ContractUpdateRequest 
} from '../models/contract.model';

@Injectable({
  providedIn: 'root'
})
export class ContractService {
  private apiUrl = `${environment.apiUrl}/customers`;

  constructor(private http: HttpClient) {}

  // Get all contracts for a customer
  getContractsByCustomer(customerId: string): Observable<Contract[]> {
    return this.http.get<Contract[]>(`${this.apiUrl}/${customerId}/contracts`).pipe(
      catchError(this.handleError)
    );
  }

  // Get a single contract
  getContract(customerId: string, contractId: string): Observable<Contract> {
    return this.http.get<Contract>(
      `${this.apiUrl}/${customerId}/contracts/${contractId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Create a new contract
  createContract(
    customerId: string, 
    contract: ContractCreateRequest
  ): Observable<Contract> {
    return this.http.post<Contract>(
      `${this.apiUrl}/${customerId}/contracts`, 
      contract
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Update a contract
  updateContract(
    customerId: string, 
    contractId: string, 
    contract: ContractUpdateRequest
  ): Observable<Contract> {
    return this.http.put<Contract>(
      `${this.apiUrl}/${customerId}/contracts/${contractId}`, 
      contract
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Delete a contract
  deleteContract(customerId: string, contractId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${customerId}/contracts/${contractId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('ContractService error:', error);
    return throwError(() => error);
  }
}
```

## Implementation Steps

1. Create `frontend/src/app/core/services/contract.service.ts`
2. Import required Angular modules and models
3. Implement all CRUD methods
4. Add proper error handling with catchError
5. Use environment.apiUrl for base URL

## Reference Files
- `frontend/src/app/core/services/customer.service.ts` - Pattern reference
- `frontend/src/app/core/services/project.service.ts` - Pattern reference

## API Endpoints Used

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/customers/:customerId/contracts` | List contracts |
| GET | `/customers/:customerId/contracts/:contractId` | Get contract |
| POST | `/customers/:customerId/contracts` | Create contract |
| PUT | `/customers/:customerId/contracts/:contractId` | Update contract |
| DELETE | `/customers/:customerId/contracts/:contractId` | Delete contract |

## Acceptance Criteria

- [ ] Service is created with `providedIn: 'root'`
- [ ] All 5 CRUD methods are implemented
- [ ] Proper TypeScript types are used
- [ ] Error handling follows existing patterns
- [ ] Service uses environment.apiUrl
- [ ] TypeScript compiles without errors
- [ ] Frontend builds successfully

## Validation Commands

```bash
cd frontend && npm run build
```

## Estimated Time
20 minutes
