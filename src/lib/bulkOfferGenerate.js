import { query } from '@/lib/db';
import { buildRenderedOfferLetter } from '@/lib/offerTemplateRender';
import { refreshOfferLatestFlagsForStudent } from '@/lib/offersLatestFlag';
import { notifyStudentFormalOffer } from '@/lib/studentFormalOfferNotify';
import {
  AND_APP_NOT_DELETED,
  AND_DRIVE_NOT_DELETED,
  AND_JP_NOT_DELETED,
  AND_OFFER_NOT_DELETED,
  AND_PA_NOT_DELETED,
} from '@/lib/softDeleteSql';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { toDateOnlyString, toDeadlineTimestampIso } from '@/lib/dateOnly';

const SELECTED_SQL = `LOWER(TRIM(a.status)) = 'selected'`;

/** @param {unknown} err */
export function mapBulkOfferGenerateError(err) {
  const code = err?.code;
  const msg = String(err?.message || err || '');
  if (code === '23514' && /offer_kind/i.test(msg)) {
    return 'Internship offer type is not enabled in the database. Run npm run db:migrate:095 and try again.';
  }
  if (code === '42703') {
    if (/archived_at/i.test(msg)) {
      return 'Student archive columns are missing. Run npm run db:migrate:052 and try again.';
    }
    if (/offer_template_id|rendered_letter_html|program_application_id|offer_kind|event_type/i.test(msg)) {
      return 'Offer workflow schema is out of date. Run npm run db:migrate:089, db:migrate:093, and db:migrate:095, then try again.';
    }
  }
  if (/invalid time value/i.test(msg)) {
    return 'Offer template has an invalid response deadline or joining date. Edit the template dates and try again.';
  }
  return null;
}

async function safeRefreshOfferLatestFlags(studentId) {
  try {
    await refreshOfferLatestFlagsForStudent(studentId);
  } catch (e) {
    console.error('refreshOfferLatestFlagsForStudent failed during bulk offer generate', studentId, e);
  }
}

/**
 * Selected drive applicants without an offer row for this employer+drive.
 */
export async function listSelectedWithoutOffer({ employerId, driveId }) {
  const res = await query(
    `SELECT
       a.id AS application_id,
       sp.id AS student_id,
       sp.tenant_id,
       TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS student_name,
       u.first_name,
       COALESCE(NULLIF(TRIM(u.communication_email), ''), u.email) AS email,
       u.id AS user_id,
       t.name AS college_name,
       d.title AS drive_title,
       ep.company_name
     FROM applications a
     INNER JOIN placement_drives d ON d.id = a.drive_id
     INNER JOIN employer_profiles ep ON ep.id = d.employer_id
     INNER JOIN student_profiles sp ON sp.id = a.student_id AND ${SP_ACTIVE_CLAUSE}
     INNER JOIN users u ON u.id = sp.user_id
     LEFT JOIN tenants t ON t.id = sp.tenant_id
     WHERE d.id = $1::uuid
       AND d.employer_id = $2::uuid
       AND ${SELECTED_SQL}
       ${AND_APP_NOT_DELETED} ${AND_DRIVE_NOT_DELETED}
       AND NOT EXISTS (
         SELECT 1 FROM offers o
         WHERE o.student_id = sp.id
           AND o.drive_id = d.id
           AND o.employer_id = $2::uuid
           ${AND_OFFER_NOT_DELETED}
       )
     ORDER BY u.first_name ASC, u.last_name ASC`,
    [driveId, employerId],
  );
  return res.rows;
}

export async function countDriveSelectionOfferStats({ employerId, driveId }) {
  const withoutOffer = await listSelectedWithoutOffer({ employerId, driveId });

  const [selectedRes, offeredRes] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS n
       FROM applications a
       INNER JOIN placement_drives d ON d.id = a.drive_id
       WHERE d.id = $1::uuid AND d.employer_id = $2::uuid
         AND ${SELECTED_SQL} ${AND_APP_NOT_DELETED} ${AND_DRIVE_NOT_DELETED}`,
      [driveId, employerId],
    ),
    query(
      `SELECT COUNT(*)::int AS n
       FROM offers o
       WHERE o.drive_id = $1::uuid AND o.employer_id = $2::uuid ${AND_OFFER_NOT_DELETED}`,
      [driveId, employerId],
    ),
  ]);

  return {
    selectedCount: selectedRes.rows[0]?.n ?? 0,
    offersExistingCount: offeredRes.rows[0]?.n ?? 0,
    readyToGenerateCount: withoutOffer.length,
    withoutOffer,
  };
}

/** @typedef {'drive'|'internship'|'alumni_jobs'} OfferTemplateEventType */

export async function loadEmployerOfferTemplate(templateId, employerId, { eventType } = {}) {
  const params = [templateId, employerId];
  let eventSql = '';
  if (eventType) {
    params.push(eventType);
    eventSql = ` AND event_type = $${params.length}`;
  }
  try {
    const res = await query(
      `SELECT id, employer_id, name, job_title, salary, location, joining_date, response_deadline, body_template, is_active, event_type
       FROM employer_offer_templates
       WHERE id = $1::uuid AND employer_id = $2::uuid AND is_active = true${eventSql}
       LIMIT 1`,
      params,
    );
    return res.rows[0] || null;
  } catch (e) {
    if (e?.code !== '42703' || !/event_type/i.test(String(e.message || ''))) throw e;
    const res = await query(
      `SELECT id, employer_id, name, job_title, salary, location, joining_date, response_deadline, body_template, is_active
       FROM employer_offer_templates
       WHERE id = $1::uuid AND employer_id = $2::uuid AND is_active = true
       LIMIT 1`,
      [templateId, employerId],
    );
    return res.rows[0] || null;
  }
}

export async function assertEmployerOwnsDrive(employerId, driveId) {
  const res = await query(
    `SELECT d.id, d.title, d.tenant_id, ep.company_name
     FROM placement_drives d
     INNER JOIN employer_profiles ep ON ep.id = d.employer_id
     WHERE d.id = $1::uuid AND d.employer_id = $2::uuid ${AND_DRIVE_NOT_DELETED}
     LIMIT 1`,
    [driveId, employerId],
  );
  return res.rows[0] || null;
}

/**
 * Create pending offers + emails for selected students missing offers. Safe to re-run.
 * @returns {Promise<{ created: number; emailed: number; skipped: number; offerIds: string[] }>}
 */
export async function generateOffersFromSelections({ employerId, driveId, templateId }) {
  const drive = await assertEmployerOwnsDrive(employerId, driveId);
  if (!drive) {
    const err = new Error('DRIVE_NOT_FOUND');
    throw err;
  }

  const template = await loadEmployerOfferTemplate(templateId, employerId, { eventType: 'drive' });
  if (!template) {
    const err = new Error('TEMPLATE_NOT_FOUND');
    throw err;
  }

  const rows = await listSelectedWithoutOffer({ employerId, driveId });
  const offerIds = [];
  let emailed = 0;

  const deadlineIso = toDeadlineTimestampIso(template.response_deadline);
  const joiningDate = template.joining_date ? toDateOnlyString(template.joining_date) : null;

  for (const row of rows) {
    const renderedLetter = buildRenderedOfferLetter({
      template,
      studentName: row.student_name,
      companyName: row.company_name,
      collegeName: row.college_name,
    });

    let insertRes;
    try {
      insertRes = await query(
        `INSERT INTO offers (
           student_id, drive_id, employer_id, application_id, job_title, salary, location,
           status, joining_date, deadline, salary_currency, offer_template_id, rendered_letter_html
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, 'INR', $10, $11)
         RETURNING id`,
        [
          row.student_id,
          driveId,
          employerId,
          row.application_id,
          template.job_title,
          Number(template.salary) || 0,
          template.location || null,
          joiningDate,
          deadlineIso,
          template.id,
          renderedLetter,
        ],
      );
    } catch (e) {
      if (e?.code === '42703') {
        insertRes = await query(
          `INSERT INTO offers (
             student_id, drive_id, employer_id, application_id, job_title, salary, location,
             status, joining_date, deadline, salary_currency
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, 'INR')
           RETURNING id`,
          [
            row.student_id,
            driveId,
            employerId,
            row.application_id,
            template.job_title,
            Number(template.salary) || 0,
            template.location || null,
            joiningDate,
            deadlineIso,
          ],
        );
      } else {
        throw e;
      }
    }

    const offerId = String(insertRes.rows[0].id);
    offerIds.push(offerId);
    await safeRefreshOfferLatestFlags(row.student_id);

    try {
      await notifyStudentFormalOffer({
        studentUserId: String(row.user_id),
        email: String(row.email || ''),
        firstName: row.first_name,
        companyName: String(row.company_name || 'Company'),
        roleTitle: String(template.job_title || 'Role'),
        salary: Number(template.salary) || 0,
        deadline: deadlineIso,
        offerId,
        applicationId: row.application_id,
        renderedLetterHtml: renderedLetter,
      });
      emailed += 1;
    } catch (mailErr) {
      console.error('Bulk offer email failed for', offerId, mailErr);
    }
  }

  return {
    created: offerIds.length,
    emailed,
    skipped: 0,
    offerIds,
    driveTitle: drive.title,
    templateName: template.name,
  };
}

const INTERNSHIP_SELECTION_OFFER_KIND = 'internship_offer';

/** One row per program application — guard against join fan-out or bad data. */
export function dedupeInternshipOfferRows(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return rows || [];
  const byApp = new Map();
  for (const row of rows) {
    const key = String(row.program_application_id || row.student_id || '');
    if (key && !byApp.has(key)) byApp.set(key, row);
  }
  return byApp.size === rows.length ? rows : [...byApp.values()];
}

/** Exclude selection offers; PPO job offers on the same application are allowed later. */
const NO_INTERNSHIP_SELECTION_OFFER_SQL = `NOT EXISTS (
  SELECT 1 FROM offers o
  WHERE o.program_application_id = pa.id
    AND o.employer_id = $2::uuid
    AND COALESCE(o.offer_kind, 'standard') IN ('standard', 'internship_offer')
    ${AND_OFFER_NOT_DELETED}
)`;

/**
 * Selected internship applicants without a formal internship selection offer yet.
 */
export async function listInternshipSelectedWithoutOffer({ employerId, jobId }) {
  const res = await query(
    `SELECT
       pa.id AS program_application_id,
       sp.id AS student_id,
       sp.tenant_id,
       TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS student_name,
       u.first_name,
       COALESCE(NULLIF(TRIM(u.communication_email), ''), u.email) AS email,
       u.id AS user_id,
       t.name AS college_name,
       jp.title AS opening_title,
       ep.company_name
     FROM program_applications pa
     INNER JOIN job_postings jp ON jp.id = pa.job_id AND jp.job_type = 'internship'
     INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
     INNER JOIN student_profiles sp ON sp.id = pa.student_id AND ${SP_ACTIVE_CLAUSE}
     INNER JOIN users u ON u.id = sp.user_id
     LEFT JOIN tenants t ON t.id = sp.tenant_id
     WHERE jp.id = $1::uuid
       AND jp.employer_id = $2::uuid
       AND ${SELECTED_SQL}
       ${AND_PA_NOT_DELETED} ${AND_JP_NOT_DELETED}
       AND ${NO_INTERNSHIP_SELECTION_OFFER_SQL}
     ORDER BY u.first_name ASC, u.last_name ASC`,
    [jobId, employerId],
  );
  return res.rows;
}

export async function countInternshipSelectionOfferStats({ employerId, jobId }) {
  const withoutOffer = await listInternshipSelectedWithoutOffer({ employerId, jobId });

  const [selectedRes, offeredRes] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS n
       FROM program_applications pa
       INNER JOIN job_postings jp ON jp.id = pa.job_id AND jp.job_type = 'internship'
       WHERE jp.id = $1::uuid AND jp.employer_id = $2::uuid
         AND ${SELECTED_SQL} ${AND_PA_NOT_DELETED} ${AND_JP_NOT_DELETED}`,
      [jobId, employerId],
    ),
    query(
      `SELECT COUNT(*)::int AS n
       FROM offers o
       INNER JOIN program_applications pa ON pa.id = o.program_application_id
       WHERE pa.job_id = $1::uuid
         AND o.employer_id = $2::uuid
         AND COALESCE(o.offer_kind, 'standard') IN ('standard', 'internship_offer')
         ${AND_OFFER_NOT_DELETED}`,
      [jobId, employerId],
    ),
  ]);

  return {
    selectedCount: selectedRes.rows[0]?.n ?? 0,
    offersExistingCount: offeredRes.rows[0]?.n ?? 0,
    readyToGenerateCount: withoutOffer.length,
    withoutOffer,
  };
}

export async function assertEmployerOwnsInternshipPosting(employerId, jobId) {
  const res = await query(
    `SELECT jp.id, jp.title, ep.company_name, jp.internship_start_date
     FROM job_postings jp
     INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
     WHERE jp.id = $1::uuid AND jp.employer_id = $2::uuid AND jp.job_type = 'internship'
       ${AND_JP_NOT_DELETED}
     LIMIT 1`,
    [jobId, employerId],
  );
  return res.rows[0] || null;
}

/**
 * Create pending internship selection offers + emails. Safe to re-run.
 */
export async function generateInternshipOffersFromSelections({ employerId, jobId, templateId }) {
  const posting = await assertEmployerOwnsInternshipPosting(employerId, jobId);
  if (!posting) {
    const err = new Error('INTERNSHIP_NOT_FOUND');
    throw err;
  }

  const template = await loadEmployerOfferTemplate(templateId, employerId, { eventType: 'internship' });
  if (!template) {
    const err = new Error('TEMPLATE_NOT_FOUND');
    throw err;
  }

  const rows = dedupeInternshipOfferRows(await listInternshipSelectedWithoutOffer({ employerId, jobId }));
  const offerIds = [];
  let emailed = 0;

  const deadlineIso = toDeadlineTimestampIso(template.response_deadline);
  const joiningDate = template.joining_date ? toDateOnlyString(template.joining_date) : null;

  for (const row of rows) {
    const renderedLetter = buildRenderedOfferLetter({
      template,
      studentName: row.student_name,
      companyName: row.company_name,
      collegeName: row.college_name,
    });

    let insertRes;
    try {
      insertRes = await query(
        `INSERT INTO offers (
           student_id, employer_id, program_application_id, job_title, salary, location,
           status, joining_date, deadline, salary_currency, offer_template_id, rendered_letter_html, offer_kind
         ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, 'INR', $9, $10, $11)
         RETURNING id`,
        [
          row.student_id,
          employerId,
          row.program_application_id,
          template.job_title,
          Number(template.salary) || 0,
          template.location || null,
          joiningDate,
          deadlineIso,
          template.id,
          renderedLetter,
          INTERNSHIP_SELECTION_OFFER_KIND,
        ],
      );
    } catch (e) {
      if (e?.code === '23505') {
        continue;
      }
      if (e?.code === '42703') {
        insertRes = await query(
          `INSERT INTO offers (
             student_id, employer_id, program_application_id, job_title, salary, location,
             status, joining_date, deadline, salary_currency
           ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, 'INR')
           RETURNING id`,
          [
            row.student_id,
            employerId,
            row.program_application_id,
            template.job_title,
            Number(template.salary) || 0,
            template.location || null,
            joiningDate,
            deadlineIso,
          ],
        );
      } else {
        throw e;
      }
    }

    const offerId = String(insertRes.rows[0].id);
    offerIds.push(offerId);
    await safeRefreshOfferLatestFlags(row.student_id);

    try {
      const notifyResult = await notifyStudentFormalOffer({
        studentUserId: String(row.user_id),
        email: String(row.email || ''),
        firstName: row.first_name,
        companyName: String(row.company_name || 'Company'),
        roleTitle: String(template.job_title || row.opening_title || 'Internship'),
        salary: Number(template.salary) || 0,
        deadline: deadlineIso,
        offerId,
        programApplicationId: row.program_application_id,
        renderedLetterHtml: renderedLetter,
      });
      if (notifyResult?.sent !== false) emailed += 1;
    } catch (mailErr) {
      console.error('Internship offer email failed for', offerId, mailErr);
    }
  }

  return {
    created: offerIds.length,
    emailed,
    skipped: 0,
    offerIds,
    postingTitle: posting.title,
    templateName: template.name,
  };
}
