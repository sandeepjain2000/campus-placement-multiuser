const { useRepoRoot } = require('../lib/repo-root');
useRepoRoot();

const { Pool } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=').trim();
const pool = new Pool({ connectionString: dbUrl });

async function check() {
  const cols = await pool.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'student_profiles'");
  console.log('STUDENT_PROFILES NULLABILITY:', cols.rows);
  await pool.end();
}
check();
