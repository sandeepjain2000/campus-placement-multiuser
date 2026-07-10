const { Pool } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=').trim();
const pool = new Pool({ connectionString: dbUrl });

async function check() {
  try {
    const res = await pool.query(
      `SELECT o.id, o.student_id, u.email, o.job_title, o.offer_letter_url, o.status, o.created_at
       FROM offers o
       LEFT JOIN users u ON u.id = o.student_id
       ORDER BY o.created_at DESC`
    );
    console.log('ALL OFFERS IN DB:', res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
check();
