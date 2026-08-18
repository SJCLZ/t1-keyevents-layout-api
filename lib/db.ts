import { Pool, neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || '';

let _pool: Pool | null = null;
function pool() {
  if (!_pool) {
    if (!DATABASE_URL) throw new Error('DATABASE_URL not set');
    _pool = new Pool({ connectionString: DATABASE_URL });
  }
  return _pool;
}

export interface LayoutRow {
  lang: string;
  data: any;
  sha: string;
  updated_at: string;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS layouts (
    lang TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    sha TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    lang TEXT NOT NULL,
    type TEXT NOT NULL,         -- logo / font / gt_frame
    name TEXT NOT NULL,         -- startrader_logo_official.png / t003.000.png / ...
    data BYTEA NOT NULL,
    content_type TEXT NOT NULL, -- image/png / font/ttf
    size INTEGER NOT NULL,
    sha TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (lang, type, name)
  );
  CREATE INDEX IF NOT EXISTS idx_assets_lookup ON assets (lang, type);
`;

export async function ensureSchema(): Promise<void> {
  await pool().query(SCHEMA);
}

// ============= Assets CRUD =============

export interface AssetRow {
  id: number;
  lang: string;
  type: string;
  name: string;
  data: Buffer;
  content_type: string;
  size: number;
  sha: string;
  updated_at: string;
}

export async function listAssets(lang?: string, type?: string): Promise<Omit<AssetRow, 'data'>[]> {
  let q = 'SELECT id, lang, type, name, content_type, size, sha, updated_at FROM assets';
  const args: any[] = [];
  const conds: string[] = [];
  if (lang) { args.push(lang); conds.push(`lang = $${args.length}`); }
  if (type) { args.push(type); conds.push(`type = $${args.length}`); }
  if (conds.length) q += ' WHERE ' + conds.join(' AND ');
  q += ' ORDER BY lang, type, name';
  const { rows } = await pool().query(q, args);
  return rows;
}

export async function getAsset(lang: string, type: string, name: string): Promise<AssetRow | null> {
  const { rows } = await pool().query(
    'SELECT * FROM assets WHERE lang = $1 AND type = $2 AND name = $3 LIMIT 1',
    [lang, type, name],
  );
  return rows[0] || null;
}

export async function upsertAsset(
  lang: string,
  type: string,
  name: string,
  data: Buffer,
  contentType: string,
): Promise<{ sha: string; size: number }> {
  const sha = new Date().toISOString();
  const size = data.length;
  await pool().query(
    `INSERT INTO assets (lang, type, name, data, content_type, size, sha, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (lang, type, name) DO UPDATE SET
       data = EXCLUDED.data,
       content_type = EXCLUDED.content_type,
       size = EXCLUDED.size,
       sha = EXCLUDED.sha,
       updated_at = EXCLUDED.updated_at`,
    [lang, type, name, data, contentType, size, sha],
  );
  return { sha, size };
}

export async function listLayouts(): Promise<string[]> {
  const { rows } = await pool().query('SELECT lang FROM layouts ORDER BY lang');
  return rows.map((r: any) => r.lang as string);
}

export async function readLayout(lang: string): Promise<{ data: any; sha: string } | null> {
  const { rows } = await pool().query(
    'SELECT data, sha FROM layouts WHERE lang = $1 LIMIT 1',
    [lang],
  );
  if (rows.length === 0) return null;
  return { data: rows[0].data, sha: rows[0].sha };
}

export async function writeLayout(
  lang: string,
  data: any,
  message: string,
  expectedSha?: string,
): Promise<{ sha: string }> {
  if (expectedSha) {
    // 乐观锁:检查 sha 是否匹配
    const { rows: cur } = await pool().query(
      'SELECT sha FROM layouts WHERE lang = $1 LIMIT 1',
      [lang],
    );
    if (cur.length > 0 && cur[0].sha !== expectedSha) {
      throw Object.assign(new Error('Conflict: sha mismatch'), { statusCode: 409 });
    }
  }
  // 新 sha = 时间戳(用作乐观锁)
  const sha = new Date().toISOString();
  const updatedAt = sha;

  await pool().query(
    'INSERT INTO layouts (lang, data, sha, updated_at) VALUES ($1, $2::jsonb, $3, $4) ON CONFLICT (lang) DO UPDATE SET data = EXCLUDED.data, sha = EXCLUDED.sha, updated_at = EXCLUDED.updated_at',
    [lang, JSON.stringify(data), sha, updatedAt],
  );
  return { sha };
}

export async function isConfigured(): Promise<boolean> {
  return !!DATABASE_URL;
}