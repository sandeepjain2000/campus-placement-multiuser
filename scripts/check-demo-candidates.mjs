import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const students = await pool.query(
    `SELECT sp.id FROM student_profiles sp
     JOIN users u ON u.id = sp.user_id
     WHERE COALESCE(sp.is_deleted, false) = false
       AND u.email ILIKE '%@placementhub.test'
     LIMIT 1`,
  );
  console.log('Demo students available:', students.rows.length);

  const jobs = await pool.query(
    `SELECT id, title FROM job_postings
     WHERE COALESCE(is_deleted, false) = false
       AND description ILIKE '%Data Tester API%'
     LIMIT 1`,
  );
  console.log('Demo jobs available:', jobs.rows.length, jobs.rows[0] || null);
} finally {
  await pool.end();
}
