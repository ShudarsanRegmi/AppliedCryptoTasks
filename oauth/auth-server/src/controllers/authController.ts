import { Request, Response } from 'express';
import { 
  findClientById, 
  validateRedirectUri, 
  validateScopes,
  validateClient 
} from '../models/client';
import { 
  authenticateUser, 
  findUserById,
  createUser,
  usernameExists,
  emailExists
} from '../models/user';
import { 
  generateAuthorizationCode, 
  consumeAuthorizationCode 
} from '../models/token';
import { 
  generateTokenPair, 
  generateAccessTokenFromRefresh,
  introspectToken,
  verifyCodeChallenge
} from '../services/tokenService';

// ==========================================
// Direct Login Page (not OAuth)
// GET /login
// ==========================================
export function loginPage(req: Request, res: Response): void {
  const session = req.session as any;
  const redirect = req.query.redirect as string || null;
  
  if (session.userId) {
    // If already logged in and there's a redirect, issue a token and redirect
    if (redirect) {
      const user = findUserById(session.userId);
      if (user) {
        const { accessToken } = generateTokenPair(
          user.id, 
          'direct-login', 
          ['notes:read', 'notes:write', 'profile:read']
        );
        const redirectUrl = new URL(redirect);
        redirectUrl.searchParams.set('token', accessToken);
        res.redirect(redirectUrl.toString());
        return;
      }
    }
    res.redirect('/dashboard');
    return;
  }
  
  res.render('login', {
    client: null,
    scopes: [],
    redirect_uri: null,
    state: null,
    code_challenge: null,
    code_challenge_method: null,
    error: null,
    isDirectLogin: true,
    redirect
  });
}

// ==========================================
// Direct Login Handler (not OAuth)
// POST /login
// ==========================================
export function loginHandler(req: Request, res: Response): void {
  const { username, password, redirect } = req.body;
  
  const user = authenticateUser(username, password);
  if (!user) {
    res.render('login', {
      client: null,
      scopes: [],
      redirect_uri: null,
      state: null,
      code_challenge: null,
      code_challenge_method: null,
      error: 'Invalid username or password',
      isDirectLogin: true,
      redirect
    });
    return;
  }
  
  const session = req.session as any;
  session.userId = user.id;
  
  // If redirect is specified, issue a token and redirect back with it
  if (redirect) {
    const { accessToken } = generateTokenPair(
      user.id, 
      'direct-login', 
      ['notes:read', 'notes:write', 'profile:read']
    );
    const redirectUrl = new URL(redirect);
    redirectUrl.searchParams.set('token', accessToken);
    res.redirect(redirectUrl.toString());
    return;
  }
  
  res.redirect('/dashboard');
}

// ==========================================
// Registration Page
// GET /register
// ==========================================
export function registerPage(req: Request, res: Response): void {
  const session = req.session as any;
  if (session.userId) {
    res.redirect('/dashboard');
    return;
  }
  
  res.render('register', {
    error: null,
    success: null,
    redirect: req.query.redirect || null
  });
}

// ==========================================
// Registration Handler
// POST /register
// ==========================================
export function registerHandler(req: Request, res: Response): void {
  const { username, email, password, confirmPassword, redirect } = req.body;
  
  // Validation
  if (!username || !email || !password) {
    res.render('register', {
      error: 'All fields are required',
      success: null,
      redirect
    });
    return;
  }
  
  if (password !== confirmPassword) {
    res.render('register', {
      error: 'Passwords do not match',
      success: null,
      redirect
    });
    return;
  }
  
  if (password.length < 6) {
    res.render('register', {
      error: 'Password must be at least 6 characters',
      success: null,
      redirect
    });
    return;
  }
  
  if (usernameExists(username)) {
    res.render('register', {
      error: 'Username is already taken',
      success: null,
      redirect
    });
    return;
  }
  
  if (emailExists(email)) {
    res.render('register', {
      error: 'Email is already registered',
      success: null,
      redirect
    });
    return;
  }
  
  // Create user
  const user = createUser(username, email, password);
  if (!user) {
    res.render('register', {
      error: 'Failed to create account. Please try again.',
      success: null,
      redirect
    });
    return;
  }
  
  // Auto-login after registration
  const session = req.session as any;
  session.userId = user.id;
  
  res.redirect(redirect || '/dashboard');
}

// ==========================================
// Dashboard Page
// GET /dashboard
// ==========================================
export function dashboardPage(req: Request, res: Response): void {
  const session = req.session as any;
  if (!session.userId) {
    res.redirect('/login');
    return;
  }
  
  const user = findUserById(session.userId);
  if (!user) {
    session.destroy(() => {});
    res.redirect('/login');
    return;
  }
  
  res.render('dashboard', { user });
}

// ==========================================
// Authorization Endpoint
// GET /authorize
// ==========================================
export function authorizeGet(req: Request, res: Response): void {
  const {
    response_type,
    client_id,
    redirect_uri,
    scope,
    state,
    code_challenge,
    code_challenge_method
  } = req.query as Record<string, string>;

  // Validate required parameters
  if (response_type !== 'code') {
    res.status(400).render('error', { 
      error: 'unsupported_response_type',
      error_description: 'Only authorization code grant is supported'
    });
    return;
  }

  if (!client_id) {
    res.status(400).render('error', { 
      error: 'invalid_request',
      error_description: 'client_id is required'
    });
    return;
  }

  // Validate client
  const client = findClientById(client_id);
  if (!client) {
    res.status(400).render('error', { 
      error: 'invalid_client',
      error_description: 'Unknown client'
    });
    return;
  }

  // Validate redirect_uri
  if (!redirect_uri || !validateRedirectUri(client_id, redirect_uri)) {
    res.status(400).render('error', { 
      error: 'invalid_request',
      error_description: 'Invalid redirect_uri'
    });
    return;
  }

  // Parse and validate scopes
  const requestedScopes = scope ? scope.split(' ') : ['notes:read'];
  if (!validateScopes(client_id, requestedScopes)) {
    res.redirect(`${redirect_uri}?error=invalid_scope&state=${state || ''}`);
    return;
  }

  // Check if user is already logged in (session)
  const session = req.session as any;
  if (session.userId) {
    // User is logged in, show consent page
    const user = findUserById(session.userId);
    res.render('consent', {
      client,
      user,
      scopes: requestedScopes,
      redirect_uri,
      state,
      code_challenge,
      code_challenge_method
    });
    return;
  }

  // User is not logged in, show login page
  res.render('login', {
    client,
    scopes: requestedScopes,
    redirect_uri,
    state,
    code_challenge,
    code_challenge_method,
    error: null
  });
}

// ==========================================
// Login Handler
// POST /authorize/login
// ==========================================
export function authorizeLogin(req: Request, res: Response): void {
  const { 
    username, 
    password,
    client_id,
    redirect_uri,
    scope,
    state,
    code_challenge,
    code_challenge_method
  } = req.body;

  const client = findClientById(client_id);
  if (!client) {
    res.status(400).render('error', { 
      error: 'invalid_client',
      error_description: 'Unknown client'
    });
    return;
  }

  const requestedScopes = scope ? scope.split(' ') : ['notes:read'];

  // Authenticate user
  const user = authenticateUser(username, password);
  if (!user) {
    res.render('login', {
      client,
      scopes: requestedScopes,
      redirect_uri,
      state,
      code_challenge,
      code_challenge_method,
      error: 'Invalid username or password'
    });
    return;
  }

  // Store user in session
  const session = req.session as any;
  session.userId = user.id;

  // Show consent page
  res.render('consent', {
    client,
    user,
    scopes: requestedScopes,
    redirect_uri,
    state,
    code_challenge,
    code_challenge_method
  });
}

// ==========================================
// Consent Handler
// POST /authorize/consent
// ==========================================
export function authorizeConsent(req: Request, res: Response): void {
  const {
    client_id,
    redirect_uri,
    scope,
    state,
    code_challenge,
    code_challenge_method,
    consent  // 'allow' or 'deny'
  } = req.body;

  const session = req.session as any;
  if (!session.userId) {
    res.status(401).render('error', {
      error: 'unauthorized',
      error_description: 'User not authenticated'
    });
    return;
  }

  // User denied access
  if (consent !== 'allow') {
    const params = new URLSearchParams({
      error: 'access_denied',
      error_description: 'User denied the request'
    });
    if (state) params.append('state', state);
    res.redirect(`${redirect_uri}?${params.toString()}`);
    return;
  }

  // User allowed access - generate authorization code
  const scopes = scope ? scope.split(' ') : ['notes:read'];
  const code = generateAuthorizationCode(
    client_id,
    session.userId,
    redirect_uri,
    scopes,
    600,  // 10 minutes expiry
    code_challenge,
    code_challenge_method as 'S256' | 'plain' | undefined
  );

  // Redirect back to client with authorization code
  const params = new URLSearchParams({ code });
  if (state) params.append('state', state);
  res.redirect(`${redirect_uri}?${params.toString()}`);
}

// ==========================================
// Token Endpoint
// POST /token
// ==========================================
export function tokenEndpoint(req: Request, res: Response): void {
  const {
    grant_type,
    code,
    redirect_uri,
    client_id,
    client_secret,
    refresh_token,
    code_verifier
  } = req.body;

  // Handle authorization_code grant
  if (grant_type === 'authorization_code') {
    handleAuthorizationCodeGrant(req, res, {
      code,
      redirect_uri,
      client_id,
      client_secret,
      code_verifier
    });
    return;
  }

  // Handle refresh_token grant
  if (grant_type === 'refresh_token') {
    handleRefreshTokenGrant(req, res, {
      refresh_token,
      client_id,
      client_secret
    });
    return;
  }

  res.status(400).json({
    error: 'unsupported_grant_type',
    error_description: 'Only authorization_code and refresh_token grants are supported'
  });
}

function handleAuthorizationCodeGrant(
  req: Request, 
  res: Response,
  params: {
    code: string;
    redirect_uri: string;
    client_id: string;
    client_secret?: string;
    code_verifier?: string;
  }
): void {
  const { code, redirect_uri, client_id, client_secret, code_verifier } = params;

  // Validate client
  if (client_secret) {
    const client = validateClient(client_id, client_secret);
    if (!client) {
      res.status(401).json({
        error: 'invalid_client',
        error_description: 'Invalid client credentials'
      });
      return;
    }
  }

  // Consume authorization code (one-time use)
  const authCode = consumeAuthorizationCode(code);
  if (!authCode) {
    res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Invalid or expired authorization code'
    });
    return;
  }

  // Validate code belongs to this client
  if (authCode.clientId !== client_id) {
    res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Authorization code was not issued to this client'
    });
    return;
  }

  // Validate redirect_uri matches
  if (authCode.redirectUri !== redirect_uri) {
    res.status(400).json({
      error: 'invalid_grant',
      error_description: 'redirect_uri does not match'
    });
    return;
  }

  // Verify PKCE if code challenge was used
  if (authCode.codeChallenge) {
    if (!code_verifier) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'code_verifier is required'
      });
      return;
    }

    const isValid = verifyCodeChallenge(
      code_verifier,
      authCode.codeChallenge,
      authCode.codeChallengeMethod || 'S256'
    );

    if (!isValid) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'code_verifier is invalid'
      });
      return;
    }
  }

  // Generate tokens
  const tokens = generateTokenPair(
    authCode.userId,
    authCode.clientId,
    authCode.scopes
  );

  res.json({
    access_token: tokens.accessToken,
    token_type: tokens.tokenType,
    expires_in: tokens.expiresIn,
    refresh_token: tokens.refreshToken,
    scope: tokens.scope
  });
}

function handleRefreshTokenGrant(
  req: Request,
  res: Response,
  params: {
    refresh_token: string;
    client_id: string;
    client_secret?: string;
  }
): void {
  const { refresh_token, client_id, client_secret } = params;

  // Validate client if secret provided
  if (client_secret) {
    const client = validateClient(client_id, client_secret);
    if (!client) {
      res.status(401).json({
        error: 'invalid_client',
        error_description: 'Invalid client credentials'
      });
      return;
    }
  }

  // Generate new tokens from refresh token
  const tokens = generateAccessTokenFromRefresh(refresh_token);
  if (!tokens) {
    res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Invalid or expired refresh token'
    });
    return;
  }

  res.json({
    access_token: tokens.accessToken,
    token_type: tokens.tokenType,
    expires_in: tokens.expiresIn,
    refresh_token: tokens.refreshToken,
    scope: tokens.scope
  });
}

// ==========================================
// Token Introspection Endpoint
// POST /introspect
// ==========================================
export function introspectEndpoint(req: Request, res: Response): void {
  const { token } = req.body;

  if (!token) {
    res.status(400).json({
      error: 'invalid_request',
      error_description: 'token is required'
    });
    return;
  }

  const result = introspectToken(token);
  res.json(result);
}

// ==========================================
// User Info Endpoint
// GET /userinfo
// ==========================================
export function userinfoEndpoint(req: Request, res: Response): void {
  // Token should be validated by middleware
  const userId = (req as any).userId;
  
  if (!userId) {
    res.status(401).json({
      error: 'unauthorized',
      error_description: 'Invalid access token'
    });
    return;
  }

  const user = findUserById(userId);
  if (!user) {
    res.status(404).json({
      error: 'not_found',
      error_description: 'User not found'
    });
    return;
  }

  res.json({
    sub: user.id,
    username: user.username,
    email: user.email
  });
}

// ==========================================
// Logout Endpoint
// GET/POST /logout
// ==========================================
export function logoutEndpoint(req: Request, res: Response): void {
  const session = req.session as any;
  session.destroy((err: any) => {
    if (err) {
      if (req.method === 'GET') {
        res.redirect('/login');
      } else {
        res.status(500).json({ error: 'Failed to logout' });
      }
      return;
    }
    
    if (req.method === 'GET') {
      res.redirect('/login');
    } else {
      res.json({ message: 'Logged out successfully' });
    }
  });
}
