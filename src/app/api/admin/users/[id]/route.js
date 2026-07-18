import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import {
  ADMIN_USER_ERRORS,
  ADMIN_USER_ROLES,
  mapAdminUserRow,
  validateAdminUserForm,
} from '@/lib/adminUserForm';
import { isUuid } from '@/lib/tenantContext';
import { withApiHandlers } from '@/lib/platformErrorRoute';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function jsonError(codeOrMessage, status) {
  const message =
    ADMIN_USER_ERRORS[codeOrMessage] ||
    (typeof codeOrMessage === 'string' && Object.values(ADMIN_USER_ERRORS).includes(codeOrMessage)
      ? codeOrMessage
      : ADMIN_USER_ERRORS.LOAD_FAILED);
  const code =
    Object.entries(ADMIN_USER_ERRORS).find(([, v]) => v === message)?.[0] || 'LOAD_FAILED';
  return NextResponse.json({ error: message, code }, { status });
}

async function __platform_GET(_request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'super_admin') {
      return jsonError('UNAUTHORIZED', 401);
    }

    const { id } = await params;
    const userId = String(id || '').trim();
    if (!isUuid(userId)) return jsonError('INVALID_ID', 400);

    const result = await query(
      `SELECT id, first_name, last_name, email, phone, role, is_active, is_verified, last_login, created_at
       FROM users
       WHERE id = $1::uuid
       LIMIT 1`,
      [userId],
    );
    const row = result.rows[0];
    if (!row) return jsonError('NOT_FOUND', 404);

    return NextResponse.json({ user: mapAdminUserRow(row) });
  } catch (error) {
    console.error('GET /api/admin/users/[id]', error);
    return jsonError('LOAD_FAILED', 500);
  }
}

async function __platform_PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'super_admin') {
      return jsonError('UNAUTHORIZED', 401);
    }

    const sessionUserId = String(session.user.id || session.user.sub || '').trim();
    const { id } = await params;
    const userId = String(id || '').trim();
    if (!isUuid(userId)) return jsonError('INVALID_ID', 400);

    const existing = await query(
      `SELECT id, first_name, last_name, email, phone, role, is_active, is_verified, last_login, created_at
       FROM users WHERE id = $1::uuid LIMIT 1`,
      [userId],
    );
    const row = existing.rows[0];
    if (!row) return jsonError('NOT_FOUND', 404);

    const body = await request.json().catch(() => ({}));
    const form = {
      firstName: body?.firstName ?? body?.first_name ?? row.first_name,
      lastName: body?.lastName ?? body?.last_name ?? row.last_name ?? '',
      phone: body?.phone !== undefined ? body.phone : row.phone ?? '',
      role: body?.role ?? row.role,
      active: body?.active !== undefined || body?.is_active !== undefined
        ? Boolean(body?.active ?? body?.is_active)
        : Boolean(row.is_active),
    };

    const check = validateAdminUserForm(form);
    if (!check.ok) return jsonError(check.error, 400);

    const isSelf = sessionUserId && sessionUserId === userId;
    if (isSelf && !form.active) {
      return jsonError('CANNOT_DEACTIVATE_SELF', 400);
    }
    if (isSelf && form.role !== row.role) {
      return jsonError('CANNOT_CHANGE_OWN_ROLE', 400);
    }
    if (!ADMIN_USER_ROLES.includes(form.role)) {
      return jsonError('INVALID_ROLE', 400);
    }

    const updated = await query(
      `UPDATE users
       SET first_name = $2,
           last_name = $3,
           phone = $4,
           role = $5,
           is_active = $6,
           updated_at = NOW()
       WHERE id = $1::uuid
       RETURNING id, first_name, last_name, email, phone, role, is_active, is_verified, last_login, created_at`,
      [
        userId,
        String(form.firstName).trim(),
        String(form.lastName || '').trim() || null,
        String(form.phone || '').trim() || null,
        form.role,
        form.active,
      ],
    );

    return NextResponse.json({
      success: true,
      user: mapAdminUserRow(updated.rows[0]),
    });
  } catch (error) {
    console.error('PATCH /api/admin/users/[id]', error);
    return jsonError('SAVE_FAILED', 500);
  }
}

const __platformApiHandlers = withApiHandlers(
  {
    GET: __platform_GET,
    PATCH: __platform_PATCH,
  },
  { context: 'api_admin_users_id' },
);
export const GET = __platformApiHandlers.GET;
export const PATCH = __platformApiHandlers.PATCH;
