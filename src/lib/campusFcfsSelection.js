/**
 * Campus FCFS (first-come, first-served): per tenant and track, the first employer to
 * confirm a student (application status "selected" or hiring_result "Select") blocks others.
 *
 * Tracks (employer UI): internship | jobs | placement
 * - placement: placement drive applications + drive assessments
 * - internship: internship program applications + internship job assessments
 * - jobs: other job postings (full-time, PPO, etc.) + matching assessments
 */

import { query } from '@/lib/db';
import { programApplicationNotDeletedSql, jobPostingNotDeletedSql } from '@/lib/migrationReady';
import { AND_APP_NOT_DELETED, AND_DRIVE_NOT_DELETED, AND_EAU_NOT_DELETED, AND_PA_NOT_DELETED, AND_JP_NOT_DELETED } from '@/lib/softDeleteSql';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { normalizeHiringResult } from '@/lib/hiringResult';

export const FCFS_TRACKS = ['internship', 'placement', 'jobs'];

export const FCFS_HIRING_SELECT = 'Select';
export const FCFS_STATUS_SELECTED = 'selected';

export const EMPLOYER_FCFS_BLOCKED_MESSAGE =
  'This student was already confirmed by another employer (first-come, first-served). See Unavailable candidates.';

export const EMPLOYER_FCFS_CSV_REJECT_MESSAGE =
  'Student already confirmed by another employer (FCFS) — row rejected';

/** @typedef {'internship' | 'placement' | 'jobs'} FcfsTrack */

export function isFcfsHiringSelect(raw) {
  return normalizeHiringResult(raw) === FCFS_HIRING_SELECT;
}

export function isFcfsApplicationSelected(status) {
  return String(status || '').trim().toLowerCase() === FCFS_STATUS_SELECTED;
}

/** Employer applications tab → FCFS track. */
export function fcfsTrackFromApplicationsTab(tab) {
  const t = String(tab || '').toLowerCase();
  if (t === 'internships') return 'internship';
  if (t === 'drives') return 'placement';
  if (t === 'jobs') return 'jobs';
  return null;
}

/** Assessment upload / online kind → FCFS track (projects excluded). */
export function fcfsTrackFromAssessmentKind(kind) {
  const k = String(kind || '').trim().toLowerCase();
  if (k === 'internship') return 'internship';
  if (k === 'drive') return 'placement';
  if (k === 'jobs') return 'jobs';
  return null;
}

/** Infer FCFS track from assessment target context. */
export function fcfsTrackFromAssessmentTarget({ opportunityKind, targetDriveId, targetJobId, jobType }) {
  const fromKind = fcfsTrackFromAssessmentKind(opportunityKind);
  if (fromKind) return fromKind;
  if (targetDriveId) return 'placement';
  const jt = String(jobType || '').toLowerCase();
  if (jt === 'internship') return 'internship';
  if (jt && !['short_project', 'hackathon'].includes(jt)) return 'jobs';
  return null;
}

export async function isCampusFcfsEnabled(tenantId, client = null) {
  if (!tenantId) return true;
  const q = client ? client.query.bind(client) : query;
  try {
    const r = await q(
      `SELECT COALESCE(fcfs_enabled, true) AS enabled
       FROM college_settings WHERE tenant_id = $1::uuid LIMIT 1`,
      [tenantId],
    );
    if (!r.rows.length) return true;
    return Boolean(r.rows[0].enabled);
  } catch {
    return true;
  }
}

function trackFilterSql(trackParamIndex) {
  const p = `$${trackParamIndex}`;
  return `
  AND (
    (${p}::text = 'placement' AND claim_track = 'placement')
    OR (${p}::text = 'internship' AND claim_track = 'internship')
    OR (${p}::text = 'jobs' AND claim_track = 'jobs')
  )`;
}

/**
 * Earliest FCFS claim for a student on a campus track (any employer).
 * @returns {Promise<null | {
 *   track: string,
 *   source: 'application' | 'assessment',
 *   employerId: string,
 *   employerName: string,
 *   claimedAt: string,
 *   openingTitle: string | null,
 * }>}
 */
export async function getCampusFcfsClaim(
  tenantId,
  studentProfileId,
  track,
  client = null,
) {
  if (!tenantId || !studentProfileId || !FCFS_TRACKS.includes(track)) return null;

  const enabled = await isCampusFcfsEnabled(tenantId, client);
  if (!enabled) return null;

  const q = client ? client.query.bind(client) : query;
  const paDel = await programApplicationNotDeletedSql('pa');
  const jpDel = await jobPostingNotDeletedSql('jp');

  const res = await q(
    `WITH claims AS (
       SELECT
         'placement'::text AS claim_track,
         'application'::text AS source,
         a.updated_at AS claimed_at,
         d.employer_id,
         ep.company_name AS employer_name,
         d.title AS opening_title
       FROM applications a
       INNER JOIN placement_drives d ON d.id = a.drive_id
       INNER JOIN employer_profiles ep ON ep.id = d.employer_id
       INNER JOIN student_profiles sp ON sp.id = a.student_id AND sp.tenant_id = $1::uuid
       WHERE a.student_id = $2::uuid
         AND LOWER(TRIM(a.status)) = 'selected'
         AND ${SP_ACTIVE_CLAUSE}
         ${AND_APP_NOT_DELETED} ${AND_DRIVE_NOT_DELETED}

       UNION ALL

       SELECT
         CASE
           WHEN jp.job_type = 'internship' THEN 'internship'
           WHEN jp.job_type IN ('short_project', 'hackathon') THEN NULL
           ELSE 'jobs'
         END AS claim_track,
         'application'::text AS source,
         pa.updated_at AS claimed_at,
         jp.employer_id,
         ep.company_name AS employer_name,
         jp.title AS opening_title
       FROM program_applications pa
       INNER JOIN job_postings jp ON jp.id = pa.job_id
       INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
       INNER JOIN student_profiles sp ON sp.id = pa.student_id AND sp.tenant_id = $1::uuid
       WHERE pa.student_id = $2::uuid
         AND LOWER(TRIM(pa.status)) = 'selected'
         AND ${SP_ACTIVE_CLAUSE}
         ${paDel}
         ${jpDel}

       UNION ALL

       SELECT
         CASE
           WHEN eau.drive_id IS NOT NULL THEN 'placement'
           WHEN jp.job_type = 'internship' THEN 'internship'
           WHEN jp.job_type IN ('short_project', 'hackathon') THEN NULL
           ELSE 'jobs'
         END AS claim_track,
         'assessment'::text AS source,
         ear.created_at AS claimed_at,
         eau.employer_id,
         ep.company_name AS employer_name,
         COALESCE(jp.title, pd.title) AS opening_title
       FROM employer_assessment_rows ear
       INNER JOIN employer_assessment_uploads eau ON eau.id = ear.upload_id
       INNER JOIN employer_profiles ep ON ep.id = eau.employer_id
       INNER JOIN student_profiles sp ON sp.id = ear.student_profile_id AND sp.tenant_id = $1::uuid
       LEFT JOIN job_postings jp ON jp.id = eau.job_id AND COALESCE(jp.is_deleted, false) = false
       LEFT JOIN placement_drives pd ON pd.id = eau.drive_id AND COALESCE(pd.is_deleted, false) = false
       WHERE ear.student_profile_id = $2::uuid
         AND LOWER(TRIM(COALESCE(ear.hiring_result, ''))) = 'select'
         ${AND_EAU_NOT_DELETED}
     )
     SELECT claim_track, source, claimed_at, employer_id, employer_name, opening_title
     FROM claims
     WHERE claim_track IS NOT NULL
     ${trackFilterSql(3)}
     ORDER BY claimed_at ASC NULLS LAST
     LIMIT 1`,
    [tenantId, studentProfileId, track],
  );

  const row = res.rows[0];
  if (!row) return null;

  return {
    track: row.claim_track,
    source: row.source,
    employerId: row.employer_id,
    employerName: row.employer_name,
    claimedAt: row.claimed_at ? new Date(row.claimed_at).toISOString() : null,
    openingTitle: row.opening_title || null,
  };
}

/**
 * @returns {Promise<{ ok: true } | { ok: false, error: string, claim?: object }>}
 */
export async function assertEmployerMayConfirmStudent(
  { tenantId, studentProfileId, track, employerId },
  client = null,
) {
  if (!tenantId || !studentProfileId || !track || !employerId) {
    return { ok: true };
  }

  const claim = await getCampusFcfsClaim(tenantId, studentProfileId, track, client);
  if (!claim) return { ok: true };

  if (String(claim.employerId) === String(employerId)) {
    return { ok: true, claim };
  }

  return {
    ok: false,
    error: `${EMPLOYER_FCFS_BLOCKED_MESSAGE} (${claim.employerName || 'another employer'}).`,
    claim,
  };
}

/**
 * Students on this campus already claimed on a track by other employers.
 */
export async function listCampusFcfsUnavailableForEmployer(
  tenantId,
  track,
  viewingEmployerId,
  client = null,
) {
  if (!tenantId || !track || !viewingEmployerId) return [];

  const enabled = await isCampusFcfsEnabled(tenantId, client);
  if (!enabled) return [];

  const q = client ? client.query.bind(client) : query;
  const paDel = await programApplicationNotDeletedSql('pa');
  const jpDel = await jobPostingNotDeletedSql('jp');

  const res = await q(
    `WITH claims AS (
       SELECT
         sp.id AS student_profile_id,
         sp.roll_number,
         u.first_name,
         u.last_name,
         u.email,
         'placement'::text AS claim_track,
         'application'::text AS source,
         a.updated_at AS claimed_at,
         d.employer_id,
         ep.company_name AS employer_name,
         d.title AS opening_title
       FROM applications a
       INNER JOIN placement_drives d ON d.id = a.drive_id
       INNER JOIN employer_profiles ep ON ep.id = d.employer_id
       INNER JOIN student_profiles sp ON sp.id = a.student_id AND sp.tenant_id = $1::uuid
       INNER JOIN users u ON u.id = sp.user_id
       WHERE LOWER(TRIM(a.status)) = 'selected'
         AND ${SP_ACTIVE_CLAUSE}
         ${AND_APP_NOT_DELETED} ${AND_DRIVE_NOT_DELETED}

       UNION ALL

       SELECT
         sp.id,
         sp.roll_number,
         u.first_name,
         u.last_name,
         u.email,
         CASE
           WHEN jp.job_type = 'internship' THEN 'internship'
           WHEN jp.job_type IN ('short_project', 'hackathon') THEN NULL
           ELSE 'jobs'
         END,
         'application'::text,
         pa.updated_at,
         jp.employer_id,
         ep.company_name,
         jp.title
       FROM program_applications pa
       INNER JOIN job_postings jp ON jp.id = pa.job_id
       INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
       INNER JOIN student_profiles sp ON sp.id = pa.student_id AND sp.tenant_id = $1::uuid
       INNER JOIN users u ON u.id = sp.user_id
       WHERE LOWER(TRIM(pa.status)) = 'selected'
         AND ${SP_ACTIVE_CLAUSE}
         ${paDel}
         ${jpDel}

       UNION ALL

       SELECT
         sp.id,
         sp.roll_number,
         u.first_name,
         u.last_name,
         u.email,
         CASE
           WHEN eau.drive_id IS NOT NULL THEN 'placement'
           WHEN jp.job_type = 'internship' THEN 'internship'
           WHEN jp.job_type IN ('short_project', 'hackathon') THEN NULL
           ELSE 'jobs'
         END,
         'assessment'::text,
         ear.created_at,
         eau.employer_id,
         ep.company_name,
         COALESCE(jp.title, pd.title)
       FROM employer_assessment_rows ear
       INNER JOIN employer_assessment_uploads eau ON eau.id = ear.upload_id
       INNER JOIN employer_profiles ep ON ep.id = eau.employer_id
       INNER JOIN student_profiles sp ON sp.id = ear.student_profile_id AND sp.tenant_id = $1::uuid
       INNER JOIN users u ON u.id = sp.user_id
       LEFT JOIN job_postings jp ON jp.id = eau.job_id AND COALESCE(jp.is_deleted, false) = false
       LEFT JOIN placement_drives pd ON pd.id = eau.drive_id AND COALESCE(pd.is_deleted, false) = false
       WHERE LOWER(TRIM(COALESCE(ear.hiring_result, ''))) = 'select'
         ${AND_EAU_NOT_DELETED}
     ),
     earliest AS (
       SELECT DISTINCT ON (student_profile_id)
         student_profile_id,
         roll_number,
         first_name,
         last_name,
         email,
         claim_track,
         source,
         claimed_at,
         employer_id,
         employer_name,
         opening_title
       FROM claims
       WHERE claim_track IS NOT NULL
       ${trackFilterSql(2)}
       ORDER BY student_profile_id, claimed_at ASC NULLS LAST
     )
     SELECT *
     FROM earliest
     WHERE employer_id IS DISTINCT FROM $3::uuid
     ORDER BY claimed_at DESC`,
    [tenantId, track, viewingEmployerId],
  );

  return res.rows.map((r) => ({
    studentProfileId: r.student_profile_id,
    rollNumber: r.roll_number || '',
    studentName: `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email || r.roll_number || 'Student',
    track: r.claim_track,
    source: r.source,
    claimedAt: r.claimed_at ? new Date(r.claimed_at).toISOString() : null,
    claimingEmployerId: r.employer_id,
    claimingEmployerName: r.employer_name || 'Another employer',
    openingTitle: r.opening_title || null,
  }));
}

/** Batch: student ids blocked for this employer on a track. */
export async function getFcfsBlockedStudentIdsForEmployer(
  tenantId,
  track,
  employerId,
  studentProfileIds,
  client = null,
) {
  const blocked = new Set();
  if (!tenantId || !track || !employerId || !studentProfileIds?.length) return blocked;

  const enabled = await isCampusFcfsEnabled(tenantId, client);
  if (!enabled) return blocked;

  for (const id of studentProfileIds) {
    const claim = await getCampusFcfsClaim(tenantId, id, track, client);
    if (claim && String(claim.employerId) !== String(employerId)) {
      blocked.add(id);
    }
  }
  return blocked;
}
