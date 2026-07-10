import pg from 'pg';
import { randomUUID } from 'crypto';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const testEntityId = randomUUID();

try {
  const tenant = await pool.query(`SELECT id FROM tenants WHERE type = 'college' LIMIT 1`);
  const tenantId = tenant.rows[0]?.id;
  if (!tenantId) throw new Error('No college tenant found');

  await pool.query(
    `INSERT INTO audit_logs (tenant_id, action, entity_type, entity_id, new_values, ip_address)
     VALUES ($1::uuid, 'DEMO_PURGE', 'job', $2::uuid, $3::jsonb, '127.0.0.1')`,
    [
      tenantId,
      testEntityId,
      JSON.stringify({
        label: 'Audit smoke test (safe to delete)',
        entityType: 'job',
        softDelete: true,
        cascade: { job: 1, alertsTrashed: 0 },
        demoPurgeTransactionId: randomUUID(),
      }),
    ],
  );

  const read = await pool.query(
    `SELECT al.action, al.entity_type, al.entity_id, al.new_values, al.tenant_id,
            u.email AS actor_email
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     WHERE al.action = 'DEMO_PURGE' AND al.entity_id = $1::uuid`,
    [testEntityId],
  );

  if (read.rows.length !== 1) {
    throw new Error(`Expected 1 test row, got ${read.rows.length}`);
  }

  const scoped = await pool.query(
    `SELECT COUNT(*)::int AS n FROM audit_logs
     WHERE action = 'DEMO_PURGE' AND tenant_id = $1::uuid AND entity_id = $2::uuid`,
    [tenantId, testEntityId],
  );
  if (scoped.rows[0]?.n !== 1) {
    throw new Error('College-scoped audit query failed');
  }

  await pool.query(`DELETE FROM audit_logs WHERE entity_id = $1::uuid`, [testEntityId]);

  console.log('Audit smoke test passed: DEMO_PURGE insert/read/scope/delete OK');
  console.log('Tenant used:', tenantId);
} catch (e) {
  console.error('Audit smoke test failed:', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
