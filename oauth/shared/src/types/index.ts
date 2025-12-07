// ==========================================
// OAuth 2.0 Type Definitions
// ==========================================

// User types
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface UserCreateInput {
  username: string;
  email: string;
  password: string;
}

// Client Application types (third-party apps)
export interface OAuthClient {
  clientId: string;
  clientSecret: string;
  clientName: string;
  redirectUris: string[];
  grants: GrantType[];
  scopes: string[];
  createdAt: Date;
}

export interface ClientCreateInput {
  clientName: string;
  redirectUris: string[];
  grants?: GrantType[];
  scopes?: string[];
}

// Grant types
export type GrantType = 'authorization_code' | 'refresh_token' | 'client_credentials';

// Authorization Code
export interface AuthorizationCode {
  code: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  scopes: string[];
  expiresAt: Date;
  codeChallenge?: string;        // PKCE
  codeChallengeMethod?: 'S256' | 'plain';  // PKCE
}

// Tokens
export interface AccessToken {
  token: string;
  clientId: string;
  userId: string;
  scopes: string[];
  expiresAt: Date;
}

export interface RefreshToken {
  token: string;
  clientId: string;
  userId: string;
  scopes: string[];
  expiresAt: Date;
}

// JWT Payload
export interface JWTPayload {
  iss: string;      // Issuer
  sub: string;      // Subject (user ID)
  aud: string;      // Audience (client ID)
  exp: number;      // Expiration time
  iat: number;      // Issued at
  jti: string;      // JWT ID
  scope: string;    // Scopes (space-separated)
}

export interface JWTHeader {
  alg: 'HS256' | 'RS256';
  typ: 'JWT';
}

// OAuth Request/Response types
export interface AuthorizeRequest {
  response_type: 'code';
  client_id: string;
  redirect_uri: string;
  scope?: string;
  state?: string;
  code_challenge?: string;        // PKCE
  code_challenge_method?: 'S256' | 'plain';  // PKCE
}

export interface TokenRequest {
  grant_type: GrantType;
  code?: string;                  // For authorization_code
  redirect_uri?: string;          // For authorization_code
  client_id: string;
  client_secret?: string;
  refresh_token?: string;         // For refresh_token grant
  code_verifier?: string;         // PKCE
}

export interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export interface TokenErrorResponse {
  error: OAuthError;
  error_description?: string;
}

export type OAuthError = 
  | 'invalid_request'
  | 'invalid_client'
  | 'invalid_grant'
  | 'unauthorized_client'
  | 'unsupported_grant_type'
  | 'invalid_scope'
  | 'access_denied'
  | 'server_error';

// Token Introspection
export interface IntrospectionRequest {
  token: string;
  token_type_hint?: 'access_token' | 'refresh_token';
}

export interface IntrospectionResponse {
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

// Notes (Resource Server data)
export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteCreateInput {
  title: string;
  content: string;
}

export interface NoteUpdateInput {
  title?: string;
  content?: string;
}

// Scopes for the Notes service
export const SCOPES = {
  NOTES_READ: 'notes:read',
  NOTES_WRITE: 'notes:write',
  PROFILE_READ: 'profile:read',
} as const;

export type Scope = typeof SCOPES[keyof typeof SCOPES];

// Analytics types (for client app)
export interface NotesAnalytics {
  totalNotes: number;
  totalWords: number;
  averageWordsPerNote: number;
  longestNote: {
    id: string;
    title: string;
    wordCount: number;
  } | null;
  shortestNote: {
    id: string;
    title: string;
    wordCount: number;
  } | null;
}
