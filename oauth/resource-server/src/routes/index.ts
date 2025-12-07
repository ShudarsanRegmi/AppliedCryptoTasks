import { Router } from 'express';
import { validateAccessToken, requireScopes } from '../middleware/auth';
import {
  getAllNotes,
  getNote,
  createNewNote,
  updateExistingNote,
  deleteExistingNote
} from '../controllers/notesController';

const router = Router();

// All routes require authentication
router.use(validateAccessToken);

// Notes routes
// GET /notes - requires notes:read scope
router.get('/notes', requireScopes('notes:read'), getAllNotes);

// GET /notes/:noteId - requires notes:read scope
router.get('/notes/:noteId', requireScopes('notes:read'), getNote);

// POST /notes - requires notes:write scope
router.post('/notes', requireScopes('notes:write'), createNewNote);

// PUT /notes/:noteId - requires notes:write scope
router.put('/notes/:noteId', requireScopes('notes:write'), updateExistingNote);

// DELETE /notes/:noteId - requires notes:write scope
router.delete('/notes/:noteId', requireScopes('notes:write'), deleteExistingNote);

// Health check (public)
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'resource-server' });
});

export default router;
