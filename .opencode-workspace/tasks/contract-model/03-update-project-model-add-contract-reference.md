# Task 03: Update Project Model - Add contractId, Remove billingOverride

## Objective
Modify the Project model to reference a Contract instead of having its own billing override.

## Dependencies
- Task 02: Contract routes must be working

## Deliverables

### 1. Update `backend/src/models/Project.ts`

**Remove:**
```typescript
// Remove this from IProject interface
billingOverride?: {
  dailyRate?: number;
  currency?: string;
};

// Remove from schema
billingOverride: {
  dailyRate: { type: Number, min: 0 },
  currency: { type: String, trim: true }
}
```

**Add:**
```typescript
// Add to IProject interface
contractId?: mongoose.Types.ObjectId;

// Add to schema
contractId: {
  type: Schema.Types.ObjectId,
  ref: 'Contract',
  required: false,  // Optional - user will manually assign existing projects
}
```

### Schema Changes

1. **Remove `billingOverride` field entirely**
2. **Add `contractId` field:**
   - Optional field (to support existing projects during transition)
   - Reference to Contract model
   - Add index for efficient queries

3. **Add validation:**
   - Pre-validate hook to ensure contractId references a valid contract (when set)
   - Contract must belong to the same customer as the project

### 2. Update Index

Add index on contractId:
```typescript
projectSchema.index({ contractId: 1 });
```

## Implementation Steps

1. Open `backend/src/models/Project.ts`
2. Remove `billingOverride` from IProject interface
3. Add `contractId` to IProject interface (optional)
4. Remove `billingOverride` from schema definition
5. Add `contractId` to schema with required: false
6. Add pre-validate hook to verify contract belongs to same customer (when contractId is set)
7. Add index on contractId
8. Update any helper methods if needed

## Reference Files
- `backend/src/models/Project.ts` - File to modify
- `backend/src/models/Contract.ts` - Contract model reference

## Important Notes

- `contractId` is **optional** to support existing projects
- User will manually assign contracts to existing projects via the UI
- No automated migration - manual assignment gives full control over contract selection
- Projects without a contract will be handled gracefully in report generation

## Acceptance Criteria

- [ ] `billingOverride` is completely removed from interface and schema
- [ ] `contractId` is added to interface and schema (optional)
- [ ] Index on contractId is added
- [ ] Pre-validate hook ensures contract belongs to same customer (when contractId is set)
- [ ] TypeScript compiles without errors
- [ ] Backend builds successfully

## Validation Commands

```bash
cd backend && npm run build
```

## Estimated Time
25 minutes
