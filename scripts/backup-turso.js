#!/usr/bin/env node

/**
 * Backup Turso cloud DB to a local SQLite file.
 * Usage: node scripts/backup-turso.js
 *
 * Creates timestamped backups in ~/Dropbox/HealingSpiral/backups/ and keeps the latest 7.
 */

import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

dotenv.config({ path: path.join(projectRoot, '.env') });

const HOME = process.env.HOME || '/Users/eli';
const BACKUP_DIR = path.join(HOME, 'Dropbox', 'HealingSpiral', 'backups');
const MAX_BACKUPS = 7;

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

if (!process.env.TURSO_DATABASE_URL) {
  console.error('TURSO_DATABASE_URL not set. Cannot backup.');
  process.exit(1);
}

async function main() {
  // Connect to remote Turso DB
  const remote = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // Create local backup file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}.db`);
  const local = createClient({ url: `file:${backupPath}` });

  console.log(`Backing up Turso DB to ${backupPath}...`);

  // Get all table names (excluding internal sqlite tables)
  const tables = await remote.execute(
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream_%'"
  );

  if (tables.rows.length === 0) {
    console.log('No tables found in remote DB.');
    process.exit(0);
  }

  // Recreate each table and copy data
  for (const table of tables.rows) {
    const tableName = table.name;
    const createSql = table.sql;

    // Create table in local DB
    await local.execute(createSql);
    console.log(`  Created table: ${tableName}`);

    // Read all rows from remote
    const rows = await remote.execute(`SELECT * FROM "${tableName}"`);

    if (rows.rows.length === 0) {
      console.log(`  ${tableName}: 0 rows`);
      continue;
    }

    // Insert rows into local DB
    const columns = rows.columns;
    const placeholders = columns.map(() => '?').join(', ');
    const insertSql = `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;

    let inserted = 0;
    for (const row of rows.rows) {
      const values = columns.map(col => row[col]);
      await local.execute({ sql: insertSql, args: values });
      inserted++;
    }
    console.log(`  ${tableName}: ${inserted} rows`);
  }

  // Also copy indexes
  const indexes = await remote.execute(
    "SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%'"
  );
  for (const idx of indexes.rows) {
    if (idx.sql) {
      await local.execute(idx.sql);
    }
  }

  console.log(`Backup complete: ${backupPath}`);

  // Prune old backups
  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-') && f.endsWith('.db'))
    .sort()
    .reverse();

  if (backups.length > MAX_BACKUPS) {
    for (const old of backups.slice(MAX_BACKUPS)) {
      fs.unlinkSync(path.join(BACKUP_DIR, old));
      console.log(`  Pruned old backup: ${old}`);
    }
  }

  console.log(`Keeping ${Math.min(backups.length, MAX_BACKUPS)} backups.`);
}

main().catch(err => {
  console.error('Backup failed:', err.message);
  process.exit(1);
});
