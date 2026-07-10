import pg from 'pg';
import { randomUUID } from 'crypto';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const coep = 'b1bd59a5-6f22-4d00-9373-969e29c2afb1';
const entityId = randomUUID();
const today = new Date().toISOString().slice(0, 10);

try {
  // Simulate legacy row: entity tenant on row, college context only in JSON
  await pool.query(
    `INSERT INTO audit_logs (tenant_id, action, entity_type, entity_id, new_values)
     VALUES ($1::uuid, 'DEMO_PURGE', 'student', $2::uuid, $3::jsonb)`,
    [
      coep,
      entityId,
      JSON.stringify({
        label: 'Legacy visibility test',
        contextTenantId: coep,
        entityTenantId: coep,
      }),
    ],
  );

  const scoped = await pool.query(
    `SELECT al.id FROM audit_logs al
     WHERE (al.tenant_id = $1::uuid OR (
       al.action = 'DEMO_PURGE'
       AND COALESCE(al.new_values->>'contextTenantId', al.new_values->>'entityTenantId') = $1::text
     ))
       AND al.created_at >= $2::date
       AND al.created_at < ($3::date + interval '1 day')
       AND al.entity_id = $4::uuid`,
    [coep, today, today, entityId],
  );

  if (scoped.rows.length !== 1) {
    throw new Error(`College scope query expected 1 row, got ${scoped.rows.length}`);
  }

  await pool.query(`DELETE FROM audit_logs WHERE entity_id = $1::uuid`, [entityId]);
  console.log('College audit scope query OK for COEP');
} catch (e) {
  console.error('College audit scope test failed:', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
