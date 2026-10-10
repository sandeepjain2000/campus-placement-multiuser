const { Pool } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=').trim();
const pool = new Pool({ connectionString: dbUrl });

async function check() {
  try {
    const res = await pool.query(
      `SELECT created_at, context, status, original_to, resolved_to, subject_truncated, error_message
       FROM mail_delivery_logs
       ORDER BY created_at DESC
       LIMIT 30`
    );
    console.log('RECENT MAIL LOGS (LATEST 30):');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
check();
