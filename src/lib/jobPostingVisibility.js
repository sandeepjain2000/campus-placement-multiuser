import { resolveIitmTenant } from '@/lib/employerIitmTieUp';
import { filterTenantIdsForJobPosting } from '@/lib/employerPostingCampusConstraints';
import { fetchCollegeAdminUserIds, notifyUsersOneAtATime } from '@/lib/notificationService';
import { isAlumniJobType } from '@/lib/studentAlumni';

const PROGRAM_JOB_TYPES = new Set(['internship', 'short_project', 'hackathon']);

function uniqueTenantIds(tenantIds) {
  return [...new Set((tenantIds || []).map((t) => String(t).trim()).filter(Boolean))];
}

export async function filterApprovedTenantIds(client, employerId, tenantIds) {
  const approved = [];
  for (const tenantId of uniqueTenantIds(tenantIds)) {
    const appr = await client.query(
      `SELECT 1 FROM employer_approvals
       WHERE tenant_id = $1::uuid AND employer_id = $2::uuid AND status = 'approved'`,
      [tenantId, employerId],
    );
    if (appr.rows.length) approved.push(tenantId);
  }
  return approved;
}

/** Default to IIT Madras when publishing with no campuses selected (sandbox testing). */
export async function resolvePublishTenantIds(client, employerId, tenantIds, { status, jobType } = {}) {
  let ids = uniqueTenantIds(tenantIds);
  if (status === 'published' && ids.length === 0) {
    const iitm = await resolveIitmTenant(client);
    if (iitm) ids = [iitm.id];
  }
  const approved = await filterApprovedTenantIds(client, employerId, ids);
  return filterTenantIdsForJobPosting(client, employerId, approved, jobType);
}

async function notifyCollegeAdmins(client, { tenantId, emp, jobType, jobTitle }) {
  const college = await client.query(`SELECT name FROM tenants WHERE id = $1::uuid`, [tenantId]);
  const collegeName = college.rows[0]?.name || 'Campus';
  const adminIds = await fetchCollegeAdminUserIds(tenantId, client);
  const isProgram = PROGRAM_JOB_TYPES.has(jobType);
  const isAlumniJob = isAlumniJobType(jobType);

  const reviewPath = isAlumniJob
    ? '/dashboard/college/jobs'
    : isProgram || jobType === 'internship'
      ? '/dashboard/college/internships'
      : '/dashboard/college/jobs';

  const reviewLabel = isAlumniJob
    ? 'Alumni Jobs'
    : isProgram || jobType === 'internship'
      ? 'Internships & Programs'
      : 'Jobs';

  await notifyUsersOneAtATime(
    adminIds,
    {
      title: isAlumniJob
        ? `${emp.company_name} posted an alumni job`
        : jobType === 'internship'
          ? `${emp.company_name} posted an internship`
          : isProgram
            ? `${emp.company_name} posted a student program`
            : `${emp.company_name} published a job`,
      message: `${emp.company_name} published "${jobTitle}" (${String(jobType).replace(/_/g, ' ')}) for ${collegeName}. Review and approve under ${reviewLabel} before ${isAlumniJob ? 'alumni' : 'students'} can apply.`,
      type: jobType === 'internship' ? 'info' : 'application',
      link: reviewPath,
    },
    client,
  );
}

/**
 * Replace campus visibility for a job and optionally notify admins for newly added campuses.
 */
export async function syncJobPostingVisibility(
  client,
  { jobId, employerId, tenantIds, jobType, jobTitle, companyName, notifyAdmins = false },
) {
  const emp = { company_name: companyName };
  const ids = uniqueTenantIds(tenantIds);

  const existing = await client.query(
    `SELECT tenant_id::text AS id FROM job_posting_visibility WHERE job_id = $1::uuid`,
    [jobId],
  );
  const before = new Set(existing.rows.map((r) => r.id));

  if (ids.length) {
    await client.query(
      `DELETE FROM job_posting_visibility
       WHERE job_id = $1::uuid
         AND NOT (tenant_id = ANY($2::uuid[]))`,
      [jobId, ids],
    );
  } else {
    await client.query(`DELETE FROM job_posting_visibility WHERE job_id = $1::uuid`, [jobId]);
    return { synced: 0, added: [] };
  }

  const added = [];
  for (const tenantId of ids) {
    let ins;
    try {
      ins = await client.query(
        `INSERT INTO job_posting_visibility (job_id, tenant_id, college_status)
         VALUES ($1::uuid, $2::uuid, 'pending')
         ON CONFLICT (job_id, tenant_id) DO NOTHING
         RETURNING tenant_id::text AS id`,
        [jobId, tenantId],
      );
    } catch (err) {
      if (err?.code !== '42703') throw err;
      ins = await client.query(
        `INSERT INTO job_posting_visibility (job_id, tenant_id)
         VALUES ($1::uuid, $2::uuid)
         ON CONFLICT (job_id, tenant_id) DO NOTHING
         RETURNING tenant_id::text AS id`,
        [jobId, tenantId],
      );
    }
    if (ins.rowCount || !before.has(tenantId)) {
      if (!before.has(tenantId)) added.push(tenantId);
    }
  }

  if (notifyAdmins && added.length) {
    for (const tenantId of added) {
      await notifyCollegeAdmins(client, { tenantId, emp, jobType, jobTitle });
    }
  }

  return { synced: ids.length, added };
}

export { PROGRAM_JOB_TYPES };
