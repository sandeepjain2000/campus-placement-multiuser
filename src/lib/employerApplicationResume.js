import { query } from '@/lib/db';
import { hasColumn } from '@/lib/migrationReady';
import { buildCvDownloadFileName } from '@/lib/studentCv';
import { isAuthoritativeResumeUrl, resolveStudentResumeUrl } from '@/lib/studentResumeUrl';

/**
 * Resolve which CV file an employer may download for a student application.
 * @returns {Promise<{ fileUrl: string, downloadFileName: string, cvLabel: string | null } | null>}
 */
export async function resolveEmployerApplicationResume({
  studentId,
  applicationId,
  sourceKind,
}) {
  if (!studentId) return null;

  const hasCvs = await hasColumn('student_cvs', 'label');

  if (hasCvs && applicationId && sourceKind) {
    let cvRow = null;
    if (sourceKind === 'drive') {
      const r = await query(
        `SELECT sc.file_url, sc.label, sc.file_extension
         FROM applications a
         INNER JOIN student_cvs sc ON sc.id = a.student_cv_id
         WHERE a.id = $1::uuid AND a.student_id = $2::uuid`,
        [applicationId, studentId],
      );
      cvRow = r.rows[0];
    } else if (sourceKind === 'program') {
      const r = await query(
        `SELECT sc.file_url, sc.label, sc.file_extension
         FROM program_applications pa
         INNER JOIN student_cvs sc ON sc.id = pa.student_cv_id
         WHERE pa.id = $1::uuid AND pa.student_id = $2::uuid`,
        [applicationId, studentId],
      );
      cvRow = r.rows[0];
    }

    if (cvRow?.file_url) {
      return {
        fileUrl: cvRow.file_url,
        downloadFileName: buildCvDownloadFileName(cvRow.label, cvRow.file_extension),
        cvLabel: cvRow.label,
      };
    }
  }

  if (hasCvs) {
    const defaultCv = await query(
      `SELECT file_url, label, file_extension
       FROM student_cvs
       WHERE student_id = $1::uuid AND archived_at IS NULL
       ORDER BY is_default DESC, created_at DESC
       LIMIT 1`,
      [studentId],
    );
    if (defaultCv.rows[0]?.file_url) {
      const row = defaultCv.rows[0];
      return {
        fileUrl: row.file_url,
        downloadFileName: buildCvDownloadFileName(row.label, row.file_extension),
        cvLabel: row.label,
      };
    }
  }

  const [profile, docs] = await Promise.all([
    query(`SELECT resume_url FROM student_profiles WHERE id = $1::uuid`, [studentId]),
    query(
      `SELECT document_type AS type, file_url AS url, uploaded_at AS "uploadedAt", document_name
       FROM student_documents WHERE student_id = $1::uuid`,
      [studentId],
    ),
  ]);

  const fileUrl = resolveStudentResumeUrl({
    resumeUrl: profile.rows[0]?.resume_url,
    documents: docs.rows,
  });

  if (!isAuthoritativeResumeUrl(fileUrl)) return null;

  const legacyDoc = docs.rows.find(
    (d) => String(d.type || '').toLowerCase() === 'resume' && String(d.url || '').trim() === String(fileUrl).trim(),
  );
  const fallbackLabel = legacyDoc?.document_name
    ? String(legacyDoc.document_name).replace(/\.[^.]+$/, '').slice(0, 20)
    : 'CV';

  return {
    fileUrl,
    downloadFileName: buildCvDownloadFileName(fallbackLabel, legacyDoc?.document_name || '.pdf'),
    cvLabel: fallbackLabel,
  };
}

export function buildEmployerResumeApiUrl({ studentId, applicationId, sourceKind }) {
  const params = new URLSearchParams({ studentId: String(studentId) });
  if (applicationId) params.set('applicationId', String(applicationId));
  if (sourceKind) params.set('source', String(sourceKind));
  return `/api/employer/applications/resume?${params.toString()}`;
}
