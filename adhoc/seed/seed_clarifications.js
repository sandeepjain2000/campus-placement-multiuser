const { useRepoRoot } = require('../lib/repo-root');
useRepoRoot();

// seed_clarifications.js - Run with: node adhoc/seed/seed_clarifications.js
const { Pool } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=').trim();
if (!dbUrl) { console.error('DATABASE_URL not found in .env.local'); process.exit(1); }

const pool = new Pool({ connectionString: dbUrl });

const COMPANIES = [
  {
    company: 'Infosys',
    postedBy: 'Placement Office',
    questions: [
      { text: 'What is the bond period after joining Infosys?', answer: 'There is no bond. Infosys does not require a bond from campus hires.', answeredBy: 'Infosys HR' },
      { text: 'Will the joining location be negotiable?', answer: 'Joining location is based on project requirements. You can submit a preference but it is not guaranteed.', answeredBy: 'Infosys HR' },
      { text: 'Is there an additional coding round after the written test?', answer: null },
    ],
  },
  {
    company: 'TCS',
    postedBy: 'Student Council',
    questions: [
      { text: 'What is the CTC breakdown for TCS Digital role vs TCS Ninja?', answer: 'TCS Ninja: ₹3.36 LPA. TCS Digital: ₹7 LPA. Both include fixed pay, variable pay and allowances.', answeredBy: 'TCS Campus Team' },
      { text: 'Will we get a chance to switch from Ninja to Digital after joining?', answer: 'Yes, through internal assessments. Performance in the first 6 months is the primary criterion.', answeredBy: 'TCS Campus Team' },
      { text: 'Does TCS allow remote work for freshers?', answer: null },
      { text: 'What tech stack will freshers be trained on during the induction?', answer: 'Training covers Java, Python, SQL, and cloud basics during the ILP (Initial Learning Program).', answeredBy: 'TCS Campus Team' },
    ],
  },
  {
    company: 'Wipro',
    postedBy: 'Placement Committee',
    questions: [
      { text: 'Is there a service agreement or bond?', answer: 'Yes, Wipro requires a 12-month service agreement for campus hires. Breakage fee is ₹75,000.', answeredBy: 'Wipro Recruitment' },
      { text: 'What is the joining timeline for the current batch?', answer: 'Expected joining is between August and October 2026, subject to business requirements.', answeredBy: 'Wipro Recruitment' },
    ],
  },
  {
    company: 'Accenture',
    postedBy: 'Placement Office',
    questions: [
      { text: 'What roles are being offered — ASE or Packaged App Developer?', answer: 'Both roles are open. Role assignment is based on performance in the technical interview rounds.', answeredBy: 'Accenture HR' },
      { text: 'Is there a difference in salary between ASE and Packaged App Developer?', answer: 'ASE: ₹4.5 LPA. Packaged App Developer: ₹6.5 LPA. Both include base pay and joining bonus.', answeredBy: 'Accenture HR' },
      { text: 'Will there be a virtual or in-person interview process?', answer: 'All rounds including coding test, communication test, and HR interview will be conducted virtually.', answeredBy: 'Accenture HR' },
    ],
  },
  {
    company: 'Amazon',
    postedBy: 'Student',
    questions: [
      { text: 'Is the Amazon SDE-1 role for full-time or a 6-month contract?', answer: 'This is a full-time permanent role, not a contract position.', answeredBy: 'Amazon University Recruiting' },
      { text: 'How many DSA rounds are there in the Amazon interview process?', answer: 'There are typically 2 online assessment rounds followed by 3-4 virtual loop interviews covering DSA, system design, and leadership principles.', answeredBy: 'Amazon University Recruiting' },
      { text: 'Does Amazon provide relocation assistance for campus hires?', answer: null },
    ],
  },
  {
    company: 'Deloitte',
    postedBy: 'Placement Committee',
    questions: [
      { text: 'What is the selection process for the Analyst role?', answer: 'Online aptitude test → Group discussion → Technical interview → HR interview. Four rounds in total.', answeredBy: 'Deloitte Campus Team' },
      { text: 'Is prior knowledge of accounting mandatory for the tech analyst profile?', answer: 'No. The tech analyst role is for engineering graduates. Accounting knowledge is not required.', answeredBy: 'Deloitte Campus Team' },
    ],
  },
];

async function seed() {
  const tenantRes = await pool.query('SELECT id FROM tenants LIMIT 1');
  if (!tenantRes.rows.length) { console.error('No tenant found'); process.exit(1); }
  const tenantId = tenantRes.rows[0].id;
  console.log('Seeding clarifications for tenant:', tenantId);

  // Find a super_admin or college_admin user to set as created_by
  const userRes = await pool.query("SELECT id FROM users WHERE role IN ('super_admin','college_admin') LIMIT 1");
  const createdBy = userRes.rows[0]?.id || null;

  for (const c of COMPANIES) {
    const batchRes = await pool.query(
      `INSERT INTO clarification_batches (tenant_id, company, posted_by, posted_at, created_by)
       VALUES ($1::uuid, $2, $3, CURRENT_DATE - (random()*30)::int, $4)
       RETURNING id`,
      [tenantId, c.company, c.postedBy, createdBy]
    );
    const batchId = batchRes.rows[0].id;

    for (const q of c.questions) {
      const qRes = await pool.query(
        `INSERT INTO clarification_questions (batch_id, question_text) VALUES ($1::uuid, $2) RETURNING id`,
        [batchId, q.text]
      );
      if (q.answer) {
        await pool.query(
          `UPDATE clarification_questions SET answer_text=$1, answered_by=$2, answered_at=NOW() WHERE id=$3::uuid`,
          [q.answer, q.answeredBy, qRes.rows[0].id]
        );
      }
    }
    console.log(`✓ Seeded: ${c.company} (${c.questions.length} questions)`);
  }

  await pool.end();
  console.log('Done!');
}

seed().catch(e => { console.error(e); pool.end(); process.exit(1); });
