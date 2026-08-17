const { useRepoRoot } = require('../lib/repo-root');
useRepoRoot();

const { Pool } = require('pg');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const dbUrl = fs.readFileSync('.env.local', 'utf8').match(/DATABASE_URL=([^\r\n]+)/)[1].replace(/['"]/g, '');
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

// ─── Data Templates ───────────────────────────────────────────────────────────

const STUDENT_TEMPLATES = [
  { firstName: 'Arjun', lastName: 'Sharma', dept: 'Computer Science', branch: 'AI & ML', cgpa: 8.7, gender: 'Male', category: 'General', skills: ['Python', 'Machine Learning', 'SQL'] },
  { firstName: 'Priya', lastName: 'Patel', dept: 'Electrical Engineering', branch: 'VLSI', cgpa: 8.2, gender: 'Female', category: 'OBC', skills: ['VHDL', 'Circuit Design', 'MATLAB'] },
];

const EMPLOYER_NAMES = [
  { name: 'Infosys', slug: 'infosys', industry: 'IT Services', type: 'mnc' },
  { name: 'Wipro', slug: 'wipro', industry: 'IT Services', type: 'mnc' },
];

const JOB_TEMPLATES = [
  { title: 'Software Engineer', category: 'Engineering', type: 'full_time', status: 'published', vacancies: 20, min_cgpa: 7.0 },
  { title: 'Data Analyst', category: 'Analytics', type: 'full_time', status: 'published', vacancies: 10, min_cgpa: 7.5 },
];

const INTERNSHIP_TEMPLATES = [
  { title: 'Summer Intern – Backend', category: 'Engineering', type: 'internship', status: 'published', vacancies: 15, min_cgpa: 6.5 },
  { title: 'Business Analyst Intern', category: 'Analytics', type: 'internship', status: 'published', vacancies: 8, min_cgpa: 6.0 },
];

const PROJECT_TEMPLATES = [
  { title: 'AI Research Project', category: 'Research', type: 'short_project', status: 'published', vacancies: 5, min_cgpa: 8.0 },
  { title: 'Full Stack Web App Development', category: 'Engineering', type: 'short_project', status: 'published', vacancies: 8, min_cgpa: 7.0 },
  { title: 'Data Pipeline Automation', category: 'Analytics', type: 'short_project', status: 'published', vacancies: 6, min_cgpa: 7.5 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function ensureEmployerUser(client, tenantId, slug) {
  const email = `hr.${slug}@placementhub.test`;
  const existing = await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
  if (existing.rows.length) return existing.rows[0].id;
  const hash = await bcrypt.hash('Test@123', 10);
  const res = await client.query(
    `INSERT INTO users (tenant_id, email, communication_email, password_hash, role, first_name, last_name, is_verified, is_active)
     VALUES ($1, $2, $2, $3, 'employer', $4, 'HR', true, true) RETURNING id`,
    [tenantId, email, hash, slug]
  );
  return res.rows[0].id;
}

async function ensureEmployerProfile(client, userId, emp) {
  const existing = await client.query('SELECT id FROM employer_profiles WHERE user_id = $1 LIMIT 1', [userId]);
  if (existing.rows.length) return existing.rows[0].id;
  // Try unique slug
  const slug = `${emp.slug}-${Date.now()}`;
  const res = await client.query(
    `INSERT INTO employer_profiles (user_id, company_name, company_slug, industry, company_type, headquarters, is_verified)
     VALUES ($1, $2, $3, $4, $5, 'India', true) RETURNING id`,
    [userId, emp.name, slug, emp.industry, emp.type]
  );
  return res.rows[0].id;
}

async function ensureApproval(client, tenantId, employerId) {
  const existing = await client.query(
    'SELECT id FROM employer_approvals WHERE tenant_id = $1 AND employer_id = $2 LIMIT 1',
    [tenantId, employerId]
  );
  if (existing.rows.length) return existing.rows[0].id;
  const res = await client.query(
    `INSERT INTO employer_approvals (tenant_id, employer_id, status, created_at, approved_at)
     VALUES ($1, $2, 'approved', NOW(), NOW()) RETURNING id`,
    [tenantId, employerId]
  );
  return res.rows[0].id;
}

async function countStudents(client, tenantId) {
  const res = await client.query('SELECT COUNT(*) FROM student_profiles WHERE tenant_id = $1', [tenantId]);
  return parseInt(res.rows[0].count);
}

async function countEmployers(client, tenantId) {
  const res = await client.query('SELECT COUNT(*) FROM employer_approvals WHERE tenant_id = $1', [tenantId]);
  return parseInt(res.rows[0].count);
}

async function countJobsByType(client, employerIds, type) {
  if (!employerIds.length) return 0;
  const res = await client.query(
    `SELECT COUNT(*) FROM job_postings WHERE employer_id = ANY($1) AND job_type = $2`,
    [employerIds, type]
  );
  return parseInt(res.rows[0].count);
}

async function seedStudent(client, tenantId, shortCode, tpl, idx) {
  const roll = `SEED${String(idx).padStart(4, '0')}`;
  const email = `${tpl.firstName.toLowerCase()}.${tpl.lastName.toLowerCase()}.${idx}@placementhub.test`;
  
  // Skip if roll already exists
  const existing = await client.query(
    'SELECT sp.id FROM student_profiles sp WHERE sp.tenant_id = $1 AND LOWER(sp.roll_number) = LOWER($2)',
    [tenantId, roll]
  );
  if (existing.rows.length) return null;

  const passHash = await bcrypt.hash('Student@123', 10);
  const userRes = await client.query(
    `INSERT INTO users (tenant_id, email, communication_email, password_hash, role, first_name, last_name, is_verified, is_active)
     VALUES ($1, $2, $2, $3, 'student', $4, $5, true, true)
     ON CONFLICT (email) DO NOTHING RETURNING id`,
    [tenantId, email, passHash, tpl.firstName, tpl.lastName]
  );
  if (!userRes.rows.length) return null;
  const userId = userRes.rows[0].id;

  const profileRes = await client.query(
    `INSERT INTO student_profiles (user_id, tenant_id, roll_number, department, branch, cgpa, gender, category, placement_status, is_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'unplaced', true) RETURNING id`,
    [userId, tenantId, roll, tpl.dept, tpl.branch, tpl.cgpa, tpl.gender, tpl.category]
  );
  const profileId = profileRes.rows[0].id;

  for (const skill of (tpl.skills || [])) {
    await client.query(
      'INSERT INTO student_skills (student_id, skill_name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [profileId, skill]
    );
  }
  return `${shortCode}-${roll}`;
}

async function seedJob(client, employerId, tpl) {
  const res = await client.query(
    `INSERT INTO job_postings (employer_id, title, job_type, category, min_cgpa, status, vacancies, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [employerId, tpl.title, tpl.type, tpl.category, tpl.min_cgpa, tpl.status, tpl.vacancies,
     `${tpl.title} opportunity for eligible students.`]
  );
  return res.rows[0].id;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tenantsRes = await client.query('SELECT id, name, short_code FROM tenants WHERE is_active = true ORDER BY name');
    const tenants = tenantsRes.rows;
    console.log(`Found ${tenants.length} active tenant(s)\n`);

    for (const tenant of tenants) {
      const { id: tenantId, name, short_code: shortCode } = tenant;
      console.log(`\n━━ ${name} (${shortCode || 'NO_CODE'}) ━━`);

      // ── Employers ──
      const empCount = await countEmployers(client, tenantId);
      const empIds = [];

      if (empCount === 0) {
        console.log(`  [employers] None found — seeding 2`);
      }

      const needed = Math.max(0, 2 - empCount);
      for (let i = 0; i < EMPLOYER_NAMES.length && i < needed + (empCount > 0 ? 0 : 0); i++) {
        const emp = EMPLOYER_NAMES[i];
        const userId = await ensureEmployerUser(client, tenantId, `${emp.slug}-${tenantId.slice(0,6)}`);
        const employerId = await ensureEmployerProfile(client, userId, emp);
        await ensureApproval(client, tenantId, employerId);
        empIds.push(employerId);
        console.log(`  [employers] ✅ ${emp.name}`);
      }

      // Also collect existing employer IDs
      const existingEmps = await client.query(
        'SELECT employer_id FROM employer_approvals WHERE tenant_id = $1',
        [tenantId]
      );
      for (const r of existingEmps.rows) {
        if (!empIds.includes(r.employer_id)) empIds.push(r.employer_id);
      }

      const primaryEmpId = empIds[0];
      const secondaryEmpId = empIds[1] || empIds[0];

      // ── Students ──
      const studCount = await countStudents(client, tenantId);
      if (studCount < 2) {
        const toSeed = 2 - studCount;
        for (let i = 0; i < toSeed; i++) {
          const tpl = STUDENT_TEMPLATES[i % STUDENT_TEMPLATES.length];
          const sysId = await seedStudent(client, tenantId, shortCode || 'GEN', tpl, Date.now() + i);
          if (sysId) console.log(`  [students]  ✅ ${tpl.firstName} ${tpl.lastName} (${sysId})`);
        }
      } else {
        console.log(`  [students]  ${studCount} already exist — skipping`);
      }

      if (!primaryEmpId) {
        console.log(`  [jobs/internships/projects] No employer — skipping`);
        continue;
      }

      // ── Jobs ──
      const jobCount = await countJobsByType(client, empIds, 'full_time');
      if (jobCount < 2) {
        const toSeed = 2 - jobCount;
        for (let i = 0; i < toSeed; i++) {
          const tpl = JOB_TEMPLATES[i % JOB_TEMPLATES.length];
          const empId = i === 0 ? primaryEmpId : secondaryEmpId;
          await seedJob(client, empId, tpl);
          console.log(`  [jobs]      ✅ ${tpl.title}`);
        }
      } else {
        console.log(`  [jobs]      ${jobCount} already exist — skipping`);
      }

      // ── Internships ──
      const internCount = await countJobsByType(client, empIds, 'internship');
      if (internCount < 2) {
        const toSeed = 2 - internCount;
        for (let i = 0; i < toSeed; i++) {
          const tpl = INTERNSHIP_TEMPLATES[i % INTERNSHIP_TEMPLATES.length];
          const empId = i === 0 ? primaryEmpId : secondaryEmpId;
          await seedJob(client, empId, tpl);
          console.log(`  [internships] ✅ ${tpl.title}`);
        }
      } else {
        console.log(`  [internships] ${internCount} already exist — skipping`);
      }

      // ── Projects ──
      const projCount = await countJobsByType(client, empIds, 'short_project');
      if (projCount < 3) {
        const toSeed = 3 - projCount;
        for (let i = 0; i < toSeed; i++) {
          const tpl = PROJECT_TEMPLATES[i % PROJECT_TEMPLATES.length];
          const empId = i % 2 === 0 ? primaryEmpId : secondaryEmpId;
          await seedJob(client, empId, tpl);
          console.log(`  [projects]  ✅ ${tpl.title}`);
        }
      } else {
        console.log(`  [projects]  ${projCount} already exist — skipping`);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Seeding complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seeding failed:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

run();
