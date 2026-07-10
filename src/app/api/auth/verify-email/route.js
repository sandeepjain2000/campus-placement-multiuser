import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

function redirect(request, path) {
  const origin =
    process.env.NEXTAUTH_URL?.replace(/\/$/, '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}`.replace(/\/$/, '') : '') ||
    new URL(request.url).origin;
  return NextResponse.redirect(new URL(path, origin).toString(), 302);
}

async function __platform_GET(request) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token || String(token).length < 32) {
    return redirect(request, '/login?verify=invalid');
  }

  try {
    const found = await query(
      `SELECT id, role, email_verification_expires_at
       FROM users
       WHERE email_verification_token = $1`,
      [token.trim()]
    );
    if (!found.rows.length) {
      return redirect(request, '/login?verify=invalid');
    }
    const row = found.rows[0];
    const exp = row.email_verification_expires_at ? new Date(row.email_verification_expires_at) : null;
    if (exp && Number.isFinite(exp.getTime()) && exp.getTime() < Date.now()) {
      return redirect(request, '/login?verify=expired');
    }

    await query(
      `UPDATE users
       SET email_verified_at = NOW(),
           is_verified = true,
           email_verification_token = NULL,
           email_verification_expires_at = NULL,
           is_active = CASE WHEN role = 'student' THEN true ELSE is_active END,
           updated_at = NOW()
       WHERE id = $1::uuid`,
      [row.id]
    );

    return redirect(request, '/login?verify=success');
  } catch (e) {
    console.error('verify-email', e);
    return redirect(request, '/login?verify=error');
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_auth_verify_email' });
export const GET = __platformApiHandlers.GET;
