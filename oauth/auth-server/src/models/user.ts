import crypto from 'crypto';
import { readJsonFile, writeJsonFile, FILES } from '../utils/storage';

// ==========================================
// User Model - Persistent JSON Storage
// ==========================================

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

interface UsersData {
  users: User[];
}

// Load users from file
function loadUsers(): User[] {
  const data = readJsonFile<UsersData>(FILES.USERS, { users: [] });
  return data.users;
}

// Save users to file
function saveUsers(users: User[]): void {
  writeJsonFile<UsersData>(FILES.USERS, { users });
}

// Hash password
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, useSalt, 100000, 64, 'sha512').toString('hex');
  return { hash: `${useSalt}:${hash}`, salt: useSalt };
}

// Verify password
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt] = storedHash.split(':');
  const { hash: computedHash } = hashPassword(password, salt);
  return storedHash === computedHash;
}

// Create user (Registration)
export function createUser(username: string, email: string, password: string): User | null {
  const users = loadUsers();
  
  // Check if username or email already exists
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return null; // Username taken
  }
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return null; // Email taken
  }
  
  const id = `user-${crypto.randomUUID()}`;
  const { hash } = hashPassword(password);
  
  const user: User = {
    id,
    username,
    email,
    passwordHash: hash,
    createdAt: new Date().toISOString()
  };
  
  users.push(user);
  saveUsers(users);
  
  console.log(`✅ New user registered: ${username}`);
  return user;
}

// Find user by ID
export function findUserById(id: string): User | undefined {
  const users = loadUsers();
  return users.find(u => u.id === id);
}

// Find user by username
export function findUserByUsername(username: string): User | undefined {
  const users = loadUsers();
  return users.find(u => u.username.toLowerCase() === username.toLowerCase());
}

// Find user by email
export function findUserByEmail(email: string): User | undefined {
  const users = loadUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
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

// Check if username exists
export function usernameExists(username: string): boolean {
  const users = loadUsers();
  return users.some(u => u.username.toLowerCase() === username.toLowerCase());
}

// Check if email exists
export function emailExists(email: string): boolean {
  const users = loadUsers();
  return users.some(u => u.email.toLowerCase() === email.toLowerCase());
}

// Get all users (for debugging)
export function getAllUsers(): User[] {
  return loadUsers();
}

// Initialize with default test user if no users exist
export function initializeUsers(): void {
  const users = loadUsers();
  if (users.length === 0) {
    const { hash } = hashPassword('password123');
    const testUser: User = {
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: hash,
      createdAt: new Date().toISOString()
    };
    saveUsers([testUser]);
    console.log('📝 Initialized with test user: testuser / password123');
  } else {
    console.log(`📝 Loaded ${users.length} users from storage`);
  }
}

// Initialize on module load
initializeUsers();
