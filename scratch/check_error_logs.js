const { Pool } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=').trim();
const pool = new Pool({ connectionString: dbUrl });

async function check() {
  try {
    const cols = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'platform_error_logs'`
    );
    console.log('PLATFORM ERROR LOGS COLUMNS:', cols.rows);

    const logs = await pool.query(
      `SELECT * FROM platform_error_logs ORDER BY created_at DESC LIMIT 3`
    );
    console.log('RECENT LOGS:');
    console.log(JSON.stringify(logs.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
check();
