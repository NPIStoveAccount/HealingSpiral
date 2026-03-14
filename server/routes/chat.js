import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { dbGet, dbRun } from '../db.js';
import logger from '../logger.js';

const router = Router();
const FREE_MESSAGE_LIMIT = 20;

router.post('/', optionalAuth, async (req, res) => {
  const { messages, systemPrompt, model, max_tokens } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // Server-side message limit enforcement for authenticated users
  if (req.user) {
    // Admins get unlimited usage — skip all limits
    const userRow = await dbGet('SELECT role FROM users WHERE id = ?', req.user.id);
    const isAdmin = userRow?.role === 'admin';

    if (!isAdmin) {
      const sub = await dbGet(
        `SELECT id FROM subscriptions WHERE user_id = ? AND status = 'active' LIMIT 1`,
        req.user.id
      );

      if (!sub) {
        const session = await dbGet(
          'SELECT id, message_count FROM sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
          req.user.id
        );

        const count = session?.message_count || 0;
        if (count >= FREE_MESSAGE_LIMIT) {
          return res.status(403).json({ error: 'Message limit reached', limitReached: true });
        }

        // Increment message count
        if (session) {
          await dbRun("UPDATE sessions SET message_count = message_count + 1, updated_at = datetime('now') WHERE id = ?", session.id);
        } else {
          await dbRun('INSERT INTO sessions (user_id, message_count) VALUES (?, 1)', req.user.id);
        }
      }
    }
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-haiku-4-5-20251001',
        max_tokens: max_tokens || 1024,
        system: systemPrompt || '',
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (err) {
    logger.error({ err }, 'Chat API error');
    res.status(500).json({ error: err.message });
  }
});

export default router;
