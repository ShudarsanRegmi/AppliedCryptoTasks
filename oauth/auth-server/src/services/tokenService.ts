import crypto from 'crypto';
import { config } from '../config';
import { storeToken, findToken, StoredToken } from '../models/token';

// ==========================================
// JWT Implementation
// ==========================================

interface JWTHeader {
  alg: 'HS256';
  typ: 'JWT';
}

interface JWTPayload {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  jti: string;
  scope: string;
}

// Base64URL encode
function base64UrlEncode(input: Buffer | string): string {
  const buffer = typeof input === 'string' ? Buffer.from(input) : input;
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Base64URL decode
function base64UrlDecode(input: string): Buffer {
  let padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = padded.length % 4;
  if (padding) {
    padded += '='.repeat(4 - padding);
  }
  return Buffer.from(padded, 'base64');
}

// HMAC-SHA256
function hmacSha256(data: string, secret: string): Buffer {
  return crypto.createHmac('sha256', secret).update(data).digest();
}

// Create JWT
function createJWT(payload: Omit<JWTPayload, 'iat' | 'jti'>): string {
  const header: JWTHeader = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const fullPayload: JWTPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    jti: crypto.randomUUID()
  };

  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(fullPayload));
  
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;
  const signature = base64UrlEncode(hmacSha256(signatureInput, config.jwtSecret));

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

// Verify JWT
export function verifyJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [headerEncoded, payloadEncoded, signatureEncoded] = parts;

    // Verify signature
    const signatureInput = `${headerEncoded}.${payloadEncoded}`;
    const expectedSignature = base64UrlEncode(hmacSha256(signatureInput, config.jwtSecret));
    
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

// Decode JWT without verification
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    return JSON.parse(base64UrlDecode(parts[1]).toString());
  } catch (error) {
    return null;
  }
}

// ==========================================
// Token Generation
// ==========================================

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  scope: string;
}

export function generateTokenPair(
  userId: string,
  clientId: string,
  scopes: string[]
): TokenPair {
  const accessToken = createJWT({
    iss: config.issuer,
    sub: userId,
    aud: clientId,
    exp: Math.floor(Date.now() / 1000) + config.accessTokenExpiry,
    scope: scopes.join(' ')
  });

  const refreshToken = createJWT({
    iss: config.issuer,
    sub: userId,
    aud: clientId,
    exp: Math.floor(Date.now() / 1000) + config.refreshTokenExpiry,
    scope: scopes.join(' ')
  });

  // Store tokens
  storeToken(
    accessToken,
    clientId,
    userId,
    scopes,
    new Date(Date.now() + config.accessTokenExpiry * 1000),
    'access'
  );

  storeToken(
    refreshToken,
    clientId,
    userId,
    scopes,
    new Date(Date.now() + config.refreshTokenExpiry * 1000),
    'refresh'
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: config.accessTokenExpiry,
    tokenType: 'Bearer',
    scope: scopes.join(' ')
  };
}

export function generateAccessTokenFromRefresh(refreshToken: string): TokenPair | null {
  const storedToken = findToken(refreshToken);
  if (!storedToken || storedToken.type !== 'refresh') {
    return null;
  }

  return generateTokenPair(
    storedToken.userId,
    storedToken.clientId,
    storedToken.scopes
  );
}

// ==========================================
// Token Introspection
// ==========================================

export interface IntrospectionResult {
  active: boolean;
  scope?: string;
  client_id?: string;
  username?: string;
  token_type?: string;
  exp?: number;
  iat?: number;
  sub?: string;
  aud?: string;
  iss?: string;
}

export function introspectToken(token: string): IntrospectionResult {
  const payload = verifyJWT(token);
  
  if (!payload) {
    return { active: false };
  }

  // Also check if token is in our store
  const storedToken = findToken(token);
  if (!storedToken) {
    return { active: false };
  }

  return {
    active: true,
    scope: payload.scope,
    client_id: payload.aud,
    token_type: 'Bearer',
    exp: payload.exp,
    iat: payload.iat,
    sub: payload.sub,
    aud: payload.aud,
    iss: payload.iss
  };
}

// ==========================================
// PKCE Support
// ==========================================

export function sha256(input: string): Buffer {
  return crypto.createHash('sha256').update(input).digest();
}

export function verifyCodeChallenge(
  verifier: string,
  challenge: string,
  method: 'S256' | 'plain' = 'S256'
): boolean {
  if (method === 'plain') {
    return verifier === challenge;
  }
  const computedChallenge = base64UrlEncode(sha256(verifier));
  return computedChallenge === challenge;
}
