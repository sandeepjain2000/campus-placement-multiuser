const { useRepoRoot } = require('../lib/repo-root');
useRepoRoot();

const { Pool } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=').trim();
const pool = new Pool({ connectionString: dbUrl });

async function check() {
  const tenantRes = await pool.query("SELECT id, name FROM tenants WHERE name LIKE '%Madras%'");
  console.log('TENANTS:', tenantRes.rows);
  
  if (tenantRes.rows.length > 0) {
    const tid = tenantRes.rows[0].id;
    const users = await pool.query("SELECT id, email, role, created_at FROM users WHERE tenant_id = $1::uuid AND role = 'student' ORDER BY created_at DESC LIMIT 5", [tid]);
    console.log('\nRECENT STUDENTS:', users.rows);

    const notifications = await pool.query("SELECT id, title, message, created_at FROM notifications WHERE user_id IN (SELECT id FROM users WHERE tenant_id = $1::uuid AND role = 'college_admin') ORDER BY created_at DESC LIMIT 5", [tid]);
    console.log('\nRECENT NOTIFICATIONS (Admin):', notifications.rows);
  }
  await pool.end();
}
check();
