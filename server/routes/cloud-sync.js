import { Router } from 'express';
import { dbGet, dbRun, dbAll } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import logger from '../logger.js';

const router = Router();

// ── GOOGLE DRIVE ──────────────────────────────────────────────────────────

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

// GET /api/cloud-sync/google/auth — start OAuth flow
router.get('/google/auth', requireAuth, (req, res) => {
  if (!GOOGLE_CLIENT_ID) return res.status(501).json({ error: 'Google Drive not configured' });

  const state = Buffer.from(JSON.stringify({ userId: req.user.id })).toString('base64url');
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.file',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
});

// GET /api/cloud-sync/google/callback — handle OAuth callback
router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) return res.status(400).send('Missing code or state');

  let userId;
  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString());
    userId = parsed.userId;
  } catch {
    return res.status(400).send('Invalid state');
  }

  try {
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResp.json();
    if (!tokenResp.ok) {
      logger.error({ tokens }, 'Google token exchange failed');
      return res.status(500).send('Token exchange failed');
    }

    const expiry = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

    const existing = await dbGet('SELECT id FROM cloud_sync_tokens WHERE user_id = ?', userId);
    if (existing) {
      await dbRun(
        `UPDATE cloud_sync_tokens SET google_access_token = ?, google_refresh_token = COALESCE(?, google_refresh_token),
         google_token_expiry = ?, updated_at = datetime('now') WHERE user_id = ?`,
        tokens.access_token, tokens.refresh_token || null, expiry, userId
      );
    } else {
      await dbRun(
        `INSERT INTO cloud_sync_tokens (user_id, google_access_token, google_refresh_token, google_token_expiry)
         VALUES (?, ?, ?, ?)`,
        userId, tokens.access_token, tokens.refresh_token || null, expiry
      );
    }

    logger.info({ userId }, 'Google Drive connected');
    // Redirect back to app with success indicator
    res.send('<html><body><script>window.opener?.postMessage("google-drive-connected","*");window.close();</script><p>Google Drive connected! You can close this window.</p></body></html>');
  } catch (err) {
    logger.error({ err }, 'Google OAuth callback error');
    res.status(500).send('Connection failed');
  }
});

// POST /api/cloud-sync/google/sync — sync journal to Google Drive
router.post('/google/sync', requireAuth, async (req, res) => {
  const tokens = await dbGet('SELECT * FROM cloud_sync_tokens WHERE user_id = ?', req.user.id);
  if (!tokens?.google_access_token) {
    return res.status(400).json({ error: 'Google Drive not connected' });
  }

  let accessToken = tokens.google_access_token;

  // Refresh if expired
  if (tokens.google_token_expiry && new Date(tokens.google_token_expiry) < new Date()) {
    if (!tokens.google_refresh_token) {
      return res.status(401).json({ error: 'Google Drive token expired. Please reconnect.' });
    }
    try {
      const refreshResp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: tokens.google_refresh_token,
          grant_type: 'refresh_token',
        }),
      });
      const refreshed = await refreshResp.json();
      if (!refreshResp.ok) throw new Error('Refresh failed');

      accessToken = refreshed.access_token;
      const newExpiry = new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString();
      await dbRun(
        "UPDATE cloud_sync_tokens SET google_access_token = ?, google_token_expiry = ?, updated_at = datetime('now') WHERE user_id = ?",
        accessToken, newExpiry, req.user.id
      );
    } catch (err) {
      logger.error({ err }, 'Google token refresh failed');
      return res.status(401).json({ error: 'Token refresh failed. Please reconnect Google Drive.' });
    }
  }

  try {
    // Build journal markdown
    const entries = await dbAll(
      'SELECT * FROM journal_entries WHERE user_id = ? ORDER BY created_at ASC',
      req.user.id
    );
    const user = await dbGet('SELECT email FROM users WHERE id = ?', req.user.id);
    const markdown = buildJournalMarkdown(entries, user?.email);

    // Find or create folder
    const folderId = await findOrCreateFolder(accessToken, 'Healing Spiral Journal');

    // Find existing file or create new
    const fileId = await findFile(accessToken, folderId, 'journal.md');

    if (fileId) {
      await updateFile(accessToken, fileId, markdown);
    } else {
      await createFile(accessToken, folderId, 'journal.md', markdown);
    }

    logger.info({ userId: req.user.id, entries: entries.length }, 'Google Drive sync complete');
    res.json({ success: true, entries: entries.length });
  } catch (err) {
    logger.error({ err }, 'Google Drive sync failed');
    res.status(500).json({ error: 'Sync failed: ' + err.message });
  }
});

// DELETE /api/cloud-sync/google/disconnect — remove Google Drive connection
router.delete('/google/disconnect', requireAuth, async (req, res) => {
  await dbRun(
    "UPDATE cloud_sync_tokens SET google_access_token = NULL, google_refresh_token = NULL, google_token_expiry = NULL, updated_at = datetime('now') WHERE user_id = ?",
    req.user.id
  );
  res.json({ success: true });
});

// ── DROPBOX ───────────────────────────────────────────────────────────────

const DROPBOX_CLIENT_ID = process.env.DROPBOX_CLIENT_ID;
const DROPBOX_CLIENT_SECRET = process.env.DROPBOX_CLIENT_SECRET;
const DROPBOX_REDIRECT_URI = process.env.DROPBOX_REDIRECT_URI;

// GET /api/cloud-sync/dropbox/auth — start OAuth flow
router.get('/dropbox/auth', requireAuth, (req, res) => {
  if (!DROPBOX_CLIENT_ID) return res.status(501).json({ error: 'Dropbox not configured' });

  const state = Buffer.from(JSON.stringify({ userId: req.user.id })).toString('base64url');
  const params = new URLSearchParams({
    client_id: DROPBOX_CLIENT_ID,
    redirect_uri: DROPBOX_REDIRECT_URI,
    response_type: 'code',
    token_access_type: 'offline',
    state,
  });

  res.json({ url: `https://www.dropbox.com/oauth2/authorize?${params}` });
});

// GET /api/cloud-sync/dropbox/callback — handle OAuth callback
router.get('/dropbox/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) return res.status(400).send('Missing code or state');

  let userId;
  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString());
    userId = parsed.userId;
  } catch {
    return res.status(400).send('Invalid state');
  }

  try {
    const tokenResp = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: DROPBOX_CLIENT_ID,
        client_secret: DROPBOX_CLIENT_SECRET,
        redirect_uri: DROPBOX_REDIRECT_URI,
      }),
    });

    const tokens = await tokenResp.json();
    if (!tokenResp.ok) {
      logger.error({ tokens }, 'Dropbox token exchange failed');
      return res.status(500).send('Token exchange failed');
    }

    const existing = await dbGet('SELECT id FROM cloud_sync_tokens WHERE user_id = ?', userId);
    if (existing) {
      await dbRun(
        `UPDATE cloud_sync_tokens SET dropbox_access_token = ?, dropbox_refresh_token = COALESCE(?, dropbox_refresh_token),
         updated_at = datetime('now') WHERE user_id = ?`,
        tokens.access_token, tokens.refresh_token || null, userId
      );
    } else {
      await dbRun(
        'INSERT INTO cloud_sync_tokens (user_id, dropbox_access_token, dropbox_refresh_token) VALUES (?, ?, ?)',
        userId, tokens.access_token, tokens.refresh_token || null
      );
    }

    logger.info({ userId }, 'Dropbox connected');
    res.send('<html><body><script>window.opener?.postMessage("dropbox-connected","*");window.close();</script><p>Dropbox connected! You can close this window.</p></body></html>');
  } catch (err) {
    logger.error({ err }, 'Dropbox OAuth callback error');
    res.status(500).send('Connection failed');
  }
});

// POST /api/cloud-sync/dropbox/sync — sync journal to Dropbox
router.post('/dropbox/sync', requireAuth, async (req, res) => {
  const tokens = await dbGet('SELECT * FROM cloud_sync_tokens WHERE user_id = ?', req.user.id);
  if (!tokens?.dropbox_access_token) {
    return res.status(400).json({ error: 'Dropbox not connected' });
  }

  let accessToken = tokens.dropbox_access_token;

  // Try refresh if we have a refresh token
  if (tokens.dropbox_refresh_token) {
    try {
      const refreshResp = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokens.dropbox_refresh_token,
          client_id: DROPBOX_CLIENT_ID,
          client_secret: DROPBOX_CLIENT_SECRET,
        }),
      });
      if (refreshResp.ok) {
        const refreshed = await refreshResp.json();
        accessToken = refreshed.access_token;
        await dbRun(
          "UPDATE cloud_sync_tokens SET dropbox_access_token = ?, updated_at = datetime('now') WHERE user_id = ?",
          accessToken, req.user.id
        );
      }
    } catch {
      // Use existing token
    }
  }

  try {
    const entries = await dbAll(
      'SELECT * FROM journal_entries WHERE user_id = ? ORDER BY created_at ASC',
      req.user.id
    );
    const user = await dbGet('SELECT email FROM users WHERE id = ?', req.user.id);
    const markdown = buildJournalMarkdown(entries, user?.email);

    // Upload/overwrite file to Dropbox
    const uploadResp = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({
          path: '/Healing Spiral Journal/journal.md',
          mode: 'overwrite',
          autorename: false,
          mute: true,
        }),
        'Content-Type': 'application/octet-stream',
      },
      body: markdown,
    });

    if (!uploadResp.ok) {
      const err = await uploadResp.json().catch(() => ({}));
      throw new Error(err.error_summary || 'Upload failed');
    }

    logger.info({ userId: req.user.id, entries: entries.length }, 'Dropbox sync complete');
    res.json({ success: true, entries: entries.length });
  } catch (err) {
    logger.error({ err }, 'Dropbox sync failed');
    res.status(500).json({ error: 'Sync failed: ' + err.message });
  }
});

// DELETE /api/cloud-sync/dropbox/disconnect — remove Dropbox connection
router.delete('/dropbox/disconnect', requireAuth, async (req, res) => {
  await dbRun(
    "UPDATE cloud_sync_tokens SET dropbox_access_token = NULL, dropbox_refresh_token = NULL, updated_at = datetime('now') WHERE user_id = ?",
    req.user.id
  );
  res.json({ success: true });
});

// GET /api/cloud-sync/status — check which services are connected
router.get('/status', requireAuth, async (req, res) => {
  const tokens = await dbGet('SELECT * FROM cloud_sync_tokens WHERE user_id = ?', req.user.id);
  res.json({
    google: !!tokens?.google_access_token,
    dropbox: !!tokens?.dropbox_access_token,
  });
});

// ── HELPERS ───────────────────────────────────────────────────────────────

function buildJournalMarkdown(entries, email) {
  const lines = [
    '# Healing Spiral Journal',
    '',
    `**Author:** ${email || 'Unknown'}`,
    `**Entries:** ${entries.length}`,
    `**Last synced:** ${new Date().toISOString()}`,
    '',
    '---',
    '',
  ];

  for (const e of entries) {
    const date = e.created_at ? new Date(e.created_at + 'Z').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
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

  return lines.join('\n');
}

async function findOrCreateFolder(accessToken, name) {
  // Search for existing folder
  const searchResp = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`)}&fields=files(id)`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  const searchData = await searchResp.json();
  if (searchData.files?.length > 0) return searchData.files[0].id;

  // Create folder
  const createResp = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder' }),
  });
  const folder = await createResp.json();
  return folder.id;
}

async function findFile(accessToken, folderId, name) {
  const q = encodeURIComponent(`name='${name}' and '${folderId}' in parents and trashed=false`);
  const resp = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  const data = await resp.json();
  return data.files?.[0]?.id || null;
}

async function updateFile(accessToken, fileId, content) {
  await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'text/markdown',
    },
    body: content,
  });
}

async function createFile(accessToken, folderId, name, content) {
  const metadata = { name, parents: [folderId] };
  const boundary = 'healing_spiral_boundary';
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: text/markdown\r\n\r\n${content}\r\n--${boundary}--`;

  await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
}

export default router;
