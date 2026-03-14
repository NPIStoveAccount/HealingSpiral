import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { fileURLToPath } from 'url';
import path from 'path';
import { initDb } from './db.js';
import logger from './logger.js';
import chatRouter from './routes/chat.js';
import reportRouter from './routes/report.js';
import checkoutRouter from './routes/checkout.js';
import webhookRouter from './routes/webhook.js';
import authRouter from './routes/auth.js';
import subscriptionRouter from './routes/subscription.js';
import sessionsRouter from './routes/sessions.js';
import analyticsRouter from './routes/analytics.js';
import adminRouter from './routes/admin.js';
import { errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));

// Stripe webhook needs raw body — must be before express.json()
app.use('/api/webhook', express.raw({ type: 'application/json' }), webhookRouter);

app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRouter);
app.use('/api/chat', chatRouter);
app.use('/api/send-report', reportRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/subscription', subscriptionRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/admin', adminRouter);

// Admin dashboard page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

// Health check for deployment platforms
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'dist')));
  app.get('{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

app.use(errorHandler);

// Initialize database on startup, then start server
const PORT = process.env.SERVER_PORT || 3001;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

initDb()
  .then(() => {
    app.listen(PORT, HOST, () => logger.info({ host: HOST, port: PORT }, 'Server listening'));
  })
  .catch(err => {
    logger.error({ err }, 'Failed to initialize database');
    process.exit(1);
  });
