import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encryptToken, decryptToken } from '../../src/utils/encryption.js';

// Mock env module to avoid requiring .env file in tests
vi.mock('../../src/config/env.js', () => ({
  env: {
    ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  },
}));

describe('AES-256-GCM Encryption Utility', () => {
  const testToken = 'EAABcXWpXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

  it('should encrypt a token without throwing', () => {
    const result = encryptToken(testToken);
    expect(result).toBeDefined();
    expect(result).toContain(':');
    // Format: iv:authTag:encrypted — must have exactly 2 colons
    expect(result.split(':').length).toBe(3);
  });

  it('should return different ciphertext each call (random IV)', () => {
    const ct1 = encryptToken(testToken);
    const ct2 = encryptToken(testToken);
    expect(ct1).not.toBe(ct2);
  });

  it('should correctly decrypt back to original plaintext', () => {
    const encrypted = encryptToken(testToken);
    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(testToken);
  });

  it('should throw on tampered ciphertext', () => {
    const encrypted = encryptToken(testToken);
    const parts = encrypted.split(':');
    // Tamper the encrypted payload
    parts[2] = parts[2].split('').reverse().join('');
    const tampered = parts.join(':');
    expect(() => decryptToken(tampered)).toThrow();
  });

  it('should throw on invalid cipher format', () => {
    expect(() => decryptToken('not-valid')).toThrow('Invalid cipher format');
  });
});
