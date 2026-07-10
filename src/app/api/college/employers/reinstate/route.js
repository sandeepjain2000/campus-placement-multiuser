import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { reinstateEmployerTieUp } from '@/lib/employerTieUp';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

/** POST — restore a revoked tie-up (college admin). No data deletion; reverses soft flags only. */
async function __platform_POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenant_id, id: user_id } = session.user;
    const body = await req.json();
    const employer_id = body?.employer_id;

    if (!employer_id) {
      return NextResponse.json({ error: 'Missing employer_id' }, { status: 400 });
    }

    const result = await reinstateEmployerTieUp({
      tenantId: tenant_id,
      employerId: employer_id,
      reinstatedByUserId: user_id,
      notify: true,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({
      success: true,
      message:
        'Tie-up restored. Employer access and student applications for this partnership can resume.',
      result: result.row,
    });
  } catch (error) {
    console.error('Reinstate tie-up error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_college_employers_reinstate' });
export const POST = __platformApiHandlers.POST;
