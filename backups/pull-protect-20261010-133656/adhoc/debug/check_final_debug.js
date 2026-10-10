const { useRepoRoot } = require('../lib/repo-root');
useRepoRoot();

const { Pool } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=').trim();
const pool = new Pool({ connectionString: dbUrl });

async function check() {
  console.log('Checking audit_logs and notifications for the last 15 minutes...');
  const audit = await pool.query("SELECT * FROM audit_logs WHERE action = 'student_bulk_import' ORDER BY created_at DESC LIMIT 5");
  const notif = await pool.query("SELECT * FROM notifications WHERE type = 'import_status' ORDER BY created_at DESC LIMIT 5");
  console.log('AUDIT LOGS:', audit.rows);
  console.log('NOTIFICATIONS:', notif.rows);
  await pool.end();
}
check();
