# 11. Extend Customer Model Tests

meta:
  id: backend-test-coverage-11
  feature: backend-test-coverage
  priority: P1
  depends_on: [backend-test-coverage-10]
  tags: [testing, models, customers, encryption]

## Objective
Extend the Customer model tests (`backend/src/models/Customer.ts`) to improve coverage from 38% to >80%, focusing on schema validation, pre-save hooks, and the `getDecryptedPAT` method.

## Context
- The Customer model has partial test coverage (38%)
- File location: `backend/src/models/Customer.ts`
- Key features to test: schema validation, PAT encryption pre-save hook, `getDecryptedPAT` method, toJSON transform
- Reference pattern: `backend/src/models/contract.model.test.ts`

## Deliverables
- New or extended file: `backend/src/models/customer.model.test.ts`
- Test coverage for schema validation
- Test coverage for pre-save hook (PAT encryption)
- Test coverage for `getDecryptedPAT` method
- Test coverage for toJSON transform

## Test Cases to Implement

### Schema Validation
1. **Required Fields:**
   - Should require name field
   - Should require contactInfo.email field
   - Should require billingDetails.dailyRate field
   - Should require billingDetails.currency field
   - Should require userId field

2. **Field Validation:**
   - Should trim name field
   - Should lowercase contactInfo.email
   - Should validate billingDetails.dailyRate is >= 0
   - Should default billingDetails.currency to 'USD'
   - Should validate azureDevOps.organizationUrl format

3. **Azure DevOps URL Validation:**
   - Should accept valid dev.azure.com URLs
   - Should accept valid visualstudio.com URLs
   - Should reject invalid URLs
   - Should allow empty organizationUrl

### Pre-save Hook (PAT Encryption)
1. **Happy Path Tests:**
   - Should encrypt PAT on save when modified
   - Should not re-encrypt already encrypted PAT
   - Should detect encrypted PAT by colon separator

2. **Edge Cases:**
   - Should handle empty PAT
   - Should handle null azureDevOps object
   - Should not encrypt when PAT not modified

### getDecryptedPAT Method
1. **Happy Path Tests:**
   - Should decrypt encrypted PAT correctly
   - Should return decrypted plain text

2. **Error Cases:**
   - Should return null when no PAT exists
   - Should return null when azureDevOps is undefined
   - Should return null on decryption error

### toJSON Transform
1. **Security Tests:**
   - Should remove PAT from JSON output
   - Should preserve other azureDevOps fields
   - Should not affect original document

### Indexes
1. **Index Tests:**
   - Should have index on userId and name
   - Should have index on contactInfo.email

## Steps
1. Create test file `backend/src/models/customer.model.test.ts`
2. Set up MongoDB Memory Server for integration tests
3. Set up encryption key environment variable
4. Implement schema validation tests
5. Implement pre-save hook tests
6. Implement getDecryptedPAT tests
7. Implement toJSON transform tests
8. Run tests to verify

## Code Template
```typescript
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Customer, ICustomer } from './Customer';

describe('Customer Model', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    process.env.ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests';
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    delete process.env.ENCRYPTION_KEY;
  });

  beforeEach(async () => {
    await Customer.deleteMany({});
  });

  const createValidCustomerData = (overrides = {}) => ({
    name: 'Test Customer',
    contactInfo: {
      email: 'test@example.com',
      phone: '123-456-7890',
      address: '123 Test St'
    },
    billingDetails: {
      dailyRate: 500,
      currency: 'USD'
    },
    userId: new mongoose.Types.ObjectId(),
    ...overrides
  });

  describe('Schema Validation', () => {
    describe('Required Fields', () => {
      /**
       * Test: should require name field
       */
      it('should require name field', async () => {
        // Arrange
        const customerData = createValidCustomerData();
        delete (customerData as any).name;

        // Act & Assert
        const customer = new Customer(customerData);
        await expect(customer.validate()).rejects.toThrow(/name/i);
      });

      /**
       * Test: should require contactInfo.email field
       */
      it('should require contactInfo.email field', async () => {
        // Arrange
        const customerData = createValidCustomerData();
        delete customerData.contactInfo.email;

        // Act & Assert
        const customer = new Customer(customerData);
        await expect(customer.validate()).rejects.toThrow(/email/i);
      });

      /**
       * Test: should require billingDetails.dailyRate field
       */
      it('should require billingDetails.dailyRate field', async () => {
        // Arrange
        const customerData = createValidCustomerData();
        delete (customerData.billingDetails as any).dailyRate;

        // Act & Assert
        const customer = new Customer(customerData);
        await expect(customer.validate()).rejects.toThrow(/dailyRate/i);
      });
    });

    describe('Field Validation', () => {
      /**
       * Test: should trim name field
       */
      it('should trim name field', async () => {
        // Arrange
        const customerData = createValidCustomerData({ name: '  Test Customer  ' });

        // Act
        const customer = await Customer.create(customerData);

        // Assert
        expect(customer.name).toBe('Test Customer');
      });

      /**
       * Test: should lowercase contactInfo.email
       */
      it('should lowercase contactInfo.email', async () => {
        // Arrange
        const customerData = createValidCustomerData({
          contactInfo: { email: 'TEST@EXAMPLE.COM' }
        });

        // Act
        const customer = await Customer.create(customerData);

        // Assert
        expect(customer.contactInfo.email).toBe('test@example.com');
      });

      /**
       * Test: should validate billingDetails.dailyRate is >= 0
       */
      it('should validate billingDetails.dailyRate is >= 0', async () => {
        // Arrange
        const customerData = createValidCustomerData({
          billingDetails: { dailyRate: -100, currency: 'USD' }
        });

        // Act & Assert
        const customer = new Customer(customerData);
        await expect(customer.validate()).rejects.toThrow();
      });
    });

    describe('Azure DevOps URL Validation', () => {
      /**
       * Test: should accept valid dev.azure.com URLs
       */
      it('should accept valid dev.azure.com URLs', async () => {
        // Arrange
        const customerData = createValidCustomerData({
          azureDevOps: {
            organizationUrl: 'https://dev.azure.com/myorg',
            pat: 'test-pat',
            enabled: true
          }
        });

        // Act
        const customer = await Customer.create(customerData);

        // Assert
        expect(customer.azureDevOps?.organizationUrl).toBe('https://dev.azure.com/myorg');
      });

      /**
       * Test: should accept valid visualstudio.com URLs
       */
      it('should accept valid visualstudio.com URLs', async () => {
        // Arrange
        const customerData = createValidCustomerData({
          azureDevOps: {
            organizationUrl: 'https://myorg.visualstudio.com',
            pat: 'test-pat',
            enabled: true
          }
        });

        // Act
        const customer = await Customer.create(customerData);

        // Assert
        expect(customer.azureDevOps?.organizationUrl).toBe('https://myorg.visualstudio.com');
      });

      /**
       * Test: should reject invalid URLs
       */
      it('should reject invalid URLs', async () => {
        // Arrange
        const customerData = createValidCustomerData({
          azureDevOps: {
            organizationUrl: 'https://invalid-url.com',
            pat: 'test-pat',
            enabled: true
          }
        });

        // Act & Assert
        const customer = new Customer(customerData);
        await expect(customer.validate()).rejects.toThrow(/Invalid Azure DevOps organization URL/);
      });
    });
  });

  describe('Pre-save Hook (PAT Encryption)', () => {
    /**
     * Test: should encrypt PAT on save when modified
     */
    it('should encrypt PAT on save when modified', async () => {
      // Arrange
      const plainPAT = 'my-plain-text-pat';
      const customerData = createValidCustomerData({
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/myorg',
          pat: plainPAT,
          enabled: true
        }
      });

      // Act
      const customer = await Customer.create(customerData);

      // Assert
      expect(customer.azureDevOps?.pat).not.toBe(plainPAT);
      expect(customer.azureDevOps?.pat).toContain(':'); // Encrypted format
    });

    /**
     * Test: should not re-encrypt already encrypted PAT
     */
    it('should not re-encrypt already encrypted PAT', async () => {
      // Arrange
      const customerData = createValidCustomerData({
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/myorg',
          pat: 'my-plain-text-pat',
          enabled: true
        }
      });
      const customer = await Customer.create(customerData);
      const encryptedPAT = customer.azureDevOps?.pat;

      // Act - Update a different field
      customer.name = 'Updated Name';
      await customer.save();

      // Assert - PAT should remain the same
      expect(customer.azureDevOps?.pat).toBe(encryptedPAT);
    });
  });

  describe('getDecryptedPAT Method', () => {
    /**
     * Test: should decrypt encrypted PAT correctly
     */
    it('should decrypt encrypted PAT correctly', async () => {
      // Arrange
      const plainPAT = 'my-plain-text-pat';
      const customerData = createValidCustomerData({
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/myorg',
          pat: plainPAT,
          enabled: true
        }
      });
      const customer = await Customer.create(customerData);

      // Act
      const decryptedPAT = customer.getDecryptedPAT();

      // Assert
      expect(decryptedPAT).toBe(plainPAT);
    });

    /**
     * Test: should return null when no PAT exists
     */
    it('should return null when no PAT exists', async () => {
      // Arrange
      const customerData = createValidCustomerData();
      const customer = await Customer.create(customerData);

      // Act
      const decryptedPAT = customer.getDecryptedPAT();

      // Assert
      expect(decryptedPAT).toBeNull();
    });
  });

  describe('toJSON Transform', () => {
    /**
     * Test: should remove PAT from JSON output
     */
    it('should remove PAT from JSON output', async () => {
      // Arrange
      const customerData = createValidCustomerData({
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/myorg',
          pat: 'my-plain-text-pat',
          enabled: true
        }
      });
      const customer = await Customer.create(customerData);

      // Act
      const json = customer.toJSON();

      // Assert
      expect(json.azureDevOps).toBeDefined();
      expect(json.azureDevOps.organizationUrl).toBe('https://dev.azure.com/myorg');
      expect(json.azureDevOps.enabled).toBe(true);
      expect(json.azureDevOps.pat).toBeUndefined();
    });
  });
});
```

## Acceptance Criteria
- [ ] Test file created at `backend/src/models/customer.model.test.ts`
- [ ] All test cases pass when running `npm test`
- [ ] Tests follow AAA pattern with clear comments
- [ ] Schema validation comprehensively tested
- [ ] Pre-save hook (PAT encryption) tested
- [ ] `getDecryptedPAT` method tested
- [ ] toJSON transform tested (PAT removal)
- [ ] Coverage for Customer.ts reaches >80%

## Validation
```bash
cd backend
npm test -- customer.model.test.ts --coverage --collectCoverageFrom="src/models/Customer.ts"
```
Expected: Coverage for `Customer.ts` should be >80%

## Dependencies Output
- Model testing patterns with MongoDB Memory Server
- Schema validation test patterns
- Pre-save hook test patterns
- Method testing patterns

## Notes
- Uses MongoDB Memory Server for integration tests
- Must set ENCRYPTION_KEY environment variable
- Azure DevOps URL regex: `/^https:\/\/(dev\.azure\.com\/[^/]+|[^/]+\.visualstudio\.com)$/`
- PAT is encrypted on save if modified and not already encrypted (no colon)
- toJSON transform removes PAT for security
- `getDecryptedPAT` returns null on any error (logged to console)
