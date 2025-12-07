import express from 'express';
import cors from 'cors';
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

// API Routes
app.use('/api', routes);

// Public health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'resource-server' });
});

// Home page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Notes Service - Resource Server</title>
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
          border-left: 4px solid #22c55e;
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
        .put { background: #f59e0b; color: white; }
        .delete { background: #ef4444; color: white; }
        .scope {
          display: inline-block;
          background: #e0e7ff;
          color: #3730a3;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          margin-left: 8px;
        }
      </style>
    </head>
    <body>
      <h1>📝 Notes Service</h1>
      <p>Protected Resource Server - Running on port ${config.port}</p>
      
      <div class="card">
        <h2>🔐 Protected Endpoints</h2>
        <p>All endpoints require a valid OAuth 2.0 access token</p>
        
        <div class="endpoint">
          <span class="method get">GET</span>
          <code>/api/notes</code>
          <span class="scope">notes:read</span>
          <p style="margin-top: 8px; color: #666; font-size: 14px;">Get all notes for the authenticated user</p>
        </div>
        
        <div class="endpoint">
          <span class="method get">GET</span>
          <code>/api/notes/:id</code>
          <span class="scope">notes:read</span>
          <p style="margin-top: 8px; color: #666; font-size: 14px;">Get a specific note</p>
        </div>
        
        <div class="endpoint">
          <span class="method post">POST</span>
          <code>/api/notes</code>
          <span class="scope">notes:write</span>
          <p style="margin-top: 8px; color: #666; font-size: 14px;">Create a new note</p>
        </div>
        
        <div class="endpoint">
          <span class="method put">PUT</span>
          <code>/api/notes/:id</code>
          <span class="scope">notes:write</span>
          <p style="margin-top: 8px; color: #666; font-size: 14px;">Update an existing note</p>
        </div>
        
        <div class="endpoint">
          <span class="method delete">DELETE</span>
          <code>/api/notes/:id</code>
          <span class="scope">notes:write</span>
          <p style="margin-top: 8px; color: #666; font-size: 14px;">Delete a note</p>
        </div>
      </div>
      
      <div class="card">
        <h2>🔑 Authentication</h2>
        <p>Include an access token in the Authorization header:</p>
        <code style="display: block; padding: 12px; margin-top: 12px;">Authorization: Bearer &lt;access_token&gt;</code>
      </div>
    </body>
    </html>
  `);
});

// Start server
app.listen(config.port, () => {
  console.log('');
  console.log('📝 ================================');
  console.log('   Notes Service (Resource Server)');
  console.log('📝 ================================');
  console.log('');
  console.log(`   🚀 Running on: http://localhost:${config.port}`);
  console.log('');
  console.log('   📋 Protected Endpoints:');
  console.log(`      GET    /api/notes       - List notes (notes:read)`);
  console.log(`      GET    /api/notes/:id   - Get note (notes:read)`);
  console.log(`      POST   /api/notes       - Create note (notes:write)`);
  console.log(`      PUT    /api/notes/:id   - Update note (notes:write)`);
  console.log(`      DELETE /api/notes/:id   - Delete note (notes:write)`);
  console.log('');
  console.log(`   🔐 Auth Server: ${config.authServerUrl}`);
  console.log('');
});

export default app;
