import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Customer, ICustomer } from './Customer';
import { encryptPAT } from '../config/encryption.helpers';

/**
 * Unit tests for the Customer Mongoose model.
 * 
 * These tests verify:
 * - Schema validation for required fields
 * - getDecryptedPAT method functionality
 * - Pre-save hook for PAT encryption
 * - Integration tests for encrypt/decrypt round-trip
 */

let mongoServer: MongoMemoryServer;

// Test encryption key - must be set before any encryption operations
const TEST_ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests-32chars';

beforeAll(async () => {
  // Set encryption key for tests
  process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  
  // Clean up environment variable
  delete process.env.ENCRYPTION_KEY;
});

beforeEach(async () => {
  await Customer.deleteMany({});
});

/**
 * Helper to create valid customer data with optional overrides.
 * Provides sensible defaults for all required fields.
 */
const createValidCustomerData = (overrides: Partial<ICustomer> = {}): Partial<ICustomer> => ({
  name: 'Test Customer',
  contactInfo: {
    email: 'test@example.com',
    phone: '123-456-7890',
    address: '123 Test Street'
  },
  billingDetails: {
    dailyRate: 500,
    currency: 'EUR',
    paymentTerms: 'Net 30'
  },
  userId: new mongoose.Types.ObjectId(),
  ...overrides
});

describe('Customer Model', () => {
  describe('Schema Validation - Required Fields', () => {
    /**
     * Test: should require name
     * 
     * Objective: Verify that name is a required field and
     * validation fails when it's missing.
     */
    it('should require name', async () => {
      // Arrange
      const customerData = createValidCustomerData();
      delete (customerData as any).name;
      const customer = new Customer(customerData);

      // Act & Assert
      await expect(customer.validate()).rejects.toThrow(/name.*required/i);
    });

    /**
     * Test: should require userId
     * 
     * Objective: Verify that userId is a required field and
     * validation fails when it's missing.
     */
    it('should require userId', async () => {
      // Arrange
      const customerData = createValidCustomerData();
      delete (customerData as any).userId;
      const customer = new Customer(customerData);

      // Act & Assert
      await expect(customer.validate()).rejects.toThrow(/userId.*required/i);
    });

    /**
     * Test: should allow optional azureDevOps config
     * 
     * Objective: Verify that azureDevOps is optional and
     * validation passes when it's missing.
     */
    it('should allow optional azureDevOps config', async () => {
      // Arrange
      const customerData = createValidCustomerData();
      delete (customerData as any).azureDevOps;
      const customer = new Customer(customerData);

      // Act & Assert
      await expect(customer.validate()).resolves.toBeUndefined();
      // Note: Mongoose may set default values for nested objects
      // The important thing is that validation passes without azureDevOps
      expect(customer.azureDevOps?.pat).toBeUndefined();
    });

    /**
     * Test: should require contactInfo.email
     * 
     * Objective: Verify that contactInfo.email is a required field.
     */
    it('should require contactInfo.email', async () => {
      // Arrange
      const customerData = createValidCustomerData();
      delete (customerData as any).contactInfo.email;
      const customer = new Customer(customerData);

      // Act & Assert
      await expect(customer.validate()).rejects.toThrow(/email.*required/i);
    });

    /**
     * Test: should require billingDetails.dailyRate
     * 
     * Objective: Verify that billingDetails.dailyRate is a required field.
     */
    it('should require billingDetails.dailyRate', async () => {
      // Arrange
      const customerData = createValidCustomerData();
      delete (customerData as any).billingDetails.dailyRate;
      const customer = new Customer(customerData);

      // Act & Assert
      await expect(customer.validate()).rejects.toThrow(/dailyRate.*required/i);
    });
  });

  describe('getDecryptedPAT method', () => {
    /**
     * Test: should return decrypted PAT when PAT exists
     * 
     * Objective: Verify that getDecryptedPAT returns the original PAT
     * after it has been encrypted and stored.
     */
    it('should return decrypted PAT when PAT exists', async () => {
      // Arrange
      const originalPAT = 'my-secret-personal-access-token';
      const customerData = createValidCustomerData({
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/myorg',
          pat: originalPAT,
          enabled: true
        }
      });
      const customer = new Customer(customerData);
      await customer.save();

      // Act
      const decryptedPAT = customer.getDecryptedPAT();

      // Assert
      expect(decryptedPAT).toBe(originalPAT);
    });

    /**
     * Test: should return null when no azureDevOps config
     * 
     * Objective: Verify that getDecryptedPAT returns null when
     * the customer has no azureDevOps configuration.
     */
    it('should return null when no azureDevOps config', async () => {
      // Arrange
      const customerData = createValidCustomerData();
      delete (customerData as any).azureDevOps;
      const customer = new Customer(customerData);
      await customer.save();

      // Act
      const decryptedPAT = customer.getDecryptedPAT();

      // Assert
      expect(decryptedPAT).toBeNull();
    });

    /**
     * Test: should return null when PAT is empty
     * 
     * Objective: Verify that getDecryptedPAT returns null when
     * the PAT field is empty or undefined.
     */
    it('should return null when PAT is empty', async () => {
      // Arrange
      const customerData = createValidCustomerData({
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/myorg',
          pat: '',
          enabled: false
        }
      });
      const customer = new Customer(customerData);
      // Save without triggering encryption (empty PAT won't be encrypted)
      await customer.save();

      // Act
      const decryptedPAT = customer.getDecryptedPAT();

      // Assert
      expect(decryptedPAT).toBeNull();
    });

    /**
     * Test: should handle decryption errors gracefully
     * 
     * Objective: Verify that getDecryptedPAT returns null and doesn't
     * throw when decryption fails (e.g., corrupted data).
     */
    it('should handle decryption errors gracefully', async () => {
      // Arrange - Bypass pre-save hook by inserting directly into collection
      await Customer.collection.insertOne({
        name: 'Test Customer',
        contactInfo: { email: 'test@example.com' },
        billingDetails: { dailyRate: 500, currency: 'EUR' },
        userId: new mongoose.Types.ObjectId(),
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/myorg',
          pat: 'invalid-encrypted-data',
          enabled: true
        }
      });
      
      // Fetch the customer to get the instance with the method
      const savedCustomer = await Customer.findOne({ name: 'Test Customer' });

      // Act
      const decryptedPAT = savedCustomer!.getDecryptedPAT();

      // Assert
      expect(decryptedPAT).toBeNull();
    });

    /**
     * Test: should work with valid encrypted PAT
     * 
     * Objective: Verify that getDecryptedPAT correctly decrypts
     * a properly encrypted PAT.
     */
    it('should work with valid encrypted PAT', async () => {
      // Arrange
      const originalPAT = 'abcdef123456789-valid-pat-token';
      const encryptedPAT = encryptPAT(originalPAT);
      
      // Insert directly with pre-encrypted PAT
      await Customer.collection.insertOne({
        name: 'Pre-encrypted Customer',
        contactInfo: { email: 'test@example.com' },
        billingDetails: { dailyRate: 500, currency: 'EUR' },
        userId: new mongoose.Types.ObjectId(),
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/myorg',
          pat: encryptedPAT,
          enabled: true
        }
      });
      
      const customer = await Customer.findOne({ name: 'Pre-encrypted Customer' });

      // Act
      const decryptedPAT = customer!.getDecryptedPAT();

      // Assert
      expect(decryptedPAT).toBe(originalPAT);
    });

    /**
     * Test: should return null when azureDevOps exists but pat is undefined
     * 
     * Objective: Verify that getDecryptedPAT handles the case where
     * azureDevOps config exists but pat field is undefined.
     */
    it('should return null when azureDevOps exists but pat is undefined', async () => {
      // Arrange
      await Customer.collection.insertOne({
        name: 'No PAT Customer',
        contactInfo: { email: 'test@example.com' },
        billingDetails: { dailyRate: 500, currency: 'EUR' },
        userId: new mongoose.Types.ObjectId(),
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/myorg',
          enabled: false
          // pat is intentionally not set
        }
      });
      
      const customer = await Customer.findOne({ name: 'No PAT Customer' });

      // Act
      const decryptedPAT = customer!.getDecryptedPAT();

      // Assert
      expect(decryptedPAT).toBeNull();
    });
  });

  describe('Pre-save hook - PAT encryption', () => {
    /**
     * Test: should encrypt PAT when azureDevOps.pat is modified
     * 
     * Objective: Verify that the pre-save hook encrypts the PAT
     * when it is modified.
     */
    it('should encrypt PAT when azureDevOps.pat is modified', async () => {
      // Arrange
      const originalPAT = 'my-new-personal-access-token';
      const customerData = createValidCustomerData({
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/myorg',
          pat: originalPAT,
          enabled: true
        }
      });
      const customer = new Customer(customerData);

      // Act
      await customer.save();

      // Assert
      expect(customer.azureDevOps?.pat).not.toBe(originalPAT);
      expect(customer.azureDevOps?.pat).toContain(':'); // Encrypted format is iv:data
    });

    /**
     * Test: should not encrypt PAT when azureDevOps.pat is not modified
     * 
     * Objective: Verify that the pre-save hook does not re-encrypt
     * the PAT when other fields are modified.
     */
    it('should not encrypt PAT when azureDevOps.pat is not modified', async () => {
      // Arrange
      const originalPAT = 'my-personal-access-token';
      const customerData = createValidCustomerData({
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/myorg',
          pat: originalPAT,
          enabled: true
        }
      });
      const customer = new Customer(customerData);
      await customer.save();
      
      const encryptedPAT = customer.azureDevOps?.pat;

      // Act - modify a different field
      customer.name = 'Updated Customer Name';
      await customer.save();

      // Assert
      expect(customer.azureDevOps?.pat).toBe(encryptedPAT);
    });

    /**
     * Test: should encrypt PAT on new customer creation with azureDevOps
     * 
     * Objective: Verify that the pre-save hook encrypts the PAT
     * when a new customer is created with azureDevOps config.
     */
    it('should encrypt PAT on new customer creation with azureDevOps', async () => {
      // Arrange
      const originalPAT = 'brand-new-pat-token';
      const customerData = createValidCustomerData({
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/myorg',
          pat: originalPAT,
          enabled: true
        }
      });

      // Act
      const customer = new Customer(customerData);
      await customer.save();

      // Assert
      expect(customer.azureDevOps?.pat).not.toBe(originalPAT);
      expect(customer.azureDevOps?.pat).toMatch(/^[a-f0-9]+:[a-f0-9]+$/); // iv:encryptedData format
    });

    /**
     * Test: should preserve encrypted PAT format (iv:data)
     * 
     * Objective: Verify that the encrypted PAT follows the expected
     * format of iv:encryptedData (hex encoded).
     */
    it('should preserve encrypted PAT format (iv:data)', async () => {
      // Arrange
      const originalPAT = 'test-pat-for-format-check';
      const customerData = createValidCustomerData({
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/myorg',
          pat: originalPAT,
          enabled: true
        }
      });

      // Act
      const customer = new Customer(customerData);
      await customer.save();

      // Assert
      const parts = customer.azureDevOps?.pat?.split(':');
      expect(parts).toHaveLength(2);
      expect(parts![0]).toMatch(/^[a-f0-9]{32}$/); // IV is 16 bytes = 32 hex chars
      expect(parts![1]).toMatch(/^[a-f0-9]+$/); // Encrypted data is hex
    });

    /**
     * Test: should handle empty PAT gracefully
     * 
     * Objective: Verify that the pre-save hook handles empty PAT
     * without throwing errors.
     */
    it('should handle empty PAT gracefully', async () => {
      // Arrange
      const customerData = createValidCustomerData({
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/myorg',
          pat: '',
          enabled: false
        }
      });

      // Act
      const customer = new Customer(customerData);
      await customer.save();

      // Assert
      expect(customer.azureDevOps?.pat).toBe('');
    });

    /**
     * Test: should not encrypt PAT when azureDevOps config is not present
     * 
     * Objective: Verify that the pre-save hook doesn't fail when
     * there's no azureDevOps configuration.
     */
    it('should not encrypt PAT when azureDevOps config is not present', async () => {
      // Arrange
      const customerData = createValidCustomerData();
      delete (customerData as any).azureDevOps;

      // Act
      const customer = new Customer(customerData);
      await customer.save();

      // Assert - PAT should not exist (no encryption needed)
      expect(customer.azureDevOps?.pat).toBeUndefined();
    });

    /**
     * Test: should not re-encrypt already encrypted PAT
     * 
     * Objective: Verify that the pre-save hook checks if PAT is already
     * encrypted (contains ':') and doesn't re-encrypt it.
     */
    it('should not re-encrypt already encrypted PAT', async () => {
      // Arrange
      const originalPAT = 'my-pat-token';
      const customerData = createValidCustomerData({
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/myorg',
          pat: originalPAT,
          enabled: true
        }
      });
      const customer = new Customer(customerData);
      await customer.save();
      
      const firstEncryptedPAT = customer.azureDevOps?.pat;

      // Act - Manually mark the field as modified and save again
      customer.markModified('azureDevOps.pat');
      await customer.save();

      // Assert - PAT should remain the same (not double-encrypted)
      expect(customer.azureDevOps?.pat).toBe(firstEncryptedPAT);
    });
  });

  describe('Integration tests - Encrypt/Decrypt round-trip', () => {
    /**
     * Test: should encrypt on save and decrypt correctly
     * 
     * Objective: Verify the complete round-trip of encrypting on save
     * and decrypting with getDecryptedPAT.
     */
    it('should encrypt on save and decrypt correctly', async () => {
      // Arrange
      const originalPAT = 'integration-test-pat-12345';
      const customerData = createValidCustomerData({
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/myorg',
          pat: originalPAT,
          enabled: true
        }
      });

      // Act
      const customer = new Customer(customerData);
      await customer.save();
      
      // Fetch fresh from database
      const savedCustomer = await Customer.findById(customer._id);
      const decryptedPAT = savedCustomer!.getDecryptedPAT();

      // Assert
      expect(savedCustomer!.azureDevOps?.pat).not.toBe(originalPAT);
      expect(decryptedPAT).toBe(originalPAT);
    });

    /**
     * Test: should preserve other azureDevOps fields when encrypting PAT
     * 
     * Objective: Verify that encrypting the PAT doesn't affect other
     * fields in the azureDevOps configuration.
     */
    it('should preserve other azureDevOps fields when encrypting PAT', async () => {
      // Arrange
      const customerData = createValidCustomerData({
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/testorg',
          pat: 'test-pat-token',
          enabled: true
        }
      });

      // Act
      const customer = new Customer(customerData);
      await customer.save();

      // Assert
      expect(customer.azureDevOps?.organizationUrl).toBe('https://dev.azure.com/testorg');
      expect(customer.azureDevOps?.enabled).toBe(true);
    });

    /**
     * Test: should handle customer without azureDevOps config
     * 
     * Objective: Verify that customers without azureDevOps config
     * can be saved and retrieved without issues.
     */
    it('should handle customer without azureDevOps config', async () => {
      // Arrange
      const customerData = createValidCustomerData();
      delete (customerData as any).azureDevOps;

      // Act
      const customer = new Customer(customerData);
      await customer.save();
      
      const savedCustomer = await Customer.findById(customer._id);

      // Assert - PAT should not exist and getDecryptedPAT should return null
      expect(savedCustomer!.azureDevOps?.pat).toBeUndefined();
      expect(savedCustomer!.getDecryptedPAT()).toBeNull();
    });

    /**
     * Test: should update PAT correctly on subsequent saves
     * 
     * Objective: Verify that updating the PAT on an existing customer
     * correctly encrypts the new PAT.
     */
    it('should update PAT correctly on subsequent saves', async () => {
      // Arrange
      const originalPAT = 'original-pat-token';
      const newPAT = 'updated-pat-token';
      const customerData = createValidCustomerData({
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/myorg',
          pat: originalPAT,
          enabled: true
        }
      });
      const customer = new Customer(customerData);
      await customer.save();
      
      const originalEncryptedPAT = customer.azureDevOps?.pat;

      // Act - Update the PAT
      customer.azureDevOps!.pat = newPAT;
      await customer.save();
      
      const savedCustomer = await Customer.findById(customer._id);

      // Assert
      expect(savedCustomer!.azureDevOps?.pat).not.toBe(originalEncryptedPAT);
      expect(savedCustomer!.azureDevOps?.pat).not.toBe(newPAT);
      expect(savedCustomer!.getDecryptedPAT()).toBe(newPAT);
    });

    /**
     * Test: should not re-encrypt already encrypted PAT on fetch and save
     * 
     * Objective: Verify that fetching a customer and saving it again
     * doesn't re-encrypt the PAT.
     */
    it('should not re-encrypt already encrypted PAT on fetch and save', async () => {
      // Arrange
      const originalPAT = 'stable-pat-token';
      const customerData = createValidCustomerData({
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/myorg',
          pat: originalPAT,
          enabled: true
        }
      });
      const customer = new Customer(customerData);
      await customer.save();
      
      const encryptedPAT = customer.azureDevOps?.pat;

      // Act - Fetch and save without modifying PAT
      const fetchedCustomer = await Customer.findById(customer._id);
      fetchedCustomer!.name = 'Updated Name';
      await fetchedCustomer!.save();

      // Assert
      expect(fetchedCustomer!.azureDevOps?.pat).toBe(encryptedPAT);
      expect(fetchedCustomer!.getDecryptedPAT()).toBe(originalPAT);
    });

    /**
     * Test: should handle multiple customers with different PATs
     * 
     * Objective: Verify that multiple customers can have different PATs
     * that are independently encrypted and decrypted.
     */
    it('should handle multiple customers with different PATs', async () => {
      // Arrange
      const pat1 = 'customer-one-pat';
      const pat2 = 'customer-two-pat';
      
      const customer1Data = createValidCustomerData({
        name: 'Customer One',
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/org1',
          pat: pat1,
          enabled: true
        }
      });
      
      const customer2Data = createValidCustomerData({
        name: 'Customer Two',
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/org2',
          pat: pat2,
          enabled: true
        }
      });

      // Act
      const customer1 = new Customer(customer1Data);
      const customer2 = new Customer(customer2Data);
      await customer1.save();
      await customer2.save();

      const savedCustomer1 = await Customer.findOne({ name: 'Customer One' });
      const savedCustomer2 = await Customer.findOne({ name: 'Customer Two' });

      // Assert
      expect(savedCustomer1!.getDecryptedPAT()).toBe(pat1);
      expect(savedCustomer2!.getDecryptedPAT()).toBe(pat2);
      expect(savedCustomer1!.azureDevOps?.pat).not.toBe(savedCustomer2!.azureDevOps?.pat);
    });

    /**
     * Test: should handle special characters in PAT
     * 
     * Objective: Verify that PATs with special characters are
     * correctly encrypted and decrypted.
     * Note: The ':' character is excluded because it's used as the
     * separator in the encrypted format (iv:data).
     */
    it('should handle special characters in PAT', async () => {
      // Arrange - exclude ':' as it's used as the encryption format separator
      const specialPAT = 'pat-with-special-chars!@#$%^&*()_+-=[]{}|;,.<>?';
      const customerData = createValidCustomerData({
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/myorg',
          pat: specialPAT,
          enabled: true
        }
      });

      // Act
      const customer = new Customer(customerData);
      await customer.save();
      
      const savedCustomer = await Customer.findById(customer._id);

      // Assert
      expect(savedCustomer!.getDecryptedPAT()).toBe(specialPAT);
    });

    /**
     * Test: should handle long PAT values
     * 
     * Objective: Verify that long PAT values are correctly
     * encrypted and decrypted.
     */
    it('should handle long PAT values', async () => {
      // Arrange
      const longPAT = 'a'.repeat(500); // 500 character PAT
      const customerData = createValidCustomerData({
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/myorg',
          pat: longPAT,
          enabled: true
        }
      });

      // Act
      const customer = new Customer(customerData);
      await customer.save();
      
      const savedCustomer = await Customer.findById(customer._id);

      // Assert
      expect(savedCustomer!.getDecryptedPAT()).toBe(longPAT);
    });
  });

  describe('Azure DevOps URL Validation', () => {
    /**
     * Test: should accept valid dev.azure.com URL
     * 
     * Objective: Verify that valid Azure DevOps URLs are accepted.
     */
    it('should accept valid dev.azure.com URL', async () => {
      // Arrange
      const customerData = createValidCustomerData({
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/myorganization',
          pat: 'test-pat',
          enabled: true
        }
      });

      // Act
      const customer = new Customer(customerData);

      // Assert
      await expect(customer.validate()).resolves.toBeUndefined();
    });

    /**
     * Test: should accept valid visualstudio.com URL
     * 
     * Objective: Verify that legacy visualstudio.com URLs are accepted.
     */
    it('should accept valid visualstudio.com URL', async () => {
      // Arrange
      const customerData = createValidCustomerData({
        azureDevOps: {
          organizationUrl: 'https://myorg.visualstudio.com',
          pat: 'test-pat',
          enabled: true
        }
      });

      // Act
      const customer = new Customer(customerData);

      // Assert
      await expect(customer.validate()).resolves.toBeUndefined();
    });

    /**
     * Test: should reject invalid Azure DevOps URL
     * 
     * Objective: Verify that invalid URLs are rejected.
     */
    it('should reject invalid Azure DevOps URL', async () => {
      // Arrange
      const customerData = createValidCustomerData({
        azureDevOps: {
          organizationUrl: 'https://invalid-url.com/org',
          pat: 'test-pat',
          enabled: true
        }
      });

      // Act
      const customer = new Customer(customerData);

      // Assert
      await expect(customer.validate()).rejects.toThrow(/Invalid Azure DevOps organization URL format/i);
    });
  });

  describe('toJSON transformation', () => {
    /**
     * Test: should remove PAT from JSON output
     * 
     * Objective: Verify that the PAT is removed from JSON responses
     * for security.
     */
    it('should remove PAT from JSON output', async () => {
      // Arrange
      const customerData = createValidCustomerData({
        azureDevOps: {
          organizationUrl: 'https://dev.azure.com/myorg',
          pat: 'secret-pat-token',
          enabled: true
        }
      });
      const customer = new Customer(customerData);
      await customer.save();

      // Act
      const json = customer.toJSON();

      // Assert
      expect(json.azureDevOps).toBeDefined();
      expect(json.azureDevOps!.organizationUrl).toBe('https://dev.azure.com/myorg');
      expect(json.azureDevOps!.enabled).toBe(true);
      expect(json.azureDevOps!.pat).toBeUndefined();
    });
  });
});
