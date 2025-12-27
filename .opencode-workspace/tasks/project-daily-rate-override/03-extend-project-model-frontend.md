# Task 03: Extend Frontend Project Model Interfaces

## Objective
Add `billingOverride` interface to frontend TypeScript models.

## Files to Modify
- `frontend/src/app/core/models/project.model.ts`

## Implementation Steps
1. Add `billingOverride` optional property to `Project` interface
2. Add `billingOverride` optional property to `ProjectCreateRequest` interface
3. Ensure consistency with backend model

## Interface Design
```typescript
billingOverride?: {
  dailyRate?: number;
  currency?: string;
};
```

## Acceptance Criteria
- [ ] `Project` interface has optional `billingOverride`
- [ ] `ProjectCreateRequest` interface has optional `billingOverride`
- [ ] TypeScript compiles without errors
