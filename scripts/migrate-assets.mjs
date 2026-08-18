import { config } from 'dotenv';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
config({ path: '/Users/lz/Documents/Mixlab Project/20260708_内容skill/layout-api/.env.local', override: true });
import { Pool } from '@neondatabase/serverless';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, '..', 'public', 'assets');

const LANGS = ['sp', 'ar', 'ja', 'en', 'vi', 'hi', 'kr', 'th', 'cn'];

const url = process.env.DATABASE_URL;
if (!url) { console.error('❌ DATABASE_URL not set'); process.exit(1); }
const pool = new Pool({ connectionString: url });

async function upsert(lang, type, name, data, contentType) {
  const sha = new Date().toISOString();
  await pool.query(
    `INSERT INTO assets (lang, type, name, data, content_type, size, sha, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (lang, type, name) DO UPDATE SET
       data = EXCLUDED.data, content_type = EXCLUDED.content_type,
       size = EXCLUDED.size, sha = EXCLUDED.sha, updated_at = EXCLUDED.updated_at`,
    [lang, type, name, data, contentType, data.length, sha],
  );
}

async function readLocal(lang, type, name) {
  // type: logo / font / gt_frame
  let rel = '';
  if (type === 'logo') rel = `${lang}/logo.png`;
  else if (type === 'font') rel = `${lang}/fonts/${name}`;
  else if (type === 'gt_frame') {
    // name = 't003.000.png',从 sp/gt_frames/{name} 读
    rel = `sp/gt_frames/${name}`;
  }
  const path = join(ASSETS_DIR, rel);
  return await readFile(path);
}

function contentType(name) {
  if (name.endsWith('.ttf')) return 'font/ttf';
  if (name.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

async function main() {
  // 1. logo: 每语言一个(从 layout-api/public/assets/{lang}/logo.png)
  for (const lang of LANGS) {
    const buf = await readLocal(lang, 'logo', 'logo.png');
    await upsert(lang, 'logo', 'startrader_logo_official.png', buf, 'image/png');
    console.log(`  ✅ ${lang}/logo: ${(buf.length / 1024).toFixed(1)} KB`);
  }

  // 2. fonts: 扫 layout-api/public/assets/{lang}/fonts/ 目录
  for (const lang of LANGS) {
    const { readdir } = await import('fs/promises');
    const fontsDir = join(ASSETS_DIR, lang, 'fonts');
    let files = [];
    try { files = await readdir(fontsDir); } catch { continue; }
    for (const name of files) {
      if (!name.endsWith('.ttf')) continue;
      const buf = await readFile(join(fontsDir, name));
      await upsert(lang, 'font', name, buf, 'font/ttf');
      console.log(`  ✅ ${lang}/font/${name}: ${(buf.length / 1024).toFixed(1)} KB`);
    }
  }

  // 3. GT frames: 9 语言共用,从 sp/gt_frames/(t003..t042)
  const FRAMES = ['t003.000.png', 't004.000.png', 't011.000.png', 't018.000.png', 't025.000.png', 't032.000.png', 't042.000.png'];
  for (const lang of LANGS) {
    for (const name of FRAMES) {
      const buf = await readLocal(lang, 'gt_frame', name);
      await upsert(lang, 'gt_frame', name, buf, 'image/png');
      console.log(`  ✅ ${lang}/gt_frame/${name}: ${(buf.length / 1024).toFixed(1)} KB`);
    }
  }

  const { rows: total } = await pool.query('SELECT count(*)::int as n FROM assets');
  const { rows: byType } = await pool.query(
    'SELECT type, count(*)::int as n, sum(size)::int as total_bytes FROM assets GROUP BY type ORDER BY type',
  );
  console.log(`\n✅ Total: ${total[0].n} assets`);
  byType.forEach((r) => console.log(`  ${r.type}: ${r.n} files, ${(r.total_bytes / 1024 / 1024).toFixed(2)} MB`));
}

main().catch((e) => { console.error('❌', JSON.stringify(e)); process.exit(1); });
