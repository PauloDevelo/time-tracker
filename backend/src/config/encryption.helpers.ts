import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Get encryption key from environment variable
 * @returns Encryption key buffer
 * @throws Error if ENCRYPTION_KEY is not set
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  // Ensure key is 32 bytes for AES-256
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt a Personal Access Token (PAT) using AES-256-CBC
 * @param pat - Plain text PAT to encrypt
 * @returns Encrypted PAT in format: iv:encryptedData (hex encoded)
 */
export function encryptPAT(pat: string): string {
  if (!pat) {
    throw new Error('PAT cannot be empty');
  }
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(pat, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return IV and encrypted data separated by colon
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an encrypted Personal Access Token (PAT)
 * @param encryptedPAT - Encrypted PAT in format: iv:encryptedData (hex encoded)
 * @returns Decrypted plain text PAT
 */
export function decryptPAT(encryptedPAT: string): string {
  if (!encryptedPAT) {
    throw new Error('Encrypted PAT cannot be empty');
  }
  
  const parts = encryptedPAT.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted PAT format');
  }
  
  const key = getEncryptionKey();
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedData = parts[1];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
