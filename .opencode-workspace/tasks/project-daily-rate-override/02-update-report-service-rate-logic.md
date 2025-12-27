# Task 02: Update Report Service to Use Project Rate Override

## Objective
Modify the report service to check for project-level daily rate override before falling back to customer rate.

## Files to Modify
- `backend/src/services/report.service.ts`

## Implementation Steps
1. In the invoice calculation loop, check if project has `billingOverride.dailyRate`
2. Use project rate if available, otherwise use customer rate
3. Optionally handle currency override as well

## Current Code (lines 219-222)
```typescript
if (reportType === 'invoice') {
  const hourlyRate = customer.billingDetails.dailyRate / 8;
  cost = hourlyRate * duration;
```

## New Logic
```typescript
if (reportType === 'invoice') {
  const dailyRate = project.billingOverride?.dailyRate ?? customer.billingDetails.dailyRate;
  const hourlyRate = dailyRate / 8;
  cost = hourlyRate * duration;
```

## Acceptance Criteria
- [ ] Projects with `billingOverride.dailyRate` use their own rate
- [ ] Projects without override use customer's rate (backward compatible)
- [ ] Invoice calculations are correct with both scenarios
- [ ] TypeScript compiles without errors
