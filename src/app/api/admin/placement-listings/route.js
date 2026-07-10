import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import {
  CAMPUS_DISPLAY_NAME_SQL,
  mapDriveRow,
  mapJobPostingRow,
  matchesListingTab,
} from '@/lib/adminPlacementListings';
import { jobPostingNotDeletedSql, programApplicationNotDeletedSql, hasColumn } from '@/lib/migrationReady';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

async function driveNotDeletedSql(alias = 'pd') {
  if (await hasColumn('placement_drives', 'is_deleted')) {
    return `AND COALESCE(${alias}.is_deleted, false) = false`;
  }
  return '';
}

/**
 * GET — all job postings and placement drives across employers and colleges.
 * Query: kind = all | job | internship | drive | project | hackathon
 */
async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const kind = String(searchParams.get('kind') || 'all').trim().toLowerCase();
    const tab = kind === 'all' ? '' : kind;

    const jpNotDeleted = await jobPostingNotDeletedSql('jp');
    const paNotDeleted = await programApplicationNotDeletedSql('pa');
    const pdNotDeleted = await driveNotDeletedSql('pd');

    const [postings, drives] = await Promise.all([
      query(
        `SELECT
           jp.id,
           jp.title,
           jp.job_type,
           jp.status,
           jp.salary_min,
           jp.salary_max,
           jp.vacancies,
           jp.application_deadline,
           jp.created_at,
           ep.id AS employer_id,
           ep.company_name,
           COALESCE(
             (SELECT string_agg(DISTINCT ${CAMPUS_DISPLAY_NAME_SQL}, '; ' ORDER BY ${CAMPUS_DISPLAY_NAME_SQL})
              FROM job_posting_visibility jpv
              JOIN tenants t ON t.id = jpv.tenant_id
              WHERE jpv.job_id = jp.id),
             ''
           ) AS campus_names,
           (SELECT COUNT(DISTINCT jpv.tenant_id)::int
            FROM job_posting_visibility jpv
            WHERE jpv.job_id = jp.id) AS campus_count,
           (SELECT COUNT(*)::int
            FROM program_applications pa
            WHERE pa.job_id = jp.id ${paNotDeleted}) AS application_count
         FROM job_postings jp
         INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
         WHERE 1=1 ${jpNotDeleted}
         ORDER BY jp.created_at DESC
         LIMIT 1000`,
      ),
      query(
        `SELECT
           pd.id,
           pd.title,
           pd.status,
           pd.drive_type,
           pd.drive_date,
           pd.max_students,
           pd.registered_count,
           pd.created_at,
           ep.id AS employer_id,
           ep.company_name,
           t.id AS college_id,
           t.name AS college_name
         FROM placement_drives pd
         INNER JOIN employer_profiles ep ON ep.id = pd.employer_id
         LEFT JOIN tenants t ON t.id = pd.tenant_id
         WHERE 1=1 ${pdNotDeleted}
         ORDER BY pd.created_at DESC
         LIMIT 1000`,
      ),
    ]);

    const postingItems = postings.rows.map(mapJobPostingRow);
    const driveItems = drives.rows.map(mapDriveRow);
    let items = [...postingItems, ...driveItems].sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
      return tb - ta;
    });

    if (tab) {
      items = items.filter((row) => matchesListingTab(row, tab));
    }

    const counts = {
      all: postingItems.length + driveItems.length,
      job: postingItems.filter((r) => r.category === 'job').length,
      internship: postingItems.filter((r) => r.category === 'internship').length,
      project: postingItems.filter((r) => r.category === 'project').length,
      hackathon: postingItems.filter((r) => r.category === 'hackathon').length,
      drive: driveItems.length,
      other: postingItems.filter((r) => r.category === 'other').length,
    };

    return NextResponse.json({ items, counts, kind: kind || 'all' });
  } catch (e) {
    console.error('GET /api/admin/placement-listings', e);
    return NextResponse.json({ error: 'Failed to load placement listings' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_admin_placement_listings' });
export const GET = __platformApiHandlers.GET;
