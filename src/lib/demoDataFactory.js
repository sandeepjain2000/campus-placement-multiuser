import { randomInt, randomUUID } from 'crypto';
import { query, transaction } from '@/lib/db';
import { ensureIitmTieUpForEmployer, resolveIitmTenant } from '@/lib/employerIitmTieUp';
import {
  DEMO_SCREEN_SQL_PARAMS,
  demoScreenCollegeTenantFilter,
  demoScreenEmployerEmailFilter,
  demoScreenStudentEmailFilter,
} from '@/lib/demoScreenAllowlist';
import { formatStudentSystemIdForCollege, resolveCollegeShortCode } from '@/lib/studentSystemId';
import { SANDBOX_DEFAULT_PASSWORD, SANDBOX_PASSWORD_HASH } from '@/lib/sandboxCredentials';

const DEMO_EMAIL_DOMAIN = 'placementhub.test';
const DEMO_RESUME_URL =
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

const FIRST_NAMES = [
  'Aarav',
  'Priya',
  'Rohan',
  'Ananya',
  'Vikram',
  'Meera',
  'Karthik',
  'Sneha',
  'Arjun',
  'Nisha',
  'Dev',
  'Kavya',
  'Rahul',
  'Isha',
  'Aditya',
];

const LAST_NAMES = [
  'Sharma',
  'Patel',
  'Iyer',
  'Reddy',
  'Gupta',
  'Nair',
  'Menon',
  'Singh',
  'Kumar',
  'Verma',
  'Rao',
  'Desai',
  'Pillai',
  'Joshi',
  'Chopra',
];

const DEPARTMENTS = [
  { dept: 'Computer Science', branch: 'Computer Science & Engineering' },
  { dept: 'Electrical Engineering', branch: 'Electronics & Communication' },
  { dept: 'Mechanical Engineering', branch: 'Mechanical Engineering' },
  { dept: 'Information Technology', branch: 'Information Technology' },
];

const JOB_TITLES = [
  'Software Development Engineer',
  'Associate Software Engineer',
  'Graduate Engineer Trainee',
  'Full Stack Developer',
  'Backend Engineer',
  'Data Engineer',
];

function pick(arr) {
  return arr[randomInt(arr.length)];
}

function randomRollSuffix() {
  const year = 2024 + randomInt(3);
  const num = randomInt(100, 999);
  return `CS${year}${num}`;
}

async function pickDemoScreenTenant(client, tenantId) {
  const collegeSlugs = DEMO_SCREEN_SQL_PARAMS.collegeSlugs;
  const collegeAdmins = DEMO_SCREEN_SQL_PARAMS.collegeAdminEmails;
  const collegeFilter = demoScreenCollegeTenantFilter('t', 'u', 2, 3);

  if (tenantId) {
    const res = await client.query(
      `SELECT t.id, t.name, t.short_code
       FROM tenants t
       WHERE t.id = $1::uuid
         AND t.is_active = true
         AND t.type = 'college'
         AND NULLIF(TRIM(t.short_code), '') IS NOT NULL
         AND ${collegeFilter}
       LIMIT 1`,
      [tenantId, collegeSlugs, collegeAdmins],
    );
    return res.rows[0] || null;
  }

  const res = await client.query(
    `SELECT t.id, t.name, t.short_code
     FROM tenants t
     WHERE t.is_active = true
       AND t.type = 'college'
       AND NULLIF(TRIM(t.short_code), '') IS NOT NULL
       AND ${demoScreenCollegeTenantFilter('t', 'u', 1, 2)}
     ORDER BY RANDOM()
     LIMIT 1`,
    [collegeSlugs, collegeAdmins],
  );
  return res.rows[0] || null;
}

async function ensureEmployerForTenant(client, tenantId) {
  const existing = await client.query(
    `SELECT ea.employer_id, ep.company_name, u.email
     FROM employer_approvals ea
     JOIN employer_profiles ep ON ep.id = ea.employer_id
     JOIN users u ON u.id = ep.user_id
     WHERE ea.tenant_id = $1::uuid
       AND ea.status = 'approved'
       AND ${demoScreenEmployerEmailFilter('u.email', 2)}
     ORDER BY RANDOM()
     LIMIT 1`,
    [tenantId, DEMO_SCREEN_SQL_PARAMS.employerEmails],
  );
  if (existing.rows.length) {
    const employerId = existing.rows[0].employer_id;
    await ensureIitmTieUpForEmployer(client, employerId);
    return { ok: true, employerId, companyName: existing.rows[0].company_name };
  }

  return {
    ok: false,
    error:
      'No demo-screen employer (TechCorp, GlobalSoft, Infosys, Innovent Labs, FinEdge) is approved on this campus. Run “Ensure IIT Madras tie-up” or approve them in the college UI.',
  };
}

/**
 * Create one demo student on a random active college.
 * @param {{ tenantId?: string, count?: number }} options
 */
export async function createDemoStudents(options = {}) {
  const count = Math.min(Math.max(Number(options.count) || 1, 1), 5);
  const results = [];

  await transaction(async (client) => {
    for (let i = 0; i < count; i += 1) {
      let tenant = null;
      if (options.tenantId) {
        tenant = await pickDemoScreenTenant(client, options.tenantId);
      } else {
        tenant = await pickDemoScreenTenant(client);
      }
      if (!tenant) {
        results.push({
          ok: false,
          error: options.tenantId
            ? 'Demo college not found (IIT Madras, NIT Trichy, or BITS Pilani only)'
            : 'No demo college available (IIT Madras, NIT Trichy, or BITS Pilani)',
        });
        continue;
      }

      const firstName = pick(FIRST_NAMES);
      const lastName = pick(LAST_NAMES);
      const deptRow = pick(DEPARTMENTS);
      const rollBase = randomRollSuffix();
      let rollNumber = rollBase;
      let attempt = 0;
      while (attempt < 8) {
        const clash = await client.query(
          `SELECT 1 FROM student_profiles WHERE tenant_id = $1::uuid AND LOWER(roll_number) = LOWER($2) LIMIT 1`,
          [tenant.id, rollNumber],
        );
        if (!clash.rows.length) break;
        rollNumber = `${rollBase}${randomInt(10, 99)}`;
        attempt += 1;
      }

      const emailToken = randomUUID().slice(0, 8);
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${emailToken}@${DEMO_EMAIL_DOMAIN}`;
      const cgpa = (6.5 + randomInt(0, 25) / 10).toFixed(2);
      const batchYear = 2022 + randomInt(0, 2);
      const systemId = formatStudentSystemIdForCollege(tenant, rollNumber);

      const userRes = await client.query(
        `INSERT INTO users (tenant_id, email, communication_email, password_hash, role, first_name, last_name, is_verified, is_active, email_verified_at)
         VALUES ($1::uuid, $2, $2, $3, 'student', $4, $5, true, true, NOW())
         RETURNING id`,
        [tenant.id, email, SANDBOX_PASSWORD_HASH, firstName, lastName],
      );
      const userId = userRes.rows[0].id;

      const profileRes = await client.query(
        `INSERT INTO student_profiles (
           user_id, tenant_id, roll_number, department, branch, cgpa, gender, category,
           placement_status, is_verified, verified_at, resume_url, batch_year, graduation_year, bio
         ) VALUES (
           $1::uuid, $2::uuid, $3, $4, $5, $6, $7, 'General',
           'unplaced', true, NOW(), $8, $9, $10, $11
         )
         RETURNING id`,
        [
          userId,
          tenant.id,
          rollNumber,
          deptRow.dept,
          deptRow.branch,
          cgpa,
          randomInt(0, 1) === 0 ? 'male' : 'female',
          DEMO_RESUME_URL,
          batchYear,
          batchYear + 4,
          'Demo student created via Data Tester API (no offers attached).',
        ],
      );

      const studentId = profileRes.rows[0].id;
      const skill = pick(['Python', 'Java', 'React', 'SQL', 'Node.js', 'DSA']);
      await client.query(`INSERT INTO student_skills (student_id, skill_name) VALUES ($1::uuid, $2)`, [
        studentId,
        skill,
      ]);

      results.push({
        ok: true,
        studentId,
        systemId,
        rollNumber,
        collegeShortCode: resolveCollegeShortCode(tenant.short_code, tenant.name),
        name: `${firstName} ${lastName}`,
        email,
        password: SANDBOX_DEFAULT_PASSWORD,
        college: tenant.name,
        collegeId: tenant.id,
        department: deptRow.dept,
        branch: deptRow.branch,
        cgpa: Number(cgpa),
        offerCount: 0,
        note: 'No offers created — use My Offers flow after jobs and applications exist.',
      });
    }
  });

  return {
    action: 'create-student',
    created: results.filter((r) => r.ok).length,
    results,
  };
}

/**
 * Create published full-time jobs with campus visibility.
 * @param {{ tenantId?: string, count?: number }} options
 */
export async function createDemoJobs(options = {}) {
  const count = Math.min(Math.max(Number(options.count) || 2, 1), 10);
  const jobType = options.jobType === 'internship' ? 'internship' : 'full_time';
  const results = [];

  await transaction(async (client) => {
    let tenants = [];
    if (options.tenantId) {
      const row = await pickDemoScreenTenant(client, options.tenantId);
      if (row) tenants = [{ id: row.id, name: row.name }];
    } else {
      const iitm = await resolveIitmTenant(client);
      if (iitm) tenants = [iitm];
      else {
        const row = await pickDemoScreenTenant(client);
        if (row) tenants = [{ id: row.id, name: row.name }];
      }
    }
    if (!tenants.length) {
      results.push({ ok: false, error: 'No demo college available (IIT Madras, NIT Trichy, or BITS Pilani)' });
      return;
    }

    for (let i = 0; i < count; i += 1) {
      const tenant = tenants[0];
      const employer = await ensureEmployerForTenant(client, tenant.id);
      if (!employer.ok) {
        results.push({ ok: false, error: employer.error });
        continue;
      }
      const { employerId, companyName } = employer;
      const title = pick(JOB_TITLES);
      const salaryMin =
        jobType === 'internship'
          ? 15000 + randomInt(0, 8) * 5000
          : 800000 + randomInt(0, 8) * 100000;
      const salaryMax =
        jobType === 'internship' ? salaryMin + randomInt(2, 5) * 5000 : salaryMin + randomInt(2, 6) * 100000;
      const minCgpa = 6 + randomInt(0, 15) / 10;
      const jobTitle =
        jobType === 'internship'
          ? `${pick(['Summer', 'Winter', 'Industry'])} Intern — ${title}`
          : title;

      const jobRes = await client.query(
        `INSERT INTO job_postings (
           employer_id, title, description, job_type, category, locations,
           salary_min, salary_max, eligible_branches, min_cgpa, max_backlogs, batch_year,
           skills_required, vacancies, status
         ) VALUES (
           $1::uuid, $2, $3, $4, 'Engineering', ARRAY['India']::text[],
           $5, $6, ARRAY['Computer Science & Engineering', 'Information Technology']::text[],
           $7, 0, 2025, ARRAY['General']::text[], $8, 'published'
         )
         RETURNING id, title`,
        [
          employerId,
          jobTitle,
          `${jobTitle} — demo ${jobType.replace('_', ' ')} for ${tenant.name}. Created via Data Tester API.`,
          jobType,
          salaryMin,
          salaryMax,
          minCgpa,
          randomInt(3, 15),
        ],
      );
      const jobId = jobRes.rows[0].id;

      await client.query(
        `INSERT INTO job_posting_visibility (job_id, tenant_id, college_status) VALUES ($1::uuid, $2::uuid, 'pending')
         ON CONFLICT (job_id, tenant_id) DO NOTHING`,
        [jobId, tenant.id],
      );

      results.push({
        ok: true,
        jobId,
        title: jobRes.rows[0].title,
        jobType,
        status: 'published',
        companyName,
        employerId,
        college: tenant.name,
        collegeId: tenant.id,
        salaryMin,
        salaryMax,
        minCgpa,
      });
    }
  });

  return {
    action: jobType === 'internship' ? 'create-internships' : 'create-jobs',
    created: results.filter((r) => r.ok).length,
    results,
  };
}

/**
 * Random unplaced demo student applies to a random visible published job or internship.
 */
export async function applyDemoStudentToJob(options = {}) {
  const jobType = options.jobType === 'internship' ? 'internship' : 'full_time';
  const actionId = jobType === 'internship' ? 'apply-to-internship' : 'apply-to-job';

  return transaction(async (client) => {
    const studentRes = await client.query(
      `SELECT sp.id AS student_id, sp.tenant_id, sp.roll_number, sp.placement_status,
              t.short_code, t.name AS college_name,
              u.first_name, u.last_name, u.email
       FROM student_profiles sp
       JOIN users u ON u.id = sp.user_id
       JOIN tenants t ON t.id = sp.tenant_id
       WHERE sp.archived_at IS NULL
         AND COALESCE(sp.is_deleted, false) = false
         AND COALESCE(sp.placement_status, 'unplaced') = 'unplaced'
         AND sp.is_verified = true
         AND ${demoScreenStudentEmailFilter('u.email', options.tenantId ? 2 : 1)}
         AND (
           sp.resume_url IS NOT NULL AND TRIM(sp.resume_url) <> ''
           OR EXISTS (
             SELECT 1 FROM student_documents sd
             WHERE sd.student_id = sp.id AND sd.document_type = 'resume'
           )
         )
         AND NOT EXISTS (
           SELECT 1 FROM offers o
           WHERE o.student_id = sp.id AND LOWER(TRIM(o.status)) = 'accepted'
         )
         ${options.tenantId ? 'AND sp.tenant_id = $1::uuid' : ''}
       ORDER BY RANDOM()
       LIMIT 1`,
      options.tenantId
        ? [options.tenantId, DEMO_SCREEN_SQL_PARAMS.studentEmails]
        : [DEMO_SCREEN_SQL_PARAMS.studentEmails],
    );

    if (!studentRes.rows.length) {
      return {
        action: actionId,
        ok: false,
        error:
          'No eligible demo-screen student found (Arjun, Sneha Rao, or Rohan — unplaced, with CV).',
        results: [],
      };
    }

    const student = studentRes.rows[0];

    const jobRes = await client.query(
      `SELECT jp.id, jp.title, ep.company_name, jp.min_cgpa
       FROM job_postings jp
       INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
       INNER JOIN job_posting_visibility jpv ON jpv.job_id = jp.id AND jpv.tenant_id = $1::uuid
       INNER JOIN employer_approvals ea
         ON ea.employer_id = jp.employer_id AND ea.tenant_id = jpv.tenant_id AND ea.status = 'approved'
       WHERE jp.job_type = $2
         AND jp.status = 'published'
         AND COALESCE(jp.is_deleted, false) = false
         ${options.jobId ? 'AND jp.id = $3::uuid' : ''}
       ORDER BY RANDOM()
       LIMIT 1`,
      options.jobId
        ? [student.tenant_id, jobType, options.jobId]
        : [student.tenant_id, jobType],
    );

    if (!jobRes.rows.length) {
      return {
        action: actionId,
        ok: false,
        error: `No published ${jobType === 'internship' ? 'internship' : 'job'} visible at ${student.college_name}. Create postings first.`,
        results: [],
      };
    }

    const job = jobRes.rows[0];

    const existing = await client.query(
      `SELECT id, status FROM program_applications WHERE student_id = $1::uuid AND job_id = $2::uuid LIMIT 1`,
      [student.student_id, job.id],
    );

    let applicationId;
    let status;
    if (existing.rows.length) {
      applicationId = existing.rows[0].id;
      status = existing.rows[0].status;
    } else {
      const ins = await client.query(
        `INSERT INTO program_applications (student_id, job_id, status, notes)
         VALUES ($1::uuid, $2::uuid, 'applied', $3)
         RETURNING id, status`,
        [student.student_id, job.id, 'Demo application via Data Tester API'],
      );
      applicationId = ins.rows[0].id;
      status = ins.rows[0].status;
    }

    const systemId = formatStudentSystemIdForCollege(
      { short_code: student.short_code, name: student.college_name },
      student.roll_number,
    );
    const name = `${student.first_name || ''} ${student.last_name || ''}`.trim();

    return {
      action: actionId,
      ok: true,
      results: [
        {
          ok: true,
          applicationId,
          status,
          jobType,
          studentId: student.student_id,
          systemId,
          studentName: name,
          studentEmail: student.email,
          jobId: job.id,
          jobTitle: job.title,
          companyName: job.company_name,
          college: student.college_name,
        },
      ],
    };
  });
}

const DRIVE_TYPES = ['on_campus', 'off_campus', 'virtual', 'hybrid'];

/**
 * Employer requests a placement drive on a campus (optionally auto-approved for student apply).
 */
export async function createDemoPlacementDrive(options = {}) {
  return transaction(async (client) => {
    let tenant;
    if (options.tenantId) {
      tenant = await pickDemoScreenTenant(client, options.tenantId);
    } else {
      tenant = await resolveIitmTenant(client);
      if (!tenant) tenant = await pickDemoScreenTenant(client);
    }
    if (!tenant) {
      return {
        action: 'request-drive',
        ok: false,
        error: 'No demo college available (IIT Madras, NIT Trichy, or BITS Pilani)',
        results: [],
      };
    }

    const employer = await ensureEmployerForTenant(client, tenant.id);
    if (!employer.ok) {
      return { action: 'request-drive', ok: false, error: employer.error, results: [] };
    }
    const { employerId, companyName } = employer;
    const title = `${companyName} — ${pick(JOB_TITLES)} drive`;
    const driveType = pick(DRIVE_TYPES);
    const driveDate = new Date();
    driveDate.setDate(driveDate.getDate() + 14 + randomInt(0, 30));
    const driveDateStr = driveDate.toISOString().slice(0, 10);
    const status = options.autoApprove ? 'approved' : 'requested';

    const ins = await client.query(
      `INSERT INTO placement_drives (
         tenant_id, employer_id, title, description, drive_type, drive_date, venue, status, max_students, registered_count
       ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::date, $7, $8, 100, 0)
       RETURNING id, title, status, drive_date`,
      [
        tenant.id,
        employerId,
        title,
        `Demo placement drive for ${tenant.name}.`,
        driveType,
        driveDateStr,
        driveType === 'virtual' ? 'Online' : 'Main campus',
        status,
      ],
    );
    const row = ins.rows[0];

    return {
      action: options.autoApprove ? 'request-and-approve-drive' : 'request-drive',
      ok: true,
      results: [
        {
          ok: true,
          driveId: row.id,
          title: row.title,
          status: row.status,
          driveDate: row.drive_date,
          driveType,
          companyName,
          college: tenant.name,
          collegeId: tenant.id,
        },
      ],
    };
  });
}

/** Approve a requested drive (demo — skips college login). */
export async function approveDemoPlacementDrive(options = {}) {
  const driveId = options.driveId ? String(options.driveId).trim() : '';
  return transaction(async (client) => {
    let targetId = driveId;
    if (!targetId) {
      const q = await client.query(
        `SELECT id, title, tenant_id FROM placement_drives
         WHERE status = 'requested'
         ${options.tenantId ? 'AND tenant_id = $1::uuid' : ''}
         ORDER BY created_at DESC LIMIT 1`,
        options.tenantId ? [options.tenantId] : [],
      );
      if (!q.rows.length) {
        return { action: 'approve-drive', ok: false, error: 'No requested drive found. Run Request drive first.', results: [] };
      }
      targetId = q.rows[0].id;
    }

    const updated = await client.query(
      `UPDATE placement_drives
       SET status = 'approved', approved_at = NOW(), updated_at = NOW()
       WHERE id = $1::uuid AND status = 'requested'
       RETURNING id, title, status, tenant_id`,
      [targetId],
    );
    if (!updated.rows.length) {
      return { action: 'approve-drive', ok: false, error: 'Drive not found or not in requested status', results: [] };
    }
    const row = updated.rows[0];
    const college = await client.query(`SELECT name FROM tenants WHERE id = $1::uuid`, [row.tenant_id]);

    return {
      action: 'approve-drive',
      ok: true,
      results: [
        {
          ok: true,
          driveId: row.id,
          title: row.title,
          status: row.status,
          college: college.rows[0]?.name,
        },
      ],
    };
  });
}

/** Demo student applies to an approved/scheduled placement drive. */
export async function applyDemoStudentToDrive(options = {}) {
  return transaction(async (client) => {
    const studentRes = await client.query(
      `SELECT sp.id AS student_id, sp.tenant_id, sp.roll_number, t.name AS college_name, t.short_code,
              u.first_name, u.last_name, u.email
       FROM student_profiles sp
       JOIN users u ON u.id = sp.user_id
       JOIN tenants t ON t.id = sp.tenant_id
       WHERE sp.archived_at IS NULL
         AND COALESCE(sp.is_deleted, false) = false
         AND COALESCE(sp.placement_status, 'unplaced') = 'unplaced'
         AND ${demoScreenStudentEmailFilter('u.email', options.tenantId ? 2 : 1)}
         AND (
           sp.resume_url IS NOT NULL AND TRIM(sp.resume_url) <> ''
           OR EXISTS (SELECT 1 FROM student_documents sd WHERE sd.student_id = sp.id AND sd.document_type = 'resume')
         )
         ${options.tenantId ? 'AND sp.tenant_id = $1::uuid' : ''}
       ORDER BY RANDOM() LIMIT 1`,
      options.tenantId
        ? [options.tenantId, DEMO_SCREEN_SQL_PARAMS.studentEmails]
        : [DEMO_SCREEN_SQL_PARAMS.studentEmails],
    );
    if (!studentRes.rows.length) {
      return {
        action: 'apply-to-drive',
        ok: false,
        error: 'No eligible demo-screen student with CV (Arjun, Sneha Rao, or Rohan).',
        results: [],
      };
    }
    const student = studentRes.rows[0];

    const driveRes = await client.query(
      `SELECT d.id, d.title, d.job_id, ep.company_name
       FROM placement_drives d
       JOIN employer_profiles ep ON ep.id = d.employer_id
       WHERE d.tenant_id = $1::uuid
         AND d.status IN ('approved', 'scheduled')
         AND COALESCE(d.is_deleted, false) = false
         ${options.driveId ? 'AND d.id = $2::uuid' : ''}
       ORDER BY RANDOM() LIMIT 1`,
      options.driveId ? [student.tenant_id, options.driveId] : [student.tenant_id],
    );
    if (!driveRes.rows.length) {
      return {
        action: 'apply-to-drive',
        ok: false,
        error: `No approved drive at ${student.college_name}. Request + approve a drive first.`,
        results: [],
      };
    }
    const drive = driveRes.rows[0];

    const ins = await client.query(
      `INSERT INTO applications (student_id, drive_id, job_id, status, notes)
       VALUES ($1::uuid, $2::uuid, $3::uuid, 'applied', $4)
       ON CONFLICT (student_id, drive_id)
       DO UPDATE SET status = 'applied', updated_at = NOW()
       RETURNING id, status`,
      [student.student_id, drive.id, drive.job_id, 'Demo drive application via Data Tester API'],
    );

    const systemId = formatStudentSystemIdForCollege(
      { short_code: student.short_code, name: student.college_name },
      student.roll_number,
    );

    return {
      action: 'apply-to-drive',
      ok: true,
      results: [
        {
          ok: true,
          applicationId: ins.rows[0].id,
          status: ins.rows[0].status,
          driveId: drive.id,
          driveTitle: drive.title,
          studentName: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
          studentEmail: student.email,
          systemId,
          companyName: drive.company_name,
          college: student.college_name,
        },
      ],
    };
  });
}

/**
 * Mark a recent demo application as shortlisted or selected (program or drive).
 */
export async function advanceDemoApplication(options = {}) {
  const nextStatus = ['shortlisted', 'selected', 'rejected'].includes(options.status)
    ? options.status
    : 'shortlisted';
  const channel = options.channel === 'drive' ? 'drive' : options.channel === 'program' ? 'program' : 'any';

  return transaction(async (client) => {
    if (channel !== 'drive') {
      const prog = await client.query(
        `SELECT pa.id, pa.status, jp.title, ep.company_name, u.email
         FROM program_applications pa
         JOIN student_profiles sp ON sp.id = pa.student_id
         JOIN users u ON u.id = sp.user_id
         JOIN job_postings jp ON jp.id = pa.job_id
         JOIN employer_profiles ep ON ep.id = jp.employer_id
         WHERE ${demoScreenStudentEmailFilter('u.email', options.tenantId ? 2 : 1)}
           ${options.tenantId ? 'AND sp.tenant_id = $1::uuid' : ''}
         ORDER BY pa.applied_at DESC NULLS LAST
         LIMIT 1`,
        options.tenantId
          ? [options.tenantId, DEMO_SCREEN_SQL_PARAMS.studentEmails]
          : [DEMO_SCREEN_SQL_PARAMS.studentEmails],
      );
      if (prog.rows.length) {
        const row = prog.rows[0];
        const upd = await client.query(
          `UPDATE program_applications SET status = $1, updated_at = NOW() WHERE id = $2::uuid RETURNING id, status`,
          [nextStatus, row.id],
        );
        return {
          action: 'advance-application',
          ok: true,
          results: [
            {
              ok: true,
              channel: 'program',
              applicationId: upd.rows[0].id,
              status: upd.rows[0].status,
              openingTitle: row.title,
              companyName: row.company_name,
              studentEmail: row.email,
            },
          ],
        };
      }
      if (channel === 'program') {
        return { action: 'advance-application', ok: false, error: 'No program application found', results: [] };
      }
    }

    const drv = await client.query(
      `SELECT a.id, a.status, d.title, ep.company_name, u.email
       FROM applications a
       JOIN student_profiles sp ON sp.id = a.student_id
       JOIN users u ON u.id = sp.user_id
       JOIN placement_drives d ON d.id = a.drive_id
       JOIN employer_profiles ep ON ep.id = d.employer_id
       WHERE ${demoScreenStudentEmailFilter('u.email', options.tenantId ? 2 : 1)}
         ${options.tenantId ? 'AND sp.tenant_id = $1::uuid' : ''}
       ORDER BY a.applied_at DESC NULLS LAST
       LIMIT 1`,
      options.tenantId
        ? [options.tenantId, DEMO_SCREEN_SQL_PARAMS.studentEmails]
        : [DEMO_SCREEN_SQL_PARAMS.studentEmails],
    );
    if (!drv.rows.length) {
      return { action: 'advance-application', ok: false, error: 'No drive application found', results: [] };
    }
    const row = drv.rows[0];
    const upd = await client.query(
      `UPDATE applications SET status = $1, updated_at = NOW() WHERE id = $2::uuid RETURNING id, status`,
      [nextStatus, row.id],
    );
    return {
      action: 'advance-application',
      ok: true,
      results: [
        {
          ok: true,
          channel: 'drive',
          applicationId: upd.rows[0].id,
          status: upd.rows[0].status,
          openingTitle: row.title,
          companyName: row.company_name,
          studentEmail: row.email,
        },
      ],
    };
  });
}

/** List demo-screen colleges for optional dropdown in UI (IITM, NITT, BITS). */
export async function listDemoColleges() {
  const res = await query(
    `SELECT id, name, short_code, slug, city
     FROM tenants
     WHERE is_active = true
       AND type = 'college'
       AND slug = ANY($1::text[])
     ORDER BY CASE slug
       WHEN 'iit-madras' THEN 0
       WHEN 'nit-trichy' THEN 1
       WHEN 'bits-pilani' THEN 2
       ELSE 3
     END`,
    [DEMO_SCREEN_SQL_PARAMS.collegeSlugs],
  );
  return res.rows;
}
