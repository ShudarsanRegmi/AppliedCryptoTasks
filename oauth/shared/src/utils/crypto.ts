import crypto from 'crypto';

// ==========================================
// Cryptographic Utilities
// ==========================================

/**
 * Generate a cryptographically secure random string
 */
export function generateRandomString(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Hash a password using PBKDF2
 */
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, useSalt, 100000, 64, 'sha512').toString('hex');
  return { hash: `${useSalt}:${hash}`, salt: useSalt };
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  const { hash: computedHash } = hashPassword(password, salt);
  return storedHash === computedHash;
}

/**
 * Generate SHA256 hash (for PKCE code challenge)
 */
export function sha256(input: string): Buffer {
  return crypto.createHash('sha256').update(input).digest();
}

/**
 * Base64URL encode (RFC 4648)
 */
export function base64UrlEncode(input: Buffer | string): string {
  const buffer = typeof input === 'string' ? Buffer.from(input) : input;
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64URL decode (RFC 4648)
 */
export function base64UrlDecode(input: string): Buffer {
  // Add padding if needed
  let padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = padded.length % 4;
  if (padding) {
    padded += '='.repeat(4 - padding);
  }
  return Buffer.from(padded, 'base64');
}

/**
 * Generate PKCE code verifier
 */
export function generateCodeVerifier(): string {
  return base64UrlEncode(crypto.randomBytes(32));
}

/**
 * Generate PKCE code challenge from verifier
 */
export function generateCodeChallenge(verifier: string): string {
  return base64UrlEncode(sha256(verifier));
}

/**
 * Verify PKCE code challenge
 */
export function verifyCodeChallenge(
  verifier: string, 
  challenge: string, 
  method: 'S256' | 'plain' = 'S256'
): boolean {
  if (method === 'plain') {
    return verifier === challenge;
  }
  return generateCodeChallenge(verifier) === challenge;
}

/**
 * HMAC-SHA256 signing
 */
export function hmacSha256(data: string, secret: string): Buffer {
  return crypto.createHmac('sha256', secret).update(data).digest();
}
