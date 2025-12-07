import { JWTHeader, JWTPayload } from '../types';
import { base64UrlEncode, base64UrlDecode, hmacSha256, generateUUID } from './crypto';

// ==========================================
// JWT (JSON Web Token) Implementation
// ==========================================

const DEFAULT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';

/**
 * Create a JWT token
 */
export function createJWT(
  payload: Omit<JWTPayload, 'iat' | 'jti'>,
  secret: string = DEFAULT_SECRET
): string {
  const header: JWTHeader = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const fullPayload: JWTPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    jti: generateUUID()
  };

  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(fullPayload));
  
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;
  const signature = base64UrlEncode(hmacSha256(signatureInput, secret));

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

/**
 * Verify and decode a JWT token
 */
export function verifyJWT(token: string, secret: string = DEFAULT_SECRET): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [headerEncoded, payloadEncoded, signatureEncoded] = parts;

    // Verify signature
    const signatureInput = `${headerEncoded}.${payloadEncoded}`;
    const expectedSignature = base64UrlEncode(hmacSha256(signatureInput, secret));
    
    if (signatureEncoded !== expectedSignature) {
      return null;
    }

    // Decode payload
    const payload: JWTPayload = JSON.parse(base64UrlDecode(payloadEncoded).toString());

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Decode a JWT without verification (useful for debugging)
 */
export function decodeJWT(token: string): { header: JWTHeader; payload: JWTPayload } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const header: JWTHeader = JSON.parse(base64UrlDecode(parts[0]).toString());
    const payload: JWTPayload = JSON.parse(base64UrlDecode(parts[1]).toString());

    return { header, payload };
  } catch (error) {
    return null;
  }
}

/**
 * Create an access token JWT
 */
export function createAccessToken(
  userId: string,
  clientId: string,
  scopes: string[],
  expiresInSeconds: number = 3600,  // 1 hour default
  issuer: string = 'http://localhost:4000',
  secret: string = DEFAULT_SECRET
): string {
  return createJWT({
    iss: issuer,
    sub: userId,
    aud: clientId,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    scope: scopes.join(' ')
  }, secret);
}

/**
 * Create a refresh token (longer expiry)
 */
export function createRefreshToken(
  userId: string,
  clientId: string,
  scopes: string[],
  expiresInSeconds: number = 30 * 24 * 3600,  // 30 days default
  issuer: string = 'http://localhost:4000',
  secret: string = DEFAULT_SECRET
): string {
  return createJWT({
    iss: issuer,
    sub: userId,
    aud: clientId,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    scope: scopes.join(' ')
  }, secret);
}
