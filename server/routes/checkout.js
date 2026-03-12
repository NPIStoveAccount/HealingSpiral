import { Router } from 'express';
import Stripe from 'stripe';

const router = Router();

router.post('/', async (req, res) => {
  const { email, returnUrl } = req.body;

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
    return res.status(500).json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID to .env' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email || undefined,
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      }],
      success_url: `${returnUrl || 'http://localhost:5173'}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl || 'http://localhost:5173'}?payment=cancelled`,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[checkout] error:', err.message);
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
    res.json({ paid: session.payment_status === 'paid', email: session.customer_email });
  } catch (err) {
    console.error('[checkout/verify] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
