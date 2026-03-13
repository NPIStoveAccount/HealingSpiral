import logger from '../logger.js';
import { dbRun } from '../db.js';

export function errorHandler(err, req, res, next) {
  logger.error({ err, url: req.url, method: req.method }, 'Unhandled server error');

  dbRun(
    'INSERT INTO analytics_events (user_id, event_type, metadata_json) VALUES (?, ?, ?)',
    req.user?.id || null,
    'server_error',
    JSON.stringify({ message: err.message, url: req.url, method: req.method })
  ).catch(() => {
    // DB logging failed — pino already captured it
  });

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}
