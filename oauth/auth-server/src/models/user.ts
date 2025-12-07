import crypto from 'crypto';

// ==========================================
// User Model - In-Memory Storage
// ==========================================

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

// In-memory user storage
const users: Map<string, User> = new Map();

// Pre-seed some users for testing
const seedUsers = () => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync('password123', salt, 100000, 64, 'sha512').toString('hex');
  
  const testUser: User = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: `${salt}:${hash}`,
    createdAt: new Date()
  };
  
  users.set(testUser.id, testUser);
  console.log('📝 Seeded test user: testuser / password123');
};

seedUsers();

// Hash password
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, useSalt, 100000, 64, 'sha512').toString('hex');
  return { hash: `${useSalt}:${hash}`, salt: useSalt };
}

// Verify password
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  const { hash: computedHash } = hashPassword(password, salt);
  return storedHash === computedHash;
}

// Create user
export function createUser(username: string, email: string, password: string): User {
  const id = `user-${crypto.randomUUID()}`;
  const { hash } = hashPassword(password);
  
  const user: User = {
    id,
    username,
    email,
    passwordHash: hash,
    createdAt: new Date()
  };
  
  users.set(id, user);
  return user;
}

// Find user by ID
export function findUserById(id: string): User | undefined {
  return users.get(id);
}

// Find user by username
export function findUserByUsername(username: string): User | undefined {
  for (const user of users.values()) {
    if (user.username === username) {
      return user;
    }
  }
  return undefined;
}

// Find user by email
export function findUserByEmail(email: string): User | undefined {
  for (const user of users.values()) {
    if (user.email === email) {
      return user;
    }
  }
  return undefined;
}

// Authenticate user
export function authenticateUser(username: string, password: string): User | null {
  const user = findUserByUsername(username);
  if (!user) {
    return null;
  }
  
  if (!verifyPassword(password, user.passwordHash)) {
    return null;
  }
  
  return user;
}

// Get all users (for debugging)
export function getAllUsers(): User[] {
  return Array.from(users.values());
}
