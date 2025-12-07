import { Router, Request, Response } from 'express';
import { config } from '../config';
import {
  generateState,
  generateCodeVerifier,
  generateCodeChallenge,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  fetchNotes,
  fetchUserInfo,
  TokenData
} from '../services/oauthService';
import { analyzeNotes } from '../services/analyticsService';

const router = Router();

// Extend session type
declare module 'express-session' {
  interface SessionData {
    state?: string;
    codeVerifier?: string;
    tokens?: TokenData;
    user?: any;
  }
}

// ==========================================
// Home Page
// ==========================================
router.get('/', (req: Request, res: Response) => {
  const session = req.session;
  res.render('home', {
    isLoggedIn: !!session.tokens,
    user: session.user || null
  });
});

// ==========================================
// Start OAuth Flow - Connect to Notes Service
// ==========================================
router.get('/connect', (req: Request, res: Response) => {
  // Generate state and PKCE parameters
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  
  // Store in session for verification later
  req.session.state = state;
  req.session.codeVerifier = codeVerifier;
  
  // Build and redirect to authorization URL
  const authUrl = buildAuthorizationUrl(state, codeChallenge);
  res.redirect(authUrl);
});

// ==========================================
// OAuth Callback - Handle Authorization Response
// ==========================================
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query;
  
  // Handle errors from auth server
  if (error) {
    res.render('error', {
      error: error as string,
      error_description: error_description as string || 'Authorization failed'
    });
    return;
  }
  
  // Verify state parameter
  if (state !== req.session.state) {
    res.render('error', {
      error: 'invalid_state',
      error_description: 'State parameter mismatch. Possible CSRF attack.'
    });
    return;
  }
  
  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(
      code as string,
      req.session.codeVerifier
    );
    
    // Store tokens in session
    req.session.tokens = tokens;
    
    // Clear OAuth flow data
    delete req.session.state;
    delete req.session.codeVerifier;
    
    // Try to fetch user info
    try {
      const userInfo = await fetchUserInfo(tokens.accessToken);
      req.session.user = userInfo;
    } catch (e) {
      // User info is optional
    }
    
    // Redirect to dashboard
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Token exchange error:', err);
    res.render('error', {
      error: 'token_error',
      error_description: err instanceof Error ? err.message : 'Failed to obtain tokens'
    });
  }
});

// ==========================================
// Dashboard - Show Analytics
// ==========================================
router.get('/dashboard', async (req: Request, res: Response) => {
  const tokens = req.session.tokens;
  
  if (!tokens) {
    res.redirect('/');
    return;
  }
  
  try {
    // Check if token needs refresh
    if (new Date() >= new Date(tokens.expiresAt)) {
      console.log('Token expired, refreshing...');
      const newTokens = await refreshAccessToken(tokens.refreshToken);
      req.session.tokens = newTokens;
    }
    
    // Fetch notes from resource server
    const notesData = await fetchNotes(req.session.tokens!.accessToken);
    
    // Analyze notes
    const analytics = analyzeNotes(notesData.notes);
    
    res.render('dashboard', {
      user: req.session.user,
      notes: notesData.notes,
      analytics,
      tokenInfo: {
        scope: req.session.tokens!.scope,
        expiresAt: req.session.tokens!.expiresAt
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    
    // If token expired, try to refresh
    if (err instanceof Error && err.message === 'TOKEN_EXPIRED') {
      try {
        const newTokens = await refreshAccessToken(tokens.refreshToken);
        req.session.tokens = newTokens;
        res.redirect('/dashboard');
        return;
      } catch (refreshErr) {
        // Refresh failed, need to re-authenticate
        delete req.session.tokens;
        res.redirect('/');
        return;
      }
    }
    
    res.render('error', {
      error: 'api_error',
      error_description: err instanceof Error ? err.message : 'Failed to fetch data'
    });
  }
});

// ==========================================
// Disconnect - Clear tokens
// ==========================================
router.get('/disconnect', (req: Request, res: Response) => {
  delete req.session.tokens;
  delete req.session.user;
  res.redirect('/');
});

// ==========================================
// Health Check
// ==========================================
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'client-app' });
});

export default router;
