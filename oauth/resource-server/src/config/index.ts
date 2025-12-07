export const config = {
  port: process.env.PORT || 4001,
  host: process.env.HOST || 'localhost',
  
  // Auth server URL for token introspection
  authServerUrl: process.env.AUTH_SERVER_URL || 'http://localhost:4000',
  
  // CORS
  allowedOrigins: [
    'http://localhost:4000',
    'http://localhost:4001',
    'http://localhost:4002'
  ]
};
