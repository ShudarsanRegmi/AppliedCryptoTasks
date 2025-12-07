import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../services/tokenService';
import { findToken } from '../models/token';

export function validateAccessToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'unauthorized',
      error_description: 'Missing or invalid Authorization header'
    });
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  // Verify JWT signature and expiration
  const payload = verifyJWT(token);
  if (!payload) {
    res.status(401).json({
      error: 'invalid_token',
      error_description: 'Token is invalid or expired'
    });
    return;
  }

  // Check if token exists in our store
  const storedToken = findToken(token);
  if (!storedToken) {
    res.status(401).json({
      error: 'invalid_token',
      error_description: 'Token has been revoked'
    });
    return;
  }

  // Attach user info to request
  (req as any).userId = payload.sub;
  (req as any).clientId = payload.aud;
  (req as any).scopes = payload.scope.split(' ');
  
  next();
}

export function requireScopes(...requiredScopes: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const tokenScopes: string[] = (req as any).scopes || [];
    
    const hasAllScopes = requiredScopes.every(scope => tokenScopes.includes(scope));
    
    if (!hasAllScopes) {
      res.status(403).json({
        error: 'insufficient_scope',
        error_description: `Required scopes: ${requiredScopes.join(', ')}`
      });
      return;
    }
    
    next();
  };
}
