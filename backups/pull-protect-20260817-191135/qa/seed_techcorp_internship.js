const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

try {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    const match = env.split('\n').find(l => l.startsWith('DATABASE_URL'));
    if (match) {
      dbUrl = match.split('=')[1].trim();
    }
  }
} catch (e) {
  console.log('Could not read .env.local');
}

const pool = new Pool({
  connectionString: dbUrl
});

async function main() {
  try {
    console.log('Seeding new internship...');
    
    // Find or create TechCorp Solutions employer
    let employerQuery = await pool.query(`SELECT id FROM employer_profiles WHERE company_name = 'TechCorp Solutions' LIMIT 1`);
    let employerId;
    
    if (employerQuery.rowCount === 0) {
      // Find a user to attach to
      const userRes = await pool.query(`SELECT id FROM users WHERE role = 'employer' LIMIT 1`);
      if (userRes.rowCount === 0) {
         console.log('No employer user found, cannot seed without a user. Please create one.');
         return;
      }
      const userId = userRes.rows[0].id;
      
      const res = await pool.query(`
        INSERT INTO employer_profiles (user_id, company_name, industry)
        VALUES ($1, 'TechCorp Solutions', 'Technology')
        RETURNING id
      `, [userId]);
      employerId = res.rows[0].id;
    } else {
      employerId = employerQuery.rows[0].id;
    }

    const description = `ROLE
We are hiring an Intern (Internship) to own delivery across discovery, implementation, code review, testing, and production support. You will collaborate with product, design, and platform teams to ship reliable user-facing experiences.

QUALIFICATIONS
B.Tech / M.Tech / dual degree (or equivalent) in relevant disciplines; minimum CGPA 8 on a 10-point scale unless waived by campus policy. Strong problem-solving, communication, and teamwork.

SKILLS
Core skills we expect: Artificial Intelligence Intern. Demonstrable projects, internships, or open-source contributions in these areas are a plus.

LOCATION
Location: anchored at Bangalore, India. Hybrid, office, or remote arrangements follow company policy and are confirmed during hiring.`;

    // Insert the job posting
    const jobRes = await pool.query(`
      INSERT INTO job_postings (
        employer_id, title, job_type, description, 
        salary_min, salary_max, min_cgpa, vacancies, status, application_deadline
      )
      VALUES (
        $1, 'Intern', 'internship', $2,
        10000000, 12000000, 8, 5, 'published', NOW() + INTERVAL '30 days'
      )
      RETURNING id
    `, [employerId, description]);

    const jobId = jobRes.rows[0].id;
    
    // We need to add job_posting_visibility for all colleges
    // get all tenants
    const tenantsRes = await pool.query(`SELECT id FROM tenants`);
    for (const tenant of tenantsRes.rows) {
      await pool.query(`
        INSERT INTO job_posting_visibility (job_id, tenant_id) 
        VALUES ($1, $2) ON CONFLICT DO NOTHING
      `, [jobId, tenant.id]);
      
      // Also approve the employer for that tenant
      await pool.query(`
        INSERT INTO employer_approvals (employer_id, tenant_id, status)
        VALUES ($1, $2, 'approved') ON CONFLICT DO NOTHING
      `, [employerId, tenant.id]);
    }

    console.log('Successfully seeded TechCorp Solutions internship!');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    pool.end();
  }
}

main();
