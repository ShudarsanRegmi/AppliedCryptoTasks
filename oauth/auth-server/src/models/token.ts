import crypto from 'crypto';

// ==========================================
// Token Model - In-Memory Storage
// ==========================================

export interface AuthorizationCode {
  code: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  scopes: string[];
  expiresAt: Date;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
}

export interface StoredToken {
  token: string;
  clientId: string;
  userId: string;
  scopes: string[];
  expiresAt: Date;
  type: 'access' | 'refresh';
}

// In-memory storage
const authCodes: Map<string, AuthorizationCode> = new Map();
const tokens: Map<string, StoredToken> = new Map();

// ==========================================
// Authorization Code Functions
// ==========================================

export function generateAuthorizationCode(
  clientId: string,
  userId: string,
  redirectUri: string,
  scopes: string[],
  expirySeconds: number = 600,
  codeChallenge?: string,
  codeChallengeMethod?: 'S256' | 'plain'
): string {
  const code = crypto.randomBytes(32).toString('hex');
  
  const authCode: AuthorizationCode = {
    code,
    clientId,
    userId,
    redirectUri,
    scopes,
    expiresAt: new Date(Date.now() + expirySeconds * 1000),
    codeChallenge,
    codeChallengeMethod
  };
  
  authCodes.set(code, authCode);
  return code;
}

export function findAuthorizationCode(code: string): AuthorizationCode | undefined {
  return authCodes.get(code);
}

export function consumeAuthorizationCode(code: string): AuthorizationCode | null {
  const authCode = authCodes.get(code);
  if (!authCode) {
    return null;
  }
  
  // Check if expired
  if (authCode.expiresAt < new Date()) {
    authCodes.delete(code);
    return null;
  }
  
  // Delete after use (one-time use)
  authCodes.delete(code);
  return authCode;
}

// ==========================================
// Token Functions
// ==========================================

export function storeToken(
  token: string,
  clientId: string,
  userId: string,
  scopes: string[],
  expiresAt: Date,
  type: 'access' | 'refresh'
): void {
  tokens.set(token, {
    token,
    clientId,
    userId,
    scopes,
    expiresAt,
    type
  });
}

export function findToken(token: string): StoredToken | undefined {
  const storedToken = tokens.get(token);
  if (!storedToken) {
    return undefined;
  }
  
  // Check if expired
  if (storedToken.expiresAt < new Date()) {
    tokens.delete(token);
    return undefined;
  }
  
  return storedToken;
}

export function revokeToken(token: string): boolean {
  return tokens.delete(token);
}

export function revokeAllUserTokens(userId: string, clientId?: string): number {
  let count = 0;
  for (const [token, storedToken] of tokens.entries()) {
    if (storedToken.userId === userId) {
      if (!clientId || storedToken.clientId === clientId) {
        tokens.delete(token);
        count++;
      }
    }
  }
  return count;
}

// Cleanup expired tokens (call periodically)
export function cleanupExpiredTokens(): number {
  const now = new Date();
  let count = 0;
  
  for (const [code, authCode] of authCodes.entries()) {
    if (authCode.expiresAt < now) {
      authCodes.delete(code);
      count++;
    }
  }
  
  for (const [token, storedToken] of tokens.entries()) {
    if (storedToken.expiresAt < now) {
      tokens.delete(token);
      count++;
    }
  }
  
  return count;
}

// Get all tokens for debugging
export function getAllTokens(): StoredToken[] {
  return Array.from(tokens.values());
}

export function getAllAuthCodes(): AuthorizationCode[] {
  return Array.from(authCodes.values());
}
