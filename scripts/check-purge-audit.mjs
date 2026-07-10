import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const count = await pool.query(
    `SELECT COUNT(*)::int AS n FROM audit_logs WHERE action = 'DEMO_PURGE'`,
  );
  console.log('DEMO_PURGE audit rows:', count.rows[0]?.n ?? 0);

  const recent = await pool.query(
    `SELECT al.action, al.entity_type, al.entity_id, al.tenant_id, al.user_id,
            al.new_values, al.ip_address, al.created_at,
            u.email AS actor_email
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     WHERE al.action = 'DEMO_PURGE'
     ORDER BY al.created_at DESC
     LIMIT 5`,
  );
  console.log('Recent DEMO_PURGE entries:', recent.rows.length);
  for (const row of recent.rows) {
    console.log(JSON.stringify(row, null, 2));
  }

  const txn = await pool.query(`SELECT COUNT(*)::int AS n FROM demo_purge_transactions`);
  console.log('demo_purge_transactions rows:', txn.rows[0]?.n ?? 0);

  const allActions = await pool.query(
    `SELECT action, COUNT(*)::int AS n FROM audit_logs GROUP BY action ORDER BY n DESC LIMIT 15`,
  );
  console.log('Top audit actions:', allActions.rows);
} finally {
  await pool.end();
}
