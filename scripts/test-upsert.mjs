import { config } from 'dotenv';
config({ path: '/Users/lz/Documents/Mixlab Project/20260708_内容skill/layout-api/.env.local', override: true });
import { Pool } from '@neondatabase/serverless';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const r = await pool.query(
    "INSERT INTO assets (lang, type, name, data, content_type, size, sha, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) ON CONFLICT (lang, type, name) DO UPDATE SET data = EXCLUDED.data, content_type = EXCLUDED.content_type, size = EXCLUDED.size, sha = EXCLUDED.sha, updated_at = EXCLUDED.updated_at",
    ['sp', 'logo', 'test.png', Buffer.from('test'), 'image/png', 4, 'test-sha'],
  );
  console.log('upsert OK');
} catch (e) {
  console.error('name:', e.name);
  console.error('msg:', JSON.stringify(e.message));
  console.error('code:', e.code);
  console.error('stack:', e.stack);
}
