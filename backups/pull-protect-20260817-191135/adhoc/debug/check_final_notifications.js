const { useRepoRoot } = require('../lib/repo-root');
useRepoRoot();

const { Pool } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=').trim();
const pool = new Pool({ connectionString: dbUrl });

async function check() {
  console.log('Checking recent notifications...');
  const res = await pool.query("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5");
  console.log('NOTIFICATIONS:', res.rows);
  await pool.end();
}
check();
