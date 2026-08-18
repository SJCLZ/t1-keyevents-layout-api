import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';
config({ path: '.env.local' });
console.log('URL:', process.env.DATABASE_URL?.slice(0, 50));
const p = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const r = await p.query('SELECT count(*) FROM layouts');
  console.log('OK:', r.rows);
} catch (e) {
  console.error('err:', e.message);
}
