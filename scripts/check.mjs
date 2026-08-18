import { Pool } from '@neondatabase/serverless';
const p = new Pool({ connectionString: process.env.DATABASE_URL });
const r = await p.query('SELECT lang, sha, updated_at FROM layouts ORDER BY lang');
console.log(JSON.stringify(r.rows, null, 2));
