import crypto from 'crypto';
import { readJsonFile, writeJsonFile, FILES } from '../utils/storage';

// ==========================================
// Notes Model - Persistent JSON Storage
// ==========================================

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface NotesData {
  notes: Note[];
}

// Load notes from file
function loadNotes(): Note[] {
  const data = readJsonFile<NotesData>(FILES.NOTES, { notes: [] });
  return data.notes;
}

// Save notes to file
function saveNotes(notes: Note[]): void {
  writeJsonFile<NotesData>(FILES.NOTES, { notes });
}

// ==========================================
// CRUD Operations
// ==========================================

// Create note
export function createNote(userId: string, title: string, content: string): Note {
  const notes = loadNotes();
  
  const note: Note = {
    id: `note-${crypto.randomUUID()}`,
    userId,
    title,
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  notes.push(note);
  saveNotes(notes);
  
  console.log(`✅ Note created: "${title}" for user ${userId}`);
  return note;
}

// Get all notes for a user
export function getNotesByUserId(userId: string): Note[] {
  const notes = loadNotes();
  return notes
    .filter(note => note.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

// Get a specific note
export function getNoteById(noteId: string, userId: string): Note | null {
  const notes = loadNotes();
  const note = notes.find(n => n.id === noteId && n.userId === userId);
  return note || null;
}

// Update a note
export function updateNote(noteId: string, userId: string, updates: { title?: string; content?: string }): Note | null {
  const notes = loadNotes();
  const noteIndex = notes.findIndex(n => n.id === noteId && n.userId === userId);
  
  if (noteIndex === -1) {
    return null;
  }
  
  const note = notes[noteIndex];
  
  if (updates.title !== undefined) {
    note.title = updates.title;
  }
  if (updates.content !== undefined) {
    note.content = updates.content;
  }
  note.updatedAt = new Date().toISOString();
  
  notes[noteIndex] = note;
  saveNotes(notes);
  
  console.log(`✅ Note updated: "${note.title}"`);
  return note;
}

// Delete a note
export function deleteNote(noteId: string, userId: string): boolean {
  const notes = loadNotes();
  const noteIndex = notes.findIndex(n => n.id === noteId && n.userId === userId);
  
  if (noteIndex === -1) {
    return false;
  }
  
  const deletedNote = notes.splice(noteIndex, 1)[0];
  saveNotes(notes);
  
  console.log(`🗑️ Note deleted: "${deletedNote.title}"`);
  return true;
}

// Get note count for a user
export function getNoteCount(userId: string): number {
  const notes = loadNotes();
  return notes.filter(n => n.userId === userId).length;
}

// Initialize with sample notes if empty
export function initializeNotes(): void {
  const notes = loadNotes();
  if (notes.length === 0) {
    const sampleNotes: Note[] = [
      {
        id: 'note-1',
        userId: 'user-1',
        title: 'Welcome to Notes',
        content: 'This is your first note. You can use this app to store all your important thoughts and ideas. Feel free to create, edit, and organize your notes however you like!',
        createdAt: '2024-01-15T10:00:00.000Z',
        updatedAt: '2024-01-15T10:00:00.000Z'
      },
      {
        id: 'note-2',
        userId: 'user-1',
        title: 'Meeting Notes',
        content: 'Discussed project timeline with the team. Key points: 1) MVP deadline is end of month, 2) Need to finalize API design, 3) Schedule weekly sync meetings. Action items assigned to each team member.',
        createdAt: '2024-02-10T14:30:00.000Z',
        updatedAt: '2024-02-10T14:30:00.000Z'
      },
      {
        id: 'note-3',
        userId: 'user-1',
        title: 'Shopping List',
        content: 'Groceries: milk, bread, eggs, cheese, tomatoes, onions, chicken, rice, pasta, olive oil. Don\'t forget to check for sales!',
        createdAt: '2024-03-05T09:15:00.000Z',
        updatedAt: '2024-03-05T09:15:00.000Z'
      },
      {
        id: 'note-4',
        userId: 'user-1',
        title: 'OAuth 2.0 Learning Notes',
        content: 'OAuth 2.0 is an authorization framework. Key concepts: Authorization Code Grant, Access Tokens, Refresh Tokens, Scopes. Remember: OAuth is for authorization, not authentication. OpenID Connect adds authentication layer on top.',
        createdAt: '2024-04-01T16:45:00.000Z',
        updatedAt: '2024-04-01T16:45:00.000Z'
      }
    ];
    saveNotes(sampleNotes);
    console.log(`📝 Initialized with ${sampleNotes.length} sample notes`);
  } else {
    console.log(`📝 Loaded ${notes.length} notes from storage`);
  }
}

// Initialize on module load
initializeNotes();
