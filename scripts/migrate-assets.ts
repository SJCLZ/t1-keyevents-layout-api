/**
 * Upload the repository's canonical assets to the configured PostgreSQL/Neon
 * database. The editor intentionally has no public-file fallback.
 *
 * Usage: npx tsx scripts/migrate-assets.ts
 */
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: '.env.local' });

const LANGS = ['sp', 'ar', 'ja', 'en', 'vi', 'hi', 'kr', 'th', 'cn'];
const ASSETS_ROOT = join(process.cwd(), 'public', 'assets');

function contentType(name: string): string {
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.ttf')) return 'font/ttf';
  throw new Error(`Unsupported asset type: ${name}`);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL not set');

  const pool = new Pool({ connectionString: databaseUrl });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assets (
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
    );
    CREATE INDEX IF NOT EXISTS idx_assets_lookup ON assets (lang, type);
  `);

  let uploaded = 0;
  for (const lang of LANGS) {
    const assets: Array<{ type: string; name: string; path: string }> = [
      {
        type: 'logo',
        name: 'startrader_logo_official.png',
        path: join(ASSETS_ROOT, lang, 'logo.png'),
      },
    ];

    for (const name of (await readdir(join(ASSETS_ROOT, lang, 'gt_frames'))).sort()) {
      assets.push({ type: 'gt_frame', name, path: join(ASSETS_ROOT, lang, 'gt_frames', name) });
    }
    for (const name of (await readdir(join(ASSETS_ROOT, lang, 'fonts'))).sort()) {
      assets.push({ type: 'font', name, path: join(ASSETS_ROOT, lang, 'fonts', name) });
    }

    for (const asset of assets) {
      const data = await readFile(asset.path);
      const sha = createHash('sha256').update(data).digest('hex');
      await pool.query(
        `INSERT INTO assets (lang, type, name, data, content_type, size, sha, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (lang, type, name) DO UPDATE SET
           data = EXCLUDED.data,
           content_type = EXCLUDED.content_type,
           size = EXCLUDED.size,
           sha = EXCLUDED.sha,
           updated_at = EXCLUDED.updated_at`,
        [lang, asset.type, asset.name, data, contentType(asset.name), data.length, sha],
      );
      uploaded += 1;
      console.log(`✅ ${lang}/${asset.type}/${asset.name} ${(data.length / 1024).toFixed(1)} KB`);
    }
  }

  const { rows: totals } = await pool.query(
    `SELECT type, count(*)::int AS count, sum(size)::bigint AS bytes
     FROM assets GROUP BY type ORDER BY type`,
  );
  console.log(JSON.stringify({ uploaded, totals }, null, 2));
  await pool.end();
}

main().catch((error) => {
  console.error('❌', error?.message || String(error));
  process.exit(1);
});
