import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

function getTenantId(session) {
  return session?.user?.tenant_id ?? session?.user?.tenantId ?? null;
}

const ALLOWED_PLATFORMS = new Set(['twitter', 'facebook', 'instagram', 'linkedin']);

/** PATCH — update drive fields for this tenant (e.g. social share flags). */
export async function PATCH(request, { params }) {
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
    if (!body || !Array.isArray(body.socialShared)) {
      return NextResponse.json({ error: 'socialShared array is required' }, { status: 400 });
    }

    const cleaned = [...new Set(body.socialShared.map((p) => String(p).toLowerCase()))].filter((p) =>
      ALLOWED_PLATFORMS.has(p),
    );

    const updated = await query(
      `UPDATE placement_drives
       SET social_shared = $1::text[],
           updated_at = NOW()
       WHERE id = $2::uuid
         AND tenant_id = $3::uuid
       RETURNING id, social_shared`,
      [cleaned, driveId, tenantId],
    );

    if (!updated.rows.length) {
      return NextResponse.json({ error: 'Drive not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      drive: {
        id: updated.rows[0].id,
        socialShared: updated.rows[0].social_shared || [],
      },
    });
  } catch (error) {
    console.error('Failed to patch drive:', error);
    return NextResponse.json({ error: 'Failed to update drive' }, { status: 500 });
  }
}
