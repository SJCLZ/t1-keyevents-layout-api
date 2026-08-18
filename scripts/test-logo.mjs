import { config } from 'dotenv';
config({ path: '/Users/lz/Documents/Mixlab Project/20260708_内容skill/layout-api/.env.local', override: true });
import { Pool } from '@neondatabase/serverless';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const r = await fetch('https://raw.githubusercontent.com/SJCLZ/t1-keyevents-templates/main/assets/sp/logo.png');
const buf = Buffer.from(await r.arrayBuffer());
console.log('buf length:', buf.length);

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED:', reason);
  console.error('  type:', typeof reason);
  console.error('  keys:', Object.keys(reason || {}));
  console.error('  proto:', Object.getPrototypeOf(reason));
});

try {
  await pool.query(
    "INSERT INTO assets (lang, type, name, data, content_type, size, sha, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) ON CONFLICT (lang, type, name) DO UPDATE SET data = EXCLUDED.data, content_type = EXCLUDED.content_type, size = EXCLUDED.size, sha = EXCLUDED.sha, updated_at = EXCLUDED.updated_at",
    ['sp', 'logo', 'startrader_logo_official.png', buf, 'image/png', buf.length, 'test-sha-logo'],
  );
  console.log('logo upsert OK');
} catch (e) {
  console.error('caught:', JSON.stringify(e, null, 2));
}
