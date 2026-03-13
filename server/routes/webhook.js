import { Router } from 'express';
import Stripe from 'stripe';
import { getDb } from '../db.js';
import logger from '../logger.js';

const router = Router();

router.post('/', async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).send('Stripe webhook not configured');
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error({ err: err.message }, 'Webhook signature verification failed');
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const db = getDb();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const email = session.customer_email;
      const customerId = session.customer;

      // Find or create user by email
      let user = email ? db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase()) : null;
      if (!user && email) {
        const result = db.prepare('INSERT INTO users (email, stripe_customer_id) VALUES (?, ?)').run(email.toLowerCase(), customerId);
        user = { id: result.lastInsertRowid };
      } else if (user) {
        db.prepare('UPDATE users SET stripe_customer_id = COALESCE(stripe_customer_id, ?) WHERE id = ?').run(customerId, user.id);
      }

      if (user) {
        const planType = session.subscription ? 'subscription' : 'onetime';
        db.prepare(
          `INSERT INTO subscriptions (user_id, stripe_subscription_id, stripe_customer_id, plan_type, status)
           VALUES (?, ?, ?, ?, 'active')`
        ).run(user.id, session.subscription || null, customerId, planType);
      }

      logger.info({ email, subscription: session.subscription, customerId }, 'Checkout completed');
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      db.prepare(
        `UPDATE subscriptions SET status = 'cancelled' WHERE stripe_subscription_id = ?`
      ).run(sub.id);
      logger.info({ subscriptionId: sub.id, customer: sub.customer }, 'Subscription cancelled');
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      db.prepare(
        `UPDATE subscriptions SET status = 'payment_failed' WHERE stripe_subscription_id = ?`
      ).run(invoice.subscription);
      logger.info({ subscriptionId: invoice.subscription, customer: invoice.customer }, 'Payment failed');
      break;
    }
    default:
      logger.info({ type: event.type }, 'Unhandled webhook event');
  }

  res.json({ received: true });
});

export default router;
