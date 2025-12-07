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
  saveUninitialized: true, // Save session immediately so popup can access it
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    sameSite: 'lax', // Allow cookies on top-level navigations (redirects)
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', routes);

// Start server
app.listen(config.port, () => {
  console.log('');
  console.log('📊 ================================');
  console.log('   Notes Analytics (Client App)');
  console.log('📊 ================================');
  console.log('');
  console.log(`   🚀 Running on: http://localhost:${config.port}`);
  console.log('');
  console.log('   📋 OAuth Settings:');
  console.log(`      Client ID: ${config.clientId}`);
  console.log(`      Auth Server: ${config.authServerUrl}`);
  console.log(`      Resource Server: ${config.resourceServerUrl}`);
  console.log(`      Callback URL: ${config.callbackUrl}`);
  console.log(`      Scopes: ${config.scopes.join(', ')}`);
  console.log('');
  console.log('   🔗 Open http://localhost:4002 to start the OAuth flow');
  console.log('');
});

export default app;
