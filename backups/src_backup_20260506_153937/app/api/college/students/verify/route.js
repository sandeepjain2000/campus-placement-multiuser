import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query, transaction } from '@/lib/db';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenant_id ?? session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const body = await request.json();
    const studentProfileId = body.studentProfileId;
    const approve = body.approve === true;

    if (!studentProfileId) {
      return NextResponse.json({ error: 'studentProfileId required' }, { status: 400 });
    }

    const check = await query(
      `SELECT sp.id, sp.user_id
       FROM student_profiles sp
       WHERE sp.id = $1::uuid AND sp.tenant_id = $2::uuid`,
      [studentProfileId, tenantId]
    );

    if (!check.rows.length) {
      return NextResponse.json({ error: 'Student not found for this campus' }, { status: 404 });
    }

    const { user_id: userId } = check.rows[0];

    await transaction(async (client) => {
      await client.query(
        `UPDATE student_profiles
         SET is_verified = $2,
             verified_by = CASE WHEN $2 THEN $3::uuid ELSE NULL END,
             verified_at = CASE WHEN $2 THEN NOW() ELSE NULL END,
             updated_at = NOW()
         WHERE id = $1::uuid`,
        [studentProfileId, approve, session.user.id]
      );
      await client.query(
        `UPDATE users SET is_verified = $2, updated_at = NOW() WHERE id = $1::uuid`,
        [userId, approve]
      );
    });

    return NextResponse.json({ ok: true, verified: approve });
  } catch (e) {
    console.error('POST /api/college/students/verify', e);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}
