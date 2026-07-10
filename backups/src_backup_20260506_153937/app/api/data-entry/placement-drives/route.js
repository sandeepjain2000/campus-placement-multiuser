import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireDataEntrySession, resolveDataEntryTenantId } from '@/lib/dataEntryAccess';

const ALLOWED_STATUS = new Set(['requested', 'approved', 'scheduled', 'in_progress', 'completed', 'cancelled']);

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
      `SELECT id, title, description, status, drive_date, venue, max_students, employer_id, tenant_id
       FROM placement_drives
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT 300`,
      [tenantId]
    );
    return NextResponse.json({ placementDrives: result.rows });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load placement drives' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const gate = await requireDataEntrySession();
    if (!gate.ok) return gate.response;

    const body = await request.json();
    const tenantId = tenantFromRequest(gate.session, request, body);

    const title = String(body?.title || '').trim();
    const description = String(body?.description || '').trim();
    const status = String(body?.status || 'scheduled').trim();
    const driveDate = body?.driveDate || null;
    const venue = String(body?.venue || '').trim();
    const maxStudents = body?.maxStudents ? Number(body.maxStudents) : null;
    const employerId = String(body?.employerId || '').trim() || null;

    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenant context' }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    if (!ALLOWED_STATUS.has(status)) {
      return NextResponse.json({ error: 'Invalid drive status' }, { status: 400 });
    }

    const created = await query(
      `INSERT INTO placement_drives (
        tenant_id, employer_id, title, description, status, drive_date, venue, max_students
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, title, status, drive_date, tenant_id`,
      [
        tenantId,
        employerId,
        title,
        description || null,
        status,
        driveDate || null,
        venue || null,
        Number.isFinite(maxStudents) ? maxStudents : null,
      ]
    );

    return NextResponse.json({ placementDrive: created.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Failed to create placement drive from data-entry:', error);
    return NextResponse.json({ error: 'Failed to create placement drive' }, { status: 500 });
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
    const title = String(body?.title || '').trim();
    const description = String(body?.description || '').trim();
    const status = String(body?.status || 'scheduled').trim();
    const driveDate = body?.driveDate || null;
    const venue = String(body?.venue || '').trim();
    const maxStudents = body?.maxStudents ? Number(body.maxStudents) : null;
    const employerId = String(body?.employerId || '').trim() || null;
    if (!id || !title || !ALLOWED_STATUS.has(status)) {
      return NextResponse.json({ error: 'id, title and valid status are required' }, { status: 400 });
    }
    const updated = await query(
      `UPDATE placement_drives
       SET title = $1, description = $2, status = $3, drive_date = $4, venue = $5, max_students = $6, employer_id = $7, updated_at = NOW()
       WHERE id = $8 AND tenant_id = $9
       RETURNING id, title, status, drive_date, tenant_id`,
      [title, description || null, status, driveDate || null, venue || null, maxStudents, employerId, id, tenantId]
    );
    if (!updated.rows[0]) return NextResponse.json({ error: 'Placement drive not found' }, { status: 404 });
    return NextResponse.json({ placementDrive: updated.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update placement drive' }, { status: 500 });
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
      `DELETE FROM placement_drives WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [id, tenantId]
    );
    if (!del.rows?.length) {
      return NextResponse.json({ error: 'Placement drive not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete placement drive' }, { status: 500 });
  }
}
