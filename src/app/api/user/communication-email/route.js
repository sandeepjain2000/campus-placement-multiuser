import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { validateEmail } from '@/lib/validators';

/**
 * Login email (`users.email`) is immutable here. Communication email is used for notifications,
 * exports, and template placeholders where applicable.
 */
async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const r = await query(
      `SELECT email, COALESCE(NULLIF(TRIM(communication_email), ''), email) AS communication_email
       FROM users WHERE id = $1::uuid`,
      [session.user.id],
    );
    const row = r.rows[0];
    if (!row) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      loginEmail: row.email,
      communicationEmail: row.communication_email,
    });
  } catch (e) {
    console.error('GET /api/user/communication-email', e);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}

async function __platform_PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const raw = String(body.communicationEmail ?? body.communication_email ?? '').trim().toLowerCase();
    if (!raw || !validateEmail(raw)) {
      return NextResponse.json({ error: 'Valid communication email is required' }, { status: 400 });
    }

    const r = await query(
      `UPDATE users
       SET communication_email = $1, updated_at = NOW()
       WHERE id = $2::uuid
       RETURNING email, communication_email`,
      [raw, session.user.id],
    );
    if (!r.rows[0]) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      loginEmail: r.rows[0].email,
      communicationEmail: r.rows[0].communication_email,
    });
  } catch (e) {
    console.error('PATCH /api/user/communication-email', e);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  PATCH: __platform_PATCH,
}, { context: 'api_user_communication_email' });
export const GET = __platformApiHandlers.GET;
export const PATCH = __platformApiHandlers.PATCH;
