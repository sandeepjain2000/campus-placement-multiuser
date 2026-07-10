import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { isUuid } from '@/lib/tenantContext';
import { AND_EAU_NOT_DELETED } from '@/lib/softDeleteSql';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function getEmployerProfileId(session) {
  const userId = session?.user?.id;
  if (!userId) return null;
  const res = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  return res.rows[0]?.id || null;
}

/** GET — activity / audit entries for one upload (employer must own it). */
async function __platform_GET(_request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { uploadId } = await params;
    if (!uploadId || !isUuid(uploadId)) {
      return NextResponse.json({ error: 'Invalid upload id' }, { status: 400 });
    }
    const employerId = await getEmployerProfileId(session);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const own = await query(
      `SELECT id FROM employer_assessment_uploads eau WHERE eau.id = $1::uuid AND eau.employer_id = $2::uuid ${AND_EAU_NOT_DELETED} LIMIT 1`,
      [uploadId, employerId],
    );
    if (!own.rows.length) return NextResponse.json({ error: 'Upload not found' }, { status: 404 });

    const res = await query(
      `SELECT
         l.id,
         l.upload_id,
         l.row_id,
         l.action,
         l.summary,
         l.details,
         l.created_at,
         TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS actor_name,
         u.email AS actor_email
       FROM employer_assessment_change_log l
       LEFT JOIN users u ON u.id = l.actor_user_id
       WHERE l.upload_id = $1::uuid
       ORDER BY l.created_at DESC
       LIMIT 200`,
      [uploadId],
    );

    return NextResponse.json({ entries: res.rows });
  } catch (e) {
    console.error('GET /api/employer/assessments/[uploadId]/audit', e);
    return NextResponse.json({ error: 'Failed to load audit log' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_employer_assessments_id_audit' });
export const GET = __platformApiHandlers.GET;
