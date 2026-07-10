/**
 * May–Jun semester rollover: recompute and persist student semester_number
 * from batch year + tenant academic calendar. Failed students get batch overrides
 * entered by the college before rollover runs.
 */

import { query, transaction } from '@/lib/db';
import {
  findAcademicYearForDate,
  parseAcademicYearLabel,
  toDateOnly,
} from '@/lib/academicYearTenant';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { normalizeAdmissionYear, normalizeGraduationYear } from '@/lib/studentBatch';

/** Calendar months when automated rollover is allowed (May–Jun). */
export const ROLLOVER_WINDOW_MONTHS = [4, 5];

export function isSemesterRolloverWindow(date = new Date()) {
  return ROLLOVER_WINDOW_MONTHS.includes(date.getMonth());
}

export function parseTenantAcademicSettings(settings = {}) {
  const s = settings && typeof settings === 'object' ? settings : {};
  const startMonth = Number(s.academicYearStartMonth);
  const semestersPerYear = Number(s.semestersPerAcademicYear);
  const defaultProgramDurationYears = Number(s.defaultProgramDurationYears);
  return {
    academicYearStartMonth:
      Number.isInteger(startMonth) && startMonth >= 1 && startMonth <= 12 ? startMonth : 7,
    semestersPerAcademicYear:
      Number.isInteger(semestersPerYear) && semestersPerYear >= 1 && semestersPerYear <= 3
        ? semestersPerYear
        : 2,
    defaultProgramDurationYears:
      Number.isInteger(defaultProgramDurationYears) &&
      defaultProgramDurationYears >= 1 &&
      defaultProgramDurationYears <= 8
        ? defaultProgramDurationYears
        : 4,
    lastSemesterRolloverAt: s.lastSemesterRolloverAt || null,
  };
}

/** Fallback academic year label (July-start) when tenant has no configured years. */
export function fallbackAcademicYearLabel(date = new Date(), startMonth = 7) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const startYear = month >= startMonth ? year : year - 1;
  const endShort = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}-${endShort}`;
}

export function academicYearStartYearFromRow(yearRow) {
  if (!yearRow) return null;
  const parsed = parseAcademicYearLabel(yearRow.label);
  if (parsed.valid) return parsed.startYear;
  const start = toDateOnly(yearRow.period_start || yearRow.periodStart);
  return start ? start.getFullYear() : null;
}

/**
 * Semester sequence within the academic year from tenant semester rows or month fallback.
 */
export function resolveSemesterInYear({ semesters, asOfDate, semestersPerYear = 2, startMonth = 7 }) {
  const date = asOfDate instanceof Date ? asOfDate : new Date(asOfDate);
  const sorted = [...(semesters || [])].sort(
    (a, b) =>
      Number(a.sequence_number ?? a.sequenceNumber) - Number(b.sequence_number ?? b.sequenceNumber),
  );

  if (sorted.length) {
    for (const sem of sorted) {
      const start = toDateOnly(sem.period_start || sem.periodStart)?.getTime();
      const end = toDateOnly(sem.period_end || sem.periodEnd)?.getTime();
      const ts = date.getTime();
      if (start != null && end != null && ts >= start && ts <= end) {
        return Number(sem.sequence_number ?? sem.sequenceNumber) || 1;
      }
    }
    // Between semesters: pick the next upcoming, or last if past all
    const ts = date.getTime();
    for (const sem of sorted) {
      const start = toDateOnly(sem.period_start || sem.periodStart)?.getTime();
      if (start != null && ts < start) {
        return Number(sem.sequence_number ?? sem.sequenceNumber) || 1;
      }
    }
    const last = sorted[sorted.length - 1];
    return Number(last.sequence_number ?? last.sequenceNumber) || sorted.length;
  }

  const perYear = Math.max(1, Math.min(3, semestersPerYear || 2));
  if (perYear === 1) return 1;
  if (perYear === 2) {
    // Jul–Dec = sem 1, Jan–Jun = sem 2 for July-start colleges
    return date.getMonth() >= startMonth - 1 ? 1 : 2;
  }
  const month = date.getMonth() + 1;
  if (month >= startMonth && month <= startMonth + 3) return 1;
  if (month > startMonth + 3 && month <= startMonth + 7) return 2;
  return 3;
}

/**
 * Compute cumulative semester number for a student cohort.
 */
export function computeStudentSemesterNumber({
  batchYear,
  programDurationYears = 4,
  semestersPerYear = 2,
  academicYearStartYear,
  semesterInYear,
}) {
  const batch = Number(batchYear);
  if (batchYear == null || batchYear === '' || !Number.isFinite(batch) || batch < 1990) {
    return null;
  }

  const duration = Math.max(1, Math.min(8, Number(programDurationYears) || 4));
  const semPerYear = Math.max(1, Math.min(3, Number(semestersPerYear) || 2));
  const maxSem = duration * semPerYear;
  const ayStart = Number(academicYearStartYear);
  if (!Number.isFinite(ayStart)) return null;

  const yearsInProgram = Math.max(0, ayStart - batch);
  const semInYear = Math.max(1, Math.min(semPerYear, Number(semesterInYear) || 1));
  let semesterNumber = yearsInProgram * semPerYear + semInYear;
  semesterNumber = Math.min(Math.max(1, semesterNumber), maxSem);
  return semesterNumber;
}

/** Default batch shift when a student repeats a year (holds semester progression). */
export function buildDefaultFailedBatchAdjustment({ batchYear, graduationYear } = {}) {
  const batch = normalizeAdmissionYear(batchYear);
  const grad = normalizeGraduationYear(graduationYear);
  return {
    repeatYear: true,
    newBatchYear: batch != null ? batch + 1 : null,
    newGraduationYear: grad != null ? grad + 1 : null,
  };
}

/**
 * Resolve batch/graduation to use during rollover for a failed student.
 * College may override newBatchYear / newGraduationYear; defaults shift batch +1 and grad +1.
 */
export function resolveRolloverBatchForStudent(row, adjustment = null) {
  const currentBatch = row.batch_year != null ? Number(row.batch_year) : null;
  const currentGrad = row.graduation_year != null ? Number(row.graduation_year) : null;

  if (!adjustment?.repeat_year && !adjustment?.repeatYear) {
    return {
      batchYear: currentBatch,
      graduationYear: currentGrad,
      joiningAcademicYear: row.joining_academic_year || (currentBatch != null ? String(currentBatch) : null),
      batchChanged: false,
    };
  }

  const defaults = buildDefaultFailedBatchAdjustment({
    batchYear: currentBatch,
    graduationYear: currentGrad,
  });

  const newBatchRaw = adjustment.new_batch_year ?? adjustment.newBatchYear;
  const newGradRaw = adjustment.new_graduation_year ?? adjustment.newGraduationYear;
  const newBatch =
    newBatchRaw != null && newBatchRaw !== ''
      ? normalizeAdmissionYear(newBatchRaw)
      : defaults.newBatchYear;
  const newGrad =
    newGradRaw != null && newGradRaw !== ''
      ? normalizeGraduationYear(newGradRaw)
      : defaults.newGraduationYear;

  return {
    batchYear: newBatch ?? currentBatch,
    graduationYear: newGrad ?? currentGrad,
    joiningAcademicYear: newBatch != null ? String(newBatch) : row.joining_academic_year,
    batchChanged:
      (newBatch != null && newBatch !== currentBatch) ||
      (newGrad != null && newGrad !== currentGrad),
  };
}

export function buildStudentSemesterUpdate(row, context, adjustment = null) {
  const {
    academicYearStartYear,
    semesterInYear,
    semestersPerYear,
    defaultProgramDurationYears,
  } = context;

  const resolvedBatch = resolveRolloverBatchForStudent(row, adjustment);
  const batchYear = resolvedBatch.batchYear;
  const programDuration =
    row.program_duration_years != null
      ? Number(row.program_duration_years)
      : defaultProgramDurationYears;

  const next = computeStudentSemesterNumber({
    batchYear,
    programDurationYears: programDuration,
    semestersPerYear,
    academicYearStartYear,
    semesterInYear,
  });

  const prev =
    row.semester_number != null
      ? Number(row.semester_number)
      : row.aux_profile?.semester && /^\d+$/.test(String(row.aux_profile.semester))
        ? Number(row.aux_profile.semester)
        : null;

  const currentBatch = row.batch_year != null ? Number(row.batch_year) : null;
  const currentGrad = row.graduation_year != null ? Number(row.graduation_year) : null;
  const repeatYear = Boolean(adjustment?.repeat_year ?? adjustment?.repeatYear);

  return {
    studentId: row.id,
    rollNumber: row.roll_number,
    name: row.student_name || null,
    email: row.email || null,
    repeatYear,
    batchYear: currentBatch,
    graduationYear: currentGrad,
    nextBatchYear: resolvedBatch.batchYear,
    nextGraduationYear: resolvedBatch.graduationYear,
    batchChanged: resolvedBatch.batchChanged,
    previousSemester: prev,
    nextSemester: next,
    changed: resolvedBatch.batchChanged || (next != null && next !== prev),
    semesterChanged: next != null && next !== prev,
  };
}

async function loadTenantRolloverContext(tenantId, asOfDate) {
  const date = asOfDate instanceof Date ? asOfDate : new Date(asOfDate);

  const tenantRes = await query(`SELECT settings FROM tenants WHERE id = $1::uuid`, [tenantId]);
  const settings = parseTenantAcademicSettings(tenantRes.rows[0]?.settings);

  const yearsRes = await query(
    `SELECT id, label, sequence_number, period_start, period_end, semester_count
     FROM tenant_academic_years
     WHERE tenant_id = $1::uuid
     ORDER BY sequence_number ASC`,
    [tenantId],
  );
  const years = yearsRes.rows;
  const currentYear = findAcademicYearForDate(date, years);

  let semesters = [];
  if (currentYear) {
    const semRes = await query(
      `SELECT academic_year_id, sequence_number, period_start, period_end
       FROM tenant_academic_year_semesters
       WHERE academic_year_id = $1::uuid
       ORDER BY sequence_number`,
      [currentYear.id],
    );
    semesters = semRes.rows;
  }

  const semestersPerYear = currentYear?.semester_count || settings.semestersPerAcademicYear;
  const semesterInYear = resolveSemesterInYear({
    semesters,
    asOfDate: date,
    semestersPerYear,
    startMonth: settings.academicYearStartMonth,
  });

  const academicYearStartYear =
    academicYearStartYearFromRow(currentYear) ??
    parseAcademicYearLabel(
      fallbackAcademicYearLabel(date, settings.academicYearStartMonth),
    ).startYear;

  const academicYearLabel =
    currentYear?.label || fallbackAcademicYearLabel(date, settings.academicYearStartMonth);

  return {
    settings,
    currentYear,
    semesters,
    semestersPerYear,
    semesterInYear,
    academicYearStartYear,
    academicYearLabel,
    asOfDate: date,
  };
}

async function loadRolloverAdjustments(tenantId, academicYearLabel, semesterInYear) {
  const res = await query(
    `SELECT student_id, repeat_year, new_batch_year, new_graduation_year, notes
     FROM tenant_semester_rollover_adjustments
     WHERE tenant_id = $1::uuid
       AND academic_year_label = $2
       AND semester_in_year = $3`,
    [tenantId, academicYearLabel, semesterInYear],
  );
  const map = new Map();
  for (const row of res.rows) {
    map.set(String(row.student_id), row);
  }
  return map;
}

export async function loadRolloverStudentRoster(tenantId, asOfDate = new Date()) {
  const context = await loadTenantRolloverContext(tenantId, asOfDate);
  const adjustments = await loadRolloverAdjustments(
    tenantId,
    context.academicYearLabel,
    context.semesterInYear,
  );

  const studentsRes = await query(
    `SELECT sp.id, sp.roll_number, sp.batch_year, sp.graduation_year, sp.joining_academic_year,
            sp.semester_number, sp.program_duration_years, sp.aux_profile,
            TRIM(CONCAT(u.first_name, ' ', u.last_name)) AS student_name,
            u.email
     FROM student_profiles sp
     JOIN users u ON u.id = sp.user_id
     WHERE sp.tenant_id = $1::uuid AND ${SP_ACTIVE_CLAUSE} AND sp.batch_year IS NOT NULL
     ORDER BY sp.roll_number NULLS LAST, u.last_name, u.first_name`,
    [tenantId],
  );

  const students = studentsRes.rows.map((row) => {
    const adjustment = adjustments.get(String(row.id)) || null;
    const update = buildStudentSemesterUpdate(row, context, adjustment);
    return {
      ...update,
      notes: adjustment?.notes || '',
      adjustment: adjustment
        ? {
            repeatYear: Boolean(adjustment.repeat_year),
            newBatchYear: adjustment.new_batch_year,
            newGraduationYear: adjustment.new_graduation_year,
            notes: adjustment.notes || '',
          }
        : null,
    };
  });

  return {
    ...context,
    students,
    failedCount: students.filter((s) => s.repeatYear).length,
    pendingBatchChanges: students.filter((s) => s.batchChanged).length,
    pendingSemesterChanges: students.filter((s) => s.semesterChanged).length,
  };
}

export async function saveRolloverAdjustments(
  tenantId,
  { academicYearLabel, semesterInYear, adjustments = [], userId = null },
) {
  if (!academicYearLabel || !semesterInYear) {
    return { error: 'Academic year and semester context required.' };
  }

  await transaction(async (client) => {
    for (const item of adjustments) {
      const studentId = String(item.studentId || item.student_id || '').trim();
      if (!studentId) continue;

      const repeatYear = Boolean(item.repeatYear ?? item.repeat_year);
      if (!repeatYear) {
        await client.query(
          `DELETE FROM tenant_semester_rollover_adjustments
           WHERE tenant_id = $1::uuid AND student_id = $2::uuid
             AND academic_year_label = $3 AND semester_in_year = $4`,
          [tenantId, studentId, academicYearLabel, semesterInYear],
        );
        continue;
      }

      const newBatchYear = normalizeAdmissionYear(item.newBatchYear ?? item.new_batch_year);
      const newGraduationYear = normalizeGraduationYear(
        item.newGraduationYear ?? item.new_graduation_year,
      );
      const notes = String(item.notes || '').trim() || null;

      await client.query(
        `INSERT INTO tenant_semester_rollover_adjustments (
           tenant_id, student_id, academic_year_label, semester_in_year,
           repeat_year, new_batch_year, new_graduation_year, notes, updated_by
         ) VALUES ($1, $2, $3, $4, true, $5, $6, $7, $8)
         ON CONFLICT (tenant_id, student_id, academic_year_label, semester_in_year)
         DO UPDATE SET
           repeat_year = EXCLUDED.repeat_year,
           new_batch_year = EXCLUDED.new_batch_year,
           new_graduation_year = EXCLUDED.new_graduation_year,
           notes = EXCLUDED.notes,
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW()`,
        [
          tenantId,
          studentId,
          academicYearLabel,
          semesterInYear,
          newBatchYear,
          newGraduationYear,
          notes,
          userId,
        ],
      );
    }
  });

  return { success: true };
}

async function applyStudentRolloverUpdate(client, item) {
  if (item.batchChanged) {
    await client.query(
      `UPDATE student_profiles
       SET batch_year = $2,
           graduation_year = $3,
           joining_academic_year = $4,
           aux_profile = jsonb_set(
             jsonb_set(
               COALESCE(aux_profile, '{}'::jsonb),
               '{batchLabel}',
               to_jsonb($4::text),
               true
             ),
             '{joiningAcademicYear}',
             to_jsonb($4::text),
             true
           ),
           updated_at = NOW()
       WHERE id = $1::uuid`,
      [item.studentId, item.nextBatchYear, item.nextGraduationYear, String(item.nextBatchYear)],
    );
  }

  if (item.nextSemester != null && (item.semesterChanged || item.batchChanged)) {
    await client.query(
      `UPDATE student_profiles
       SET semester_number = $2,
           aux_profile = jsonb_set(
             COALESCE(aux_profile, '{}'::jsonb),
             '{semester}',
             to_jsonb($3::text),
             true
           ),
           updated_at = NOW()
       WHERE id = $1::uuid`,
      [item.studentId, item.nextSemester, String(item.nextSemester)],
    );
  }
}

/**
 * Preview or execute semester rollover for one tenant.
 */
export async function runSemesterRolloverForTenant(
  tenantId,
  {
    asOfDate = new Date(),
    dryRun = false,
    force = false,
    triggeredBy = 'manual',
    triggeredByUserId = null,
  } = {},
) {
  const date = asOfDate instanceof Date ? asOfDate : new Date(asOfDate);

  if (!force && triggeredBy === 'cron' && !isSemesterRolloverWindow(date)) {
    return {
      skipped: true,
      reason: 'Outside May–June rollover window',
      windowMonths: ROLLOVER_WINDOW_MONTHS.map((m) => m + 1),
    };
  }

  const context = await loadTenantRolloverContext(tenantId, date);
  const adjustments = await loadRolloverAdjustments(
    tenantId,
    context.academicYearLabel,
    context.semesterInYear,
  );

  const studentsRes = await query(
    `SELECT sp.id, sp.roll_number, sp.batch_year, sp.graduation_year, sp.joining_academic_year,
            sp.semester_number, sp.program_duration_years, sp.aux_profile,
            TRIM(CONCAT(u.first_name, ' ', u.last_name)) AS student_name,
            u.email
     FROM student_profiles sp
     JOIN users u ON u.id = sp.user_id
     WHERE sp.tenant_id = $1::uuid AND ${SP_ACTIVE_CLAUSE} AND sp.batch_year IS NOT NULL`,
    [tenantId],
  );

  const updates = [];
  for (const row of studentsRes.rows) {
    const adjustment = adjustments.get(String(row.id)) || null;
    const item = buildStudentSemesterUpdate(row, context, adjustment);
    if (item.nextSemester != null || item.batchChanged) updates.push(item);
  }

  const toApply = updates.filter((u) => u.changed);
  const batchChanges = toApply.filter((u) => u.batchChanged);
  const semesterOnlyChanges = toApply.filter((u) => !u.batchChanged && u.semesterChanged);

  if (!dryRun && toApply.length) {
    await transaction(async (client) => {
      for (const item of toApply) {
        await applyStudentRolloverUpdate(client, item);
      }

      await client.query(
        `INSERT INTO tenant_semester_rollover_runs (
           tenant_id, academic_year_label, semester_in_year, as_of_date,
           students_scanned, students_updated, triggered_by, triggered_by_user_id, dry_run, details
         ) VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8, false, $9::jsonb)`,
        [
          tenantId,
          context.academicYearLabel,
          context.semesterInYear,
          date.toISOString().slice(0, 10),
          studentsRes.rows.length,
          toApply.length,
          triggeredBy,
          triggeredByUserId,
          JSON.stringify({
            academicYearStartYear: context.academicYearStartYear,
            semestersPerYear: context.semestersPerYear,
            failedStudents: batchChanges.length,
            batchChanges: batchChanges.slice(0, 10),
            semesterChanges: semesterOnlyChanges.slice(0, 10),
            sample: toApply.slice(0, 5),
          }),
        ],
      );

      const prevSettings = (
        await client.query(`SELECT settings FROM tenants WHERE id = $1::uuid`, [tenantId])
      ).rows[0]?.settings;
      const merged = {
        ...(prevSettings && typeof prevSettings === 'object' ? prevSettings : {}),
        lastSemesterRolloverAt: new Date().toISOString(),
        lastSemesterRolloverAcademicYear: context.academicYearLabel,
        lastSemesterRolloverSemester: context.semesterInYear,
      };
      await client.query(`UPDATE tenants SET settings = $2::jsonb, updated_at = NOW() WHERE id = $1::uuid`, [
        tenantId,
        JSON.stringify(merged),
      ]);

      await client.query(
        `DELETE FROM tenant_semester_rollover_adjustments
         WHERE tenant_id = $1::uuid
           AND academic_year_label = $2
           AND semester_in_year = $3`,
        [tenantId, context.academicYearLabel, context.semesterInYear],
      );
    });
  }

  return {
    skipped: false,
    dryRun,
    academicYearLabel: context.academicYearLabel,
    semesterInYear: context.semesterInYear,
    academicYearStartYear: context.academicYearStartYear,
    studentsScanned: studentsRes.rows.length,
    studentsUpdated: toApply.length,
    failedStudents: batchChanges.length,
    batchChanges: batchChanges.length,
    changes: toApply,
    unchanged: updates.length - toApply.length,
    inRolloverWindow: isSemesterRolloverWindow(date),
  };
}

/** Run rollover for all colleges (cron). */
export async function runSemesterRolloverAllTenants(options = {}) {
  const date = options.asOfDate ? new Date(options.asOfDate) : new Date();
  if (!options.force && !options.dryRun && !isSemesterRolloverWindow(date)) {
    return { skipped: true, reason: 'Outside May–June rollover window', results: [] };
  }

  const tenantsRes = await query(
    `SELECT id, name FROM tenants WHERE type = 'college' ORDER BY name`,
  );

  const results = [];
  for (const tenant of tenantsRes.rows) {
    try {
      const result = await runSemesterRolloverForTenant(tenant.id, {
        ...options,
        asOfDate: date,
        triggeredBy: 'cron',
      });
      results.push({ tenantId: tenant.id, tenantName: tenant.name, ...result });
    } catch (err) {
      results.push({
        tenantId: tenant.id,
        tenantName: tenant.name,
        error: err?.message || 'Rollover failed',
      });
    }
  }

  return { skipped: false, results };
}

export async function loadRecentRolloverRuns(tenantId, limit = 5) {
  const res = await query(
    `SELECT id, academic_year_label, semester_in_year, as_of_date,
            students_scanned, students_updated, triggered_by, dry_run, created_at
     FROM tenant_semester_rollover_runs
     WHERE tenant_id = $1::uuid
     ORDER BY created_at DESC
     LIMIT $2`,
    [tenantId, limit],
  );
  return res.rows;
}
