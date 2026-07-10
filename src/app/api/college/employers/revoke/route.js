import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import {
  revokeEmployerTieUp,
  TIE_UP_REVOKE_CONFIRM_REQUIRED,
} from '@/lib/employerTieUp';
import { TIE_UP_REVOKE_ENABLED } from '@/lib/employerTieUpShared';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

async function __platform_POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!TIE_UP_REVOKE_ENABLED) {
      return NextResponse.json(
        { error: 'Tie-up cancellation is temporarily disabled.' },
        { status: 403 },
      );
    }

    const { role, tenant_id, id: user_id } = session.user;
    const body = await req.json();
    let { employer_id, target_tenant_id, reason, confirmed } = body;

    if (!confirmed) {
      return NextResponse.json(
        {
          error: 'Confirmation required',
          code: TIE_UP_REVOKE_CONFIRM_REQUIRED,
        },
        { status: 400 },
      );
    }

    if (role === 'college_admin') {
      if (!employer_id) {
        return NextResponse.json({ error: 'Missing employer_id' }, { status: 400 });
      }
      target_tenant_id = tenant_id;
    } else if (role === 'employer') {
      if (!target_tenant_id) {
        return NextResponse.json({ error: 'Missing target_tenant_id' }, { status: 400 });
      }
      const empQuery = await query(`SELECT id FROM employer_profiles WHERE user_id = $1`, [user_id]);
      if (empQuery.rowCount === 0) {
        return NextResponse.json({ error: 'Employer not found' }, { status: 404 });
      }
      employer_id = empQuery.rows[0].id;
    } else {
      return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
    }

    const result = await revokeEmployerTieUp({
      tenantId: target_tenant_id,
      employerId: employer_id,
      revokedByUserId: user_id,
      revokedByRole: role === 'college_admin' ? 'college_admin' : 'employer',
      reason: reason || null,
      notify: true,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({
      success: true,
      message:
        role === 'college_admin'
          ? 'Employer tie-up revoked. The employer has been notified. All partnership activity is on hold until restored.'
          : 'Campus tie-up revoked. The college has been notified. All partnership activity is on hold until restored.',
      result: result.row,
    });
  } catch (error) {
    console.error('Revoke API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_college_employers_revoke' });
export const POST = __platformApiHandlers.POST;
