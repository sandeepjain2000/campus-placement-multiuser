const { useRepoRoot } = require('../lib/repo-root');
useRepoRoot();

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres' });
async function test() {
  try {
    const res = await pool.query('SELECT id, tenant_id FROM placement_drives WHERE status = $1 LIMIT 1', ['requested']);
    if (res.rows.length === 0) {
      console.log('No requested drives found.');
      return;
    }
    const { id: driveId, tenant_id: tenantId } = res.rows[0];
    const userRes = await pool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['college_admin']);
    const userId = userRes.rows[0].id;

    console.log('Testing update on drive:', driveId);
    
    await pool.query('BEGIN');
    const updateRes = await pool.query(
      `UPDATE placement_drives
       SET status = $1::varchar,
           approved_by = CASE WHEN $1::varchar = 'approved' THEN $2::uuid ELSE approved_by END,
           approved_at = CASE WHEN $1::varchar = 'approved' THEN NOW() ELSE approved_at END,
           updated_at = NOW()
       WHERE id = $3::uuid
         AND tenant_id = $4::uuid
         AND status = 'requested'
       RETURNING id`,
      ['approved', userId, driveId, tenantId]
    );
    console.log('Update result:', updateRes.rows);
    await pool.query('ROLLBACK');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    pool.end();
  }
}
test();
