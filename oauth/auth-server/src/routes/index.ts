import { Router } from 'express';
import {
  authorizeGet,
  authorizeLogin,
  authorizeConsent,
  tokenEndpoint,
  introspectEndpoint,
  userinfoEndpoint,
  logoutEndpoint
} from '../controllers/authController';
import { validateAccessToken } from '../middleware/auth';

const router = Router();

// Authorization endpoint
router.get('/authorize', authorizeGet);
router.post('/authorize/login', authorizeLogin);
router.post('/authorize/consent', authorizeConsent);

// Token endpoint
router.post('/token', tokenEndpoint);

// Token introspection
router.post('/introspect', introspectEndpoint);

// User info (protected)
router.get('/userinfo', validateAccessToken, userinfoEndpoint);

// Logout
router.post('/logout', logoutEndpoint);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-server' });
});

// OpenID Connect Discovery (simplified)
router.get('/.well-known/openid-configuration', (req, res) => {
  const baseUrl = `http://${req.headers.host}`;
  res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/authorize`,
    token_endpoint: `${baseUrl}/token`,
    userinfo_endpoint: `${baseUrl}/userinfo`,
    introspection_endpoint: `${baseUrl}/introspect`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['client_secret_post'],
    scopes_supported: ['notes:read', 'notes:write', 'profile:read']
  });
});

export default router;
