import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || '';

let _sql: ReturnType<typeof neon> | null = null;
function sql() {
  if (!_sql) {
    if (!DATABASE_URL) throw new Error('DATABASE_URL not set');
    _sql = neon(DATABASE_URL);
  }
  return _sql;
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
`;

export async function ensureSchema(): Promise<void> {
  await sql()`${SCHEMA}`;
}

export async function listLayouts(): Promise<string[]> {
  const rows = (await sql()`SELECT lang FROM layouts ORDER BY lang`) as any[];
  return rows.map((r) => r.lang as string);
}

export async function readLayout(lang: string): Promise<{ data: any; sha: string } | null> {
  const rows = (await sql()`SELECT data, sha FROM layouts WHERE lang = ${lang} LIMIT 1`) as any[];
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
    const cur = (await sql()`SELECT sha FROM layouts WHERE lang = ${lang} LIMIT 1`) as any[];
    if (cur.length > 0 && cur[0].sha !== expectedSha) {
      throw Object.assign(new Error('Conflict: sha mismatch'), { statusCode: 409 });
    }
  }
  // 新 sha = 时间戳(用作乐观锁)
  const sha = new Date().toISOString();
  const updatedAt = sha;

  await sql()`
    INSERT INTO layouts (lang, data, sha, updated_at)
    VALUES (${lang}, ${JSON.stringify(data)}, ${sha}, ${updatedAt})
    ON CONFLICT (lang) DO UPDATE SET
      data = EXCLUDED.data,
      sha = EXCLUDED.sha,
      updated_at = EXCLUDED.updated_at
  `;
  return { sha };
}

export async function isConfigured(): Promise<boolean> {
  return !!DATABASE_URL;
}