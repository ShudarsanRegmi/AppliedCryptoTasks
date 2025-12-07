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

// In-memory store for OAuth state (for popup flow where session might not persist)
// In production, use Redis or similar
const pendingOAuthFlows: Map<string, { codeVerifier: string; createdAt: number; isPopup: boolean }> = new Map();

// Clean up old entries periodically (entries older than 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of pendingOAuthFlows.entries()) {
    if (now - data.createdAt > 10 * 60 * 1000) {
      pendingOAuthFlows.delete(state);
    }
  }
}, 60 * 1000);

// Extend session type
declare module 'express-session' {
  interface SessionData {
    state?: string;
    codeVerifier?: string;
    tokens?: TokenData;
    user?: any;
    isPopup?: boolean;
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
  
  // Also store in memory map as backup
  pendingOAuthFlows.set(state, { codeVerifier, createdAt: Date.now(), isPopup: false });
  
  // Build and redirect to authorization URL
  const authUrl = buildAuthorizationUrl(state, codeChallenge);
  res.redirect(authUrl);
});

// ==========================================
// Start OAuth Flow (Popup version)
// ==========================================
router.get('/connect-popup', (req: Request, res: Response) => {
  // Generate state and PKCE parameters
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  
  // Store in memory map (session might not work in popup)
  pendingOAuthFlows.set(state, { codeVerifier, createdAt: Date.now(), isPopup: true });
  
  console.log('[OAuth Popup] /connect-popup -> state:', state, 'stored in memory map');
  
  // Build authorization URL
  const authUrl = buildAuthorizationUrl(state, codeChallenge);
  
  // Redirect immediately (don't rely on session)
  res.redirect(authUrl);
});

// ==========================================
// OAuth Callback - Handle Authorization Response
// ==========================================
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query;
  const stateStr = state as string;
  
  // Check memory map first (works for popup flow)
  const pendingFlow = pendingOAuthFlows.get(stateStr);
  const isPopup = pendingFlow?.isPopup || req.session.isPopup;
  const codeVerifier = pendingFlow?.codeVerifier || req.session.codeVerifier;
  const storedState = pendingFlow ? stateStr : req.session.state; // If in map, state is valid
  
  console.log('[OAuth] /callback -> state:', stateStr, 'foundInMap:', !!pendingFlow, 'isPopup:', isPopup);
  
  // Handle errors from auth server
  if (error) {
    if (isPopup) {
      res.render('popup-callback', {
        success: false,
        error: error as string,
        error_description: error_description as string || 'Authorization failed'
      });
    } else {
      res.render('error', {
        error: error as string,
        error_description: error_description as string || 'Authorization failed'
      });
    }
    return;
  }
  
  // Verify state parameter - check both memory map and session
  if (!pendingFlow && stateStr !== req.session.state) {
    if (isPopup) {
      res.render('popup-callback', {
        success: false,
        error: 'invalid_state',
        error_description: 'State parameter mismatch. Possible CSRF attack.'
      });
    } else {
      res.render('error', {
        error: 'invalid_state',
        error_description: 'State parameter mismatch. Possible CSRF attack.'
      });
    }
    return;
  }
  
  // Remove from pending flows (one-time use)
  if (pendingFlow) {
    pendingOAuthFlows.delete(stateStr);
  }
  
  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(
      code as string,
      codeVerifier
    );
    
    // Store tokens in session
    req.session.tokens = tokens;
    
    // Clear OAuth flow data from session
    delete req.session.state;
    delete req.session.codeVerifier;
    delete req.session.isPopup;
    
    // Try to fetch user info
    try {
      const userInfo = await fetchUserInfo(tokens.accessToken);
      req.session.user = userInfo;
    } catch (e) {
      // User info is optional
    }
    
    // Handle popup vs redirect flow
    if (isPopup) {
      // Save session before rendering popup callback
      req.session.save((err) => {
        if (err) console.error('Session save error:', err);
        res.render('popup-callback', {
          success: true,
          error: null,
          error_description: null
        });
      });
    } else {
      // Redirect to dashboard
      res.redirect('/dashboard');
    }
  } catch (err) {
    console.error('Token exchange error:', err);
    if (isPopup) {
      res.render('popup-callback', {
        success: false,
        error: 'token_error',
        error_description: err instanceof Error ? err.message : 'Failed to obtain tokens'
      });
    } else {
      res.render('error', {
        error: 'token_error',
        error_description: err instanceof Error ? err.message : 'Failed to obtain tokens'
      });
    }
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
