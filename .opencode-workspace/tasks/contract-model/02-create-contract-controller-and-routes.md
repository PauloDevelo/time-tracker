# Task 02: Create Contract Controller and Routes

## Objective
Create the Contract controller with full CRUD operations and configure the API routes.

## Dependencies
- Task 01: Contract model must exist

## Deliverables

### 1. Create `backend/src/controllers/contract.controller.ts`

Implement the following controller functions:

```typescript
// Get all contracts for a customer
export const getContractsByCustomer = async (req: AuthenticatedRequest, res: Response)

// Get a single contract by ID
export const getContract = async (req: AuthenticatedRequest, res: Response)

// Create a new contract
export const createContract = async (req: AuthenticatedRequest, res: Response)

// Update a contract
export const updateContract = async (req: AuthenticatedRequest, res: Response)

// Delete a contract
export const deleteContract = async (req: AuthenticatedRequest, res: Response)
```

### Controller Requirements

1. **getContractsByCustomer:**
   - Validate customerId belongs to the authenticated user
   - Return all contracts for the customer, sorted by startDate desc
   - Return 404 if customer not found

2. **getContract:**
   - Validate contract belongs to user's customer
   - Return 404 if not found

3. **createContract:**
   - Validate customer exists and belongs to user
   - Validate required fields
   - Validate endDate > startDate
   - Return 201 on success

4. **updateContract:**
   - Validate ownership
   - Validate date logic
   - Return updated contract

5. **deleteContract:**
   - Validate ownership
   - Check if any projects are using this contract
   - Return 400 if contract is in use, otherwise delete

### 2. Create `backend/src/routes/contract.routes.ts`

```typescript
// Routes nested under customer
router.get('/customers/:customerId/contracts', authenticate, getContractsByCustomer);
router.post('/customers/:customerId/contracts', authenticate, createContract);
router.get('/customers/:customerId/contracts/:contractId', authenticate, getContract);
router.put('/customers/:customerId/contracts/:contractId', authenticate, updateContract);
router.delete('/customers/:customerId/contracts/:contractId', authenticate, deleteContract);
```

### 3. Update `backend/src/routes/routes.ts`

Import and register the contract routes.

### 4. Add Swagger Documentation

Add contract schemas to `backend/src/swagger/schemas.ts`:
- ContractResponse
- ContractCreateRequest
- ContractUpdateRequest

## Implementation Steps

1. Create `backend/src/controllers/contract.controller.ts`
2. Implement all 5 controller functions with proper error handling
3. Create `backend/src/routes/contract.routes.ts`
4. Update `backend/src/routes/routes.ts` to include contract routes
5. Add Swagger schemas for API documentation

## Reference Files
- `backend/src/controllers/customer.controller.ts` - Controller pattern
- `backend/src/controllers/project.controller.ts` - Controller pattern
- `backend/src/routes/customer.routes.ts` - Route pattern
- `backend/src/routes/routes.ts` - Route registration

## Acceptance Criteria

- [ ] All 5 CRUD endpoints are implemented
- [ ] Proper authentication middleware is applied
- [ ] Ownership validation prevents accessing other users' data
- [ ] Delete prevents removal of contracts in use by projects
- [ ] Proper HTTP status codes (200, 201, 400, 401, 404, 500)
- [ ] Error messages are descriptive
- [ ] TypeScript compiles without errors
- [ ] Routes are registered in main routes file

## Validation Commands

```bash
cd backend && npm run build
cd backend && npm run dev
# Test with curl or Postman
```

## Estimated Time
45 minutes
