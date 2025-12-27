# Task 01: Create Contract Mongoose Model and Interface

## Objective
Create the Contract model in the backend with all required fields and proper Mongoose schema configuration.

## Dependencies
- None (first task)

## Deliverables

### 1. Create `backend/src/models/Contract.ts`

Create a new Contract model with the following structure:

```typescript
export interface IContract extends Document {
  customerId: mongoose.Types.ObjectId;
  name: string;
  startDate: Date;
  endDate: Date;
  dailyRate: number;
  currency: string;
  daysToCompletion: number;
  description?: string;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

### Schema Requirements

1. **Fields:**
   - `customerId` - Required, ObjectId reference to Customer
   - `name` - Required, trimmed string (e.g., "2025 Annual Contract")
   - `startDate` - Required, Date
   - `endDate` - Required, Date
   - `dailyRate` - Required, Number, min: 0
   - `currency` - Required, String, default: 'EUR'
   - `daysToCompletion` - Required, Number, min: 0
   - `description` - Optional, trimmed string
   - `userId` - Required, ObjectId reference to User

2. **Validations:**
   - `endDate` must be after `startDate`
   - `dailyRate` must be >= 0
   - `daysToCompletion` must be >= 0

3. **Indexes:**
   - Compound index on `{ userId: 1, customerId: 1 }`
   - Index on `{ customerId: 1, startDate: 1, endDate: 1 }`

4. **Timestamps:**
   - Enable `timestamps: true` for automatic createdAt/updatedAt

## Implementation Steps

1. Create the file `backend/src/models/Contract.ts`
2. Import mongoose, Document, Schema
3. Define the IContract interface
4. Create the contractSchema with all fields and validations
5. Add pre-validate hook to ensure endDate > startDate
6. Add indexes
7. Export the Contract model

## Reference Files
- `backend/src/models/Customer.ts` - For pattern reference
- `backend/src/models/Project.ts` - For pattern reference

## Acceptance Criteria

- [ ] `IContract` interface is properly defined with all fields
- [ ] Mongoose schema includes all required validations
- [ ] Pre-validate hook ensures endDate > startDate
- [ ] Indexes are properly configured
- [ ] TypeScript compiles without errors
- [ ] File follows existing code patterns (2-space indent, single quotes)

## Validation Commands

```bash
cd backend && npm run build
```

## Estimated Time
20 minutes
