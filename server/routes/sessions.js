import { Router } from 'express';
import { dbGet, dbRun } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import logger from '../logger.js';

const router = Router();

// POST /api/sessions/migrate — push localStorage session to server
router.post('/migrate', requireAuth, async (req, res) => {
  const { scores, persona, clinicalMode, chatMessages, chatSummary, messageCount } = req.body;

  const existing = await dbGet('SELECT id FROM sessions WHERE user_id = ? LIMIT 1', req.user.id);
  if (existing) {
    return res.json({ success: true, migrated: false, message: 'Session already exists' });
  }

  await dbRun(
    `INSERT INTO sessions (user_id, scores_json, persona, clinical_mode, chat_messages_json, chat_summary, message_count)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    req.user.id,
    scores ? JSON.stringify(scores) : null,
    persona || null,
    clinicalMode ? 1 : 0,
    chatMessages ? JSON.stringify(chatMessages) : null,
    chatSummary || null,
    messageCount || 0
  );

  logger.info({ userId: req.user.id }, 'Session migrated from localStorage');
  res.json({ success: true, migrated: true });
});

// GET /api/sessions/current
router.get('/current', requireAuth, async (req, res) => {
  const session = await dbGet(
    'SELECT * FROM sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
    req.user.id
  );

  if (!session) return res.json({ session: null });

  res.json({
    session: {
      id: session.id,
      scores: session.scores_json ? JSON.parse(session.scores_json) : null,
      persona: session.persona,
      clinicalMode: !!session.clinical_mode,
      chatMessages: session.chat_messages_json ? JSON.parse(session.chat_messages_json) : [],
      chatSummary: session.chat_summary,
      messageCount: session.message_count,
    }
  });
});

// PUT /api/sessions/current — update session
router.put('/current', requireAuth, async (req, res) => {
  const { scores, persona, clinicalMode, chatMessages, chatSummary, messageCount } = req.body;

  const existing = await dbGet(
    'SELECT id FROM sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
    req.user.id
  );

  if (existing) {
    await dbRun(
      `UPDATE sessions SET scores_json = ?, persona = ?, clinical_mode = ?,
       chat_messages_json = ?, chat_summary = ?, message_count = ?, updated_at = datetime('now')
       WHERE id = ?`,
      scores ? JSON.stringify(scores) : null,
      persona || null,
      clinicalMode ? 1 : 0,
      chatMessages ? JSON.stringify(chatMessages) : null,
      chatSummary || null,
      messageCount || 0,
      existing.id
    );
  } else {
    await dbRun(
      `INSERT INTO sessions (user_id, scores_json, persona, clinical_mode, chat_messages_json, chat_summary, message_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      req.user.id,
      scores ? JSON.stringify(scores) : null,
      persona || null,
      clinicalMode ? 1 : 0,
      chatMessages ? JSON.stringify(chatMessages) : null,
      chatSummary || null,
      messageCount || 0
    );
  }

  res.json({ success: true });
});

export default router;
