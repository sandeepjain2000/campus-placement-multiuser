const { useRepoRoot } = require('../lib/repo-root');
useRepoRoot();

const { Pool } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=').trim();
const pool = new Pool({ connectionString: dbUrl });

async function check() {
  console.log('Checking for students added in the last 30 minutes...');
  const res = await pool.query("SELECT s.roll_number, u.email, u.created_at FROM student_profiles s JOIN users u ON s.user_id = u.id WHERE u.created_at > NOW() - INTERVAL '30 minutes' ORDER BY u.created_at DESC");
  console.log('NEW STUDENTS:', res.rows);
  await pool.end();
}
check();
