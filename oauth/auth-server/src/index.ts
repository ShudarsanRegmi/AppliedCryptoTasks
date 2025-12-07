import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import path from 'path';
import { config } from './config';
import routes from './routes';

const app = express();

// Middleware
app.use(cors({
  origin: config.allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', routes);

// Home page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>OAuth 2.0 Authorization Server</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 800px; 
          margin: 50px auto; 
          padding: 20px;
          background: #f5f5f5;
        }
        h1 { color: #333; }
        .card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          margin: 20px 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        code { 
          background: #f0f0f0; 
          padding: 2px 8px; 
          border-radius: 4px;
          font-size: 14px;
        }
        .endpoint {
          margin: 12px 0;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #667eea;
        }
        .method {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          margin-right: 8px;
        }
        .get { background: #22c55e; color: white; }
        .post { background: #3b82f6; color: white; }
      </style>
    </head>
    <body>
      <h1>🔐 OAuth 2.0 Authorization Server</h1>
      <p>Running on port ${config.port}</p>
      
      <div class="card">
        <h2>📋 Endpoints</h2>
        
        <div class="endpoint">
          <span class="method get">GET</span>
          <code>/authorize</code> - Authorization endpoint
        </div>
        
        <div class="endpoint">
          <span class="method post">POST</span>
          <code>/token</code> - Token endpoint
        </div>
        
        <div class="endpoint">
          <span class="method post">POST</span>
          <code>/introspect</code> - Token introspection
        </div>
        
        <div class="endpoint">
          <span class="method get">GET</span>
          <code>/userinfo</code> - User info (protected)
        </div>
        
        <div class="endpoint">
          <span class="method get">GET</span>
          <code>/.well-known/openid-configuration</code> - Discovery
        </div>
      </div>
      
      <div class="card">
        <h2>🧪 Test Credentials</h2>
        <p><strong>User:</strong> <code>testuser</code> / <code>password123</code></p>
        <p><strong>Client:</strong> <code>analytics-app</code> / <code>analytics-app-secret</code></p>
      </div>
    </body>
    </html>
  `);
});

// Start server
app.listen(config.port, () => {
  console.log('');
  console.log('🔐 ================================');
  console.log('   OAuth 2.0 Authorization Server');
  console.log('🔐 ================================');
  console.log('');
  console.log(`   🚀 Running on: http://localhost:${config.port}`);
  console.log('');
  console.log('   📋 Endpoints:');
  console.log(`      GET  /authorize     - Authorization`);
  console.log(`      POST /token         - Token exchange`);
  console.log(`      POST /introspect    - Token introspection`);
  console.log(`      GET  /userinfo      - User info`);
  console.log('');
  console.log('   🧪 Test Credentials:');
  console.log('      User: testuser / password123');
  console.log('      Client: analytics-app / analytics-app-secret');
  console.log('');
});

export default app;
