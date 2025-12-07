export const config = {
  port: process.env.PORT || 4002,
  host: process.env.HOST || 'localhost',
  
  // OAuth settings
  clientId: process.env.CLIENT_ID || 'analytics-app',
  clientSecret: process.env.CLIENT_SECRET || 'analytics-app-secret',
  
  // Server URLs
  authServerUrl: process.env.AUTH_SERVER_URL || 'http://localhost:4000',
  resourceServerUrl: process.env.RESOURCE_SERVER_URL || 'http://localhost:4001',
  callbackUrl: process.env.CALLBACK_URL || 'http://localhost:4002/callback',
  
  // Session settings
  sessionSecret: process.env.SESSION_SECRET || 'client-app-session-secret-change-in-production',
  
  // Scopes to request
  scopes: ['notes:read', 'profile:read'],
  
  // CORS
  allowedOrigins: [
    'http://localhost:4000',
    'http://localhost:4001',
    'http://localhost:4002'
  ]
};
