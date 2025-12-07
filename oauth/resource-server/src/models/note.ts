import crypto from 'crypto';

// ==========================================
// Notes Model - In-Memory Storage
// ==========================================

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory notes storage
const notes: Map<string, Note> = new Map();

// Pre-seed some notes for the test user
const seedNotes = () => {
  const testNotes = [
    {
      id: 'note-1',
      userId: 'user-1',
      title: 'Welcome to Notes',
      content: 'This is your first note. You can use this app to store all your important thoughts and ideas. Feel free to create, edit, and organize your notes however you like!',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15')
    },
    {
      id: 'note-2',
      userId: 'user-1',
      title: 'Meeting Notes',
      content: 'Discussed project timeline with the team. Key points: 1) MVP deadline is end of month, 2) Need to finalize API design, 3) Schedule weekly sync meetings. Action items assigned to each team member.',
      createdAt: new Date('2024-02-10'),
      updatedAt: new Date('2024-02-10')
    },
    {
      id: 'note-3',
      userId: 'user-1',
      title: 'Shopping List',
      content: 'Groceries: milk, bread, eggs, cheese, tomatoes, onions, chicken, rice, pasta, olive oil. Don\'t forget to check for sales!',
      createdAt: new Date('2024-03-05'),
      updatedAt: new Date('2024-03-05')
    },
    {
      id: 'note-4',
      userId: 'user-1',
      title: 'Book Recommendations',
      content: 'Books to read this year: 1) "Clean Code" by Robert Martin, 2) "The Pragmatic Programmer", 3) "Designing Data-Intensive Applications", 4) "System Design Interview". Start with Clean Code!',
      createdAt: new Date('2024-03-20'),
      updatedAt: new Date('2024-03-20')
    },
    {
      id: 'note-5',
      userId: 'user-1',
      title: 'OAuth 2.0 Learning Notes',
      content: 'OAuth 2.0 is an authorization framework. Key concepts: Authorization Code Grant, Access Tokens, Refresh Tokens, Scopes. Remember: OAuth is for authorization, not authentication. OpenID Connect adds authentication layer on top.',
      createdAt: new Date('2024-04-01'),
      updatedAt: new Date('2024-04-01')
    }
  ];

  testNotes.forEach(note => {
    notes.set(note.id, note);
  });

  console.log(`📝 Seeded ${testNotes.length} notes for test user`);
};

seedNotes();

// ==========================================
// CRUD Operations
// ==========================================

// Create note
export function createNote(userId: string, title: string, content: string): Note {
  const note: Note = {
    id: `note-${crypto.randomUUID()}`,
    userId,
    title,
    content,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  notes.set(note.id, note);
  return note;
}

// Get all notes for a user
export function getNotesByUserId(userId: string): Note[] {
  const userNotes: Note[] = [];
  for (const note of notes.values()) {
    if (note.userId === userId) {
      userNotes.push(note);
    }
  }
  return userNotes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

// Get a specific note
export function getNoteById(noteId: string, userId: string): Note | null {
  const note = notes.get(noteId);
  if (!note || note.userId !== userId) {
    return null;
  }
  return note;
}

// Update a note
export function updateNote(noteId: string, userId: string, updates: { title?: string; content?: string }): Note | null {
  const note = notes.get(noteId);
  if (!note || note.userId !== userId) {
    return null;
  }
  
  if (updates.title !== undefined) {
    note.title = updates.title;
  }
  if (updates.content !== undefined) {
    note.content = updates.content;
  }
  note.updatedAt = new Date();
  
  notes.set(noteId, note);
  return note;
}

// Delete a note
export function deleteNote(noteId: string, userId: string): boolean {
  const note = notes.get(noteId);
  if (!note || note.userId !== userId) {
    return false;
  }
  return notes.delete(noteId);
}

// Get note count for a user
export function getNoteCount(userId: string): number {
  let count = 0;
  for (const note of notes.values()) {
    if (note.userId === userId) {
      count++;
    }
  }
  return count;
}
