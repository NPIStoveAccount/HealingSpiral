import { Router } from 'express';
import { dbGet, dbRun, dbAll } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import logger from '../logger.js';

const router = Router();

// GET /api/journal — list all entries (newest first, paginated)
router.get('/', requireAuth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;

  const entries = await dbAll(
    `SELECT * FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    req.user.id, limit, offset
  );

  const countRow = await dbGet(
    'SELECT COUNT(*) as total FROM journal_entries WHERE user_id = ?',
    req.user.id
  );

  res.json({
    entries: entries.map(formatEntry),
    total: countRow?.total || 0,
  });
});

// POST /api/journal — create new entry
router.post('/', requireAuth, async (req, res) => {
  const { content, prompt, dimension, mood, source } = req.body;

  if (!content?.trim()) {
    return res.status(400).json({ error: 'Content is required' });
  }

  const result = await dbRun(
    `INSERT INTO journal_entries (user_id, content, prompt, dimension, mood, source)
     VALUES (?, ?, ?, ?, ?, ?)`,
    req.user.id,
    content.trim(),
    prompt || null,
    dimension || null,
    mood || null,
    source || 'direct'
  );

  const entry = await dbGet('SELECT * FROM journal_entries WHERE id = ?', result.lastInsertRowid);
  logger.info({ userId: req.user.id, entryId: result.lastInsertRowid }, 'Journal entry created');
  res.json({ entry: formatEntry(entry) });
});

// PUT /api/journal/:id — update entry content
router.put('/:id', requireAuth, async (req, res) => {
  const { content, mood, dimension } = req.body;

  const entry = await dbGet(
    'SELECT id FROM journal_entries WHERE id = ? AND user_id = ?',
    req.params.id, req.user.id
  );
  if (!entry) return res.status(404).json({ error: 'Entry not found' });

  const updates = [];
  const params = [];
  if (content !== undefined) { updates.push('content = ?'); params.push(content.trim()); }
  if (mood !== undefined) { updates.push('mood = ?'); params.push(mood || null); }
  if (dimension !== undefined) { updates.push('dimension = ?'); params.push(dimension || null); }
  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);

  await dbRun(`UPDATE journal_entries SET ${updates.join(', ')} WHERE id = ?`, ...params);

  const updated = await dbGet('SELECT * FROM journal_entries WHERE id = ?', req.params.id);
  res.json({ entry: formatEntry(updated) });
});

// DELETE /api/journal/:id — delete entry
router.delete('/:id', requireAuth, async (req, res) => {
  const entry = await dbGet(
    'SELECT id FROM journal_entries WHERE id = ? AND user_id = ?',
    req.params.id, req.user.id
  );
  if (!entry) return res.status(404).json({ error: 'Entry not found' });

  await dbRun('DELETE FROM journal_entries WHERE id = ?', req.params.id);
  res.json({ success: true });
});

// GET /api/journal/export — export all entries as markdown
router.get('/export', requireAuth, async (req, res) => {
  const user = await dbGet('SELECT email FROM users WHERE id = ?', req.user.id);
  const entries = await dbAll(
    'SELECT * FROM journal_entries WHERE user_id = ? ORDER BY created_at ASC',
    req.user.id
  );

  const lines = [
    '# Healing Spiral Journal',
    '',
    `**Author:** ${user?.email || 'Unknown'}`,
    `**Entries:** ${entries.length}`,
    `**Export Date:** ${new Date().toISOString().split('T')[0]}`,
    '',
    '---',
    '',
  ];

  for (const e of entries) {
    const date = e.created_at ? new Date(e.created_at + 'Z').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }) : 'Unknown date';
    lines.push(`## ${date}${e.mood ? ' ' + e.mood : ''}`);
    if (e.dimension) lines.push(`*Dimension: ${e.dimension}*`);
    if (e.prompt) lines.push(`> **Prompt:** ${e.prompt}`);
    lines.push('');
    lines.push(e.content);
    if (e.ai_reflection) {
      lines.push('');
      lines.push(`**Reflection:** ${e.ai_reflection}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  const markdown = lines.join('\n');
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="healing-spiral-journal-${new Date().toISOString().split('T')[0]}.md"`);
  res.send(markdown);
});

// POST /api/journal/:id/reflect — AI reflection on an entry (paid feature)
router.post('/:id/reflect', requireAuth, async (req, res) => {
  // Check subscription
  const sub = await dbGet(
    `SELECT id FROM subscriptions WHERE user_id = ? AND status = 'active' LIMIT 1`,
    req.user.id
  );
  const userRow = await dbGet('SELECT role FROM users WHERE id = ?', req.user.id);
  if (!sub && userRow?.role !== 'admin') {
    return res.status(403).json({ error: 'Subscription required for AI reflections', requiresSubscription: true });
  }

  const entry = await dbGet(
    'SELECT * FROM journal_entries WHERE id = ? AND user_id = ?',
    req.params.id, req.user.id
  );
  if (!entry) return res.status(404).json({ error: 'Entry not found' });

  try {
    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: `You are a compassionate healing guide reflecting on a journal entry. Offer a brief, warm reflection (2-4 sentences) that:
1. Mirrors back what you notice in their writing — emotions, patterns, or shifts
2. Names something they may not have seen themselves
3. Gently invites further exploration if appropriate

Be concise, warm, and non-prescriptive. Don't diagnose or fix — just reflect.${entry.dimension ? ` This entry relates to the "${entry.dimension}" dimension of the Healing Spiral framework.` : ''}`,
        messages: [{ role: 'user', content: entry.content }],
      }),
    });

    const data = await apiResponse.json();
    if (!apiResponse.ok) {
      logger.error({ status: apiResponse.status, data }, 'Journal reflect API error');
      return res.status(500).json({ error: 'Failed to generate reflection' });
    }

    // Log usage
    if (data.usage) {
      dbRun(
        'INSERT INTO usage_log (user_id, input_tokens, output_tokens, model) VALUES (?, ?, ?, ?)',
        req.user.id, data.usage.input_tokens || 0, data.usage.output_tokens || 0, data.model || 'unknown'
      ).catch(() => {});
    }

    const reflection = data.content?.[0]?.text || '';
    await dbRun(
      "UPDATE journal_entries SET ai_reflection = ?, updated_at = datetime('now') WHERE id = ?",
      reflection, entry.id
    );

    res.json({ reflection });
  } catch (err) {
    logger.error({ err }, 'Journal reflect request failed');
    res.status(500).json({ error: 'Failed to generate reflection' });
  }
});

// POST /api/journal/summarize — AI summary of recent journal entries (paid feature)
router.post('/summarize', requireAuth, async (req, res) => {
  const sub = await dbGet(
    `SELECT id FROM subscriptions WHERE user_id = ? AND status = 'active' LIMIT 1`,
    req.user.id
  );
  const userRow = await dbGet('SELECT role FROM users WHERE id = ?', req.user.id);
  if (!sub && userRow?.role !== 'admin') {
    return res.status(403).json({ error: 'Subscription required for AI summaries', requiresSubscription: true });
  }

  const entries = await dbAll(
    'SELECT * FROM journal_entries WHERE user_id = ? ORDER BY created_at ASC',
    req.user.id
  );

  if (entries.length === 0) {
    return res.json({ summary: 'No journal entries found to summarize.' });
  }

  const context = entries.map(e => {
    const date = e.created_at || 'Unknown date';
    let text = `[${date}]${e.mood ? ' ' + e.mood : ''}`;
    if (e.dimension) text += ` (${e.dimension})`;
    if (e.prompt) text += `\nPrompt: ${e.prompt}`;
    text += `\n${e.content}`;
    return text;
  }).join('\n\n---\n\n');

  const truncated = context.length > 20000 ? context.slice(0, 20000) + '\n\n[...truncated]' : context;

  try {
    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: `You are a compassionate healing guide summarizing someone's journal journey. Write a warm, insightful summary that:
1. Identifies recurring themes and emotional patterns
2. Notes any shifts or growth over time
3. Highlights moments of particular depth or insight
4. Gently names what seems to be emerging

Keep it personal, warm, and under 400 words. Use second person ("you").`,
        messages: [{ role: 'user', content: `Here are my journal entries:\n\n${truncated}` }],
      }),
    });

    const data = await apiResponse.json();
    if (!apiResponse.ok) {
      return res.status(500).json({ error: 'Failed to generate summary' });
    }

    if (data.usage) {
      dbRun(
        'INSERT INTO usage_log (user_id, input_tokens, output_tokens, model) VALUES (?, ?, ?, ?)',
        req.user.id, data.usage.input_tokens || 0, data.usage.output_tokens || 0, data.model || 'unknown'
      ).catch(() => {});
    }

    res.json({ summary: data.content?.[0]?.text || 'Unable to generate summary.' });
  } catch (err) {
    logger.error({ err }, 'Journal summarize failed');
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

function formatEntry(row) {
  if (!row) return null;
  return {
    id: row.id,
    prompt: row.prompt,
    content: row.content,
    aiReflection: row.ai_reflection,
    dimension: row.dimension,
    mood: row.mood,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default router;
