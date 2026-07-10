import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { EMPLOYER_COMPANY_TYPE_OPTIONS } from '@/lib/employerCompanyTypeLabels';
import { isBrowserLoadableAssetUrl } from '@/lib/clientAssetUrl';
import { pickBrowserAssetUrl } from '@/lib/resolveBrandLogoUrl';
import { respondPlatformError , withApiHandlers } from '@/lib/platformErrorRoute';
import { PLATFORM_ERROR_CONTEXT } from '@/lib/platformErrorContext';

export const dynamic = 'force-dynamic';
export const revalidate = 0;




const ALLOWED_COMPANY_TYPES = new Set(EMPLOYER_COMPANY_TYPE_OPTIONS.map((o) => o.value));

function normalizeBillingPatch(body) {
  const legalRaw = String(body?.billingLegalName ?? body?.billing_legal_name ?? '').trim();
  const legal = legalRaw.length > 280 ? legalRaw.slice(0, 280) : legalRaw;
  const legalOut = legal || null;

  let panRaw = String(body?.billingPan ?? body?.billing_pan ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  if (panRaw.length > 10) panRaw = panRaw.slice(0, 10);
  if (panRaw && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panRaw)) {
    return { error: 'PAN must be 10 characters in format AAAAA9999A' };
  }
  const panOut = panRaw || null;

  let gstRaw = String(body?.billingGstNumber ?? body?.billing_gst_number ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  if (gstRaw.length > 18) gstRaw = gstRaw.slice(0, 18);
  if (gstRaw && gstRaw.length !== 15) {
    return { error: 'GSTIN must be exactly 15 characters when provided' };
  }
  if (gstRaw && !/^[0-9]{2}[A-Z0-9]{13}$/.test(gstRaw)) {
    return { error: 'GSTIN format looks invalid' };
  }
  const gstOut = gstRaw || null;

  return { legal: legalOut, pan: panOut, gst: gstOut };
}

async function getEmployerByUser(userId) {
  const res = await query(
    `SELECT
       ep.id,
       ep.company_name,
       ep.industry,
       ep.company_type,
       ep.company_size,
       ep.founded_year,
       ep.logo_url,
       ep.website,
       ep.headquarters,
       ep.locations,
       ep.description,
       ep.contact_person,
       ep.contact_email,
       ep.contact_phone,
       ep.total_hires,
       ep.reliability_score,
       ep.billing_legal_name,
       ep.billing_pan,
       ep.billing_gst_number,
       u.email AS account_email,
       u.communication_email
     FROM employer_profiles ep
     INNER JOIN users u ON u.id = ep.user_id
     WHERE ep.user_id = $1
     LIMIT 1`,
    [userId]
  );
  return res.rows[0] || null;
}

async function __platform_GET() {
  let session = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await getEmployerByUser(session.user.id);
    if (!profile) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });
    const safeLogoUrl = pickBrowserAssetUrl(profile.logo_url);
    return NextResponse.json({
      profile: {
        ...profile,
        logo_url: safeLogoUrl,
      },
    });
  } catch (error) {
    return respondPlatformError(error, {
      context: PLATFORM_ERROR_CONTEXT.EMPLOYER_PROFILE_READ,
      sessionUser: session?.user,
      defaultMessage: 'Failed to load employer profile',
      logLabel: 'GET /api/employer/profile',
    });
  }
}

async function __platform_PATCH(request) {
  let session = null;
  let body = {};
  let profile = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    profile = await getEmployerByUser(session.user.id);
    if (!profile) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    body = await request.json();
    const description = String(body?.description || '').trim();
    const contactPerson = String(body?.contactPerson || '').trim();
    const contactEmail = String(body?.contactEmail || '').trim();
    const contactPhone = String(body?.contactPhone || '').trim();
    const headquarters = String(body?.headquarters || '').trim();
    const website = String(body?.website || '').trim();
    const logoUrlRaw = String(body?.logoUrl || '').trim();
    if (logoUrlRaw && !isBrowserLoadableAssetUrl(logoUrlRaw)) {
      return NextResponse.json(
        {
          error:
            'Logo URL must be a web address (https://…) or site path (/…). Use Upload New Logo instead of a file path on your computer.',
        },
        { status: 400 },
      );
    }
    const logoUrl = logoUrlRaw;
    const industry = String(body?.industry || '').trim();
    const companyTypeRaw = String(body?.companyType || body?.company_type || '').trim().toLowerCase();
    const companySize = String(body?.companySize || body?.company_size || '').trim().slice(0, 50);
    const foundedYearRaw = body?.foundedYear ?? body?.founded_year;
    let foundedYear = null;
    if (foundedYearRaw !== '' && foundedYearRaw != null) {
      const y = Number(foundedYearRaw);
      if (!Number.isInteger(y) || y < 1600 || y > new Date().getFullYear() + 1) {
        return NextResponse.json({ error: 'Founded year must be a valid year' }, { status: 400 });
      }
      foundedYear = y;
    }

    let companyType = null;
    if (companyTypeRaw) {
      if (!ALLOWED_COMPANY_TYPES.has(companyTypeRaw)) {
        return NextResponse.json({ error: 'Invalid company type' }, { status: 400 });
      }
      companyType = companyTypeRaw;
    }

    const locations = Array.isArray(body?.locations)
      ? body.locations.map((x) => String(x || '').trim()).filter(Boolean)
      : String(body?.locations || '')
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean);

    const billingKeys = ['billingLegalName', 'billing_legal_name', 'billingPan', 'billing_pan', 'billingGstNumber', 'billing_gst_number'];
    const hasBillingPatch = billingKeys.some((k) => Object.prototype.hasOwnProperty.call(body || {}, k));
    let billingLegal = null;
    let billingPan = null;
    let billingGst = null;
    if (hasBillingPatch) {
      const b = normalizeBillingPatch(body);
      if ('error' in b) {
        return NextResponse.json({ error: b.error }, { status: 400 });
      }
      billingLegal = b.legal;
      billingPan = b.pan;
      billingGst = b.gst;
    }

    const hasCommunicationEmailPatch = Object.prototype.hasOwnProperty.call(body || {}, 'communicationEmail');
    if (hasCommunicationEmailPatch) {
      const commRaw = String(body.communicationEmail ?? '').trim().toLowerCase();
      if (commRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(commRaw)) {
        return NextResponse.json({ error: 'Communication email must be a valid address' }, { status: 400 });
      }
      await query(`UPDATE users SET communication_email = $1, updated_at = NOW() WHERE id = $2::uuid`, [
        commRaw || null,
        session.user.id,
      ]);
    }

    await query(
      `UPDATE employer_profiles
       SET description = $1,
           contact_person = $2,
           contact_email = $3,
           contact_phone = $4,
           headquarters = $5,
           website = $6,
           logo_url = $7,
           locations = $8,
           industry = $9,
           company_type = $10,
           company_size = $11,
           founded_year = $12,
           billing_legal_name = CASE WHEN $14::boolean THEN $15 ELSE billing_legal_name END,
           billing_pan = CASE WHEN $14::boolean THEN $16 ELSE billing_pan END,
           billing_gst_number = CASE WHEN $14::boolean THEN $17 ELSE billing_gst_number END,
           updated_at = NOW()
       WHERE id = $13`,
      [
        description || null,
        contactPerson || null,
        contactEmail || null,
        contactPhone || null,
        headquarters || null,
        website || null,
        logoUrl || null,
        locations,
        industry || null,
        companyType,
        companySize || null,
        foundedYear,
        profile.id,
        hasBillingPatch,
        billingLegal,
        billingPan,
        billingGst,
      ]
    );

    const updated = await getEmployerByUser(session.user.id);
    return NextResponse.json({ profile: updated });
  } catch (error) {
    return respondPlatformError(error, {
      context: PLATFORM_ERROR_CONTEXT.EMPLOYER_PROFILE_UPDATE,
      request,
      sessionUser: session?.user,
      employerId: profile?.id,
      requestBody: body,
      defaultMessage: 'Failed to update employer profile',
      logLabel: 'PATCH /api/employer/profile',
    });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  PATCH: __platform_PATCH,
}, { context: 'api_employer_profile' });
export const GET = __platformApiHandlers.GET;
export const PATCH = __platformApiHandlers.PATCH;
