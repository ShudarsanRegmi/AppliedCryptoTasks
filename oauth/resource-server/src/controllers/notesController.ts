import { Request, Response } from 'express';
import {
  createNote,
  getNotesByUserId,
  getNoteById,
  updateNote,
  deleteNote
} from '../models/note';

// Get all notes for the authenticated user
export function getAllNotes(req: Request, res: Response): void {
  const userId = (req as any).userId;
  
  if (!userId) {
    res.status(401).json({
      error: 'unauthorized',
      error_description: 'User not authenticated'
    });
    return;
  }

  const notes = getNotesByUserId(userId);
  res.json({
    notes,
    count: notes.length
  });
}

// Get a specific note
export function getNote(req: Request, res: Response): void {
  const userId = (req as any).userId;
  const { noteId } = req.params;
  
  if (!userId) {
    res.status(401).json({
      error: 'unauthorized',
      error_description: 'User not authenticated'
    });
    return;
  }

  const note = getNoteById(noteId, userId);
  
  if (!note) {
    res.status(404).json({
      error: 'not_found',
      error_description: 'Note not found'
    });
    return;
  }

  res.json(note);
}

// Create a new note
export function createNewNote(req: Request, res: Response): void {
  const userId = (req as any).userId;
  const { title, content } = req.body;
  
  if (!userId) {
    res.status(401).json({
      error: 'unauthorized',
      error_description: 'User not authenticated'
    });
    return;
  }

  if (!title || !content) {
    res.status(400).json({
      error: 'invalid_request',
      error_description: 'Title and content are required'
    });
    return;
  }

  const note = createNote(userId, title, content);
  res.status(201).json(note);
}

// Update a note
export function updateExistingNote(req: Request, res: Response): void {
  const userId = (req as any).userId;
  const { noteId } = req.params;
  const { title, content } = req.body;
  
  if (!userId) {
    res.status(401).json({
      error: 'unauthorized',
      error_description: 'User not authenticated'
    });
    return;
  }

  const note = updateNote(noteId, userId, { title, content });
  
  if (!note) {
    res.status(404).json({
      error: 'not_found',
      error_description: 'Note not found'
    });
    return;
  }

  res.json(note);
}

// Delete a note
export function deleteExistingNote(req: Request, res: Response): void {
  const userId = (req as any).userId;
  const { noteId } = req.params;
  
  if (!userId) {
    res.status(401).json({
      error: 'unauthorized',
      error_description: 'User not authenticated'
    });
    return;
  }

  const deleted = deleteNote(noteId, userId);
  
  if (!deleted) {
    res.status(404).json({
      error: 'not_found',
      error_description: 'Note not found'
    });
    return;
  }

  res.status(204).send();
}
