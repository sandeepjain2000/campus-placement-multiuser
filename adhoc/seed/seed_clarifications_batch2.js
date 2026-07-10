const { useRepoRoot } = require('../lib/repo-root');
useRepoRoot();

// seed_clarifications_batch2.js - Run with: node adhoc/seed/seed_clarifications_batch2.js
const { Pool } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=').trim();
if (!dbUrl) { console.error('DATABASE_URL not found in .env.local'); process.exit(1); }

const pool = new Pool({ connectionString: dbUrl });

const COMPANIES = [
  {
    company: 'Microsoft',
    postedBy: 'Placement Committee',
    questions: [
      { text: 'Is the role for Microsoft India Development Center (IDC) or a different entity?', answer: 'Yes, this role is specifically for Microsoft IDC, Hyderabad.', answeredBy: 'Microsoft University Recruiting' },
      { text: 'How many interview rounds does Microsoft conduct for the SDE role?', answer: 'Typically 4–5 rounds: 1 online assessment + 3 technical interviews + 1 HR round.', answeredBy: 'Microsoft University Recruiting' },
      { text: 'Does Microsoft offer stock (ESPP) to campus hires?', answer: 'Yes, ESPP is part of the compensation package from Day 1.', answeredBy: 'Microsoft University Recruiting' },
      { text: 'Is relocation support provided for candidates joining outside their home city?', answer: null },
    ],
  },
  {
    company: 'Google',
    postedBy: 'Placement Office',
    questions: [
      { text: 'What is the expected CTC for the STEP Intern and full-time SWE roles?', answer: 'SWE (L3): ₹35–45 LPA total compensation including base, bonus and GSU. STEP Intern: ₹1.5L/month stipend.', answeredBy: 'Google Campus Recruiting' },
      { text: 'How many coding rounds are in the Google interview process?', answer: '5 rounds total: 2 online coding assessments + 3 virtual interviews covering algorithms, systems, and behavioral.', answeredBy: 'Google Campus Recruiting' },
      { text: 'Does Google allow branch exceptions for non-CS students?', answer: 'Yes, students from ECE, EE, and Mathematics backgrounds are also eligible if they meet the CGPA cutoff.', answeredBy: 'Google Campus Recruiting' },
    ],
  },
  {
    company: 'Capgemini',
    postedBy: 'Student Council',
    questions: [
      { text: 'What is the difference between the Analyst and Senior Analyst campus offer?', answer: 'Analyst: ₹3.8 LPA. Senior Analyst: ₹6.5 LPA. Selection is based on the SuperCoders test performance.', answeredBy: 'Capgemini HR' },
      { text: 'Is there a service bond for Capgemini campus hires?', answer: 'No formal bond. However, a training cost recovery clause applies if you leave within 6 months.', answeredBy: 'Capgemini HR' },
      { text: 'Will the joining be virtual or in-person?', answer: null },
    ],
  },
  {
    company: 'HCL Technologies',
    postedBy: 'Placement Office',
    questions: [
      { text: 'What is the CTC offered for the Technology Trainee role?', answer: 'CTC is ₹3.5 LPA for Technology Trainee, increasing to ₹5 LPA after successful completion of the 1-year training program.', answeredBy: 'HCL Talent Acquisition' },
      { text: 'What is the duration and structure of the initial training period?', answer: 'The HCL TechBee training is 12 months at HCL Learning Center, covering functional, technical, and behavioural modules.', answeredBy: 'HCL Talent Acquisition' },
      { text: 'Is the CGPA cutoff strictly 6.0 or is there any relaxation?', answer: null },
    ],
  },
  {
    company: 'IBM',
    postedBy: 'Placement Committee',
    questions: [
      { text: 'What roles is IBM hiring for in this campus drive?', answer: 'IBM is recruiting for Associate Developer, Data Analyst, and Consulting Analyst roles this cycle.', answeredBy: 'IBM Campus Hiring' },
      { text: 'Is there an aptitude test before the technical round?', answer: 'Yes. IBM Cognitive Ability Assessment (IPAT) is the first filter, followed by technical and HR rounds.', answeredBy: 'IBM Campus Hiring' },
      { text: 'Does IBM provide an opportunity to work in the USA within the first 2 years?', answer: 'Opportunities exist through the IBM GBS Global Mobility program, but they are project-dependent and not guaranteed.', answeredBy: 'IBM Campus Hiring' },
    ],
  },
  {
    company: 'Cognizant',
    postedBy: 'Student Council',
    questions: [
      { text: 'What is the difference between CTS GenC, GenC Next, and GenC Elevate?', answer: 'GenC: ₹4 LPA (general engineering). GenC Next: ₹5.8 LPA (higher aptitude). GenC Elevate: ₹9 LPA (competitive coding round required).', answeredBy: 'Cognizant HR' },
      { text: 'How long is the training period before going live on a project?', answer: 'Training is typically 3–4 months at Cognizant Academy (virtual). You are deployed to a project after training completion.', answeredBy: 'Cognizant HR' },
    ],
  },
  {
    company: 'Adobe',
    postedBy: 'Placement Office',
    questions: [
      { text: 'What is the expected package for the MTS (Member of Technical Staff) role?', answer: 'Adobe MTS campus offer is typically ₹25–32 LPA total compensation including RSUs and performance bonus.', answeredBy: 'Adobe University Recruiting' },
      { text: 'Does the Adobe interview include a system design round for freshers?', answer: 'Yes, there is typically 1 system design round along with 2–3 DSA rounds and 1 HR round.', answeredBy: 'Adobe University Recruiting' },
      { text: 'Will there be an internship conversion to full-time offer?', answer: 'Yes, Adobe interns with a strong performance review receive a pre-placement offer (PPO) at the end of the internship.', answeredBy: 'Adobe University Recruiting' },
    ],
  },
  {
    company: 'Flipkart',
    postedBy: 'Placement Committee',
    questions: [
      { text: 'Is Flipkart hiring SDE-1 exclusively from CS/IT branches?', answer: 'No. ECE, EE, and other engineering branches are also eligible as long as they have a strong programming background.', answeredBy: 'Flipkart Campus Team' },
      { text: 'What is the CTC for the SDE-1 role at Flipkart?', answer: 'SDE-1 total compensation is ₹24–28 LPA including base salary, joining bonus, and ESOPs.', answeredBy: 'Flipkart Campus Team' },
      { text: 'What is the minimum CGPA requirement?', answer: null },
      { text: 'Are there opportunities to work on the supply chain or ML platform teams as a fresher?', answer: 'Team allocation depends on business needs. You can express your interest, but placement is based on project availability.', answeredBy: 'Flipkart Campus Team' },
    ],
  },
  {
    company: 'Swiggy',
    postedBy: 'Student Council',
    questions: [
      { text: 'Is Swiggy hiring engineers exclusively for Bangalore?', answer: 'Primarily yes, but Swiggy also has tech teams in Hyderabad. Initial posting is typically Bangalore.', answeredBy: 'Swiggy Recruiting' },
      { text: 'What kind of technical interviews does Swiggy conduct for campus SDE?', answer: '3 technical rounds: 2 DSA-focused and 1 low-level design round. Final round is a cultural fit discussion.', answeredBy: 'Swiggy Recruiting' },
      { text: 'Does Swiggy provide food and transport allowances as part of the package?', answer: 'Yes, Swiggy provides food credits and cab reimbursement as standard perks.', answeredBy: 'Swiggy Recruiting' },
    ],
  },
  {
    company: 'Persistent Systems',
    postedBy: 'Placement Office',
    questions: [
      { text: 'What is the CTC offered for the Fresher Engineer role?', answer: 'Persistent offers ₹5 LPA for the Engineer role. High performers in the Smart Hiring Test may qualify for ₹8 LPA Digital Specialist track.', answeredBy: 'Persistent HR' },
      { text: 'Is there a service bond at Persistent Systems?', answer: 'There is no traditional bond. However, training costs may be recovered if you resign within 12 months of joining.', answeredBy: 'Persistent HR' },
      { text: 'What is the exam pattern for the Smart Hiring Test?', answer: null },
    ],
  },
];

async function seed() {
  const tenantRes = await pool.query('SELECT id FROM tenants LIMIT 1');
  if (!tenantRes.rows.length) { console.error('No tenant found'); process.exit(1); }
  const tenantId = tenantRes.rows[0].id;
  console.log('Seeding clarifications for tenant:', tenantId);

  const userRes = await pool.query("SELECT id FROM users WHERE role IN ('super_admin','college_admin') LIMIT 1");
  const createdBy = userRes.rows[0]?.id || null;

  for (const c of COMPANIES) {
    const batchRes = await pool.query(
      `INSERT INTO clarification_batches (tenant_id, company, posted_by, posted_at, created_by)
       VALUES ($1::uuid, $2, $3, CURRENT_DATE - (random()*20)::int, $4)
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
    console.log(`✓ ${c.company} — ${c.questions.length} questions`);
  }

  await pool.end();
  console.log('\nAll done! 10 companies added.');
}

seed().catch(e => { console.error(e); pool.end(); process.exit(1); });
