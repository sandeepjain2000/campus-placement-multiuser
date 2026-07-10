import { transaction } from '@/lib/db';
import {
  recordStudentSelectionNotification,
  sendStudentSelectionEmail,
} from '@/lib/studentSelectionNotify';
import { shouldEmailStudentOnInternshipSelection } from '@/lib/internshipEmailPolicy';
import {
  AND_APP_NOT_DELETED,
  AND_DRIVE_NOT_DELETED,
  AND_JP_NOT_DELETED,
  AND_PA_NOT_DELETED,
} from '@/lib/softDeleteSql';
import {
  normalizeEmployerApplicationStatus,
  shouldNotifyStudentSelectionOnStatusChange,
} from '@/lib/employerApplicationList';
import { assertEmployerMayConfirmStudent } from '@/lib/campusFcfsSelection';

/**
 * Atomically update application status and send at most one selection notification.
 * Row lock prevents duplicate emails when Select is clicked repeatedly or in parallel.
 *
 * @returns {Promise<
 *   | { application: object; sourceKind: string }
 *   | { error: string; status: number }
 * >}
 */
export async function updateEmployerApplicationStatus({
  employerId,
  applicationId,
  sourceKind,
  nextStatus,
}) {
  const emailPayload = await transaction(async (client) => {
    const runQuery = client.query.bind(client);

    let lockedRow;
    if (sourceKind === 'drive') {
      const res = await runQuery(
        `SELECT a.id, a.status
         FROM applications a
         INNER JOIN placement_drives d ON d.id = a.drive_id
         WHERE a.id = $1::uuid
           AND d.employer_id = $2::uuid
           ${AND_APP_NOT_DELETED} ${AND_DRIVE_NOT_DELETED}
         FOR UPDATE OF a`,
        [applicationId, employerId],
      );
      lockedRow = res.rows[0];
    } else {
      const res = await runQuery(
        `SELECT pa.id, pa.status, pa.job_id
         FROM program_applications pa
         INNER JOIN job_postings jp ON jp.id = pa.job_id
         WHERE pa.id = $1::uuid
           AND jp.employer_id = $2::uuid
           ${AND_PA_NOT_DELETED} ${AND_JP_NOT_DELETED}
         FOR UPDATE OF pa`,
        [applicationId, employerId],
      );
      lockedRow = res.rows[0];
    }

    if (!lockedRow) {
      return { error: 'Application not found', status: 404 };
    }

    const currentStatus = lockedRow.status;
    const notifySelection =
      nextStatus === 'selected' &&
      shouldNotifyStudentSelectionOnStatusChange(currentStatus, nextStatus);

    let metaResultRow = null;
    if (nextStatus === 'selected') {
      if (sourceKind === 'drive') {
        const meta = await runQuery(
          `SELECT sp.tenant_id, sp.id AS student_id, d.title AS drive_title, ep.company_name,
                  u.first_name, COALESCE(u.communication_email, u.email) AS email, u.id AS student_user_id
           FROM applications a
           INNER JOIN student_profiles sp ON sp.id = a.student_id
           INNER JOIN users u ON u.id = sp.user_id
           INNER JOIN placement_drives d ON d.id = a.drive_id
           INNER JOIN employer_profiles ep ON ep.id = d.employer_id
           WHERE a.id = $1::uuid AND d.employer_id = $2::uuid
           LIMIT 1`,
          [applicationId, employerId],
        );
        metaResultRow = meta.rows[0];
        if (metaResultRow?.tenant_id && metaResultRow?.student_id) {
          const fcfs = await assertEmployerMayConfirmStudent({
            tenantId: metaResultRow.tenant_id,
            studentProfileId: metaResultRow.student_id,
            track: 'placement',
            employerId,
          }, client);
          if (!fcfs.ok) {
            return { error: fcfs.error, status: 409 };
          }
        }
      } else {
        const meta = await runQuery(
          `SELECT sp.tenant_id, sp.id AS student_id, jp.job_type, jp.title AS job_title, ep.company_name,
                  u.first_name, COALESCE(u.communication_email, u.email) AS email, u.id AS student_user_id
           FROM program_applications pa
           INNER JOIN student_profiles sp ON sp.id = pa.student_id
           INNER JOIN users u ON u.id = sp.user_id
           INNER JOIN job_postings jp ON jp.id = pa.job_id
           INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
           WHERE pa.id = $1::uuid AND jp.employer_id = $2::uuid
           LIMIT 1`,
          [applicationId, employerId],
        );
        metaResultRow = meta.rows[0];
        const jt = String(metaResultRow?.job_type || '').toLowerCase();
        const track = jt === 'internship' ? 'internship' : 'jobs';
        if (metaResultRow?.tenant_id && metaResultRow?.student_id) {
          const fcfs = await assertEmployerMayConfirmStudent({
            tenantId: metaResultRow.tenant_id,
            studentProfileId: metaResultRow.student_id,
            track,
            employerId,
          }, client);
          if (!fcfs.ok) {
            return { error: fcfs.error, status: 409 };
          }
        }
      }
    }

    let updatedRes;
    if (sourceKind === 'drive') {
      updatedRes = await runQuery(
        `UPDATE applications a
         SET status = $1, updated_at = NOW()
         FROM placement_drives d
         WHERE a.id = $2::uuid
           AND d.id = a.drive_id
           AND d.employer_id = $3::uuid
           ${AND_APP_NOT_DELETED} ${AND_DRIVE_NOT_DELETED}
         RETURNING a.id, a.status`,
        [nextStatus, applicationId, employerId],
      );
    } else {
      updatedRes = await runQuery(
        `UPDATE program_applications pa
         SET status = $1, updated_at = NOW()
         FROM job_postings jp
         WHERE pa.id = $2::uuid
           AND jp.id = pa.job_id
           AND jp.employer_id = $3::uuid
           ${AND_PA_NOT_DELETED} ${AND_JP_NOT_DELETED}
         RETURNING pa.id, pa.status, pa.job_id`,
        [nextStatus, applicationId, employerId],
      );
    }

    const updatedRow = updatedRes.rows[0];
    if (!updatedRow) {
      return { error: 'Application not found', status: 404 };
    }

    let pendingEmail = null;
    if (notifySelection && metaResultRow) {
      const programType =
        sourceKind === 'drive'
          ? 'drives'
          : String(metaResultRow?.job_type || 'internship').toLowerCase() === 'internship'
            ? 'internships'
            : 'jobs';

      const recorded = await recordStudentSelectionNotification(
        {
          studentUserId: metaResultRow.student_user_id,
          email: metaResultRow.email,
          firstName: metaResultRow.first_name,
          companyName: metaResultRow.company_name,
          roleTitle: sourceKind === 'drive' ? metaResultRow.drive_title : metaResultRow.job_title,
          applicationId,
          sourceKind,
          programType,
        },
        { runQuery },
      );

      if (recorded) {
        const emailOnSelection = shouldEmailStudentOnInternshipSelection(
          sourceKind,
          metaResultRow?.job_type,
        );
        if (emailOnSelection) {
          pendingEmail = {
            studentUserId: metaResultRow.student_user_id,
            email: metaResultRow.email,
            firstName: metaResultRow.first_name,
            companyName: metaResultRow.company_name,
            roleTitle: sourceKind === 'drive' ? metaResultRow.drive_title : metaResultRow.job_title,
            applicationId,
            sourceKind,
            programType,
          };
        }
      }
    }

    return {
      application: updatedRow,
      normalizedStatus: normalizeEmployerApplicationStatus(updatedRow.status),
      pendingEmail,
    };
  });

  if (emailPayload?.error) {
    return emailPayload;
  }

  if (emailPayload?.pendingEmail) {
    try {
      await sendStudentSelectionEmail(emailPayload.pendingEmail);
    } catch (err) {
      console.error('Selection email failed after status update:', err);
    }
  }

  return {
    application: emailPayload.application,
    normalizedStatus: emailPayload.normalizedStatus,
    sourceKind,
  };
}
