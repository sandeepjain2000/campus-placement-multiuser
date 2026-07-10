import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const iitm = 'a1000000-0000-0000-0000-000000000001';
const from = '2026-04-20';
const to = '2026-05-19';

try {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS n FROM audit_logs
     WHERE tenant_id = $1::uuid
       AND DATE(created_at) >= $2::date
       AND DATE(created_at) <= $3::date`,
    [iitm, from, to],
  );
  console.log(`IITM logs in default window ${from}..${to}:`, r.rows[0]?.n);

  const all = await pool.query(
    `SELECT DATE(created_at) AS d, action FROM audit_logs
     WHERE tenant_id = $1::uuid ORDER BY created_at DESC`,
    [iitm],
  );
  console.log('All IITM log dates:', all.rows);

  const demo = await pool.query(
    `SELECT sp.tenant_id, t.name, COUNT(*)::int AS students
     FROM student_profiles sp
     JOIN users u ON u.id = sp.user_id
     JOIN tenants t ON t.id = sp.tenant_id
     WHERE u.email ILIKE '%@placementhub.test'
       AND COALESCE(sp.is_deleted, false) = false
     GROUP BY sp.tenant_id, t.name`,
  );
  console.log('Demo students by tenant:', demo.rows);

  const jobVis = await pool.query(
    `SELECT jpv.tenant_id, t.name, jp.id, jp.title
     FROM job_postings jp
     JOIN job_posting_visibility jpv ON jpv.job_id = jp.id
     JOIN tenants t ON t.id = jpv.tenant_id
     WHERE jp.description ILIKE '%Data Tester API%'
       AND COALESCE(jp.is_deleted, false) = false
     LIMIT 5`,
  );
  console.log('Demo job visibility:', jobVis.rows);
} finally {
  await pool.end();
}
