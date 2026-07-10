import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getSessionTenantId } from '@/lib/tenantContext';
import { toDateOnlyString, validatePlacementDate } from '@/lib/dateOnly';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




function parseMeta(description, title) {
  if (!description) {
    return {
      company: title || '',
      roomId: '',
      roomName: '',
      startTime: '',
      endTime: '',
      notes: '',
      channels: [],
    };
  }
  try {
    const m = JSON.parse(description);
    return {
      company: m.company || title || '',
      roomId: m.roomId || '',
      roomName: m.roomName || '',
      startTime: m.startTime || '',
      endTime: m.endTime || '',
      notes: m.notes || '',
      channels: Array.isArray(m.channels) ? m.channels : [],
    };
  } catch {
    return {
      company: title || '',
      roomId: '',
      roomName: '',
      startTime: '',
      endTime: '',
      notes: description,
      channels: [],
    };
  }
}

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = getSessionTenantId(session.user);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const [assetsRes, eventsRes] = await Promise.all([
      query(
        `SELECT id, name, capacity, facility_type AS type
         FROM college_facilities
         WHERE tenant_id = $1
         ORDER BY name ASC`,
        [tenantId]
      ),
      query(
        `SELECT id, title, start_date, description
         FROM college_calendar
         WHERE tenant_id = $1 AND event_type = 'placement_drive'
         ORDER BY start_date ASC, created_at ASC`,
        [tenantId]
      ),
    ]);

    const bookings = eventsRes.rows.map((r) => {
      const meta = parseMeta(r.description, r.title);
      return {
        id: r.id,
        roomId: meta.roomId,
        roomName: meta.roomName,
        date: toDateOnlyString(r.start_date),
        startTime: meta.startTime,
        endTime: meta.endTime,
        company: meta.company,
        description: meta.notes,
        channels: meta.channels,
      };
    });

    return NextResponse.json({
      assets: assetsRes.rows.map((a) => ({
        id: a.id,
        name: a.name,
        capacity: a.capacity,
        type: a.type || 'Facility',
      })),
      bookings,
    });
  } catch (error) {
    console.error('Failed to load infrastructure data:', error);
    return NextResponse.json({ error: 'Failed to load infrastructure data' }, { status: 500 });
  }
}

async function __platform_POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = getSessionTenantId(session.user);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const body = await request.json();
    const roomId = String(body?.roomId || '').trim();
    const roomName = String(body?.roomName || '').trim();
    const date = String(body?.date || '').trim();
    const startTime = String(body?.startTime || '').trim();
    const endTime = String(body?.endTime || '').trim();
    const company = String(body?.company || '').trim();
    const notes = String(body?.description || '').trim();
    const channels = Array.isArray(body?.channels) ? body.channels : [];

    if (!roomId || !date || !startTime || !endTime || !company) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const dateCheck = validatePlacementDate(date, { allowPast: false });
    if (!dateCheck.ok) {
      return NextResponse.json({ error: dateCheck.error }, { status: 400 });
    }

    const desc = JSON.stringify({
      roomId,
      roomName,
      startTime,
      endTime,
      company,
      notes,
      channels,
    });

    const created = await query(
      `INSERT INTO college_calendar (tenant_id, title, event_type, start_date, end_date, is_blocking, description)
       VALUES ($1, $2, 'placement_drive', $3, $3, true, $4)
       RETURNING id, title, start_date, description`,
      [tenantId, company, dateCheck.value, desc]
    );

    const r = created.rows[0];
    return NextResponse.json({
      booking: {
        id: r.id,
        roomId,
        roomName,
        date: toDateOnlyString(r.start_date),
        startTime,
        endTime,
        company,
        description: notes,
        channels,
      },
    });
  } catch (error) {
    console.error('Failed to create infrastructure booking:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}

async function __platform_PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = getSessionTenantId(session.user);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const body = await request.json();
    const id = String(body?.id || '').trim();
    const channels = Array.isArray(body?.channels) ? body.channels : [];
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const existing = await query(
      `SELECT title, description, start_date
       FROM college_calendar
       WHERE id = $1::uuid AND tenant_id = $2::uuid AND event_type = 'placement_drive'`,
      [id, tenantId]
    );
    if (!existing.rows.length) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const prev = existing.rows[0];
    const meta = parseMeta(prev.description, prev.title);
    const nextDesc = JSON.stringify({
      roomId: meta.roomId,
      roomName: meta.roomName,
      startTime: meta.startTime,
      endTime: meta.endTime,
      company: meta.company,
      notes: meta.notes,
      channels,
    });

    await query(
      `UPDATE college_calendar
       SET description = $1
       WHERE id = $2::uuid AND tenant_id = $3::uuid`,
      [nextDesc, id, tenantId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update booking channels:', error);
    return NextResponse.json({ error: 'Failed to update booking channels' }, { status: 500 });
  }
}

async function __platform_DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = getSessionTenantId(session.user);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const body = await request.json();
    const id = String(body?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const del = await query(
      `DELETE FROM college_calendar
       WHERE id = $1::uuid AND tenant_id = $2::uuid AND event_type = 'placement_drive'
       RETURNING id`,
      [id, tenantId]
    );
    if (!del.rows?.length) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete booking:', error);
    return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
  PATCH: __platform_PATCH,
  DELETE: __platform_DELETE,
}, { context: 'api_college_infrastructure' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
export const PATCH = __platformApiHandlers.PATCH;
export const DELETE = __platformApiHandlers.DELETE;
