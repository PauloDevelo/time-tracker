import { encryptPAT, decryptPAT } from './encryption.helpers';

/**
 * Unit tests for the Encryption helpers.
 * 
 * These tests verify:
 * - PAT encryption with AES-256-CBC
 * - PAT decryption with proper format validation
 * - Round-trip encryption/decryption integrity
 * - Error handling for invalid inputs
 * - Environment variable requirements
 */

describe('Encryption Helpers', () => {
  const TEST_ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests';
  const SAMPLE_PAT = 'sample-personal-access-token-12345';

  beforeEach(() => {
    // Set up encryption key for each test
    process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  afterEach(() => {
    // Clean up environment after each test
    delete process.env.ENCRYPTION_KEY;
  });

  describe('encryptPAT', () => {
    /**
     * Test: should encrypt PAT successfully
     * 
     * Objective: Verify that a valid PAT is encrypted and returns a non-empty string.
     */
    it('should encrypt PAT successfully', () => {
      // Arrange
      const pat = SAMPLE_PAT;

      // Act
      const result = encryptPAT(pat);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    /**
     * Test: should return string in format "iv:encryptedData"
     * 
     * Objective: Verify that the encrypted output follows the expected format
     * with IV and encrypted data separated by a colon.
     */
    it('should return string in format "iv:encryptedData"', () => {
      // Arrange
      const pat = SAMPLE_PAT;

      // Act
      const result = encryptPAT(pat);
      const parts = result.split(':');

      // Assert
      expect(parts.length).toBe(2);
      expect(parts[0].length).toBe(32); // IV is 16 bytes = 32 hex chars
      expect(parts[1].length).toBeGreaterThan(0); // Encrypted data exists
      // Verify both parts are valid hex strings
      expect(/^[0-9a-f]+$/i.test(parts[0])).toBe(true);
      expect(/^[0-9a-f]+$/i.test(parts[1])).toBe(true);
    });

    /**
     * Test: should throw error when PAT is empty
     * 
     * Objective: Verify that an empty PAT throws an appropriate error.
     */
    it('should throw error when PAT is empty', () => {
      // Arrange
      const emptyPat = '';

      // Act & Assert
      expect(() => encryptPAT(emptyPat)).toThrow('PAT cannot be empty');
    });

    /**
     * Test: should throw error when ENCRYPTION_KEY not set
     * 
     * Objective: Verify that missing ENCRYPTION_KEY environment variable
     * throws an appropriate error.
     */
    it('should throw error when ENCRYPTION_KEY not set', () => {
      // Arrange
      delete process.env.ENCRYPTION_KEY;
      const pat = SAMPLE_PAT;

      // Act & Assert
      expect(() => encryptPAT(pat)).toThrow('ENCRYPTION_KEY environment variable is not set');
    });

    /**
     * Test: should produce different output for same input (due to random IV)
     * 
     * Objective: Verify that encrypting the same PAT twice produces different
     * ciphertext due to the random IV generation.
     */
    it('should produce different output for same input (due to random IV)', () => {
      // Arrange
      const pat = SAMPLE_PAT;

      // Act
      const result1 = encryptPAT(pat);
      const result2 = encryptPAT(pat);

      // Assert
      expect(result1).not.toBe(result2);
      // IVs should be different
      const iv1 = result1.split(':')[0];
      const iv2 = result2.split(':')[0];
      expect(iv1).not.toBe(iv2);
    });

    /**
     * Test: should handle short PAT values
     * 
     * Objective: Verify that short PAT values are encrypted correctly.
     */
    it('should handle short PAT values', () => {
      // Arrange
      const shortPat = 'abc';

      // Act
      const result = encryptPAT(shortPat);

      // Assert
      expect(result).toBeDefined();
      expect(result.split(':').length).toBe(2);
    });
  });

  describe('decryptPAT', () => {
    /**
     * Test: should decrypt PAT successfully
     * 
     * Objective: Verify that a properly encrypted PAT can be decrypted
     * back to its original value.
     */
    it('should decrypt PAT successfully', () => {
      // Arrange
      const originalPat = SAMPLE_PAT;
      const encryptedPat = encryptPAT(originalPat);

      // Act
      const result = decryptPAT(encryptedPat);

      // Assert
      expect(result).toBe(originalPat);
    });

    /**
     * Test: should throw error when encrypted PAT is empty
     * 
     * Objective: Verify that an empty encrypted PAT throws an appropriate error.
     */
    it('should throw error when encrypted PAT is empty', () => {
      // Arrange
      const emptyEncryptedPat = '';

      // Act & Assert
      expect(() => decryptPAT(emptyEncryptedPat)).toThrow('Encrypted PAT cannot be empty');
    });

    /**
     * Test: should throw error when format is invalid (no colon)
     * 
     * Objective: Verify that an encrypted PAT without the expected colon
     * separator throws an appropriate error.
     */
    it('should throw error when format is invalid (no colon)', () => {
      // Arrange
      const invalidFormat = 'invalidencrypteddatawithoutcolon';

      // Act & Assert
      expect(() => decryptPAT(invalidFormat)).toThrow('Invalid encrypted PAT format');
    });

    /**
     * Test: should throw error when format has too many colons
     * 
     * Objective: Verify that an encrypted PAT with multiple colons
     * throws an appropriate error.
     */
    it('should throw error when format has too many colons', () => {
      // Arrange
      const invalidFormat = 'part1:part2:part3';

      // Act & Assert
      expect(() => decryptPAT(invalidFormat)).toThrow('Invalid encrypted PAT format');
    });

    /**
     * Test: should throw error when ENCRYPTION_KEY not set
     * 
     * Objective: Verify that missing ENCRYPTION_KEY environment variable
     * throws an appropriate error during decryption.
     */
    it('should throw error when ENCRYPTION_KEY not set', () => {
      // Arrange
      const encryptedPat = encryptPAT(SAMPLE_PAT);
      delete process.env.ENCRYPTION_KEY;

      // Act & Assert
      expect(() => decryptPAT(encryptedPat)).toThrow('ENCRYPTION_KEY environment variable is not set');
    });

    /**
     * Test: should throw error when encrypted data is corrupted
     * 
     * Objective: Verify that corrupted encrypted data throws an error
     * during decryption.
     */
    it('should throw error when encrypted data is corrupted', () => {
      // Arrange
      const encryptedPat = encryptPAT(SAMPLE_PAT);
      const parts = encryptedPat.split(':');
      // Corrupt the encrypted data by modifying it
      const corruptedData = parts[0] + ':' + 'corrupted' + parts[1].substring(9);

      // Act & Assert
      expect(() => decryptPAT(corruptedData)).toThrow();
    });

    /**
     * Test: should throw error when IV is corrupted
     * 
     * Objective: Verify that a corrupted IV throws an error during decryption.
     */
    it('should throw error when IV is corrupted', () => {
      // Arrange
      const encryptedPat = encryptPAT(SAMPLE_PAT);
      const parts = encryptedPat.split(':');
      // Corrupt the IV by changing some characters
      const corruptedIv = 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz';
      const corruptedData = corruptedIv + ':' + parts[1];

      // Act & Assert
      expect(() => decryptPAT(corruptedData)).toThrow();
    });

    /**
     * Test: should throw error when decrypting with wrong key
     * 
     * Objective: Verify that decryption fails when using a different
     * encryption key than was used for encryption.
     */
    it('should throw error when decrypting with wrong key', () => {
      // Arrange
      const encryptedPat = encryptPAT(SAMPLE_PAT);
      // Change the encryption key
      process.env.ENCRYPTION_KEY = 'different-encryption-key';

      // Act & Assert
      expect(() => decryptPAT(encryptedPat)).toThrow();
    });
  });

  describe('Round-trip tests', () => {
    /**
     * Test: should encrypt and decrypt back to original value
     * 
     * Objective: Verify that the encryption/decryption round-trip
     * preserves the original PAT value.
     */
    it('should encrypt and decrypt back to original value', () => {
      // Arrange
      const originalPat = 'my-secret-personal-access-token';

      // Act
      const encrypted = encryptPAT(originalPat);
      const decrypted = decryptPAT(encrypted);

      // Assert
      expect(decrypted).toBe(originalPat);
    });

    /**
     * Test: should work with special characters
     * 
     * Objective: Verify that PATs containing special characters
     * are correctly encrypted and decrypted.
     */
    it('should work with special characters', () => {
      // Arrange
      const patWithSpecialChars = 'pat!@#$%^&*()_+-=[]{}|;:,.<>?/~`';

      // Act
      const encrypted = encryptPAT(patWithSpecialChars);
      const decrypted = decryptPAT(encrypted);

      // Assert
      expect(decrypted).toBe(patWithSpecialChars);
    });

    /**
     * Test: should work with long PATs
     * 
     * Objective: Verify that very long PAT values are correctly
     * encrypted and decrypted.
     */
    it('should work with long PATs', () => {
      // Arrange
      const longPat = 'a'.repeat(1000);

      // Act
      const encrypted = encryptPAT(longPat);
      const decrypted = decryptPAT(encrypted);

      // Assert
      expect(decrypted).toBe(longPat);
    });

    /**
     * Test: should work with unicode characters
     * 
     * Objective: Verify that PATs containing unicode characters
     * are correctly encrypted and decrypted.
     */
    it('should work with unicode characters', () => {
      // Arrange
      const unicodePat = 'pat-with-émojis-🔐🔑-and-中文-日本語';

      // Act
      const encrypted = encryptPAT(unicodePat);
      const decrypted = decryptPAT(encrypted);

      // Assert
      expect(decrypted).toBe(unicodePat);
    });

    /**
     * Test: should work with different PAT values
     * 
     * Objective: Verify that various different PAT values
     * are all correctly encrypted and decrypted.
     */
    it('should work with different PAT values', () => {
      // Arrange
      const patValues = [
        'simple-pat',
        'PAT_WITH_UNDERSCORES',
        'pat-with-dashes',
        'pat.with.dots',
        'MixedCasePAT123',
        '12345678901234567890',
        'base64-like/+==',
      ];

      // Act & Assert
      patValues.forEach(pat => {
        const encrypted = encryptPAT(pat);
        const decrypted = decryptPAT(encrypted);
        expect(decrypted).toBe(pat);
      });
    });

    /**
     * Test: should work with whitespace in PAT
     * 
     * Objective: Verify that PATs containing whitespace characters
     * are correctly encrypted and decrypted.
     */
    it('should work with whitespace in PAT', () => {
      // Arrange
      const patWithWhitespace = '  pat with spaces  \t\n';

      // Act
      const encrypted = encryptPAT(patWithWhitespace);
      const decrypted = decryptPAT(encrypted);

      // Assert
      expect(decrypted).toBe(patWithWhitespace);
    });

    /**
     * Test: should work with numeric-only PAT
     * 
     * Objective: Verify that PATs containing only numbers
     * are correctly encrypted and decrypted.
     */
    it('should work with numeric-only PAT', () => {
      // Arrange
      const numericPat = '1234567890123456789012345678901234567890';

      // Act
      const encrypted = encryptPAT(numericPat);
      const decrypted = decryptPAT(encrypted);

      // Assert
      expect(decrypted).toBe(numericPat);
    });

    /**
     * Test: should produce consistent decryption across multiple calls
     * 
     * Objective: Verify that decrypting the same encrypted value
     * multiple times produces the same result.
     */
    it('should produce consistent decryption across multiple calls', () => {
      // Arrange
      const originalPat = SAMPLE_PAT;
      const encrypted = encryptPAT(originalPat);

      // Act
      const decrypted1 = decryptPAT(encrypted);
      const decrypted2 = decryptPAT(encrypted);
      const decrypted3 = decryptPAT(encrypted);

      // Assert
      expect(decrypted1).toBe(originalPat);
      expect(decrypted2).toBe(originalPat);
      expect(decrypted3).toBe(originalPat);
    });
  });

  describe('Edge cases', () => {
    /**
     * Test: should handle single character PAT
     * 
     * Objective: Verify that a single character PAT is correctly
     * encrypted and decrypted.
     */
    it('should handle single character PAT', () => {
      // Arrange
      const singleCharPat = 'x';

      // Act
      const encrypted = encryptPAT(singleCharPat);
      const decrypted = decryptPAT(encrypted);

      // Assert
      expect(decrypted).toBe(singleCharPat);
    });

    /**
     * Test: should handle PAT with only special characters
     * 
     * Objective: Verify that a PAT containing only special characters
     * is correctly encrypted and decrypted.
     */
    it('should handle PAT with only special characters', () => {
      // Arrange
      const specialOnlyPat = '!@#$%^&*()';

      // Act
      const encrypted = encryptPAT(specialOnlyPat);
      const decrypted = decryptPAT(encrypted);

      // Assert
      expect(decrypted).toBe(specialOnlyPat);
    });

    /**
     * Test: should handle PAT with newlines
     * 
     * Objective: Verify that a PAT containing newline characters
     * is correctly encrypted and decrypted.
     */
    it('should handle PAT with newlines', () => {
      // Arrange
      const patWithNewlines = 'line1\nline2\r\nline3';

      // Act
      const encrypted = encryptPAT(patWithNewlines);
      const decrypted = decryptPAT(encrypted);

      // Assert
      expect(decrypted).toBe(patWithNewlines);
    });

    /**
     * Test: should work with different encryption keys
     * 
     * Objective: Verify that different encryption keys produce
     * different encrypted outputs for the same PAT.
     */
    it('should work with different encryption keys', () => {
      // Arrange
      const pat = SAMPLE_PAT;
      
      // Encrypt with first key
      process.env.ENCRYPTION_KEY = 'first-encryption-key';
      const encrypted1 = encryptPAT(pat);
      const decrypted1 = decryptPAT(encrypted1);

      // Encrypt with second key
      process.env.ENCRYPTION_KEY = 'second-encryption-key';
      const encrypted2 = encryptPAT(pat);
      const decrypted2 = decryptPAT(encrypted2);

      // Assert
      expect(decrypted1).toBe(pat);
      expect(decrypted2).toBe(pat);
      // Encrypted data should be different (different keys)
      expect(encrypted1.split(':')[1]).not.toBe(encrypted2.split(':')[1]);
    });
  });
});
