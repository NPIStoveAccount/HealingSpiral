import { Router } from 'express';
import bcrypt from 'bcrypt';
import { requireAdmin } from '../middleware/auth.js';
import { dbAll, dbGet, dbRun } from '../db.js';

const router = Router();
router.use(requireAdmin);

// GET /api/admin/users — list all users with subscription + session info
router.get('/users', async (req, res, next) => {
  try {
    const users = await dbAll(`
      SELECT
        u.id, u.email, u.role, u.created_at,
        s.plan_type, s.status AS subscription_status, s.paid_at, s.expires_at,
        sess.message_count, sess.assessment_method, sess.persona,
        sess.updated_at AS last_active,
        sess.scores_json,
        sess_counts.session_count,
        sess_counts.total_messages,
        COALESCE(j.journal_count, 0) AS journal_count,
        COALESCE(usg.total_input_tokens, 0) AS total_input_tokens,
        COALESCE(usg.total_output_tokens, 0) AS total_output_tokens
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id
        AND s.id = (SELECT MAX(id) FROM subscriptions WHERE user_id = u.id)
      LEFT JOIN sessions sess ON sess.user_id = u.id
        AND sess.id = (SELECT MAX(id) FROM sessions WHERE user_id = u.id AND archived = 0)
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS session_count, SUM(message_count) AS total_messages
        FROM sessions GROUP BY user_id
      ) sess_counts ON sess_counts.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS journal_count
        FROM journal_entries GROUP BY user_id
      ) j ON j.user_id = u.id
      LEFT JOIN (
        SELECT user_id, SUM(input_tokens) AS total_input_tokens, SUM(output_tokens) AS total_output_tokens
        FROM usage_log GROUP BY user_id
      ) usg ON usg.user_id = u.id
      ORDER BY u.created_at DESC
    `);
    // Parse scores for the response
    const enriched = users.map(u => ({
      ...u,
      scores: u.scores_json ? JSON.parse(u.scores_json) : null,
      scores_json: undefined,
    }));
    res.json({ users: enriched });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id — update user fields
router.put('/users/:id', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const user = await dbGet('SELECT id FROM users WHERE id = ?', userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { email, role, plan_type, subscription_status, expires_at, paid_at } = req.body;

    // Update user fields
    if (email || role) {
      const fields = [];
      const vals = [];
      if (email) { fields.push('email = ?'); vals.push(email); }
      if (role && (role === 'user' || role === 'admin')) { fields.push('role = ?'); vals.push(role); }
      if (fields.length > 0) {
        vals.push(userId);
        await dbRun(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, ...vals);
      }
    }

    // Update or create subscription
    if (plan_type || subscription_status || expires_at !== undefined || paid_at !== undefined) {
      const existing = await dbGet(
        'SELECT id FROM subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 1', userId
      );
      if (existing) {
        const fields = [];
        const vals = [];
        if (plan_type) { fields.push('plan_type = ?'); vals.push(plan_type); }
        if (subscription_status) { fields.push('status = ?'); vals.push(subscription_status); }
        if (expires_at !== undefined) { fields.push('expires_at = ?'); vals.push(expires_at || null); }
        if (paid_at !== undefined) { fields.push('paid_at = ?'); vals.push(paid_at || null); }
        if (fields.length > 0) {
          vals.push(existing.id);
          await dbRun(`UPDATE subscriptions SET ${fields.join(', ')} WHERE id = ?`, ...vals);
        }
      } else if (plan_type && subscription_status) {
        await dbRun(
          `INSERT INTO subscriptions (user_id, plan_type, status, expires_at, paid_at)
           VALUES (?, ?, ?, ?, ?)`,
          userId, plan_type, subscription_status, expires_at || null, paid_at || null
        );
      }
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id/password — reset user password
router.put('/users/:id/password', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const user = await dbGet('SELECT id, email FROM users WHERE id = ?', userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { password } = req.body;
    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const hash = await bcrypt.hash(password, 10);
    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', hash, userId);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/users/:id — delete user and associated data
router.delete('/users/:id', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const user = await dbGet('SELECT id, email FROM users WHERE id = ?', userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Prevent self-deletion
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await dbRun('DELETE FROM sessions WHERE user_id = ?', userId);
    await dbRun('DELETE FROM subscriptions WHERE user_id = ?', userId);
    await dbRun('DELETE FROM analytics_events WHERE user_id = ?', userId);
    await dbRun('DELETE FROM users WHERE id = ?', userId);

    res.json({ ok: true, deleted: user.email });
  } catch (err) {
    next(err);
  }
});

export default router;
