import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const colleges = await pool.query(
    `SELECT id, name FROM tenants WHERE type = 'college' ORDER BY name LIMIT 10`,
  );
  console.log('Colleges:', colleges.rows);

  for (const c of colleges.rows.slice(0, 3)) {
    const logs = await pool.query(
      `SELECT action, COUNT(*)::int AS n
       FROM audit_logs
       WHERE tenant_id = $1::uuid
       GROUP BY action
       ORDER BY n DESC`,
      [c.id],
    );
    console.log(`\nAudit for ${c.name} (${c.id}):`, logs.rows);

    const nullTenant = await pool.query(
      `SELECT action, COUNT(*)::int AS n
       FROM audit_logs
       WHERE tenant_id IS NULL
       GROUP BY action
       ORDER BY n DESC
       LIMIT 10`,
    );
  }

  const nullTenant = await pool.query(
    `SELECT COUNT(*)::int AS n FROM audit_logs WHERE tenant_id IS NULL`,
  );
  console.log('\nRows with NULL tenant_id:', nullTenant.rows[0]?.n);

  const withTenant = await pool.query(
    `SELECT COUNT(*)::int AS n FROM audit_logs WHERE tenant_id IS NOT NULL`,
  );
  console.log('Rows with tenant_id set:', withTenant.rows[0]?.n);

  const sample = await pool.query(
    `SELECT al.action, al.tenant_id, t.name, al.created_at
     FROM audit_logs al
     LEFT JOIN tenants t ON t.id = al.tenant_id
     ORDER BY al.created_at DESC
     LIMIT 15`,
  );
  console.log('\nRecent audit rows:');
  for (const r of sample.rows) {
    console.log(r.action, '| tenant:', r.name || r.tenant_id || 'NULL', '|', r.created_at);
  }
} finally {
  await pool.end();
}
