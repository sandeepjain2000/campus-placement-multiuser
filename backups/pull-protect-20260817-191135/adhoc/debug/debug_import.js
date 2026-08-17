const { useRepoRoot } = require('../lib/repo-root');
useRepoRoot();

const { Pool } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=').trim();
const pool = new Pool({ connectionString: dbUrl });

async function check() {
  console.log('Checking for students added in the last 2 hours...');
  const users = await pool.query("SELECT id, email, tenant_id, role, created_at FROM users WHERE role = 'student' AND created_at > NOW() - INTERVAL '2 hours' ORDER BY created_at DESC");
  console.log('USERS:', users.rows);

  const notifications = await pool.query("SELECT id, title, message, created_at FROM notifications WHERE created_at > NOW() - INTERVAL '2 hours' ORDER BY created_at DESC");
  console.log('\nRECENT NOTIFICATIONS:', notifications.rows);

  await pool.end();
}
check();
