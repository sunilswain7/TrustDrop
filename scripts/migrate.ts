/**
 * scripts/migrate.ts — apply pending migrations on boot.
 *
 * Reads migrations/*.sql in alphabetical order. Tracks applied filenames in
 * a `_migrations` table so reruns are no-ops. Designed to be run before
 * `next start` in production.
 *
 *   npx tsx scripts/migrate.ts
 */

import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';

const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('[migrate] DATABASE_URL is not set');
    process.exit(1);
  }

  const isLocal = /(?:localhost|127\.0\.0\.1)/.test(process.env.DATABASE_URL);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `);

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let applied = 0;
  for (const f of files) {
    const seen = await pool.query('SELECT 1 FROM _migrations WHERE filename = $1', [f]);
    if (seen.rows.length) {
      console.log(`[migrate] skip ${f}`);
      continue;
    }
    const sql = await readFile(path.join(MIGRATIONS_DIR, f), 'utf8');
    console.log(`[migrate] applying ${f}…`);
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO _migrations (filename) VALUES ($1)', [f]);
      await pool.query('COMMIT');
      applied++;
      console.log(`[migrate] applied ${f}`);
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error(`[migrate] failed ${f}:`, err);
      throw err;
    }
  }

  await pool.end();
  console.log(`[migrate] done — ${applied} new, ${files.length - applied} already applied`);
}

main().catch((err) => {
  console.error('[migrate] fatal', err);
  process.exit(1);
});
