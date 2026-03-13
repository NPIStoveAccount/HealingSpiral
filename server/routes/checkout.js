import { Router } from 'express';
import Stripe from 'stripe';
import { optionalAuth } from '../middleware/auth.js';
import { dbGet } from '../db.js';
import logger from '../logger.js';

const router = Router();

router.post('/', optionalAuth, async (req, res) => {
  const { email, returnUrl, plan } = req.body;

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
    return res.status(500).json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID to .env' });
  }

  const isOnetime = plan === 'onetime';
  const priceId = isOnetime ? process.env.STRIPE_PRICE_ID_ONETIME : process.env.STRIPE_PRICE_ID;

  if (!priceId) {
    return res.status(500).json({ error: `Price not configured for plan: ${plan || 'subscription'}` });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // If authenticated user has a Stripe customer ID, use it
  let customer;
  if (req.user) {
    const user = await dbGet('SELECT stripe_customer_id FROM users WHERE id = ?', req.user.id);
    if (user?.stripe_customer_id) {
      customer = user.stripe_customer_id;
    }
  }

  try {
    const sessionParams = {
      mode: isOnetime ? 'payment' : 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${returnUrl || 'http://localhost:5173'}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl || 'http://localhost:5173'}?payment=cancelled`,
    };

    // Use existing Stripe customer if available, otherwise pass email
    if (customer) {
      sessionParams.customer = customer;
    } else if (email) {
      sessionParams.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    logger.error({ err }, 'Checkout error');
    res.status(500).json({ error: err.message });
  }
});

router.get('/verify', async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id required' });

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const paid = session.payment_status === 'paid' || !!session.subscription;
    res.json({ paid, email: session.customer_email, subscriptionId: session.subscription || null });
  } catch (err) {
    logger.error({ err }, 'Checkout verify error');
    res.status(500).json({ error: err.message });
  }
});

export default router;
