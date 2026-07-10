import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import {
  notifyCollegeEnrollmentKey,
  notifyRegistrationResolved,
} from '@/lib/registrationNotify';
import { newEmailVerificationToken, sendSignupVerificationEmail } from '@/lib/emailVerification';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;


async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      `SELECT
         u.id,
         u.email,
         u.first_name,
         u.last_name,
         u.role,
         u.created_at,
         u.tenant_id,
         u.email_verified_at,
         t.name AS tenant_name,
         ep.company_name
       FROM users u
       LEFT JOIN tenants t ON t.id = u.tenant_id
       LEFT JOIN employer_profiles ep ON ep.user_id = u.id
       WHERE u.role IN ('college_admin', 'employer')
         AND u.is_active = false
         AND u.registration_rejected_at IS NULL
       ORDER BY u.created_at ASC`
    );

    return NextResponse.json({
      pending: result.rows.map((r) => ({
        id: r.id,
        email: r.email,
        firstName: r.first_name,
        lastName: r.last_name || '',
        role: r.role,
        createdAt: r.created_at,
        tenantId: r.tenant_id,
        tenantName: r.tenant_name,
        companyName: r.company_name,
        emailVerified: Boolean(r.email_verified_at),
        label:
          r.role === 'college_admin'
            ? r.tenant_name || 'College'
            : r.company_name || 'Employer',
      })),
    });
  } catch (e) {
    console.error('GET /api/admin/pending-registrations', e);
    return NextResponse.json({ error: 'Failed to load pending registrations' }, { status: 500 });
  }
}

async function __platform_POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const userId = body.userId;
    const action = body.action;
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    if (!userId || !['approve', 'reject', 'resend_verification'].includes(action)) {
      return NextResponse.json({ error: 'userId and action (approve|reject|resend_verification) required' }, { status: 400 });
    }

    const row = await query(
      `SELECT u.id, u.email, u.first_name, u.role, u.tenant_id, u.email_verified_at
       FROM users u
       WHERE u.id = $1::uuid
         AND u.role IN ('college_admin', 'employer')
         AND u.is_active = false
         AND u.registration_rejected_at IS NULL`,
      [userId]
    );

    if (!row.rows.length) {
      return NextResponse.json({ error: 'No pending registration found for this user' }, { status: 404 });
    }

    const u = row.rows[0];

    if (action === 'resend_verification') {
      if (u.email_verified_at) {
        return NextResponse.json({ error: 'This user has already verified their email.' }, { status: 400 });
      }

      const verifyToken = newEmailVerificationToken();
      const verifyExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);

      await query(
        `UPDATE users
         SET email_verification_token = $2,
             email_verification_expires_at = $3,
             updated_at = NOW()
         WHERE id = $1::uuid`,
        [userId, verifyToken, verifyExpires]
      );

      try {
        await sendSignupVerificationEmail({
          to: u.email,
          firstName: u.first_name,
          token: verifyToken,
          role: u.role,
        });
      } catch (mailErr) {
        console.error('Failed to resend verification email:', mailErr);
        return NextResponse.json({ error: 'Verification token generated, but failed to send email. Check SMTP configuration.' }, { status: 500 });
      }

      return NextResponse.json({ ok: true, message: 'Verification email resent successfully.' });
    }

    if (action === 'approve') {
      if (!u.email_verified_at) {
        return NextResponse.json(
          { error: 'This registrant has not verified their email yet. They must click the verification link in their inbox before you can approve.' },
          { status: 400 }
        );
      }
    }

    if (action === 'reject') {
      await query(
        `UPDATE users
         SET registration_rejected_at = NOW(),
             registration_rejection_note = $2,
             updated_at = NOW()
         WHERE id = $1::uuid`,
        [userId, reason || null]
      );
      await notifyRegistrationResolved({
        email: u.email,
        firstName: u.first_name,
        approved: false,
        reason: reason || undefined,
        role: u.role,
      });
      return NextResponse.json({ ok: true });
    }

    await query(
      `UPDATE users
       SET is_active = true,
           registration_rejected_at = NULL,
           registration_rejection_note = NULL,
           updated_at = NOW()
       WHERE id = $1::uuid`,
      [userId]
    );

    await notifyRegistrationResolved({
      email: u.email,
      firstName: u.first_name,
      approved: true,
      role: u.role,
    });

    if (u.role === 'college_admin' && u.tenant_id) {
      const t = await query(`SELECT name FROM tenants WHERE id = $1::uuid`, [u.tenant_id]);
      const s = await query(
        `SELECT surface_token FROM shard_binding_pairs WHERE ref_scope_id = $1::uuid`,
        [u.tenant_id]
      );
      const collegeName = t.rows[0]?.name || '';
      const surfaceToken = s.rows[0]?.surface_token;
      if (surfaceToken) {
        await notifyCollegeEnrollmentKey({
          collegeAdminEmail: u.email,
          firstName: u.first_name,
          collegeName,
          surfaceToken,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST /api/admin/pending-registrations', e);
    return NextResponse.json({ error: 'Failed to update registration' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
}, { context: 'api_admin_pending_registrations' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
