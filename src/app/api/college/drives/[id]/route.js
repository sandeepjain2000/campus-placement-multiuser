import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




function getTenantId(session) {
  return session?.user?.tenant_id ?? session?.user?.tenantId ?? null;
}

const ALLOWED_PLATFORMS = new Set(['twitter', 'facebook', 'instagram', 'linkedin']);
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function validateStaffUserIds(tenantId, staffUserIds) {
  if (!staffUserIds.length) return [];
  const check = await query(
    `SELECT id FROM users
     WHERE tenant_id = $1::uuid
       AND role = 'college_admin'
       AND is_active = true
       AND id = ANY($2::uuid[])`,
    [tenantId, staffUserIds],
  );
  if (check.rows.length !== staffUserIds.length) {
    return null;
  }
  return staffUserIds;
}

/** PATCH — update drive fields for this tenant (social share flags, attached staff). */
async function __platform_PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantId(session);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const { id: driveId } = await params;
    if (!driveId || typeof driveId !== 'string') {
      return NextResponse.json({ error: 'Drive id required' }, { status: 400 });
    }

    const body = await request.json();
    const hasSocial = body && Array.isArray(body.socialShared);
    const hasStaff = body && Array.isArray(body.staffIds);

    if (!hasSocial && !hasStaff) {
      return NextResponse.json(
        { error: 'Provide socialShared and/or staffIds' },
        { status: 400 },
      );
    }

    const sets = [];
    const values = [];
    let idx = 1;

    if (hasStaff) {
      const staffUserIds = [
        ...new Set(
          body.staffIds.map((id) => String(id).trim()).filter((id) => UUID_RE.test(id)),
        ),
      ];
      const validated = await validateStaffUserIds(tenantId, staffUserIds);
      if (validated === null) {
        return NextResponse.json(
          { error: 'One or more staff selections are invalid' },
          { status: 400 },
        );
      }
      sets.push(`attached_staff_user_ids = $${idx}::uuid[]`);
      values.push(validated);
      idx += 1;
    }

    if (hasSocial) {
      const cleaned = [...new Set(body.socialShared.map((p) => String(p).toLowerCase()))].filter(
        (p) => ALLOWED_PLATFORMS.has(p),
      );
      sets.push(`social_shared = $${idx}::text[]`);
      values.push(cleaned);
      idx += 1;
    }

    sets.push('updated_at = NOW()');
    values.push(driveId, tenantId);

    const driveIdParam = idx;
    const tenantParam = idx + 1;

    let updated;
    try {
      updated = await query(
        `UPDATE placement_drives
         SET ${sets.join(', ')}
         WHERE id = $${driveIdParam}::uuid
           AND tenant_id = $${tenantParam}::uuid
           AND COALESCE(is_deleted, false) = false
         RETURNING id, social_shared, attached_staff_user_ids`,
        values,
      );
    } catch (err) {
      if (err?.code === '42703' && hasStaff && String(err?.message || '').includes('attached_staff')) {
        return NextResponse.json(
          {
            error:
              'Staff assignment is not available until migration 063_placement_drive_attached_staff.sql is applied.',
          },
          { status: 503 },
        );
      }
      throw err;
    }

    if (!updated.rows.length) {
      return NextResponse.json({ error: 'Drive not found' }, { status: 404 });
    }

    const row = updated.rows[0];
    return NextResponse.json({
      success: true,
      drive: {
        id: row.id,
        socialShared: row.social_shared || [],
        staffIds: (row.attached_staff_user_ids || []).map(String),
      },
    });
  } catch (error) {
    console.error('Failed to patch drive:', error);
    return NextResponse.json({ error: 'Failed to update drive' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  PATCH: __platform_PATCH,
}, { context: 'api_college_drives_id' });
export const PATCH = __platformApiHandlers.PATCH;
