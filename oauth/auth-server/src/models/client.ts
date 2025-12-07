import crypto from 'crypto';

// ==========================================
// OAuth Client Model - In-Memory Storage
// ==========================================

export interface OAuthClient {
  clientId: string;
  clientSecret: string;
  clientName: string;
  redirectUris: string[];
  grants: string[];
  scopes: string[];
  createdAt: Date;
}

// In-memory client storage
const clients: Map<string, OAuthClient> = new Map();

// Pre-register the Analytics App client
const seedClients = () => {
  const analyticsApp: OAuthClient = {
    clientId: 'analytics-app',
    clientSecret: 'analytics-app-secret',
    clientName: 'Notes Analytics App',
    redirectUris: ['http://localhost:4002/callback'],
    grants: ['authorization_code', 'refresh_token'],
    scopes: ['notes:read', 'profile:read'],
    createdAt: new Date()
  };
  
  clients.set(analyticsApp.clientId, analyticsApp);
  console.log('📝 Seeded client: analytics-app');
};

seedClients();

// Generate client credentials
function generateClientId(): string {
  return crypto.randomBytes(16).toString('hex');
}

function generateClientSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Create client
export function createClient(
  clientName: string, 
  redirectUris: string[], 
  scopes: string[] = ['notes:read']
): OAuthClient {
  const client: OAuthClient = {
    clientId: generateClientId(),
    clientSecret: generateClientSecret(),
    clientName,
    redirectUris,
    grants: ['authorization_code', 'refresh_token'],
    scopes,
    createdAt: new Date()
  };
  
  clients.set(client.clientId, client);
  return client;
}

// Find client by ID
export function findClientById(clientId: string): OAuthClient | undefined {
  return clients.get(clientId);
}

// Validate client credentials
export function validateClient(clientId: string, clientSecret: string): OAuthClient | null {
  const client = clients.get(clientId);
  if (!client) {
    return null;
  }
  
  if (client.clientSecret !== clientSecret) {
    return null;
  }
  
  return client;
}

// Check if redirect URI is valid for client
export function validateRedirectUri(clientId: string, redirectUri: string): boolean {
  const client = clients.get(clientId);
  if (!client) {
    return false;
  }
  
  return client.redirectUris.includes(redirectUri);
}

// Check if scopes are valid for client
export function validateScopes(clientId: string, requestedScopes: string[]): boolean {
  const client = clients.get(clientId);
  if (!client) {
    return false;
  }
  
  return requestedScopes.every(scope => client.scopes.includes(scope));
}

// Get all clients (for debugging)
export function getAllClients(): OAuthClient[] {
  return Array.from(clients.values());
}
