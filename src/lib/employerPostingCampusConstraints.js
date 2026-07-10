/**
 * Employer settings: limit which approved colleges can receive each posting type.
 * Empty/missing category list = all approved tie-ups are eligible.
 */

export const POSTING_CAMPUS_CONSTRAINT_CATEGORIES = [
  {
    id: 'internship',
    label: 'Internships',
    description: 'Campuses that can receive internship postings and sync visibility.',
  },
  {
    id: 'projects',
    label: 'Projects & hackathons',
    description: 'Campuses for short projects and hackathon programs.',
  },
  {
    id: 'alumni_jobs',
    label: 'Alumni jobs',
    description: 'Campuses where experienced-hire (alumni) job postings may be published.',
  },
  {
    id: 'drives',
    label: 'Placement drives',
    description: 'Campuses where you may request on-campus placement drives.',
  },
];

const CATEGORY_IDS = new Set(POSTING_CAMPUS_CONSTRAINT_CATEGORIES.map((c) => c.id));

/** @param {string | null | undefined} jobType */
export function jobTypeToConstraintCategory(jobType) {
  const t = String(jobType || '').trim();
  if (t === 'internship') return 'internship';
  if (t === 'short_project' || t === 'hackathon') return 'projects';
  if (t === 'full_time' || t === 'contract' || t === 'ppo') return 'alumni_jobs';
  return null;
}

function uniqueTenantIds(ids) {
  return [...new Set((ids || []).map((id) => String(id).trim()).filter(Boolean))];
}

/** @param {unknown} raw */
export function normalizePostingCampusConstraints(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const out = {};
  for (const { id } of POSTING_CAMPUS_CONSTRAINT_CATEGORIES) {
    const list = Array.isArray(src[id]) ? uniqueTenantIds(src[id]) : [];
    out[id] = list;
  }
  return out;
}

/**
 * @param {Record<string, string[]> | null | undefined} constraints
 * @param {string} category
 * @returns {string[] | null} allowlist, or null when unrestricted
 */
export function getConstraintAllowlist(constraints, category) {
  if (!CATEGORY_IDS.has(category)) return null;
  const list = constraints?.[category];
  if (!Array.isArray(list) || list.length === 0) return null;
  return uniqueTenantIds(list);
}

/** @param {string[]} tenantIds @param {string[] | null} allowlist */
export function filterTenantIdsByConstraint(tenantIds, allowlist) {
  if (!allowlist?.length) return uniqueTenantIds(tenantIds);
  const allowed = new Set(allowlist);
  return uniqueTenantIds(tenantIds).filter((id) => allowed.has(id));
}

/**
 * @param {Array<{ id: string }>} campuses
 * @param {Record<string, string[]> | null | undefined} constraints
 * @param {string} category
 */
export function campusesEligibleForPosting(campuses, constraints, category) {
  const allowlist = getConstraintAllowlist(constraints, category);
  if (!allowlist) return campuses || [];
  const allowed = new Set(allowlist);
  return (campuses || []).filter((c) => allowed.has(String(c.id)));
}

/**
 * @param {Record<string, string[]>} constraints
 * @param {string} category
 * @param {string[]} tenantIds
 * @param {Set<string>} approvedTenantIds
 */
export function validateCategoryConstraintInput(constraints, category, tenantIds, approvedTenantIds) {
  if (!CATEGORY_IDS.has(category)) {
    return { ok: false, error: 'Invalid posting category.' };
  }
  const ids = uniqueTenantIds(tenantIds);
  const invalid = ids.filter((id) => !approvedTenantIds.has(id));
  if (invalid.length) {
    return {
      ok: false,
      error: 'One or more colleges are not in your approved partnerships.',
    };
  }
  return { ok: true, tenantIds: ids };
}

/**
 * @param {import('@/lib/db').query} queryFn
 * @param {string} employerId
 */
export async function loadEmployerPostingCampusConstraints(queryFn, employerId) {
  try {
    const res = await queryFn(
      `SELECT posting_campus_constraints FROM employer_profiles WHERE id = $1::uuid LIMIT 1`,
      [employerId],
    );
    return normalizePostingCampusConstraints(res.rows[0]?.posting_campus_constraints);
  } catch (err) {
    if (err?.code === '42703') return normalizePostingCampusConstraints({});
    throw err;
  }
}

/**
 * @param {import('pg').PoolClient | { query: Function }} client
 * @param {string} employerId
 * @param {string[]} tenantIds
 * @param {string | null | undefined} jobType
 */
export async function filterTenantIdsForJobPosting(client, employerId, tenantIds, jobType) {
  const category = jobTypeToConstraintCategory(jobType);
  if (!category) return uniqueTenantIds(tenantIds);
  const constraints = await loadEmployerPostingCampusConstraints(
    (sql, params) => client.query(sql, params),
    employerId,
  );
  const allowlist = getConstraintAllowlist(constraints, category);
  return filterTenantIdsByConstraint(tenantIds, allowlist);
}

/**
 * @param {import('pg').PoolClient | { query: Function }} client
 * @param {string} employerId
 * @param {string} tenantId
 * @param {string} category
 */
export async function assertTenantAllowedForPostingCategory(client, employerId, tenantId, category) {
  const constraints = await loadEmployerPostingCampusConstraints(
    (sql, params) => client.query(sql, params),
    employerId,
  );
  const allowlist = getConstraintAllowlist(constraints, category);
  if (!allowlist) return { ok: true };
  const id = String(tenantId || '').trim();
  if (!id || !allowlist.includes(id)) {
    return {
      ok: false,
      error:
        'This college is not enabled for that posting type in Employer settings. Update Campus posting limits or choose another campus.',
    };
  }
  return { ok: true };
}
