import { Pool } from '@neondatabase/serverless';
const p = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const r = await p.query('SELECT count(*) FROM layouts');
  console.log('count:', r.rows);
} catch (e) {
  console.error('err:', e.message);
  console.error('code:', e.code);
}
