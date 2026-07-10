import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

function getTenantId(session) {
  return session?.user?.tenant_id ?? session?.user?.tenantId ?? null;
}

/** PATCH — save coordination POC staff (college_admin users) for an employer tie-up. */
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantId(session);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const { employerId } = await params;
    if (!employerId || typeof employerId !== 'string') {
      return NextResponse.json({ error: 'Employer id required' }, { status: 400 });
    }

    const body = await request.json();
    const rawIds = Array.isArray(body?.staffUserIds) ? body.staffUserIds : [];
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const staffUserIds = [...new Set(rawIds.map((id) => String(id).trim()).filter((id) => uuidRe.test(id)))];

    if (staffUserIds.length) {
      const check = await query(
        `SELECT id FROM users
         WHERE tenant_id = $1::uuid
           AND role = 'college_admin'
           AND is_active = true
           AND id = ANY($2::uuid[])`,
        [tenantId, staffUserIds],
      );
      if (check.rows.length !== staffUserIds.length) {
        return NextResponse.json({ error: 'One or more staff selections are invalid' }, { status: 400 });
      }
    }

    const updated =
      staffUserIds.length === 0
        ? await query(
            `UPDATE employer_approvals
             SET coordination_poc_user_ids = ARRAY[]::uuid[]
             WHERE tenant_id = $1::uuid
               AND employer_id = $2::uuid
               AND status = 'approved'
             RETURNING coordination_poc_user_ids`,
            [tenantId, employerId],
          )
        : await query(
            `UPDATE employer_approvals
             SET coordination_poc_user_ids = $1::uuid[]
             WHERE tenant_id = $2::uuid
               AND employer_id = $3::uuid
               AND status = 'approved'
             RETURNING coordination_poc_user_ids`,
            [staffUserIds, tenantId, employerId],
          );

    if (!updated.rows.length) {
      return NextResponse.json({ error: 'Approved employer tie-up not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      coordination_poc_user_ids: updated.rows[0].coordination_poc_user_ids || [],
    });
  } catch (error) {
    console.error('Failed to save employer POCs:', error);
    return NextResponse.json({ error: 'Failed to save POC assignment' }, { status: 500 });
  }
}
