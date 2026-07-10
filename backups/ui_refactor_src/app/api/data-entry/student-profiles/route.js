import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireDataEntrySession, resolveDataEntryTenantId } from '@/lib/dataEntryAccess';

const ALLOWED_STATUS = new Set(['unplaced', 'placed', 'opted_out', 'higher_studies']);

function tenantFromRequest(gateSession, request, body) {
  if (body && typeof body === 'object' && 'tenantId' in body) {
    return resolveDataEntryTenantId(gateSession, body.tenantId);
  }
  return resolveDataEntryTenantId(gateSession, request.nextUrl.searchParams.get('tenantId'));
}

export async function GET(request) {
  try {
    const gate = await requireDataEntrySession();
    if (!gate.ok) return gate.response;

    const tenantId = resolveDataEntryTenantId(gate.session, request.nextUrl.searchParams.get('tenantId'));
    if (!tenantId) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });

    const result = await query(
      `SELECT sp.id, sp.user_id, sp.department, sp.cgpa, sp.placement_status, sp.batch_year, sp.graduation_year, sp.is_verified,
              u.email, u.first_name, u.last_name
       FROM student_profiles sp
       LEFT JOIN users u ON u.id = sp.user_id
       WHERE sp.tenant_id = $1
       ORDER BY sp.created_at DESC
       LIMIT 300`,
      [tenantId]
    );
    return NextResponse.json({ studentProfiles: result.rows });
  } catch (error) {
    console.error('Failed to load student profiles:', error);
    return NextResponse.json({ error: 'Failed to load student profiles' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const gate = await requireDataEntrySession();
    if (!gate.ok) return gate.response;

    const body = await request.json();
    const tenantId = tenantFromRequest(gate.session, request, body);

    const userId = String(body?.userId || '').trim();
    const department = String(body?.department || '').trim();
    const cgpa = Number(body?.cgpa || 0);
    const placementStatus = String(body?.placementStatus || 'unplaced').trim();
    const batchYear = body?.batchYear ? Number(body.batchYear) : null;
    const graduationYear = body?.graduationYear ? Number(body.graduationYear) : null;
    const isVerified = Boolean(body?.isVerified);

    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenant context' }, { status: 400 });
    }
    if (!userId || !department) {
      return NextResponse.json({ error: 'userId and department are required' }, { status: 400 });
    }
    if (!ALLOWED_STATUS.has(placementStatus)) {
      return NextResponse.json({ error: 'Invalid placement status' }, { status: 400 });
    }

    const userOk = await query(`SELECT 1 FROM users WHERE id = $1::uuid AND tenant_id = $2::uuid LIMIT 1`, [
      userId,
      tenantId,
    ]);
    if (!userOk.rows.length) {
      return NextResponse.json({ error: 'User not found in this tenant' }, { status: 400 });
    }

    const created = await query(
      `INSERT INTO student_profiles (
        user_id, tenant_id, department, cgpa, placement_status, batch_year, graduation_year, is_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, user_id, tenant_id, department, cgpa, placement_status`,
      [
        userId,
        tenantId,
        department,
        Number.isFinite(cgpa) ? cgpa : 0,
        placementStatus,
        Number.isFinite(batchYear) ? batchYear : null,
        Number.isFinite(graduationYear) ? graduationYear : null,
        isVerified,
      ]
    );

    return NextResponse.json({ studentProfile: created.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Failed to create student profile from data-entry:', error);
    return NextResponse.json({ error: 'Failed to create student profile' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const gate = await requireDataEntrySession();
    if (!gate.ok) return gate.response;

    const body = await request.json();
    const tenantId = tenantFromRequest(gate.session, request, body);
    if (!tenantId) return NextResponse.json({ error: 'No tenant available for update' }, { status: 400 });

    const id = String(body?.id || '').trim();
    const department = String(body?.department || '').trim();
    const placementStatus = String(body?.placementStatus || 'unplaced').trim();
    const cgpa = Number(body?.cgpa || 0);
    const batchYear = body?.batchYear ? Number(body.batchYear) : null;
    const graduationYear = body?.graduationYear ? Number(body.graduationYear) : null;
    const isVerified = Boolean(body?.isVerified);
    if (!id || !department || !ALLOWED_STATUS.has(placementStatus)) {
      return NextResponse.json({ error: 'id, department and valid placementStatus are required' }, { status: 400 });
    }
    const updated = await query(
      `UPDATE student_profiles
       SET department = $1, cgpa = $2, placement_status = $3, batch_year = $4, graduation_year = $5, is_verified = $6, updated_at = NOW()
       WHERE id = $7 AND tenant_id = $8
       RETURNING id, user_id, tenant_id, department, cgpa, placement_status`,
      [department, Number.isFinite(cgpa) ? cgpa : 0, placementStatus, batchYear, graduationYear, isVerified, id, tenantId]
    );
    if (!updated.rows[0]) return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    return NextResponse.json({ studentProfile: updated.rows[0] });
  } catch (error) {
    console.error('Failed to update student profile:', error);
    return NextResponse.json({ error: 'Failed to update student profile' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const gate = await requireDataEntrySession();
    if (!gate.ok) return gate.response;

    const body = await request.json();
    const tenantId = tenantFromRequest(gate.session, request, body);
    if (!tenantId) return NextResponse.json({ error: 'No tenant available for delete' }, { status: 400 });

    const id = String(body?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const del = await query(
      `DELETE FROM student_profiles WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [id, tenantId]
    );
    if (!del.rows?.length) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete student profile:', error);
    return NextResponse.json({ error: 'Failed to delete student profile' }, { status: 500 });
  }
}
