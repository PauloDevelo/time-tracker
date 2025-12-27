# Task 04: Update Project Controller for Contracts

## Objective
Update the Project controller to handle contractId instead of billingOverride in create/update operations.

## Dependencies
- Task 03: Project model must have contractId field

## Deliverables

### 1. Update `backend/src/controllers/project.controller.ts`

**Modify createProject:**
- Accept `contractId` in request body instead of `billingOverride`
- Validate that the contract exists and belongs to the same customer
- Validate that the contract belongs to the authenticated user

**Modify updateProject:**
- Accept `contractId` in request body
- Validate contract ownership and customer match
- Remove any billingOverride handling

**Modify getProject / getProjects:**
- Populate contractId with contract details when returning projects
- Include contract name and dailyRate in response

### 2. Update Request Validation

Add validation for contractId:
- Must be a valid MongoDB ObjectId
- Must reference an existing contract
- Contract must belong to the same customer as the project

### 3. Update Response Format

When returning projects, include populated contract info:
```typescript
{
  _id: "...",
  name: "Project Name",
  customerId: { _id: "...", name: "Customer" },
  contractId: { 
    _id: "...", 
    name: "2025 Contract",
    dailyRate: 500,
    currency: "EUR"
  },
  // ... other fields
}
```

## Implementation Steps

1. Open `backend/src/controllers/project.controller.ts`
2. Update `createProject`:
   - Remove billingOverride handling
   - Add contractId validation
   - Verify contract belongs to same customer
3. Update `updateProject`:
   - Same changes as createProject
4. Update `getProject` and `getProjects`:
   - Add `.populate('contractId', 'name dailyRate currency startDate endDate')`
5. Remove any references to billingOverride

## Reference Files
- `backend/src/controllers/project.controller.ts` - File to modify
- `backend/src/models/Contract.ts` - Contract model for validation

## Validation Logic

```typescript
// Validate contract exists and belongs to same customer
const contract = await Contract.findOne({
  _id: contractId,
  customerId: customerId,
  userId: req.user._id
});

if (!contract) {
  return res.status(400).json({ 
    message: 'Invalid contract or contract does not belong to this customer' 
  });
}
```

## Acceptance Criteria

- [ ] createProject accepts and validates contractId
- [ ] createProject rejects invalid or mismatched contracts
- [ ] updateProject handles contractId changes
- [ ] getProject populates contract details
- [ ] getProjects populates contract details for all projects
- [ ] All billingOverride references are removed
- [ ] TypeScript compiles without errors
- [ ] API returns proper error messages for invalid contracts

## Validation Commands

```bash
cd backend && npm run build
cd backend && npm run dev
# Test create/update project with contractId
```

## Estimated Time
35 minutes
