import { query } from '@/lib/db';
import {
  AND_APP_NOT_DELETED,
  AND_DRIVE_NOT_DELETED,
  AND_EAU_NOT_DELETED,
  AND_JP_NOT_DELETED,
  AND_PA_NOT_DELETED,
} from '@/lib/softDeleteSql';
import { STUDENT_PROFILE_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';

/**
 * @param {{ id: string; role: string; tenantId?: string | null }} sessionUser
 */
export async function buildUserDataExportPayload(sessionUser) {
  const { id: userId, role, tenantId } = sessionUser;
  const exportedAt = new Date().toISOString();
  const base = { exportedAt, role, userId, sections: {} };

  if (role === 'employer') {
    const emp = await query(
      `SELECT id, company_name, industry, website, created_at
       FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`,
      [userId],
    );
    const profile = emp.rows[0] || null;
    if (!profile) {
      base.sections.employer_profile = null;
      return base;
    }
    const employerId = profile.id;

    const [drives, jobs, apps, programApps, uploads, rowCounts] = await Promise.all([
      query(
        `SELECT d.id, t.name AS college, d.title, d.drive_date, d.drive_type, d.status, d.venue, d.registered_count, d.ctc_breakup
         FROM placement_drives d
         JOIN tenants t ON t.id = d.tenant_id
         WHERE d.employer_id = $1::uuid ${AND_DRIVE_NOT_DELETED}
         ORDER BY d.created_at DESC
         LIMIT 500`,
        [employerId],
      ),
      query(
        `SELECT id, title, job_type, status, created_at
         FROM job_postings jp WHERE jp.employer_id = $1::uuid ${AND_JP_NOT_DELETED}
         ORDER BY created_at DESC
         LIMIT 500`,
        [employerId],
      ),
      query(
        `SELECT a.id, a.status, a.applied_at, a.drive_id, a.job_id, sp.roll_number
         FROM applications a
         JOIN student_profiles sp ON sp.id = a.student_id
         JOIN placement_drives d ON d.id = a.drive_id
         WHERE d.employer_id = $1::uuid ${AND_APP_NOT_DELETED} ${AND_DRIVE_NOT_DELETED}
         ORDER BY a.applied_at DESC
         LIMIT 2000`,
        [employerId],
      ),
      query(
        `SELECT pa.id, pa.status, pa.applied_at, pa.job_id, jp.title AS job_title, jp.job_type, sp.roll_number
         FROM program_applications pa
         JOIN job_postings jp ON jp.id = pa.job_id
         JOIN student_profiles sp ON sp.id = pa.student_id
         WHERE jp.employer_id = $1::uuid ${AND_PA_NOT_DELETED} ${AND_JP_NOT_DELETED}
         ORDER BY pa.applied_at DESC
         LIMIT 2000`,
        [employerId],
      ),
      query(
        `SELECT id, original_file_name, total_rows, accepted_rows, rejected_rows, created_at, drive_id, job_id, tenant_id
         FROM employer_assessment_uploads eau
         WHERE eau.employer_id = $1::uuid ${AND_EAU_NOT_DELETED}
         ORDER BY eau.created_at DESC
         LIMIT 200`,
        [employerId],
      ),
      query(
        `SELECT COUNT(*)::int AS n FROM employer_assessment_rows ear
         WHERE ear.upload_id IN (
           SELECT id FROM employer_assessment_uploads eau WHERE eau.employer_id = $1::uuid ${AND_EAU_NOT_DELETED}
         )`,
        [employerId],
      ),
    ]);

    base.sections.employer_profile = profile;
    base.sections.placement_drives = drives.rows;
    base.sections.job_postings = jobs.rows;
    base.sections.applications_for_my_drives = apps.rows;
    base.sections.program_applications = programApps.rows;
    base.sections.assessment_uploads = uploads.rows;
    base.sections.assessment_result_rows_total = rowCounts.rows[0]?.n ?? 0;
    return base;
  }

  if (role === 'student') {
    const sp = await query(
      `SELECT sp.*, u.email AS account_email
       FROM student_profiles sp
       JOIN users u ON u.id = sp.user_id
       WHERE sp.user_id = $1::uuid AND ${STUDENT_PROFILE_ACTIVE_CLAUSE} LIMIT 1`,
      [userId],
    );
    const student = sp.rows[0] || null;
    if (!student) {
      base.sections.student_profile = null;
      return base;
    }
    const sid = student.id;

    const [apps, programApps] = await Promise.all([
      query(
        `SELECT a.id, a.status, a.notes, a.applied_at, a.drive_id, a.job_id, d.title AS drive_title
         FROM applications a
         LEFT JOIN placement_drives d ON d.id = a.drive_id
         WHERE a.student_id = $1::uuid ${AND_APP_NOT_DELETED}
         ORDER BY a.applied_at DESC
         LIMIT 2000`,
        [sid],
      ),
      query(
        `SELECT pa.id, pa.status, pa.applied_at, pa.job_id, jp.title AS job_title
         FROM program_applications pa
         JOIN job_postings jp ON jp.id = pa.job_id
         WHERE pa.student_id = $1::uuid ${AND_PA_NOT_DELETED} ${AND_JP_NOT_DELETED}
         ORDER BY pa.applied_at DESC
         LIMIT 1000`,
        [sid],
      ),
    ]);

    base.sections.student_profile = student;
    base.sections.applications = apps.rows;
    base.sections.program_applications = programApps.rows;
    return base;
  }

  if (role === 'college_admin' && tenantId) {
    const [tenant, students, drives, apps] = await Promise.all([
      query(`SELECT id, name, slug, created_at FROM tenants WHERE id = $1::uuid LIMIT 1`, [tenantId]),
      query(`SELECT COUNT(*)::int AS n FROM users WHERE tenant_id = $1::uuid AND role = 'student'`, [tenantId]),
      query(
        `SELECT id, title, status, drive_date, registered_count, employer_id, created_at
         FROM placement_drives d WHERE d.tenant_id = $1::uuid ${AND_DRIVE_NOT_DELETED}
         ORDER BY created_at DESC
         LIMIT 500`,
        [tenantId],
      ),
      query(
        `SELECT COUNT(*)::int AS n FROM applications a
         JOIN placement_drives d ON d.id = a.drive_id
         WHERE d.tenant_id = $1::uuid ${AND_APP_NOT_DELETED} ${AND_DRIVE_NOT_DELETED}`,
        [tenantId],
      ),
    ]);
    base.sections.tenant = tenant.rows[0] || null;
    base.sections.student_records_estimate = students.rows[0]?.n ?? 0;
    base.sections.placement_drives = drives.rows;
    base.sections.applications_count = apps.rows[0]?.n ?? 0;
    return base;
  }

  if (role === 'super_admin') {
    const [tenants, users, employers, pending] = await Promise.all([
      query(`SELECT COUNT(*)::int AS n FROM tenants`),
      query(`SELECT COUNT(*)::int AS n FROM users WHERE is_active = true`),
      query(`SELECT COUNT(*)::int AS n FROM employer_profiles`),
      query(
        `SELECT COUNT(*)::int AS n FROM users WHERE role IN ('college_admin','employer') AND is_active = false AND registration_rejected_at IS NULL`,
      ),
    ]);
    base.sections.platform = {
      tenants: tenants.rows[0]?.n ?? 0,
      active_users: users.rows[0]?.n ?? 0,
      employers: employers.rows[0]?.n ?? 0,
      pending_registrations: pending.rows[0]?.n ?? 0,
    };
    return base;
  }

  base.sections.note = 'No export sections defined for this role.';
  return base;
}

export function summarizeExportSections(payload) {
  const sections = payload?.sections || {};
  return Object.keys(sections).map((k) => ({
    key: k,
    kind: Array.isArray(sections[k]) ? 'array' : typeof sections[k],
    count: Array.isArray(sections[k]) ? sections[k].length : null,
  }));
}
