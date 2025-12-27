# Task 07: Create Contract Frontend Model

## Objective
Create the Contract model interfaces for the Angular frontend.

## Dependencies
- Task 01: Backend Contract model (for reference)

## Deliverables

### 1. Create `frontend/src/app/core/models/contract.model.ts`

```typescript
export interface Contract {
  _id: string;
  customerId: string;
  name: string;
  startDate: string;  // ISO date string
  endDate: string;    // ISO date string
  dailyRate: number;
  currency: string;
  daysToCompletion: number;
  description?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContractCreateRequest {
  name: string;
  startDate: string;
  endDate: string;
  dailyRate: number;
  currency: string;
  daysToCompletion: number;
  description?: string;
}

export interface ContractUpdateRequest extends ContractCreateRequest {
  _id: string;
}

// For displaying in dropdowns/lists
export interface ContractSummary {
  _id: string;
  name: string;
  dailyRate: number;
  currency: string;
  startDate: string;
  endDate: string;
}
```

### 2. Update `frontend/src/app/core/models/project.model.ts`

**Remove:**
```typescript
billingOverride?: {
  dailyRate?: number;
  currency?: string;
};
```

**Add:**
```typescript
contractId?: {
  _id: string;
  name: string;
  dailyRate: number;
  currency: string;
} | string;  // Can be populated object or just ID
```

**Update request interfaces:**
```typescript
export interface ProjectCreateRequest {
  name: string;
  description?: string;
  customerId: string;
  contractId: string;  // Required, replaces billingOverride
  azureDevOps?: { ... };
}

export interface ProjectUpdateRequest extends ProjectCreateRequest {
  _id: string;
}
```

## Implementation Steps

1. Create `frontend/src/app/core/models/contract.model.ts`
2. Define all interfaces (Contract, ContractCreateRequest, ContractUpdateRequest, ContractSummary)
3. Open `frontend/src/app/core/models/project.model.ts`
4. Remove `billingOverride` from Project interface
5. Add `contractId` to Project interface
6. Update ProjectCreateRequest and ProjectUpdateRequest

## Reference Files
- `frontend/src/app/core/models/customer.model.ts` - Pattern reference
- `frontend/src/app/core/models/project.model.ts` - File to modify

## Acceptance Criteria

- [ ] `contract.model.ts` is created with all interfaces
- [ ] Contract interface matches backend model
- [ ] Project model has contractId instead of billingOverride
- [ ] Request interfaces are properly typed
- [ ] TypeScript compiles without errors
- [ ] Frontend builds successfully

## Validation Commands

```bash
cd frontend && npm run build
```

## Estimated Time
15 minutes
