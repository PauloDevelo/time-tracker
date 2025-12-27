# 10. Create Encryption Helpers Unit Tests

meta:
  id: backend-test-coverage-10
  feature: backend-test-coverage
  priority: P1
  depends_on: [backend-test-coverage-01]
  tags: [testing, config, encryption, security]

## Objective
Create comprehensive unit tests for the encryption helpers (`backend/src/config/encryption.helpers.ts`) covering PAT encryption and decryption functionality.

## Context
- The encryption helpers handle secure storage of Azure DevOps PATs
- Current coverage: 17%
- File location: `backend/src/config/encryption.helpers.ts`
- Exports: `encryptPAT`, `decryptPAT`
- Uses AES-256-CBC encryption with random IV
- Reference pattern: `backend/src/services/report.service.test.ts`

## Deliverables
- New file: `backend/src/config/encryption.helpers.test.ts`
- Test coverage for both exported functions
- Coverage should reach >80%

## Test Cases to Implement

### encryptPAT
1. **Happy Path Tests:**
   - Should encrypt PAT and return iv:encryptedData format
   - Should produce different output for same input (random IV)
   - Should produce consistent decryptable output

2. **Error Cases:**
   - Should throw error when PAT is empty string
   - Should throw error when PAT is null/undefined
   - Should throw error when ENCRYPTION_KEY not set

3. **Format Tests:**
   - Should return string with colon separator
   - Should return hex-encoded IV (32 chars)
   - Should return hex-encoded encrypted data

### decryptPAT
1. **Happy Path Tests:**
   - Should decrypt encrypted PAT correctly
   - Should handle various PAT lengths
   - Should handle special characters in PAT

2. **Error Cases:**
   - Should throw error when encrypted PAT is empty
   - Should throw error when format is invalid (no colon)
   - Should throw error when IV is invalid
   - Should throw error when encrypted data is corrupted
   - Should throw error when ENCRYPTION_KEY not set

3. **Round-trip Tests:**
   - Should encrypt then decrypt to original value
   - Should work with short PATs
   - Should work with long PATs
   - Should work with PATs containing special characters

## Steps
1. Create test file `backend/src/config/encryption.helpers.test.ts`
2. Set up environment variable mocking for ENCRYPTION_KEY
3. Implement tests for encryptPAT
4. Implement tests for decryptPAT
5. Implement round-trip tests
6. Run tests to verify

## Code Template
```typescript
import { encryptPAT, decryptPAT } from './encryption.helpers';

describe('Encryption Helpers', () => {
  const TEST_ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests';
  
  beforeEach(() => {
    // Set up encryption key for tests
    process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  afterEach(() => {
    // Clean up
    delete process.env.ENCRYPTION_KEY;
  });

  describe('encryptPAT', () => {
    /**
     * Test: should encrypt PAT and return iv:encryptedData format
     */
    it('should encrypt PAT and return iv:encryptedData format', () => {
      // Arrange
      const pat = 'my-secret-pat-token';

      // Act
      const encrypted = encryptPAT(pat);

      // Assert
      expect(encrypted).toContain(':');
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(2);
      expect(parts[0]).toHaveLength(32); // IV is 16 bytes = 32 hex chars
      expect(parts[1].length).toBeGreaterThan(0);
    });

    /**
     * Test: should produce different output for same input (random IV)
     */
    it('should produce different output for same input (random IV)', () => {
      // Arrange
      const pat = 'my-secret-pat-token';

      // Act
      const encrypted1 = encryptPAT(pat);
      const encrypted2 = encryptPAT(pat);

      // Assert
      expect(encrypted1).not.toEqual(encrypted2);
    });

    /**
     * Test: should throw error when PAT is empty
     */
    it('should throw error when PAT is empty', () => {
      // Arrange & Act & Assert
      expect(() => encryptPAT('')).toThrow('PAT cannot be empty');
    });

    /**
     * Test: should throw error when ENCRYPTION_KEY not set
     */
    it('should throw error when ENCRYPTION_KEY not set', () => {
      // Arrange
      delete process.env.ENCRYPTION_KEY;

      // Act & Assert
      expect(() => encryptPAT('test-pat')).toThrow('ENCRYPTION_KEY environment variable is not set');
    });
  });

  describe('decryptPAT', () => {
    /**
     * Test: should decrypt encrypted PAT correctly
     */
    it('should decrypt encrypted PAT correctly', () => {
      // Arrange
      const originalPAT = 'my-secret-pat-token';
      const encrypted = encryptPAT(originalPAT);

      // Act
      const decrypted = decryptPAT(encrypted);

      // Assert
      expect(decrypted).toEqual(originalPAT);
    });

    /**
     * Test: should throw error when encrypted PAT is empty
     */
    it('should throw error when encrypted PAT is empty', () => {
      // Arrange & Act & Assert
      expect(() => decryptPAT('')).toThrow('Encrypted PAT cannot be empty');
    });

    /**
     * Test: should throw error when format is invalid
     */
    it('should throw error when format is invalid (no colon)', () => {
      // Arrange & Act & Assert
      expect(() => decryptPAT('invalid-format-no-colon')).toThrow('Invalid encrypted PAT format');
    });

    /**
     * Test: should throw error when ENCRYPTION_KEY not set
     */
    it('should throw error when ENCRYPTION_KEY not set', () => {
      // Arrange
      const encrypted = encryptPAT('test-pat');
      delete process.env.ENCRYPTION_KEY;

      // Act & Assert
      expect(() => decryptPAT(encrypted)).toThrow('ENCRYPTION_KEY environment variable is not set');
    });
  });

  describe('Round-trip encryption/decryption', () => {
    /**
     * Test: should encrypt then decrypt to original value
     */
    it('should encrypt then decrypt to original value', () => {
      // Arrange
      const testCases = [
        'simple-pat',
        'pat-with-special-chars-!@#$%^&*()',
        'very-long-pat-token-that-is-much-longer-than-typical-tokens-1234567890',
        'a', // Single character
        '12345678901234567890123456789012345678901234567890' // 50 chars
      ];

      // Act & Assert
      testCases.forEach(pat => {
        const encrypted = encryptPAT(pat);
        const decrypted = decryptPAT(encrypted);
        expect(decrypted).toEqual(pat);
      });
    });

    /**
     * Test: should handle PATs with unicode characters
     */
    it('should handle PATs with unicode characters', () => {
      // Arrange
      const pat = 'pat-with-émojis-🔐-and-ünïcödé';

      // Act
      const encrypted = encryptPAT(pat);
      const decrypted = decryptPAT(encrypted);

      // Assert
      expect(decrypted).toEqual(pat);
    });
  });

  describe('Security properties', () => {
    /**
     * Test: encrypted output should not contain original PAT
     */
    it('encrypted output should not contain original PAT', () => {
      // Arrange
      const pat = 'my-secret-pat-token';

      // Act
      const encrypted = encryptPAT(pat);

      // Assert
      expect(encrypted).not.toContain(pat);
      expect(encrypted).not.toContain('my-secret');
    });

    /**
     * Test: different encryption keys should produce different results
     */
    it('different encryption keys should produce different results', () => {
      // Arrange
      const pat = 'my-secret-pat-token';
      
      process.env.ENCRYPTION_KEY = 'key-one';
      const encrypted1 = encryptPAT(pat);
      
      process.env.ENCRYPTION_KEY = 'key-two';
      const encrypted2 = encryptPAT(pat);

      // Assert
      // Note: The encrypted data portions will differ due to different keys
      // (IVs are random anyway, but the encrypted data will also differ)
      expect(encrypted1.split(':')[1]).not.toEqual(encrypted2.split(':')[1]);
    });

    /**
     * Test: decryption with wrong key should fail
     */
    it('decryption with wrong key should fail', () => {
      // Arrange
      const pat = 'my-secret-pat-token';
      
      process.env.ENCRYPTION_KEY = 'original-key';
      const encrypted = encryptPAT(pat);
      
      process.env.ENCRYPTION_KEY = 'different-key';

      // Act & Assert
      expect(() => decryptPAT(encrypted)).toThrow();
    });
  });
});
```

## Acceptance Criteria
- [ ] Test file created at `backend/src/config/encryption.helpers.test.ts`
- [ ] All test cases pass when running `npm test`
- [ ] Tests follow AAA pattern with clear comments
- [ ] Both functions have comprehensive test coverage
- [ ] Round-trip encryption/decryption verified
- [ ] Error cases properly tested
- [ ] Security properties verified (no plaintext leakage)

## Validation
```bash
cd backend
npm test -- encryption.helpers.test.ts --coverage --collectCoverageFrom="src/config/encryption.helpers.ts"
```
Expected: Coverage for `encryption.helpers.ts` should be >80%

## Dependencies Output
- Encryption test patterns
- Environment variable mocking patterns
- Security testing patterns

## Notes
- Uses AES-256-CBC algorithm
- IV is 16 bytes (32 hex characters)
- Key is derived from ENCRYPTION_KEY using SHA-256
- Format: `{iv_hex}:{encrypted_data_hex}`
- Tests should verify security properties (no plaintext in output)
- Different keys must produce different encrypted outputs
- Decryption with wrong key should fail
