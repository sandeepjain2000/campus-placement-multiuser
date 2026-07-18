import { query } from '@/lib/db';
import { hasColumn } from '@/lib/migrationReady';
import { getCollegeCvVerificationSettings } from '@/lib/collegeCvVerification';
import { isAuthoritativeResumeUrl, resolveStudentResumeUrl } from '@/lib/studentResumeUrl';
import {
  STUDENT_CV_NOT_VERIFIED_FOR_APPLY_MESSAGE,
  STUDENT_CV_VERIFICATION_REQUIRED_APPLY_MESSAGE,
} from '@/lib/studentApplyMessages';

import {
  mapStudentCvRow,
  extractFileExtension,
  validateCvLabel,
} from '@/lib/studentCvShared';

export {
  CV_LABEL_MAX_LENGTH,
  buildCvDownloadFileName,
  extractFileExtension,
  sanitizeCvDownloadBaseName,
  validateCvLabel,
} from '@/lib/studentCvShared';

export { mapStudentCvRow };

let studentCvsTableReady;
let studentCvVerificationColumnsReady;
let studentCvUsageCountSqlCache;

export async function isStudentCvsTableReady() {
  if (studentCvsTableReady !== undefined) return studentCvsTableReady;
  try {
    studentCvsTableReady = await hasColumn('student_cvs', 'label');
  } catch {
    studentCvsTableReady = false;
  }
  return studentCvsTableReady;
}

export async function isStudentCvVerificationReady() {
  if (studentCvVerificationColumnsReady !== undefined) return studentCvVerificationColumnsReady;
  try {
    studentCvVerificationColumnsReady =
      (await isStudentCvsTableReady()) && (await hasColumn('student_cvs', 'cv_verified_at'));
  } catch {
    studentCvVerificationColumnsReady = false;
  }
  return studentCvVerificationColumnsReady;
}

/** Safe `used_on_applications` select when migration 099 FK columns are partial. */
export async function buildStudentCvUsageCountSelect() {
  if (studentCvUsageCountSqlCache !== undefined) return studentCvUsageCountSqlCache;
  try {
    const parts = [];
    if (await hasColumn('program_applications', 'student_cv_id')) {
      parts.push('(SELECT COUNT(*)::int FROM program_applications pa WHERE pa.student_cv_id = sc.id)');
    }
    if (await hasColumn('applications', 'student_cv_id')) {
      parts.push('(SELECT COUNT(*)::int FROM applications a WHERE a.student_cv_id = sc.id)');
    }
    studentCvUsageCountSqlCache = parts.length
      ? `(${parts.join(' + ')}) AS used_on_applications`
      : '0::int AS used_on_applications';
  } catch {
    studentCvUsageCountSqlCache = '0::int AS used_on_applications';
  }
  return studentCvUsageCountSqlCache;
}

const STUDENT_CV_SELECT =
  'id, label, file_url, file_size, is_default, archived_at, cv_verified_at, cv_verified_by, created_at, updated_at';

async function selectStudentCvs(whereSql, params, client = null) {
  const q = client ? client.query.bind(client) : query;
  const verificationReady = await isStudentCvVerificationReady();
  const columns = verificationReady
    ? STUDENT_CV_SELECT
    : 'id, label, file_url, file_size, is_default, archived_at, created_at, updated_at';
  const r = await q(
    `SELECT ${columns}
     FROM student_cvs
     WHERE ${whereSql}`,
    params,
  );
  return r.rows.map((row) => mapStudentCvRow(row));
}

export async function listActiveStudentCvs(studentId, client = null) {
  const ready = await isStudentCvsTableReady();
  if (!ready) return [];
  return selectStudentCvs('student_id = $1::uuid AND archived_at IS NULL ORDER BY is_default DESC, created_at DESC', [
    studentId,
  ], client);
}

export async function listStudentCvsForCollege(studentId, { includeArchived = false } = {}) {
  const ready = await isStudentCvsTableReady();
  if (!ready) return [];
  const archivedSql = includeArchived ? '' : 'AND archived_at IS NULL';
  return selectStudentCvs(
    `student_id = $1::uuid ${archivedSql} ORDER BY archived_at NULLS FIRST, is_default DESC, created_at DESC`,
    [studentId],
  );
}

export async function countVerifiedActiveStudentCvs(studentId) {
  const verificationReady = await isStudentCvVerificationReady();
  if (!verificationReady || !studentId) return 0;
  const r = await query(
    `SELECT COUNT(*)::int AS n
     FROM student_cvs
     WHERE student_id = $1::uuid AND archived_at IS NULL AND cv_verified_at IS NOT NULL`,
    [studentId],
  );
  return r.rows[0]?.n ?? 0;
}

/**
 * Per-student CV counts for college student list (S-45).
 * @param {string[]} studentIds
 * @returns {Promise<Map<string, { activeCvCount: number, verifiedCvCount: number, cvStatus: 'verified' | 'pending' | 'none' }>>}
 */
export async function loadStudentCvVerificationSummaries(studentIds) {
  const map = new Map();
  if (!studentIds.length) return map;

  const cvsReady = await isStudentCvsTableReady();
  if (!cvsReady) {
    for (const id of studentIds) {
      map.set(String(id), { activeCvCount: 0, verifiedCvCount: 0, cvStatus: 'none' });
    }
    return map;
  }

  const verificationReady = await isStudentCvVerificationReady();
  const verifiedSql = verificationReady
    ? 'COUNT(*) FILTER (WHERE sc.archived_at IS NULL AND sc.cv_verified_at IS NOT NULL)::int'
    : '0::int';

  const r = await query(
    `SELECT sc.student_id,
            COUNT(*) FILTER (WHERE sc.archived_at IS NULL)::int AS active_cv_count,
            ${verifiedSql} AS verified_cv_count
     FROM student_cvs sc
     WHERE sc.student_id = ANY($1::uuid[])
     GROUP BY sc.student_id`,
    [studentIds],
  );

  for (const id of studentIds) {
    map.set(String(id), { activeCvCount: 0, verifiedCvCount: 0, cvStatus: 'none' });
  }
  for (const row of r.rows) {
    const activeCvCount = row.active_cv_count ?? 0;
    const verifiedCvCount = row.verified_cv_count ?? 0;
    let cvStatus = 'none';
    if (activeCvCount > 0) {
      cvStatus = verifiedCvCount > 0 ? 'verified' : 'pending';
    }
    map.set(String(row.student_id), { activeCvCount, verifiedCvCount, cvStatus });
  }
  return map;
}

/**
 * Browse/apply gate when college requires verified CVs for drives and internships.
 */
export async function getStudentCampusCvVerificationGate(studentId, tenantId) {
  const settings = await getCollegeCvVerificationSettings(tenantId);
  if (!settings.requireCvVerification) {
    return {
      required: false,
      hasVerifiedCv: true,
      applyBlockedReason: null,
      settings,
    };
  }
  const verifiedCount = await countVerifiedActiveStudentCvs(studentId);
  const hasVerifiedCv = verifiedCount > 0;
  return {
    required: true,
    hasVerifiedCv,
    applyBlockedReason: hasVerifiedCv ? null : STUDENT_CV_VERIFICATION_REQUIRED_APPLY_MESSAGE,
    settings,
  };
}

/** @returns {{ ok: true } | { ok: false, error: string }} */
export async function assertStudentCvVerifiedForCampusApply(studentId, tenantId, studentCvId) {
  const gate = await getStudentCampusCvVerificationGate(studentId, tenantId);
  if (!gate.required) return { ok: true };

  if (!studentCvId) {
    return { ok: false, error: STUDENT_CV_VERIFICATION_REQUIRED_APPLY_MESSAGE };
  }

  const verificationReady = await isStudentCvVerificationReady();
  if (!verificationReady) {
    return { ok: false, error: STUDENT_CV_VERIFICATION_REQUIRED_APPLY_MESSAGE };
  }

  const r = await query(
    `SELECT id FROM student_cvs
     WHERE id = $1::uuid AND student_id = $2::uuid AND archived_at IS NULL AND cv_verified_at IS NOT NULL
     LIMIT 1`,
    [studentCvId, studentId],
  );
  if (!r.rows.length) {
    return { ok: false, error: STUDENT_CV_NOT_VERIFIED_FOR_APPLY_MESSAGE };
  }
  return { ok: true };
}

export async function getStudentCvApplyState(studentId) {
  if (!studentId) return { hasResume: false, resumeUrl: '', activeCvs: [] };

  const ready = await isStudentCvsTableReady();
  if (ready) {
    const activeCvs = await listActiveStudentCvs(studentId);
    if (activeCvs.length > 0) {
      const defaultCv = activeCvs.find((c) => c.isDefault) || activeCvs[0];
      return {
        hasResume: true,
        resumeUrl: '',
        activeCvs,
        defaultCvId: defaultCv?.id || null,
      };
    }
  }

  const legacy = await loadLegacyStudentResumeState(studentId);
  return {
    hasResume: legacy.hasResume,
    resumeUrl: legacy.resumeUrl,
    activeCvs: [],
    defaultCvId: null,
  };
}

async function queryLegacyStudentDocuments(studentId) {
  try {
    return await query(
      `SELECT document_type AS type, file_url AS url, uploaded_at AS "uploadedAt", document_name, file_size
       FROM student_documents WHERE student_id = $1::uuid`,
      [studentId],
    );
  } catch (e) {
    if (e?.code !== '42703') throw e;
    return query(
      `SELECT document_type AS type, file_url AS url, uploaded_at AS "uploadedAt"
       FROM student_documents WHERE student_id = $1::uuid`,
      [studentId],
    );
  }
}

async function loadLegacyStudentResumeState(studentId) {
  const [profileRes, docsRes] = await Promise.all([
    query(`SELECT resume_url FROM student_profiles WHERE id = $1::uuid`, [studentId]),
    queryLegacyStudentDocuments(studentId),
  ]);

  const resumeUrl = resolveStudentResumeUrl({
    resumeUrl: profileRes.rows[0]?.resume_url,
    documents: docsRes.rows,
  });

  return {
    hasResume: isAuthoritativeResumeUrl(resumeUrl),
    resumeUrl,
    documents: docsRes.rows,
  };
}

/**
 * When student_cvs exists but a student only has a pre-migration profile/documents résumé,
 * create one labelled row so apply + employer download stay consistent.
 * @returns {Promise<string | null>} new or existing active CV id
 */
export async function ensureLegacyCvRowFromProfile(studentId, client = null) {
  const ready = await isStudentCvsTableReady();
  if (!ready || !studentId) return null;

  const q = client ? client.query.bind(client) : query;
  const active = await listActiveStudentCvs(studentId, client);
  if (active.length) return active.find((c) => c.isDefault)?.id || active[0].id;

  const legacy = await loadLegacyStudentResumeState(studentId);
  if (!legacy.hasResume) return null;

  const fileUrl = String(legacy.resumeUrl || '').trim();
  const legacyDoc = legacy.documents.find(
    (d) =>
      String(d.type || '').toLowerCase() === 'resume' &&
      String(d.url || '').trim() === fileUrl,
  );

  const rawName = String(
    legacyDoc?.document_name || fileUrl.split('/').pop() || 'resume.pdf',
  ).slice(0, 255);
  const labelCandidate = String(rawName).replace(/\.[^.]+$/, '').trim() || 'CV';
  const labelCheck = validateCvLabel(labelCandidate);
  const label = labelCheck.label || 'CV';
  const extension = extractFileExtension(rawName);
  const fileSize = legacyDoc?.file_size != null ? Number(legacyDoc.file_size) : null;

  try {
    const ins = await q(
      `INSERT INTO student_cvs
        (student_id, label, file_url, file_size, original_file_name, file_extension, is_default)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, true)
       RETURNING id`,
      [studentId, label, fileUrl, fileSize, rawName, extension],
    );
    return ins.rows[0]?.id ? String(ins.rows[0].id) : null;
  } catch (e) {
    console.error('ensureLegacyCvRowFromProfile', studentId, e);
    return null;
  }
}

/**
 * Resolve CV for apply POST. Returns cv row id + file_url or error.
 * @param {string} studentId
 * @param {string | null | undefined} requestedCvId
 */
export async function resolveCvForApplication(studentId, requestedCvId, client = null) {
  const ready = await isStudentCvsTableReady();

  if (!ready) {
    const state = await getStudentCvApplyState(studentId);
    if (!state.hasResume) {
      return { ok: false, error: 'Upload a CV with a label before applying.' };
    }
    return { ok: true, studentCvId: null };
  }

  let active = await listActiveStudentCvs(studentId, client);
  if (!active.length) {
    const backfilledId = await ensureLegacyCvRowFromProfile(studentId, client);
    if (backfilledId) {
      active = await listActiveStudentCvs(studentId, client);
    } else {
      const state = await getStudentCvApplyState(studentId);
      if (!state.hasResume) {
        return { ok: false, error: 'Upload a CV with a label before applying.' };
      }
      return { ok: true, studentCvId: null };
    }
  }

  if (!active.length) {
    return { ok: false, error: 'Upload a CV with a label before applying.' };
  }

  if (requestedCvId) {
    const match = active.find((c) => c.id === String(requestedCvId));
    if (!match) {
      return { ok: false, error: 'Selected CV is not available. Choose an active CV or upload a new one.' };
    }
    return { ok: true, studentCvId: match.id };
  }

  if (active.length === 1) {
    return { ok: true, studentCvId: active[0].id };
  }

  const defaultCv = active.find((c) => c.isDefault);
  if (defaultCv) {
    return { ok: true, studentCvId: defaultCv.id };
  }

  return { ok: false, error: 'Choose which CV to submit with this application.' };
}

export async function syncDefaultCvOnProfile(client, studentId, fileUrl) {
  try {
    await client.query(
      `UPDATE student_profiles SET resume_url = $1::text, updated_at = NOW() WHERE id = $2::uuid`,
      [fileUrl, studentId],
    );
  } catch (e) {
    if (e?.code === '42703') {
      await client.query(`UPDATE student_profiles SET resume_url = $1::text WHERE id = $2::uuid`, [
        fileUrl,
        studentId,
      ]);
    } else {
      throw e;
    }
  }
}
