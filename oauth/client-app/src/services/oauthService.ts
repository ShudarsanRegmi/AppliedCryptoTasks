import fetch from 'node-fetch';
import crypto from 'crypto';
import { config } from '../config';

// ==========================================
// OAuth Service - Handles OAuth flow
// ==========================================

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}

// Generate random state parameter
export function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Generate PKCE code verifier
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

// Generate PKCE code challenge from verifier
export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// Build authorization URL
export function buildAuthorizationUrl(state: string, codeChallenge?: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.callbackUrl,
    scope: config.scopes.join(' '),
    state
  });

  if (codeChallenge) {
    params.append('code_challenge', codeChallenge);
    params.append('code_challenge_method', 'S256');
  }

  return `${config.authServerUrl}/authorize?${params.toString()}`;
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(
  code: string, 
  codeVerifier?: string
): Promise<TokenData> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.callbackUrl,
    client_id: config.clientId,
    client_secret: config.clientSecret
  });

  if (codeVerifier) {
    params.append('code_verifier', codeVerifier);
  }

  const response = await fetch(`${config.authServerUrl}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const error = await response.json() as { error: string; error_description?: string };
    throw new Error(error.error_description || error.error || 'Failed to exchange code for tokens');
  }

  const data = await response.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    scope: data.scope
  };
}

// Refresh access token
export async function refreshAccessToken(refreshToken: string): Promise<TokenData> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret
  });

  const response = await fetch(`${config.authServerUrl}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const error = await response.json() as { error: string; error_description?: string };
    throw new Error(error.error_description || error.error || 'Failed to refresh token');
  }

  const data = await response.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    scope: data.scope
  };
}

// Fetch user's notes from resource server
export async function fetchNotes(accessToken: string): Promise<any> {
  const response = await fetch(`${config.resourceServerUrl}/api/notes`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('TOKEN_EXPIRED');
    }
    throw new Error('Failed to fetch notes');
  }

  return response.json();
}

// Fetch user info from auth server
export async function fetchUserInfo(accessToken: string): Promise<any> {
  const response = await fetch(`${config.authServerUrl}/userinfo`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }

  return response.json();
}
