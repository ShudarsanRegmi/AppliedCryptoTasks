import { Request, Response, NextFunction } from 'express';
import fetch from 'node-fetch';
import { config } from '../config';

// Token validation middleware that calls auth server introspection
export async function validateAccessToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'unauthorized',
      error_description: 'Missing or invalid Authorization header'
    });
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Call auth server's introspection endpoint
    const response = await fetch(`${config.authServerUrl}/introspect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `token=${encodeURIComponent(token)}`
    });

    const introspection = await response.json() as {
      active: boolean;
      sub?: string;
      client_id?: string;
      scope?: string;
    };

    if (!introspection.active) {
      res.status(401).json({
        error: 'invalid_token',
        error_description: 'Token is invalid or expired'
      });
      return;
    }

    // Attach token info to request
    (req as any).userId = introspection.sub;
    (req as any).clientId = introspection.client_id;
    (req as any).scopes = introspection.scope?.split(' ') || [];
    
    next();
  } catch (error) {
    console.error('Token introspection error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to validate token'
    });
  }
}

// Scope checking middleware
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
