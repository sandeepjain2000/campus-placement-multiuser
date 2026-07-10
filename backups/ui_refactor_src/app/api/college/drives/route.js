import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { isFacebookPageShareConfigured } from '@/lib/facebookPageShare';
import { emailPlacementDriveApproved } from '@/lib/placementDriveEmail';

function getTenantId(session) {
  return session?.user?.tenant_id ?? session?.user?.tenantId ?? null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantId(session);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const drives = await query(
      `SELECT
        d.id,
        ep.company_name AS company,
        d.title AS role,
        d.drive_date AS date,
        d.drive_type AS type,
        d.status,
        d.registered_count AS registered,
        d.selected_count AS selected,
        d.venue,
        COALESCE(d.social_shared, '{}') AS social_shared
      FROM placement_drives d
      LEFT JOIN employer_profiles ep ON ep.id = d.employer_id
      WHERE d.tenant_id = $1::uuid
      ORDER BY d.drive_date DESC NULLS LAST, d.created_at DESC`,
      [tenantId]
    );

    const staff = await query(
      `SELECT id, first_name, last_name, role
       FROM users
       WHERE tenant_id = $1::uuid
         AND role = 'college_admin'
         AND is_active = true
       ORDER BY first_name ASC, last_name ASC`,
      [tenantId]
    );

    return NextResponse.json({
      drives: drives.rows,
      staffDirectory: staff.rows.map((s) => ({
        id: s.id,
        name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
        role: s.role === 'college_admin' ? 'Placement Coordinator' : s.role,
      })),
      integrations: {
        /** True when FACEBOOK_PAGE_ID + FACEBOOK_PAGE_ACCESS_TOKEN are set (enables “Post to FB Page” on the UI). */
        facebookPageShare: isFacebookPageShareConfigured(),
      },
    });
  } catch (error) {
    console.error('Failed to load college drives:', error);
    return NextResponse.json({ error: 'Failed to load college drives' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantId(session);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const { driveId, action } = await request.json();
    if (!driveId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'driveId and valid action are required' }, { status: 400 });
    }

    const nextStatus = action === 'approve' ? 'approved' : 'cancelled';
    const updated = await query(
      `UPDATE placement_drives
       SET status = $1,
           approved_by = CASE WHEN $1 = 'approved' THEN $2::uuid ELSE approved_by END,
           approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE approved_at END,
           updated_at = NOW()
       WHERE id = $3::uuid
         AND tenant_id = $4::uuid
         AND status = 'requested'
       RETURNING id, status, title, drive_date, drive_type, tenant_id, employer_id`,
      [nextStatus, session.user.id, driveId, tenantId]
    );

    if (!updated.rows.length) {
      return NextResponse.json({ error: 'Requested drive not found' }, { status: 404 });
    }

    const row = updated.rows[0];
    if (row.status === 'approved') {
      const meta = await query(
        `SELECT t.name AS college_name, ep.company_name
         FROM placement_drives d
         JOIN tenants t ON t.id = d.tenant_id
         JOIN employer_profiles ep ON ep.id = d.employer_id
         WHERE d.id = $1::uuid`,
        [row.id],
      );
      const m = meta.rows[0];
      const dateLabel = row.drive_date
        ? new Date(row.drive_date).toLocaleDateString(undefined, { dateStyle: 'medium' })
        : 'date TBD';
      void emailPlacementDriveApproved({
        companyName: m?.company_name || 'Employer',
        driveTitle: row.title || 'Untitled',
        collegeName: m?.college_name || 'College',
        driveDateLabel: dateLabel,
        driveType: row.drive_type,
        driveId: row.id,
      }).catch((err) => console.error('[mail] placement drive approved', err));
    }

    return NextResponse.json({ success: true, drive: { id: row.id, status: row.status } });
  } catch (error) {
    console.error('Failed to update drive status:', error);
    return NextResponse.json({ error: 'Failed to update drive status' }, { status: 500 });
  }
}
