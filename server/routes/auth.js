import { Router } from 'express';
import bcrypt from 'bcrypt';
import { dbGet, dbRun } from '../db.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import logger from '../logger.js';

const router = Router();
const BCRYPT_ROUNDS = 12;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const normalized = email.toLowerCase().trim();

  try {
    const existing = await dbGet('SELECT id, password_hash FROM users WHERE email = ?', normalized);

    if (existing) {
      if (!existing.password_hash) {
        const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', hash, existing.id);
        const token = signToken({ id: existing.id, email: normalized });
        return res.json({ token, user: { id: existing.id, email: normalized } });
      }
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = await dbRun('INSERT INTO users (email, password_hash) VALUES (?, ?)', normalized, hash);
    const token = signToken({ id: Number(result.lastInsertRowid), email: normalized });
    logger.info({ email: normalized }, 'User registered');
    res.status(201).json({ token, user: { id: Number(result.lastInsertRowid), email: normalized } });
  } catch (err) {
    logger.error({ err }, 'Registration error');
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const normalized = email.toLowerCase().trim();

  try {
    const user = await dbGet('SELECT id, email, password_hash FROM users WHERE email = ?', normalized);

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken({ id: user.id, email: user.email });
    logger.info({ email: user.email }, 'User logged in');
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    logger.error({ err }, 'Login error');
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  try {
    const user = await dbGet('SELECT id, password_hash FROM users WHERE id = ?', req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.password_hash) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password required' });
      }
      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', hash, user.id);
    logger.info({ userId: user.id }, 'Password changed');
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Change password error');
    res.status(500).json({ error: 'Password change failed' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const user = await dbGet('SELECT id, email, role, created_at FROM users WHERE id = ?', req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isAdmin = user.role === 'admin';

  const sub = await dbGet(
    `SELECT plan_type, status, paid_at, expires_at
     FROM subscriptions WHERE user_id = ? AND status = 'active'
     ORDER BY paid_at DESC LIMIT 1`,
    req.user.id
  );

  const session = await dbGet(
    'SELECT message_count FROM sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
    req.user.id
  );

  res.json({
    user: { id: user.id, email: user.email, role: user.role, created_at: user.created_at },
    subscription: isAdmin ? { plan_type: 'admin', status: 'active' } : (sub || null),
    paymentVerified: isAdmin || !!sub,
    messageCount: session?.message_count || 0,
  });
});

export default router;
