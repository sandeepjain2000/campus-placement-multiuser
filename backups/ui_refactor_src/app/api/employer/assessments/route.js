import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

async function getEmployerId(session) {
  const userId = session?.user?.id;
  if (!userId) return null;
  const res = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  return res.rows[0]?.id || null;
}

export async function GET(request) {
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
      `SELECT id, tenant_id, drive_id, job_id, original_file_name, total_rows, accepted_rows, rejected_rows, created_at
       FROM employer_assessment_uploads
       WHERE employer_id = $1::uuid
       ORDER BY created_at DESC
       LIMIT $2`,
      [employerId, limit],
    );
    return NextResponse.json({ uploads: uploads.rows });
  } catch (error) {
    console.error('GET /api/employer/assessments failed:', error);
    return NextResponse.json({ error: 'Failed to load assessment uploads' }, { status: 500 });
  }
}
