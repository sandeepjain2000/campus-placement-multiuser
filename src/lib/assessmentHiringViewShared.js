/**
 * Client-safe helpers for hiring results / assessment view UI (no DB imports).
 */

import { pickRepresentativeAssessmentRows } from '@/lib/assessmentRowsDedupe';

/** Classify an assessment upload row for employer hiring results tabs. */
export function classifyAssessmentOpportunityKind(row) {
  if (row.upload_drive_id) return 'drive';
  const jt = String(row.job_type || '').toLowerCase();
  if (jt === 'internship') return 'internship';
  if (jt === 'short_project' || jt === 'hackathon') return 'projects';
  if (row.upload_job_id) return 'jobs';
  return 'jobs';
}

export function filterAssessmentRowsByKind(rows, kind) {
  if (!kind || kind === 'all') return rows;
  return rows.filter((r) => r.opportunity_kind === kind);
}

export function buildAssessmentSummary(rows) {
  const nonEmpty = (v) => String(v ?? '').trim().length > 0;
  const rep = pickRepresentativeAssessmentRows(rows);
  const uploadIds = new Set(rows.map((r) => r.upload_id).filter(Boolean));

  const withResult = rep.filter((r) => nonEmpty(r.hiring_result)).length;
  const withoutResult = rep.length - withResult;

  const buckets = new Map();
  for (const r of rep) {
    const raw = String(r.hiring_result ?? '').trim();
    if (!raw) continue;
    const lk = raw.toLowerCase();
    const cur = buckets.get(lk);
    if (cur) cur.count += 1;
    else buckets.set(lk, { status: raw, count: 1 });
  }

  const byStatus = [...buckets.values()].sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));

  return {
    uniqueStudentCount: rep.length,
    totalResultRows: rows.length,
    uploadsCount: uploadIds.size,
    withHiringResult: withResult,
    withoutHiringResult: withoutResult,
    hiringResultByStatus: byStatus,
  };
}

export { pickRepresentativeAssessmentRows };
