import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { notifyStudentFormalOfferByOfferId } from '@/lib/studentFormalOfferNotify';
import { withApiHandlers } from '@/lib/platformErrorRoute';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getEmployerId(session) {
  const userId = session?.user?.id;
  if (!userId) return null;
  const r = await query(`SELECT id FROM employer_profiles WHERE user_id = $1 LIMIT 1`, [userId]);
  return r.rows[0]?.id || null;
}

async function __platform_POST(_request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const employerId = await getEmployerId(session);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const offerId = String(params?.id || '').trim();
    const own = await query(
      `SELECT id FROM offers WHERE id = $1::uuid AND employer_id = $2::uuid LIMIT 1`,
      [offerId, employerId],
    );
    if (!own.rows[0]) return NextResponse.json({ error: 'Offer not found' }, { status: 404 });

    const sent = await notifyStudentFormalOfferByOfferId(offerId, { force: true });
    if (!sent) {
      return NextResponse.json(
        { error: 'Offer email can only be resent for pending offers with a valid student contact.' },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true, message: 'Offer email sent again.' });
  } catch (error) {
    console.error('POST /api/employer/offers/[id]/resend', error);
    return NextResponse.json({ error: 'Failed to resend offer email' }, { status: 500 });
  }
}

const handlers = withApiHandlers({ POST: __platform_POST }, { context: 'api_employer_offers_resend' });
export const POST = handlers.POST;
