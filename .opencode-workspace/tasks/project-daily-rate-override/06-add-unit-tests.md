# Task 06: Add Unit Tests for Rate Override Logic

## Objective
Add unit tests to verify the rate override logic works correctly.

## Files to Create/Modify
- `backend/src/services/report.service.test.ts` (if exists, or create)

## Test Cases
1. Project with billingOverride.dailyRate uses project rate
2. Project without billingOverride uses customer rate
3. Project with billingOverride but no dailyRate uses customer rate
4. Multiple projects with mixed override settings calculate correctly

## Acceptance Criteria
- [ ] Tests cover all rate override scenarios
- [ ] All tests pass
- [ ] Edge cases are handled
