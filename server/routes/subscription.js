import { Router } from 'express';
import Stripe from 'stripe';
import { dbGet, dbRun } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import logger from '../logger.js';

const router = Router();

// GET /api/subscription
router.get('/', requireAuth, async (req, res) => {
  const sub = await dbGet(
    `SELECT plan_type, status, stripe_subscription_id, paid_at, expires_at
     FROM subscriptions WHERE user_id = ? AND status = 'active'
     ORDER BY paid_at DESC LIMIT 1`,
    req.user.id
  );
  res.json({ subscription: sub || null, paymentVerified: !!sub });
});

// POST /api/subscription/cancel
router.post('/cancel', requireAuth, async (req, res) => {
  const sub = await dbGet(
    `SELECT id, stripe_subscription_id, plan_type
     FROM subscriptions WHERE user_id = ? AND status = 'active' AND plan_type = 'subscription'
     LIMIT 1`,
    req.user.id
  );

  if (!sub || !sub.stripe_subscription_id) {
    return res.status(404).json({ error: 'No active subscription found' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  try {
    await stripe.subscriptions.cancel(sub.stripe_subscription_id);
    await dbRun('UPDATE subscriptions SET status = ? WHERE id = ?', 'cancelled', sub.id);
    logger.info({ userId: req.user.id, subscriptionId: sub.stripe_subscription_id }, 'Subscription cancelled');
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Subscription cancellation failed');
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

export default router;
