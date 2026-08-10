import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { newId, referralCodeFrom } from '@/lib/ids';

const DEMO_PASSWORD = 'Admin@123';

async function ensureDemoUser({ email, role, name, points = 50, credits = 3, allowance = 15, profileComplete = true }) {
  const existing = await query(`SELECT id FROM ip_users WHERE lower(email) = lower($1)`, [email]);
  if (existing.rows[0]) return { id: existing.rows[0].id, created: false };

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const id = newId('ip_user');
  await query(
    `INSERT INTO ip_users (id, email, password_hash, role, name, points, free_post_credits,
      application_allowance, referral_code, profile_complete, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true)`,
    [id, email, hash, role, name, points, credits, allowance, referralCodeFrom(email), profileComplete],
  );
  return { id, created: true };
}

/**
 * Ensure demo SuperAdmin + Candidate + Employer exist (idempotent).
 * Password for all: Admin@123
 */
export async function ensureIpBootstrap() {
  let seeded = false;

  const admin = await ensureDemoUser({
    email: 'superadmin@internship.local',
    role: 'superadmin',
    name: 'Portal SuperAdmin',
    points: 0,
    credits: 0,
    allowance: 0,
  });
  if (admin.created) seeded = true;

  const candidate = await ensureDemoUser({
    email: 'candidate@internship.local',
    role: 'candidate',
    name: 'Demo Candidate',
  });
  if (candidate.created) {
    seeded = true;
    await query(
      `INSERT INTO ip_candidates (
         id, user_id, name, email, phone, college, degree, specialization, study_status,
         graduation_year, cgpa, city, state, skills, preferred_work_mode, preferred_locations, searchable
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,true)
       ON CONFLICT (user_id) DO NOTHING`,
      [
        newId('ip_cand'),
        candidate.id,
        'Demo Candidate',
        'candidate@internship.local',
        '9999990001',
        'Demo Institute of Technology',
        'B.Tech',
        'Computer Science',
        'pursuing',
        2027,
        8.2,
        'Bengaluru',
        'Karnataka',
        ['React', 'SQL', 'Python'],
        'Remote',
        ['Bengaluru', 'Remote'],
      ],
    );
  }

  const employer = await ensureDemoUser({
    email: 'employer@internship.local',
    role: 'employer',
    name: 'Demo Employer',
    credits: 5,
  });
  if (employer.created) {
    seeded = true;
    await query(
      `INSERT INTO ip_employers (
         id, user_id, company_name, brand_name, website, work_email, industry, company_size,
         hq_city, hq_state, about, contact_name, contact_designation, contact_phone,
         approval_status, show_identity_on_posting
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'approved',true)
       ON CONFLICT (user_id) DO NOTHING`,
      [
        newId('ip_emp'),
        employer.id,
        'Demo Tech Pvt Ltd',
        'DemoTech',
        'https://demotech.example',
        'employer@internship.local',
        'Software',
        '11-50',
        'Bengaluru',
        'Karnataka',
        'Seeded demo employer for Internship Portal.',
        'Demo Employer',
        'HR Lead',
        '9999990002',
      ],
    );
  }

  return {
    seeded,
    password: DEMO_PASSWORD,
    accounts: [
      'superadmin@internship.local',
      'candidate@internship.local',
      'employer@internship.local',
    ],
  };
}
