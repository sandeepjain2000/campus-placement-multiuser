const { Client } = require('pg');

const DB_URL = 'postgresql://postgres.yvnhwklejsdjsnhzqovs:MhC%2BLD%21%2Bb5WzYFy@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres';

const TECHCORP_ID = 'c1000000-0000-0000-0000-000000000001';
const ADMIN_ID = 'b1000000-0000-0000-0000-000000000002';

const cities = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad',
  'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur',
  'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane',
  'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad', 'Patna', 'Vadodara',
  'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Ranchi',
  'Faridabad', 'Meerut', 'Rajkot', 'Kalyan-Dombivli', 'Vasai-Virar',
  'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar',
  'Navi Mumbai', 'Allahabad', 'Howrah', 'Gwalior', 'Jabalpur',
  'Coimbatore', 'Vijayawada', 'Jodhpur', 'Madurai', 'Raipur',
  'Kota', 'Guwahati', 'Chandigarh', 'Solapur', 'Hubli-Dharwad'
];

const colleges = cities.map((city, idx) => ({
  slug: `iot-${city.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
  name: `Institute of Technology, ${city}`,
  city,
  email: `placement@iot${city.toLowerCase().replace(/[^a-z0-9]/g, '')}.edu`,
  phone: `+91-98${String(10000000 + idx).padStart(8, '0')}`,
}));

async function run() {
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to database');

  // ── Step 1: Upsert all 50 colleges, capture actual IDs ──────────────────
  const slugToId = {};
  for (const c of colleges) {
    const res = await client.query(
      `INSERT INTO tenants (name, slug, type, city, state, email, accreditation, naac_grade,
         established_year, website, logo_url, phone, address, pincode, settings)
       VALUES ($1, $2, 'college', $3, 'State', $4, 'AICTE', 'A', 2000,
         $5, '/logos/default-college.svg', $6, 'Main Campus', '000000', '{}'::jsonb)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [c.name, c.slug, c.city, c.email, `https://${c.slug}.edu`, c.phone]
    );
    slugToId[c.slug] = res.rows[0].id;
  }
  console.log(`✓ Upserted ${Object.keys(slugToId).length} colleges`);

  // ── Step 2: Upsert employer_approvals using real tenant IDs ─────────────
  let approvalCount = 0;
  for (const c of colleges) {
    const tenantId = slugToId[c.slug];
    try {
      await client.query(
        `INSERT INTO employer_approvals (tenant_id, employer_id, status, approved_by, approved_at, created_at)
         VALUES ($1, $2, 'approved', $3, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days')
         ON CONFLICT DO NOTHING`,
        [tenantId, TECHCORP_ID, ADMIN_ID]
      );
      approvalCount++;
    } catch (err) {
      console.error(`Approval error for ${c.slug}:`, err.message);
    }
  }
  console.log(`✓ Inserted ${approvalCount} employer approvals`);

  // ── Step 3: Upsert job posting ───────────────────────────────────────────
  const JOB_ID = 'b47dc22d-352f-4184-b785-826f6cc77707';
  await client.query(
    `INSERT INTO job_postings (id, employer_id, title, description, job_type, category,
       locations, salary_min, salary_max, eligible_branches, min_cgpa, max_backlogs,
       batch_year, skills_required, vacancies, status)
     VALUES ($1, $2, 'Software Engineer (Campus Hiring)',
       'Campus hiring across various top institutions.',
       'full_time', 'Engineering',
       ARRAY['Bangalore', 'Pune'],
       1200000, 1600000,
       ARRAY['Computer Science & Engineering'],
       7.0, 0, 2026,
       ARRAY['Java', 'Python'],
       50, 'published')
     ON CONFLICT (id) DO NOTHING`,
    [JOB_ID, TECHCORP_ID]
  );
  console.log('✓ Job posting upserted');

  // ── Step 4: Create placement drives in first 20 colleges ─────────────────
  const driveColleges = colleges.slice(0, 20);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  let driveCount = 0;
  for (let i = 0; i < driveColleges.length; i++) {
    const c = driveColleges[i];
    const tenantId = slugToId[c.slug];

    const targetMonth = i % 2 === 0 ? month : month + 1;
    const actualYear = targetMonth > 11 ? year + 1 : year;
    const actualMonth = targetMonth > 11 ? 0 : targetMonth;
    const day = (i * 3 % 28) + 1;
    const driveDate = `${actualYear}-${String(actualMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const driveType = i % 3 === 0 ? 'virtual' : 'on_campus';
    const status = i % 5 === 4 ? 'scheduled' : 'approved';
    const registered = 5 + (i * 7 % 45);

    try {
      await client.query(
        `INSERT INTO placement_drives (tenant_id, employer_id, job_id, title, description,
           drive_type, drive_date, start_time, end_time, venue, status, max_students, registered_count)
         VALUES ($1, $2, $3, $4, 'Recruitment drive for SE role.',
           $5, $6, '09:00', '17:00', 'Virtual/Campus', $7, 100, $8)`,
        [
          tenantId, TECHCORP_ID, JOB_ID,
          `TechCorp Campus Drive at ${c.city}`,
          driveType, driveDate, status, registered
        ]
      );
      driveCount++;
    } catch (err) {
      console.error(`Drive error for ${c.slug}:`, err.message);
    }
  }
  console.log(`✓ Created ${driveCount} placement drives`);

  await client.end();
  console.log('\nAll done! Seed completed successfully.');
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
