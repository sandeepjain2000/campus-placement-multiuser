import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { resolveCollegeAdminTenantId } from '@/lib/sessionTenant';
import { isArchiveSchemaError, ARCHIVE_COLUMN_HINT } from '@/lib/collegeStudentArchive';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { AND_JP_NOT_DELETED, AND_PA_NOT_DELETED } from '@/lib/softDeleteSql';
import { formatStudentSystemId } from '@/lib/studentSystemId';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

const RESULTS_SQL = `
  SELECT
    pa.id,
    pa.status,
    pa.applied_at,
    pa.notes,
    sp.id AS student_profile_id,
    sp.roll_number,
    sp.branch,
    sp.department,
    sp.cgpa,
    sp.batch_year,
    u.first_name,
    u.last_name,
    u.email,
    t.short_code,
    jp.id AS job_id,
    jp.title AS opening_title,
    ep.id AS employer_id,
    ep.company_name,
    ep.website
  FROM program_applications pa
  INNER JOIN student_profiles sp ON sp.id = pa.student_id AND sp.tenant_id = $1::uuid
  INNER JOIN job_postings jp ON jp.id = pa.job_id AND jp.job_type = 'internship'
  INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
  INNER JOIN job_posting_visibility jpv ON jpv.job_id = jp.id AND jpv.tenant_id = $1::uuid
  LEFT JOIN users u ON u.id = sp.user_id
  LEFT JOIN tenants t ON t.id = sp.tenant_id
  WHERE __ACTIVE_STUDENT__
    ${AND_PA_NOT_DELETED}
    ${AND_JP_NOT_DELETED}
  ORDER BY pa.applied_at DESC NULLS LAST
  LIMIT 2000`;

function sqlWithActiveClause(includeArchivedFilter) {
  const active = includeArchivedFilter ? SP_ACTIVE_CLAUSE : 'TRUE';
  return RESULTS_SQL.replace('__ACTIVE_STUDENT__', active);
}

/** @param {import('pg').QueryResultRow} row */
function mapRow(row) {
  const first = row.first_name || '';
  const last = row.last_name || '';
  return {
    id: row.id,
    studentProfileId: row.student_profile_id,
    studentName: `${first} ${last}`.trim() || row.email || 'Student',
    rollNumber: row.roll_number || '',
    systemId: formatStudentSystemId(row.short_code, row.roll_number),
    branch: row.branch || row.department || '—',
    cgpa: row.cgpa != null ? Number(row.cgpa) : null,
    batchYear: row.batch_year != null ? Number(row.batch_year) : null,
    companyId: row.employer_id,
    companyName: row.company_name || '—',
    website: row.website || null,
    jobId: row.job_id,
    openingTitle: row.opening_title || '—',
    status: row.status || 'applied',
    appliedAt: row.applied_at,
    notes: row.notes || null,
  };
}

function buildCounts(results) {
  const selected = results.filter((r) => r.status === 'selected').length;
  const shortlisted = results.filter((r) => r.status === 'shortlisted').length;
  const rejected = results.filter((r) => r.status === 'rejected').length;
  const withdrawn = results.filter((r) => r.status === 'withdrawn').length;
  const pending = results.filter((r) =>
    ['applied', 'in_progress', 'on_hold'].includes(String(r.status || '').toLowerCase()),
  ).length;
  return {
    total: results.length,
    selected,
    shortlisted,
    rejected,
    withdrawn,
    pending,
  };
}

function buildFilterOptions(results) {
  const companies = new Map();
  const internships = new Map();
  const statuses = new Set();
  const branches = new Set();
  const batchYears = new Set();

  for (const row of results) {
    if (row.companyId && row.companyName) {
      companies.set(String(row.companyId), row.companyName);
    }
    if (row.jobId && row.openingTitle) {
      internships.set(String(row.jobId), {
        id: row.jobId,
        title: row.openingTitle,
        companyId: row.companyId,
        companyName: row.companyName,
      });
    }
    if (row.status) statuses.add(row.status);
    if (row.branch && row.branch !== '—') branches.add(row.branch);
    if (row.batchYear) batchYears.add(row.batchYear);
  }

  return {
    companies: [...companies.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    internships: [...internships.values()].sort((a, b) =>
      `${a.companyName} ${a.title}`.localeCompare(`${b.companyName} ${b.title}`),
    ),
    statuses: [...statuses].sort(),
    branches: [...branches].sort((a, b) => a.localeCompare(b)),
    batchYears: [...batchYears].sort((a, b) => b - a),
  };
}

async function loadResults(tenantId, includeArchivedFilter) {
  const res = await query(sqlWithActiveClause(includeArchivedFilter), [tenantId]);
  const results = res.rows.map(mapRow);
  return {
    results,
    counts: buildCounts(results),
    filters: buildFilterOptions(results),
  };
}

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    const sessionTenant = session.user.tenantId || session.user.tenant_id;
    const tenantId = (await resolveCollegeAdminTenantId(userId, sessionTenant)) || sessionTenant;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    try {
      const payload = await loadResults(tenantId, true);
      return NextResponse.json(payload);
    } catch (error) {
      if (isArchiveSchemaError(error)) {
        const payload = await loadResults(tenantId, false);
        return NextResponse.json({ ...payload, schemaWarning: ARCHIVE_COLUMN_HINT });
      }
      throw error;
    }
  } catch (error) {
    console.error('GET /api/college/internship-results', error);
    const msg = String(error?.message || '');
    if (error?.code === '42P01' && msg.includes('program_applications')) {
      return NextResponse.json(
        { error: 'Program applications table missing. Run database migrations.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Failed to load internship results' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_college_internship_results' });
export const GET = __platformApiHandlers.GET;
