import { Router } from 'express';
import Stripe from 'stripe';

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
    console.error('[webhook] signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log(`[webhook] Subscription started for ${session.customer_email} (sub: ${session.subscription})`);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      console.log(`[webhook] Subscription cancelled: ${sub.id} (customer: ${sub.customer})`);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      console.log(`[webhook] Payment failed for subscription ${invoice.subscription} (customer: ${invoice.customer})`);
      break;
    }
    default:
      console.log(`[webhook] Unhandled event: ${event.type}`);
  }

  res.json({ received: true });
});

export default router;
