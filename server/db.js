import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let client;

function createDbClient() {
  if (process.env.TURSO_DATABASE_URL) {
    return createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  // Local SQLite fallback for development
  const dataDir = process.env.DATA_DIR || path.join(__dirname, '..');
  return createClient({ url: `file:${path.join(dataDir, 'healing-spiral.db')}` });
}

export async function initDb() {
  client = createDbClient();
  await runMigrations();
  return client;
}

export function getClient() {
  if (!client) throw new Error('Database not initialized. Call initDb() first.');
  return client;
}

// Helper: get single row
export async function dbGet(sql, ...args) {
  const result = await client.execute({ sql, args });
  return result.rows[0] || null;
}

// Helper: get all rows
export async function dbAll(sql, ...args) {
  const result = await client.execute({ sql, args });
  return result.rows;
}

// Helper: run insert/update/delete
export async function dbRun(sql, ...args) {
  const result = await client.execute({ sql, args });
  return {
    lastInsertRowid: result.lastInsertRowid != null ? Number(result.lastInsertRowid) : null,
    rowsAffected: result.rowsAffected,
  };
}

// Helper: execute raw SQL (multiple statements)
export async function dbExec(sql) {
  await client.executeMultiple(sql);
}

async function runMigrations() {
  await dbExec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now'))
  )`);

  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) return;

  const applied = new Set(
    (await dbAll('SELECT version FROM schema_migrations')).map(r => r.version)
  );

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const version = parseInt(file.split('_')[0], 10);
    if (applied.has(version)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await dbExec(sql);
    await dbRun('INSERT INTO schema_migrations (version) VALUES (?)', version);
  }
}
