import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getEmployerProfileId } from '@/lib/employerApplicationAccess';
import {


  loadSystemEmailTemplate,
  buildCampusGuestSubstitutionVars,
  renderTemplates,
  CAMPUS_GUEST_CONFIRMATION_TEMPLATE_KEY,
} from '@/lib/campusGuestConfirmation';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;


async function __platform_GET(_request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: listingId } = await params;
    if (!listingId) {
      return NextResponse.json({ error: 'Missing listing id' }, { status: 400 });
    }

    const employerUserId = session.user.id;
    const employerEmail = session.user.communication_email || session.user.email || '';
    const displayName = session.user.name || 'Employer contact';

    const listingRes = await query(
      `SELECT
         cel.id,
         cel.kind,
         cel.title,
         cel.summary,
         cel.requirements,
         cel.time_hint,
         cel.status,
         t.id AS college_id,
         t.name AS college_name,
         t.city AS college_city,
         t.state AS college_state,
         COALESCE(NULLIF(TRIM(t.communication_email), ''), t.email) AS college_email,
         cgs.sent_at AS confirmation_sent_at,
         ep.company_name
       FROM campus_engagement_listings cel
       INNER JOIN tenants t ON t.id = cel.tenant_id
       LEFT JOIN campus_guest_confirmation_sends cgs
         ON cgs.listing_id = cel.id AND cgs.employer_user_id = $2::uuid
       LEFT JOIN employer_profiles ep ON ep.user_id = $2::uuid
       WHERE cel.id = $1::uuid`,
      [listingId, employerUserId],
    );

    const row = listingRes.rows[0];
    if (!row || row.status !== 'published') {
      return NextResponse.json({ error: 'Listing not found or not published' }, { status: 404 });
    }

    if (row.confirmation_sent_at) {
      return NextResponse.json(
        {
          error: 'Confirmation email was already sent for this listing.',
          alreadySent: true,
          sentAt: row.confirmation_sent_at,
        },
        { status: 409 },
      );
    }

    const toEmail = String(row.college_email || '').trim();
    if (!toEmail) {
      return NextResponse.json(
        { error: 'This college has no contact email on file. Confirm is unavailable until it is updated.' },
        { status: 400 },
      );
    }

    const employerProfileId = await getEmployerProfileId(employerUserId);
    const templateRow = await loadSystemEmailTemplate(
      CAMPUS_GUEST_CONFIRMATION_TEMPLATE_KEY,
      employerProfileId ? { scopeType: 'employer', scopeId: employerProfileId } : null,
    );
    if (!templateRow) {
      return NextResponse.json({ error: 'Email template not configured' }, { status: 500 });
    }

    const vars = buildCampusGuestSubstitutionVars(row, {
      displayName,
      email: employerEmail,
      companyName: row.company_name || session.user.tenantName || 'Our organization',
    });

    const { subject, body } = renderTemplates(templateRow, vars);

    return NextResponse.json({
      subject,
      body,
      toEmail,
      placeholdersHelp: [
        'collegeName',
        'collegeCity',
        'collegeState',
        'listingTitle',
        'listingKind',
        'listingSummary',
        'listingRequirements',
        'timeHint',
        'employerName',
        'employerEmail',
        'employerCompany',
      ],
    });
  } catch (e) {
    console.error('GET /api/employer/engagement-listings/[id]/confirmation-draft', e);
    if (e.message?.includes('campus_guest_confirmation_sends')) {
      return NextResponse.json(
        { error: 'Database migration required (027_campus_guest_confirmation_email.sql).' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Failed to build draft' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_employer_engagement_listings_id_confirmation_draft' });
export const GET = __platformApiHandlers.GET;
