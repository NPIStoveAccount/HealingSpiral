import { Router } from 'express';
import { dbGet, dbRun } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/profile/modalities — get user's modality selections from their latest session
router.get('/modalities', requireAuth, async (req, res) => {
  const session = await dbGet(
    'SELECT user_modalities_json, user_modalities_other, scores_json FROM sessions WHERE user_id = ? AND archived = 0 ORDER BY updated_at DESC LIMIT 1',
    req.user.id
  );

  res.json({
    modalities: session?.user_modalities_json ? JSON.parse(session.user_modalities_json) : [],
    modalitiesOther: session?.user_modalities_other || null,
    scores: session?.scores_json ? JSON.parse(session.scores_json) : null,
  });
});

// PUT /api/profile/modalities — update user's modality selections
router.put('/modalities', requireAuth, async (req, res) => {
  const { modalities, modalitiesOther } = req.body;

  const existing = await dbGet(
    'SELECT id FROM sessions WHERE user_id = ? AND archived = 0 ORDER BY updated_at DESC LIMIT 1',
    req.user.id
  );

  if (existing) {
    await dbRun(
      `UPDATE sessions SET user_modalities_json = ?, user_modalities_other = ?, updated_at = datetime('now') WHERE id = ?`,
      JSON.stringify(modalities || []),
      modalitiesOther || null,
      existing.id
    );
  } else {
    await dbRun(
      `INSERT INTO sessions (user_id, user_modalities_json, user_modalities_other) VALUES (?, ?, ?)`,
      req.user.id,
      JSON.stringify(modalities || []),
      modalitiesOther || null
    );
  }

  res.json({ success: true });
});

export default router;
