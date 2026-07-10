const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let dbUrl = 'postgresql://postgres:postgres@localhost:5432/postgres';
try {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    const match = env.split('\n').find(l => l.startsWith('DATABASE_URL'));
    if (match) dbUrl = match.split('=').slice(1).join('=').trim();
  }
} catch (e) { /* ignore */ }

const pool = new Pool({ connectionString: dbUrl });

const INTERNSHIPS = [
  {
    title: 'Software Engineering Intern',
    description: 'Work on large-scale distributed systems powering search and cloud products. Collaborate with world-class engineers on real production code.',
    salaryMin: 80000, salaryMax: 120000, minCgpa: 8.5, vacancies: 10,
    skills: ['Python', 'Java', 'Distributed Systems', 'Data Structures'],
    deadlineDays: 21,
  },
  {
    title: 'Data Science Intern',
    description: 'Apply ML models to improve product recommendations, search ranking, and supply-chain forecasting. Work with petabyte-scale datasets.',
    salaryMin: 60000, salaryMax: 90000, minCgpa: 7.5, vacancies: 6,
    skills: ['Python', 'Machine Learning', 'SQL', 'Statistics'],
    deadlineDays: 30,
  },
  {
    title: 'Frontend Development Intern',
    description: 'Build delightful payment experiences used by millions of merchants. Work with React, TypeScript, and modern design systems.',
    salaryMin: 50000, salaryMax: 75000, minCgpa: 7.0, vacancies: 4,
    skills: ['React', 'TypeScript', 'CSS', 'JavaScript'],
    deadlineDays: 14,
  },
  {
    title: 'Cloud Infrastructure Intern',
    description: 'Contribute to cloud services. Work on container orchestration, networking, and reliability engineering for global-scale infrastructure.',
    salaryMin: 90000, salaryMax: 130000, minCgpa: 8.0, vacancies: 8,
    skills: ['C#', 'Azure', 'Kubernetes', 'Networking'],
    deadlineDays: 25,
  },
  {
    title: 'Product Design Intern',
    description: 'Design intuitive experiences for consumers and delivery partners. Conduct user research, create prototypes, and collaborate with engineering.',
    salaryMin: 45000, salaryMax: 65000, minCgpa: 6.5, vacancies: 3,
    skills: ['Figma', 'User Research', 'Prototyping', 'UI/UX'],
    deadlineDays: 18,
  },
  {
    title: 'Backend Engineering Intern',
    description: 'Build high-throughput trading systems handling millions of orders per day. Work with Go, PostgreSQL, and real-time data pipelines.',
    salaryMin: 70000, salaryMax: 100000, minCgpa: 7.5, vacancies: 5,
    skills: ['Go', 'PostgreSQL', 'REST APIs', 'System Design'],
    deadlineDays: 20,
  },
  {
    title: 'DevOps Intern',
    description: 'Automate CI/CD pipelines, manage Kubernetes clusters, and ensure 99.99% uptime for services serving millions of users daily.',
    salaryMin: 55000, salaryMax: 80000, minCgpa: 7.0, vacancies: 3,
    skills: ['Docker', 'Kubernetes', 'AWS', 'Linux'],
    deadlineDays: 15,
  },
  {
    title: 'AI/ML Research Intern',
    description: 'Research and prototype generative AI models for creative tools. Publish papers and ship features used by millions of creatives worldwide.',
    salaryMin: 85000, salaryMax: 120000, minCgpa: 8.5, vacancies: 4,
    skills: ['PyTorch', 'Deep Learning', 'Computer Vision', 'NLP'],
    deadlineDays: 28,
  },
];

async function main() {
  const client = await pool.connect();
  try {
    // Get all tenants for visibility
    const tenantsRes = await client.query('SELECT id FROM tenants');
    const tenantIds = tenantsRes.rows.map(r => r.id);
    if (!tenantIds.length) {
      console.log('No tenants found. Cannot seed.');
      return;
    }

    // Use the EXISTING employer profile (there's a unique user_id constraint)
    const epRes = await client.query('SELECT id FROM employer_profiles LIMIT 1');
    if (!epRes.rowCount) {
      console.log('No employer profile found. Cannot seed.');
      return;
    }
    const employerId = epRes.rows[0].id;
    console.log('Using employer profile:', employerId);

    let seeded = 0;
    for (const intern of INTERNSHIPS) {
      // Check for duplicate job
      const dupCheck = await client.query(
        'SELECT id FROM job_postings WHERE employer_id = $1 AND title = $2 AND job_type = $3 LIMIT 1',
        [employerId, intern.title, 'internship'],
      );
      if (dupCheck.rowCount) {
        console.log('  skip  "' + intern.title + '" already exists.');
        continue;
      }

      // Insert job posting
      const jobRes = await client.query(
        `INSERT INTO job_postings (
           employer_id, title, job_type, description,
           salary_min, salary_max, min_cgpa, vacancies, status, application_deadline,
           skills_required
         ) VALUES ($1,$2,'internship',$3,$4,$5,$6,$7,'published', NOW() + ($8 || ' days')::interval, $9)
         RETURNING id`,
        [
          employerId, intern.title, intern.description,
          intern.salaryMin, intern.salaryMax, intern.minCgpa, intern.vacancies,
          String(intern.deadlineDays),
          '{' + intern.skills.map(s => '"' + s + '"').join(',') + '}',
        ],
      );
      const jobId = jobRes.rows[0].id;

      // Visibility + employer approval for every tenant
      for (const tid of tenantIds) {
        await client.query(
          'INSERT INTO job_posting_visibility (job_id, tenant_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [jobId, tid],
        );
        await client.query(
          'INSERT INTO employer_approvals (employer_id, tenant_id, status) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
          [employerId, tid, 'approved'],
        );
      }

      seeded++;
      console.log('  OK  "' + intern.title + '"');
    }

    console.log('\nDone — ' + seeded + ' new internships seeded.');
  } catch (e) {
    console.error('Seed error:', e);
  } finally {
    client.release();
    pool.end();
  }
}

main();
