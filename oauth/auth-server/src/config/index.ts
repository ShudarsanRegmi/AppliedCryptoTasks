export const config = {
  port: process.env.PORT || 4000,
  host: process.env.HOST || 'localhost',
  
  // JWT settings
  jwtSecret: process.env.JWT_SECRET || 'auth-server-super-secret-key-change-in-production',
  accessTokenExpiry: 3600,        // 1 hour in seconds
  refreshTokenExpiry: 30 * 24 * 3600,  // 30 days in seconds
  authCodeExpiry: 600,            // 10 minutes in seconds
  
  // Session settings
  sessionSecret: process.env.SESSION_SECRET || 'session-secret-key-change-in-production',
  
  // Server URLs
  issuer: process.env.ISSUER || 'http://localhost:4000',
  
  // CORS
  allowedOrigins: [
    'http://localhost:4000',
    'http://localhost:4001',
    'http://localhost:4002'
  ]
};
