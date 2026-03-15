import { Router } from 'express';
import { dbGet, dbRun, dbAll } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import logger from '../logger.js';

const router = Router();

// POST /api/sessions/migrate — push localStorage session to server
router.post('/migrate', requireAuth, async (req, res) => {
  const {
    scores, persona, clinicalMode, chatMessages, chatSummary, messageCount,
    assessmentMethod, sliderResponses, scoreRationale, userModalities,
    userModalitiesOther, userContext, probingMessages, socraticMessages,
  } = req.body;

  const existing = await dbGet(
    'SELECT id FROM sessions WHERE user_id = ? AND archived = 0 LIMIT 1',
    req.user.id
  );
  if (existing) {
    return res.json({ success: true, migrated: false, message: 'Session already exists' });
  }

  await dbRun(
    `INSERT INTO sessions (user_id, scores_json, persona, clinical_mode, chat_messages_json,
      chat_summary, message_count, assessment_method, slider_responses_json, score_rationale,
      user_modalities_json, user_modalities_other, user_context, probing_messages_json,
      socratic_messages_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    req.user.id,
    scores ? JSON.stringify(scores) : null,
    persona || null,
    clinicalMode ? 1 : 0,
    chatMessages ? JSON.stringify(chatMessages) : null,
    chatSummary || null,
    messageCount || 0,
    assessmentMethod || null,
    sliderResponses ? JSON.stringify(sliderResponses) : null,
    scoreRationale || null,
    userModalities ? JSON.stringify(userModalities) : null,
    userModalitiesOther || null,
    userContext || null,
    probingMessages ? JSON.stringify(probingMessages) : null,
    socraticMessages ? JSON.stringify(socraticMessages) : null,
  );

  logger.info({ userId: req.user.id }, 'Session migrated from localStorage');
  res.json({ success: true, migrated: true });
});

// GET /api/sessions/current
router.get('/current', requireAuth, async (req, res) => {
  const session = await dbGet(
    'SELECT * FROM sessions WHERE user_id = ? AND archived = 0 ORDER BY updated_at DESC LIMIT 1',
    req.user.id
  );

  if (!session) return res.json({ session: null });

  res.json({
    session: {
      id: session.id,
      scores: session.scores_json ? JSON.parse(session.scores_json) : null,
      persona: session.persona,
      clinicalMode: !!session.clinical_mode,
      chatMessages: session.chat_messages_json ? JSON.parse(session.chat_messages_json) : [],
      chatSummary: session.chat_summary,
      messageCount: session.message_count,
      assessmentMethod: session.assessment_method || null,
      sliderResponses: session.slider_responses_json ? JSON.parse(session.slider_responses_json) : null,
      scoreRationale: session.score_rationale || null,
      userModalities: session.user_modalities_json ? JSON.parse(session.user_modalities_json) : [],
      userModalitiesOther: session.user_modalities_other || null,
      userContext: session.user_context || null,
      probingMessages: session.probing_messages_json ? JSON.parse(session.probing_messages_json) : [],
      socraticMessages: session.socratic_messages_json ? JSON.parse(session.socratic_messages_json) : [],
    }
  });
});

// PUT /api/sessions/current — update session
router.put('/current', requireAuth, async (req, res) => {
  const {
    scores, persona, clinicalMode, chatMessages, chatSummary, messageCount,
    assessmentMethod, sliderResponses, scoreRationale, userModalities,
    userModalitiesOther, userContext, probingMessages, socraticMessages,
  } = req.body;

  const existing = await dbGet(
    'SELECT id FROM sessions WHERE user_id = ? AND archived = 0 ORDER BY updated_at DESC LIMIT 1',
    req.user.id
  );

  const params = [
    scores ? JSON.stringify(scores) : null,
    persona || null,
    clinicalMode ? 1 : 0,
    chatMessages ? JSON.stringify(chatMessages) : null,
    chatSummary || null,
    messageCount || 0,
    assessmentMethod || null,
    sliderResponses ? JSON.stringify(sliderResponses) : null,
    scoreRationale || null,
    userModalities ? JSON.stringify(userModalities) : null,
    userModalitiesOther || null,
    userContext || null,
    probingMessages ? JSON.stringify(probingMessages) : null,
    socraticMessages ? JSON.stringify(socraticMessages) : null,
  ];

  if (existing) {
    await dbRun(
      `UPDATE sessions SET scores_json = ?, persona = ?, clinical_mode = ?,
       chat_messages_json = ?, chat_summary = ?, message_count = ?,
       assessment_method = ?, slider_responses_json = ?, score_rationale = ?,
       user_modalities_json = ?, user_modalities_other = ?, user_context = ?,
       probing_messages_json = ?, socratic_messages_json = ?,
       updated_at = datetime('now')
       WHERE id = ?`,
      ...params, existing.id
    );
  } else {
    await dbRun(
      `INSERT INTO sessions (user_id, scores_json, persona, clinical_mode, chat_messages_json,
        chat_summary, message_count, assessment_method, slider_responses_json, score_rationale,
        user_modalities_json, user_modalities_other, user_context, probing_messages_json,
        socratic_messages_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      req.user.id, ...params
    );
  }

  res.json({ success: true });
});

// POST /api/sessions/archive — archive current session (called before reset)
router.post('/archive', requireAuth, async (req, res) => {
  const existing = await dbGet(
    'SELECT id FROM sessions WHERE user_id = ? AND archived = 0 ORDER BY updated_at DESC LIMIT 1',
    req.user.id
  );

  if (!existing) {
    return res.json({ success: true, archived: false, message: 'No active session to archive' });
  }

  await dbRun(
    'UPDATE sessions SET archived = 1, updated_at = datetime(\'now\') WHERE id = ?',
    existing.id
  );

  logger.info({ userId: req.user.id, sessionId: existing.id }, 'Session archived');
  res.json({ success: true, archived: true });
});

// GET /api/sessions/history — list all sessions (including archived) for the user
router.get('/history', requireAuth, async (req, res) => {
  const sessions = await dbAll(
    `SELECT id, scores_json, persona, assessment_method, message_count, archived,
     created_at, updated_at
     FROM sessions WHERE user_id = ? ORDER BY created_at DESC`,
    req.user.id
  );

  res.json({
    sessions: sessions.map(s => ({
      id: s.id,
      scores: s.scores_json ? JSON.parse(s.scores_json) : null,
      persona: s.persona,
      assessmentMethod: s.assessment_method,
      messageCount: s.message_count,
      archived: !!s.archived,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }))
  });
});

// Dimension metadata for export formatting
const DIMENSIONS = [
  { id: "relational_field", label: "Relational Field" },
  { id: "capacity_building", label: "Capacity Building" },
  { id: "physiological_completion", label: "Physiological Completion" },
  { id: "affect_metabolization", label: "Affect Metabolization" },
  { id: "differentiation", label: "Differentiation" },
  { id: "implicit_model_updating", label: "Implicit Model Updating" },
  { id: "identity_reorganization", label: "Identity Reorganization" },
  { id: "energetic_reorganization", label: "Energetic Reorganization" },
  { id: "shadow_integration", label: "Shadow Integration" },
  { id: "nondual_view", label: "Nondual View" },
];
const TIER_LABELS = ["", "Exemplary", "Strong", "Moderate", "Developing", "Emerging", "Minimal", "Harmful"];

function formatSessionMarkdown(session, email, index) {
  const lines = [];
  const label = index !== undefined ? ` #${index + 1}` : '';
  const archived = session.archived ? ' (Archived)' : ' (Current)';
  lines.push(`## Session${label}${archived}`);
  lines.push(`- **Created:** ${session.created_at || 'Unknown'}`);
  lines.push(`- **Last Updated:** ${session.updated_at || 'Unknown'}`);
  if (session.persona) lines.push(`- **Persona:** ${session.persona}`);
  if (session.assessment_method) lines.push(`- **Assessment Method:** ${session.assessment_method}`);
  lines.push(`- **Clinical Mode:** ${session.clinical_mode ? 'Yes' : 'No'}`);
  lines.push(`- **Message Count:** ${session.message_count || 0}`);
  lines.push('');

  // Scores
  const scores = session.scores_json ? JSON.parse(session.scores_json) : null;
  if (scores) {
    lines.push('### Dimension Scores');
    for (const dim of DIMENSIONS) {
      const tier = scores[dim.id];
      if (tier !== undefined) {
        lines.push(`- **${dim.label}:** Tier ${tier} (${TIER_LABELS[tier] || 'N/A'})`);
      }
    }
    lines.push('');
  }

  // Score rationale
  if (session.score_rationale) {
    lines.push('### Score Rationale');
    lines.push(session.score_rationale);
    lines.push('');
  }

  // User context
  if (session.user_context) {
    lines.push('### User Context');
    lines.push(session.user_context);
    lines.push('');
  }

  // Modalities
  const modalities = session.user_modalities_json ? JSON.parse(session.user_modalities_json) : [];
  if (modalities.length > 0) {
    lines.push('### Selected Modalities');
    modalities.forEach(m => lines.push(`- ${m}`));
    if (session.user_modalities_other) lines.push(`- Other: ${session.user_modalities_other}`);
    lines.push('');
  }

  // Probing conversation
  const probing = session.probing_messages_json ? JSON.parse(session.probing_messages_json) : [];
  if (probing.length > 0) {
    lines.push('### Probing Conversation');
    probing.forEach(m => lines.push(`**${m.role === 'user' ? 'You' : 'Guide'}:** ${m.content}`));
    lines.push('');
  }

  // Socratic conversation
  const socratic = session.socratic_messages_json ? JSON.parse(session.socratic_messages_json) : [];
  if (socratic.length > 0) {
    lines.push('### Socratic Assessment Conversation');
    socratic.forEach(m => lines.push(`**${m.role === 'user' ? 'You' : 'Guide'}:** ${m.content}`));
    lines.push('');
  }

  // Chat summary
  if (session.chat_summary) {
    lines.push('### Conversation Summary');
    lines.push(session.chat_summary);
    lines.push('');
  }

  // Chat messages
  const chatMsgs = session.chat_messages_json ? JSON.parse(session.chat_messages_json) : [];
  if (chatMsgs.length > 0) {
    lines.push('### Coaching Conversation');
    chatMsgs.forEach(m => lines.push(`**${m.role === 'user' ? 'You' : 'Guide'}:** ${m.content}`));
    lines.push('');
  }

  return lines.join('\n');
}

// GET /api/sessions/export — export all user data as markdown
router.get('/export', requireAuth, async (req, res) => {
  const user = await dbGet('SELECT email, created_at FROM users WHERE id = ?', req.user.id);
  const sessions = await dbAll(
    'SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at ASC',
    req.user.id
  );

  const lines = [
    '# Healing Spiral — Complete Context Export',
    '',
    `**Email:** ${user?.email || 'Unknown'}`,
    `**Account Created:** ${user?.created_at || 'Unknown'}`,
    `**Total Sessions:** ${sessions.length}`,
    `**Export Date:** ${new Date().toISOString().split('T')[0]}`,
    '',
    '---',
    '',
  ];

  sessions.forEach((s, i) => {
    lines.push(formatSessionMarkdown(s, user?.email, i));
    lines.push('---');
    lines.push('');
  });

  const markdown = lines.join('\n');
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="healing-spiral-export-${new Date().toISOString().split('T')[0]}.md"`);
  res.send(markdown);
});

// POST /api/sessions/summarize — AI summary of all user context
router.post('/summarize', requireAuth, async (req, res) => {
  const sessions = await dbAll(
    'SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at ASC',
    req.user.id
  );

  if (sessions.length === 0) {
    return res.json({ summary: 'No session data found to summarize.' });
  }

  // Build context from all sessions
  const contextParts = sessions.map((s, i) => formatSessionMarkdown(s, null, i));
  const fullContext = contextParts.join('\n---\n');

  // Truncate if too long (keep under ~8k tokens worth)
  const truncated = fullContext.length > 20000 ? fullContext.slice(0, 20000) + '\n\n[...truncated]' : fullContext;

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
        system: `You are a compassionate healing guide summarizing a person's healing journey. Write a warm, insightful summary that covers:
1. Their overall healing profile — strengths and growth edges
2. Key themes from their conversations and assessments
3. How their journey has evolved across sessions (if multiple)
4. Gentle observations about patterns or opportunities

Keep it personal, warm, and under 500 words. Use second person ("you").`,
        messages: [{ role: 'user', content: `Here is my complete healing context:\n\n${truncated}` }],
      }),
    });

    const data = await apiResponse.json();
    if (!apiResponse.ok) {
      logger.error({ status: apiResponse.status, data }, 'Summarize API error');
      return res.status(500).json({ error: 'Failed to generate summary' });
    }

    // Log usage
    if (data.usage) {
      dbRun(
        'INSERT INTO usage_log (user_id, input_tokens, output_tokens, model) VALUES (?, ?, ?, ?)',
        req.user.id, data.usage.input_tokens || 0, data.usage.output_tokens || 0, data.model || 'unknown'
      ).catch(() => {});
    }

    const summary = data.content?.[0]?.text || 'Unable to generate summary.';
    res.json({ summary });
  } catch (err) {
    logger.error({ err }, 'Summarize request failed');
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// DELETE /api/sessions/all — permanently delete all user sessions from server
router.delete('/all', requireAuth, async (req, res) => {
  const result = await dbRun('DELETE FROM sessions WHERE user_id = ?', req.user.id);
  logger.info({ userId: req.user.id, deleted: result.rowsAffected }, 'All sessions deleted by user');
  res.json({ success: true, deleted: result.rowsAffected });
});

export default router;
