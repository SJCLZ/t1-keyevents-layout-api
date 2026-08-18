/**
 * migrate-from-github.ts
 * 把 SJCLZ/t1-keyevents-templates 仓库里的 9 个 layouts/*.json 一次性导入 Neon 数据库
 *
 * 用法:
 *   DATABASE_URL=postgres://... npx tsx scripts/migrate-from-github.ts
 *
 * 或者本地有 DATABASE_URL 配 .env.local 后跑
 */
import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });

const TEMPLATES_REPO = 'SJCLZ/t1-keyevents-templates';
const BRANCH = 'main';
const LANGS = ['sp', 'ar', 'ja', 'en', 'vi', 'hi', 'kr', 'th', 'cn'];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }
  const sql = neon(url);

  // 1. 建表
  console.log('🔧 CREATE TABLE...');
  await sql`CREATE TABLE IF NOT EXISTS layouts (
    lang TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    sha TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`;

  // 2. 从 GitHub raw 拉 9 个 layouts
  for (const lang of LANGS) {
    const url = `https://raw.githubusercontent.com/${TEMPLATES_REPO}/${BRANCH}/${lang}.json`;
    console.log(`📥 Fetching ${url}`);
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn(`  ⚠ skip ${lang} (HTTP ${resp.status})`);
      continue;
    }
    const data = await resp.json();
    const sha = new Date().toISOString();

    await sql`
      INSERT INTO layouts (lang, data, sha, updated_at)
      VALUES (${lang}, ${JSON.stringify(data)}, ${sha}, NOW())
      ON CONFLICT (lang) DO UPDATE SET
        data = EXCLUDED.data,
        sha = EXCLUDED.sha,
        updated_at = EXCLUDED.updated_at
    `;
    console.log(`  ✅ ${lang}: ${Object.keys(data.frames || {}).length} frames`);
  }

  // 3. 验证
  const rows = await sql`SELECT lang FROM layouts ORDER BY lang`;
  console.log(`\n✅ Migration done. ${rows.length} layouts in DB:`);
  rows.forEach((r) => console.log(`  - ${r.lang}`));
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});