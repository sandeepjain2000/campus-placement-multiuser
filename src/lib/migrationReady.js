import { query } from '@/lib/db';

const cache = new Map();

/**
 * Cached information_schema check — avoids repeated lookups per process.
 * @param {string} table
 * @param {string} column
 */
export async function hasColumn(table, column) {
  const key = `${table}.${column}`;
  if (cache.has(key)) return cache.get(key);
  try {
    const r = await query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
       LIMIT 1`,
      [table, column],
    );
    const ok = r.rows.length > 0;
    cache.set(key, ok);
    return ok;
  } catch {
    cache.set(key, false);
    return false;
  }
}

/** Whether job_posting_visibility.college_status exists (migration 067). */
export async function hasJobVisibilityCollegeStatus() {
  return hasColumn('job_posting_visibility', 'college_status');
}

/** SQL fragment inside visibility EXISTS — empty when column missing (legacy behaviour). */
export async function jobVisibilityCollegeApprovedSql() {
  if (await hasJobVisibilityCollegeStatus()) {
    return "AND jpv.college_status = 'approved'";
  }
  return '';
}

/** program_applications soft-delete filter — noop when is_deleted column missing. */
export async function programApplicationNotDeletedSql(alias = 'pa') {
  if (await hasColumn('program_applications', 'is_deleted')) {
    return `AND COALESCE(${alias}.is_deleted, false) = false`;
  }
  return '';
}

/** job_postings soft-delete filter. */
export async function jobPostingNotDeletedSql(alias = 'jp') {
  if (await hasColumn('job_postings', 'is_deleted')) {
    return `AND COALESCE(${alias}.is_deleted, false) = false`;
  }
  return '';
}

/** offers soft-delete filter for placement lock queries. */
export async function offerNotDeletedSql(alias = 'o') {
  if (await hasColumn('offers', 'is_deleted')) {
    return `AND COALESCE(${alias}.is_deleted, false) = false`;
  }
  return '';
}

/** applications soft-delete filter — noop when column missing. */
export async function applicationNotDeletedSql(alias = 'a') {
  if (await hasColumn('applications', 'is_deleted')) {
    return `AND COALESCE(${alias}.is_deleted, false) = false`;
  }
  return '';
}

/** placement_drives soft-delete filter — noop when column missing. */
export async function placementDriveNotDeletedSql(alias = 'd') {
  if (await hasColumn('placement_drives', 'is_deleted')) {
    return `AND COALESCE(${alias}.is_deleted, false) = false`;
  }
  return '';
}
