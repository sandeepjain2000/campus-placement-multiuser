import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { query } from '@/lib/db';
import { requireDataEntrySession, resolveDataEntryTenantId } from '@/lib/dataEntryAccess';

const ALLOWED_ROLES = new Set(['student', 'college_admin', 'employer']);

export async function GET(request) {
  try {
    const gate = await requireDataEntrySession();
    if (!gate.ok) return gate.response;

    const role = request.nextUrl.searchParams.get('role');
    const tenantId = resolveDataEntryTenantId(gate.session, request.nextUrl.searchParams.get('tenantId'));
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    const whereRole = role && ALLOWED_ROLES.has(role) ? 'AND role = $2' : '';
    const params = whereRole ? [tenantId, role] : [tenantId];
    const users = await query(
      `SELECT id, email, role, first_name, last_name, is_verified, is_active, created_at
       FROM users
       WHERE tenant_id = $1 ${whereRole}
       ORDER BY created_at DESC
       LIMIT 300`,
      params
    );
    return NextResponse.json({ users: users.rows });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const gate = await requireDataEntrySession();
    if (!gate.ok) return gate.response;

    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const firstName = String(body?.firstName || '').trim();
    const lastName = String(body?.lastName || '').trim();
    const password = String(body?.password || '').trim();
    const role = String(body?.role || 'student').trim();
    const isVerified = Boolean(body?.isVerified);
    const tenantId = resolveDataEntryTenantId(gate.session, body?.tenantId);

    if (!tenantId) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    if (!email || !firstName || !password) {
      return NextResponse.json({ error: 'email, firstName, and password are required' }, { status: 400 });
    }
    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: 'Unsupported role for this form' }, { status: 400 });
    }

    const passwordHash = await hash(password, 10);

    const created = await query(
      `INSERT INTO users (
        tenant_id, email, password_hash, role, first_name, last_name, is_verified, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING id, email, role, first_name, last_name, is_verified`,
      [tenantId, email, passwordHash, role, firstName, lastName || null, isVerified]
    );

    return NextResponse.json({ user: created.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Failed to create user from data-entry:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const gate = await requireDataEntrySession();
    if (!gate.ok) return gate.response;

    const body = await request.json();
    const tenantId = resolveDataEntryTenantId(gate.session, body?.tenantId);
    if (!tenantId) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });

    const id = String(body?.id || '').trim();
    const firstName = String(body?.firstName || '').trim();
    const lastName = String(body?.lastName || '').trim();
    const role = String(body?.role || '').trim();
    const isVerified = Boolean(body?.isVerified);
    const isActive = body?.isActive === false ? false : true;
    if (!id || !firstName || !ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: 'id, firstName, and valid role are required' }, { status: 400 });
    }
    const updated = await query(
      `UPDATE users
       SET first_name = $1, last_name = $2, role = $3, is_verified = $4, is_active = $5, updated_at = NOW()
       WHERE id = $6 AND tenant_id = $7
       RETURNING id, email, role, first_name, last_name, is_verified, is_active`,
      [firstName, lastName || null, role, isVerified, isActive, id, tenantId]
    );
    if (!updated.rows[0]) return NextResponse.json({ error: 'User not found in your tenant' }, { status: 404 });
    return NextResponse.json({ user: updated.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const gate = await requireDataEntrySession();
    if (!gate.ok) return gate.response;

    const body = await request.json();
    const tenantId = resolveDataEntryTenantId(gate.session, body?.tenantId);
    if (!tenantId) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    const id = String(body?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const del = await query(
      `DELETE FROM users WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [id, tenantId]
    );
    if (!del.rows?.length) {
      return NextResponse.json({ error: 'User not found in your tenant' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
