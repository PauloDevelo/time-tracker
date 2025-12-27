# Task 01: Extend Backend Project Model with Billing Override

## Objective
Add optional `billingOverride` schema to the Project model to allow projects to override the customer's default daily rate.

## Files to Modify
- `backend/src/models/Project.ts`

## Implementation Steps
1. Add `billingOverride` interface to `IProject`
2. Add `billingOverride` schema to `projectSchema`
3. Make fields optional with appropriate validation

## Schema Design
```typescript
billingOverride?: {
  dailyRate?: number;    // Optional - overrides customer rate if set
  currency?: string;     // Optional - could override customer currency
};
```

## Acceptance Criteria
- [ ] `billingOverride` is optional on the Project model
- [ ] `dailyRate` within billingOverride is optional and must be >= 0 if provided
- [ ] `currency` within billingOverride is optional
- [ ] Existing projects without billingOverride continue to work
- [ ] TypeScript compiles without errors
