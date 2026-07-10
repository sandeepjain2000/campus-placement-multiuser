import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function __platform_POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const fileUrl = String(body.file_url || '').trim();
    if (!fileUrl) {
      return NextResponse.json({ error: 'file_url is required' }, { status: 400 });
    }

    await query(
      `UPDATE employer_profiles
       SET logo_url = $1, updated_at = NOW()
       WHERE user_id = $2`,
      [fileUrl, session.user.id]
    );
    return NextResponse.json({ success: true, logo_url: fileUrl });
  } catch (e) {
    console.error('POST /api/employer/profile/logo/complete', e);
    return NextResponse.json({ error: 'Failed to save logo' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_employer_profile_logo_complete' });
export const POST = __platformApiHandlers.POST;
