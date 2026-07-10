import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const admins = await pool.query(
    `SELECT u.id, u.email, u.tenant_id, t.name AS tenant_name, u.role
     FROM users u
     LEFT JOIN tenants t ON t.id = u.tenant_id
     WHERE u.role = 'college_admin'
     ORDER BY u.email
     LIMIT 20`,
  );
  console.log('College admins:');
  for (const r of admins.rows) {
    console.log(r.email, '| tenant:', r.tenant_name || r.tenant_id || 'MISSING');
  }
} finally {
  await pool.end();
}
