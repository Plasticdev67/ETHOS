import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const res = await pool.query('SELECT id, name, email, role FROM users ORDER BY role, name');
console.table(res.rows);
await pool.end();
