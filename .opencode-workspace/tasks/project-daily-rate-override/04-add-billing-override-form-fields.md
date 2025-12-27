# Task 04: Add Billing Override Fields to Project Form

## Objective
Add a collapsible billing override section to the project form with daily rate input.

## Files to Modify
- `frontend/src/app/features/projects/project-form/project-form.component.ts`
- `frontend/src/app/features/projects/project-form/project-form.component.html`

## Implementation Steps
1. Add `billingOverride` form group to the reactive form
2. Add expansion panel UI similar to Azure DevOps section
3. Show customer's inherited rate as hint/placeholder
4. Add checkbox to enable/disable override
5. Add daily rate input field

## UI Design
- Collapsible expansion panel titled "Billing Override"
- Checkbox: "Override customer's daily rate"
- When enabled: Show daily rate input
- Show hint: "Customer's default rate: $X/day"

## Acceptance Criteria
- [ ] Billing override section appears in project form
- [ ] Can enable/disable override with checkbox
- [ ] Daily rate input appears when override is enabled
- [ ] Customer's default rate is shown as reference
- [ ] Form submits correctly with override data
- [ ] Form works for both create and edit modes
