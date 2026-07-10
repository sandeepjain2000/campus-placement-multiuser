import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { formatDriveFacebookMessage, isFacebookPageShareConfigured, postToFacebookPageFeed } from '@/lib/facebookPageShare';

function getTenantId(session) {
  return session?.user?.tenant_id ?? session?.user?.tenantId ?? null;
}

function normalizeWebsiteUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  return s.startsWith('http') ? s : `https://${s}`;
}

/** POST — publish a placement-drive summary to the configured Facebook Page (Graph API). */
export async function POST(_request, { params }) {
  try {
    if (!isFacebookPageShareConfigured()) {
      return NextResponse.json(
        {
          error:
            'Facebook Page posting is not configured. Set FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN on the server.',
        },
        { status: 503 },
      );
    }

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

    const row = await query(
      `SELECT
        d.title AS role,
        d.drive_date AS date,
        d.venue,
        d.drive_type AS type,
        ep.company_name AS company,
        t.name AS tenant_name,
        t.website AS tenant_website
       FROM placement_drives d
       LEFT JOIN employer_profiles ep ON ep.id = d.employer_id
       INNER JOIN tenants t ON t.id = d.tenant_id
       WHERE d.id = $1::uuid AND d.tenant_id = $2::uuid`,
      [driveId, tenantId],
    );

    if (!row.rows.length) {
      return NextResponse.json({ error: 'Drive not found' }, { status: 404 });
    }

    const r = row.rows[0];
    const dateVal = r.date;
    const dateStr = dateVal
      ? new Date(dateVal).toLocaleDateString('en-IN', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : '';

    const message = formatDriveFacebookMessage({
      tenantName: r.tenant_name,
      company: r.company,
      role: r.role,
      dateStr,
      venue: r.venue,
      driveType: r.type,
    });

    const link = normalizeWebsiteUrl(r.tenant_website);

    const { postId } = await postToFacebookPageFeed({
      message,
      link: link || undefined,
    });

    return NextResponse.json({ success: true, postId, messagePreview: message });
  } catch (error) {
    console.error('Facebook post error:', error);
    return NextResponse.json(
      { error: 'Failed to post to Facebook' },
      { status: 500 },
    );
  }
}
