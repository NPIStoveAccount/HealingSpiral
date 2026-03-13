import { Router } from 'express';
import { dbGet, dbAll, dbRun } from '../db.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/analytics/event
router.post('/event', optionalAuth, async (req, res) => {
  const { event_type, metadata } = req.body;
  if (!event_type) return res.status(400).json({ error: 'event_type required' });

  await dbRun(
    'INSERT INTO analytics_events (user_id, event_type, metadata_json) VALUES (?, ?, ?)',
    req.user?.id || null,
    event_type,
    metadata ? JSON.stringify(metadata) : null
  );
  res.json({ success: true });
});

// GET /api/analytics/summary
router.get('/summary', requireAuth, async (req, res) => {
  const days = parseInt(req.query.days) || 30;

  const counts = await dbAll(
    `SELECT event_type, COUNT(*) as count
     FROM analytics_events
     WHERE created_at >= datetime('now', ?)
     GROUP BY event_type ORDER BY count DESC`,
    `-${days} days`
  );

  const totalUsers = await dbGet('SELECT COUNT(*) as count FROM users');
  const activeSubscriptions = await dbGet(
    "SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'"
  );

  res.json({
    counts,
    totalUsers: totalUsers.count,
    activeSubscriptions: activeSubscriptions.count,
  });
});

export default router;
