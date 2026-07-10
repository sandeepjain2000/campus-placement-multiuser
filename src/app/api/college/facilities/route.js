import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getSessionTenantId } from '@/lib/tenantContext';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function requireCollegeAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'college_admin') {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const tenantId = getSessionTenantId(session.user);
  if (!tenantId) {
    return { error: NextResponse.json({ error: 'No tenant' }, { status: 400 }) };
  }
  return { session, tenantId };
}

function mapRow(a) {
  return {
    id: a.id,
    name: a.name,
    capacity: a.capacity,
    type: a.facility_type || a.type || 'other',
    isAvailable: a.is_available !== false,
  };
}

async function __platform_GET() {
  try {
    const auth = await requireCollegeAdmin();
    if (auth.error) return auth.error;

    const r = await query(
      `SELECT id, name, capacity, facility_type, is_available
       FROM college_facilities
       WHERE tenant_id = $1::uuid
       ORDER BY name ASC`,
      [auth.tenantId],
    );

    return NextResponse.json({ facilities: r.rows.map(mapRow) });
  } catch (e) {
    console.error('GET /api/college/facilities', e);
    if (e.message?.includes('college_facilities')) {
      return NextResponse.json(
        { error: 'Facilities table missing. Apply the latest database schema/migrations.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Failed to load facilities' }, { status: 500 });
  }
}

async function __platform_POST(request) {
  try {
    const auth = await requireCollegeAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    const name = String(body?.name || '').trim();
    const facilityType = String(body?.facilityType || body?.type || 'other').trim() || 'other';
    const capacity = body?.capacity != null && body.capacity !== '' ? Number(body.capacity) : null;

    if (!name) {
      return NextResponse.json({ error: 'Resource name is required' }, { status: 400 });
    }
    if (capacity != null && (Number.isNaN(capacity) || capacity < 0)) {
      return NextResponse.json({ error: 'Capacity must be a positive number' }, { status: 400 });
    }

    const created = await query(
      `INSERT INTO college_facilities (tenant_id, name, facility_type, capacity, is_available)
       VALUES ($1::uuid, $2, $3, $4, true)
       RETURNING id, name, capacity, facility_type, is_available`,
      [auth.tenantId, name, facilityType, capacity],
    );

    return NextResponse.json({ facility: mapRow(created.rows[0]) }, { status: 201 });
  } catch (e) {
    console.error('POST /api/college/facilities', e);
    return NextResponse.json({ error: 'Failed to add resource' }, { status: 500 });
  }
}

async function __platform_PATCH(request) {
  try {
    const auth = await requireCollegeAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    const id = String(body?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const name = body.name != null ? String(body.name).trim() : undefined;
    const facilityType =
      body.facilityType != null || body.type != null
        ? String(body.facilityType || body.type || 'other').trim() || 'other'
        : undefined;
    const capacity =
      body.capacity !== undefined
        ? body.capacity === '' || body.capacity == null
          ? null
          : Number(body.capacity)
        : undefined;

    if (name !== undefined && !name) {
      return NextResponse.json({ error: 'Resource name cannot be empty' }, { status: 400 });
    }
    if (capacity !== undefined && capacity != null && (Number.isNaN(capacity) || capacity < 0)) {
      return NextResponse.json({ error: 'Capacity must be a positive number' }, { status: 400 });
    }

    const updated = await query(
      `UPDATE college_facilities
       SET
         name = COALESCE($3, name),
         facility_type = COALESCE($4, facility_type),
         capacity = CASE WHEN $5::boolean THEN $6 ELSE capacity END
       WHERE id = $1::uuid AND tenant_id = $2::uuid
       RETURNING id, name, capacity, facility_type, is_available`,
      [
        id,
        auth.tenantId,
        name ?? null,
        facilityType ?? null,
        capacity !== undefined,
        capacity,
      ],
    );

    if (!updated.rows.length) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    return NextResponse.json({ facility: mapRow(updated.rows[0]) });
  } catch (e) {
    console.error('PATCH /api/college/facilities', e);
    return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 });
  }
}

async function __platform_DELETE(request) {
  try {
    const auth = await requireCollegeAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    const id = String(body?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const del = await query(
      `DELETE FROM college_facilities
       WHERE id = $1::uuid AND tenant_id = $2::uuid
       RETURNING id`,
      [id, auth.tenantId],
    );

    if (!del.rows.length) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/college/facilities', e);
    return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
  PATCH: __platform_PATCH,
  DELETE: __platform_DELETE,
}, { context: 'api_college_facilities' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
export const PATCH = __platformApiHandlers.PATCH;
export const DELETE = __platformApiHandlers.DELETE;
