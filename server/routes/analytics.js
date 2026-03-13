import { Router } from 'express';
import { getDb } from '../db.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/analytics/event
router.post('/event', optionalAuth, (req, res) => {
  const { event_type, metadata } = req.body;
  if (!event_type) return res.status(400).json({ error: 'event_type required' });

  const db = getDb();
  db.prepare(
    'INSERT INTO analytics_events (user_id, event_type, metadata_json) VALUES (?, ?, ?)'
  ).run(
    req.user?.id || null,
    event_type,
    metadata ? JSON.stringify(metadata) : null
  );
  res.json({ success: true });
});

// GET /api/analytics/summary
router.get('/summary', requireAuth, (req, res) => {
  const db = getDb();
  const days = parseInt(req.query.days) || 30;

  const counts = db.prepare(
    `SELECT event_type, COUNT(*) as count
     FROM analytics_events
     WHERE created_at >= datetime('now', ?)
     GROUP BY event_type ORDER BY count DESC`
  ).all(`-${days} days`);

  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  const activeSubscriptions = db.prepare(
    "SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'"
  ).get();

  res.json({
    counts,
    totalUsers: totalUsers.count,
    activeSubscriptions: activeSubscriptions.count,
  });
});

export default router;
