/**
 * migrate-assets.ts
 * 从 GitHub t1-keyevents-templates 仓库拉所有 logo / fonts / gt_frames,存到 Neon assets 表
 *
 * 用法:DATABASE_URL=... npx tsx scripts/migrate-assets.ts
 */
import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';

config({ path: '.env.local' });

const TEMPLATES_REPO = 'SJCLZ/t1-keyevents-templates';
const BRANCH = 'main';
const LANGS = ['sp', 'ar', 'ja', 'en', 'vi', 'hi', 'kr', 'th', 'cn'];

// 文件配置(每语言)
const FILES: { type: string; name: string; path: string; contentType: string }[] = [
  // logo: 单一官方版(所有语言共用 startrader_logo_official.png)
  { type: 'logo', name: 'startrader_logo_official.png', path: 'sp/logo.png', contentType: 'image/png' },
  // gt_frames: 7 张
  { type: 'gt_frame', name: 't003.000.png', path: 'sp/gt_frames/t003.000.png', contentType: 'image/png' },
  { type: 'gt_frame', name: 't004.000.png', path: 'sp/gt_frames/t004.000.png', contentType: 'image/png' },
  { type: 'gt_frame', name: 't011.000.png', path: 'sp/gt_frames/t012.000.png', contentType: 'image/png' },
  { type: 'gt_frame', name: 't018.000.png', path: 'sp/gt_frames/t018.000.png', contentType: 'image/png' },
  { type: 'gt_frame', name: 't025.000.png', path: 'sp/gt_frames/t024.000.png', contentType: 'image/png' },
  { type: 'gt_frame', name: 't032.000.png', path: 'sp/gt_frames/t032.000.png', contentType: 'image/png' },
  { type: 'gt_frame', name: 't042.000.png', path: 'sp/gt_frames/t042.000.png', contentType: 'image/png' },
];

// 字体按语言不同
const FONTS: Record<string, { name: string; path: string; contentType: string }[]> = {
  sp: [
    { name: 'PlusJakartaSans-300.ttf', path: 'sp/fonts/PlusJakartaSans-300.ttf', contentType: 'font/ttf' },
    { name: 'PlusJakartaSans-400.ttf', path: 'sp/fonts/PlusJakartaSans-400.ttf', contentType: 'font/ttf' },
    { name: 'PlusJakartaSans-600.ttf', path: 'sp/fonts/PlusJakartaSans-600.ttf', contentType: 'font/ttf' },
  ],
  en: [
    { name: 'PlusJakartaSans-300.ttf', path: 'en/fonts/PlusJakartaSans-300.ttf', contentType: 'font/ttf' },
    { name: 'PlusJakartaSans-400.ttf', path: 'en/fonts/PlusJakartaSans-400.ttf', contentType: 'font/ttf' },
    { name: 'PlusJakartaSans-600.ttf', path: 'en/fonts/PlusJakartaSans-600.ttf', contentType: 'font/ttf' },
  ],
  vi: [
    { name: 'PlusJakartaSans-300.ttf', path: 'vi/fonts/PlusJakartaSans-300.ttf', contentType: 'font/ttf' },
    { name: 'PlusJakartaSans-400.ttf', path: 'vi/fonts/PlusJakartaSans-400.ttf', contentType: 'font/ttf' },
    { name: 'PlusJakartaSans-600.ttf', path: 'vi/fonts/PlusJakartaSans-600.ttf', contentType: 'font/ttf' },
  ],
  ar: [
    { name: 'Tajawal-Light.ttf', path: 'ar/fonts/Tajawal-Light.ttf', contentType: 'font/ttf' },
    { name: 'Tajawal-Regular.ttf', path: 'ar/fonts/Tajawal-Regular.ttf', contentType: 'font/ttf' },
    { name: 'Tajawal-Medium.ttf', path: 'ar/fonts/Tajawal-Medium.ttf', contentType: 'font/ttf' },
    { name: 'Tajawal-Bold.ttf', path: 'ar/fonts/Tajawal-Bold.ttf', contentType: 'font/ttf' },
  ],
  ja: [{ name: 'NotoSansJP.ttf', path: 'ja/fonts/NotoSansJP.ttf', contentType: 'font/ttf' }],
  kr: [{ name: 'NotoSansKR.ttf', path: 'kr/fonts/NotoSansKR.ttf', contentType: 'font/ttf' }],
  cn: [{ name: 'NotoSansSC.ttf', path: 'cn/fonts/NotoSansSC.ttf', contentType: 'font/ttf' }],
  th: [
    { name: 'Prompt-300.ttf', path: 'th/fonts/Prompt-300.ttf', contentType: 'font/ttf' },
    { name: 'Prompt-400.ttf', path: 'th/fonts/Prompt-400.ttf', contentType: 'font/ttf' },
    { name: 'Prompt-600.ttf', path: 'th/fonts/Prompt-600.ttf', contentType: 'font/ttf' },
  ],
  hi: [
    { name: 'Mukta-300.ttf', path: 'hi/fonts/Mukta-300.ttf', contentType: 'font/ttf' },
    { name: 'Mukta-400.ttf', path: 'hi/fonts/Mukta-400.ttf', contentType: 'font/ttf' },
    { name: 'Mukta-600.ttf', path: 'hi/fonts/Mukta-600.ttf', contentType: 'font/ttf' },
  ],
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });

  // 1. 建表
  console.log('🔧 CREATE TABLE...');
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

  // 2. logo + gt_frames(每语言共用)
  for (const lang of LANGS) {
    for (const f of FILES) {
      const url = `https://raw.githubusercontent.com/${TEMPLATES_REPO}/${BRANCH}/assets/${f.path}`;
      const r = await fetch(url);
      if (!r.ok) {
        console.warn(`  ⚠ ${lang}/${f.name}: HTTP ${r.status}`);
        continue;
      }
      const buf = Buffer.from(await r.arrayBuffer());
      const sha = new Date().toISOString();
      await pool.query(
        `INSERT INTO assets (lang, type, name, data, content_type, size, sha, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (lang, type, name) DO UPDATE SET
           data = EXCLUDED.data, content_type = EXCLUDED.content_type,
           size = EXCLUDED.size, sha = EXCLUDED.sha, updated_at = EXCLUDED.updated_at`,
        [lang, f.type, f.name, buf, f.contentType, buf.length, sha],
      );
      console.log(`  ✅ ${lang}/${f.type}/${f.name}: ${(buf.length / 1024).toFixed(1)} KB`);
    }
  }

  // 3. 字体(每语言不同)
  for (const lang of LANGS) {
    const fonts = FONTS[lang] || [];
    for (const f of fonts) {
      const url = `https://raw.githubusercontent.com/${TEMPLATES_REPO}/${BRANCH}/assets/${f.path}`;
      const r = await fetch(url);
      if (!r.ok) {
        console.warn(`  ⚠ ${lang}/${f.name}: HTTP ${r.status}`);
        continue;
      }
      const buf = Buffer.from(await r.arrayBuffer());
      const sha = new Date().toISOString();
      await pool.query(
        `INSERT INTO assets (lang, type, name, data, content_type, size, sha, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (lang, type, name) DO UPDATE SET
           data = EXCLUDED.data, content_type = EXCLUDED.content_type,
           size = EXCLUDED.size, sha = EXCLUDED.sha, updated_at = EXCLUDED.updated_at`,
        [lang, 'font', f.name, buf, f.contentType, buf.length, sha],
      );
      console.log(`  ✅ ${lang}/font/${f.name}: ${(buf.length / 1024).toFixed(1)} KB`);
    }
  }

  // 4. 统计
  const { rows: total } = await pool.query('SELECT count(*)::int as n FROM assets');
  const { rows: byType } = await pool.query(
    'SELECT type, count(*)::int as n, sum(size)::int as total_bytes FROM assets GROUP BY type ORDER BY type',
  );
  console.log(`\n✅ Migration done. ${total[0].n} assets:`);
  byType.forEach((r: any) => console.log(`  ${r.type}: ${r.n} files, ${(r.total_bytes / 1024 / 1024).toFixed(2)} MB`));
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});