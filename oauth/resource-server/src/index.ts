import express from 'express';
import cors from 'cors';
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

// Session for web UI
app.use(session({
  secret: 'notes-service-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// View engine for Notes UI
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// API Routes (OAuth protected)
app.use('/api', routes);

// Public health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'resource-server' });
});

// Notes UI - Main page
app.get('/', (req, res) => {
  res.render('notes', { authServerUrl: config.authServerUrl });
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
  console.log('   📋 Web Interface:');
  console.log(`      GET    /                - Notes App UI`);
  console.log('');
  console.log('   📋 Protected API Endpoints:');
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
