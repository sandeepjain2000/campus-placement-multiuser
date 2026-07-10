import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { AND_EAU_NOT_DELETED } from '@/lib/softDeleteSql';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function getEmployerId(session) {
  const userId = session?.user?.id;
  if (!userId) return null;
  const res = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  return res.rows[0]?.id || null;
}

async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const employerId = await getEmployerId(session);
    if (!employerId) return NextResponse.json({ uploads: [] });

    const url = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '20', 10)));
    const uploads = await query(
      `SELECT eau.id, eau.tenant_id, eau.drive_id, eau.job_id, eau.original_file_name,
              eau.total_rows, eau.accepted_rows, eau.rejected_rows, eau.created_at,
              jp.job_type,
              CASE
                WHEN eau.drive_id IS NOT NULL THEN 'drive'
                WHEN jp.job_type = 'internship' THEN 'internship'
                WHEN jp.job_type IN ('short_project', 'hackathon') THEN 'projects'
                ELSE 'jobs'
              END AS opportunity_kind
       FROM employer_assessment_uploads eau
       LEFT JOIN job_postings jp ON jp.id = eau.job_id AND COALESCE(jp.is_deleted, false) = false
       WHERE eau.employer_id = $1::uuid ${AND_EAU_NOT_DELETED}
       ORDER BY eau.created_at DESC
       LIMIT $2`,
      [employerId, limit],
    );
    return NextResponse.json({ uploads: uploads.rows });
  } catch (error) {
    console.error('GET /api/employer/assessments failed:', error);
    return NextResponse.json({ error: 'Failed to load assessment uploads' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_employer_assessments' });
export const GET = __platformApiHandlers.GET;
