import jwt from 'jsonwebtoken';
import logger from '../logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch (err) {
    logger.warn({ err: err.message }, 'Invalid JWT');
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), JWT_SECRET);
    } catch {
      // Invalid token — continue as anonymous
    }
  }
  next();
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      const { dbGet } = await import('../db.js');
      const user = await dbGet('SELECT role FROM users WHERE id = ?', req.user.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      next();
    } catch (err) {
      logger.error({ err }, 'Admin check failed');
      return res.status(500).json({ error: 'Server error' });
    }
  });
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}
