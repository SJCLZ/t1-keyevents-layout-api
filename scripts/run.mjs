import { config } from 'dotenv';
config({ path: '/Users/lz/Documents/Mixlab Project/20260708_内容skill/layout-api/.env.local', override: true });
import { Pool } from '@neondatabase/serverless';
const url = process.env.DATABASE_URL;
console.log('URL prefix:', url?.slice(0, 50));
const p = new Pool({ connectionString: url });
try {
  const r = await p.query('SELECT 1 as x');
  console.log('ping:', r.rows);
  const r2 = await p.query(`CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    lang TEXT NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    data BYTEA NOT NULL,
    content_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    sha TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (lang, type, name)
  )`);
  console.log('create OK');
  const r3 = await p.query('SELECT count(*)::int as n FROM assets');
  console.log('current assets:', r3.rows);
} catch (e) {
  console.error('FAILED name:', e.name);
  console.error('FAILED msg:', e.message);
  console.error('FAILED stack:', e.stack);
}