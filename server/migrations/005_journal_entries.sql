CREATE TABLE IF NOT EXISTS journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  prompt TEXT,
  content TEXT NOT NULL,
  ai_reflection TEXT,
  dimension TEXT,
  mood TEXT,
  source TEXT DEFAULT 'chat',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS cloud_sync_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expiry TEXT,
  dropbox_access_token TEXT,
  dropbox_refresh_token TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
