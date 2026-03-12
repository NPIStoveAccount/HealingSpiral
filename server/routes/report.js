import { Router } from 'express';
import { Resend } from 'resend';
import { buildEmailHTML } from '../email-template.js';

const router = Router();

router.post('/', async (req, res) => {
  const { email, scores, dimensions, tierLabels, modalities, pdfBase64 } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn('[report] RESEND_API_KEY not set, skipping email');
    return res.json({ success: true, skipped: true });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const attachments = [];
  if (pdfBase64) {
    attachments.push({
      filename: 'healing-spiral-profile.pdf',
      content: Buffer.from(pdfBase64, 'base64'),
    });
  }

  try {
    const html = buildEmailHTML({ scores, dimensions, tierLabels, modalities });

    await resend.emails.send({
      from: `Healing Spiral <${process.env.FROM_EMAIL || 'onboarding@resend.dev'}>`,
      to: email,
      subject: 'Your Healing Spiral Profile',
      html,
      attachments,
    });

    console.log(`[report] email sent to ${email}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[report] email error:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

export default router;
