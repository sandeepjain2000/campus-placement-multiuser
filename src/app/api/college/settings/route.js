import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import {


  assertCollegeNameAvailable,
  formatCollegeNameInUseMessage,
  normalizeOrganizationName,
} from '@/lib/organizationNames';
import {
  AND_APP_NOT_DELETED,
  AND_DRIVE_NOT_DELETED,
  AND_JP_NOT_DELETED,
} from '@/lib/softDeleteSql';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { isBrowserLoadableAssetUrl } from '@/lib/clientAssetUrl';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;


function getTenantId(session) {
  return session?.user?.tenant_id ?? session?.user?.tenantId ?? null;
}

function formatAcademicYear(startYear) {
  const y = Number(startYear);
  if (!Number.isFinite(y)) return null;
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

function fallbackInstitutionContact(tenant) {
  const name = String(tenant?.name || '').toLowerCase();
  const city = String(tenant?.city || '');
  const state = String(tenant?.state || '');

  if (name.includes('madras')) {
    return {
      phone: '+91-44-2257-8000',
      address: 'IIT P.O., Sardar Patel Road, Adyar',
      pincode: '600036',
    };
  }
  if (name.includes('trichy') || name.includes('tiruchirappalli')) {
    return {
      phone: '+91-431-250-3000',
      address: 'Tanjore Main Road, National Highway 67',
      pincode: '620015',
    };
  }
  if (name.includes('bits') || name.includes('pilani')) {
    return {
      phone: '+91-1596-242-192',
      address: 'Vidya Vihar Campus',
      pincode: '333031',
    };
  }

  return {
    phone: '+91-9876501234',
    address: city && state ? `${city}, ${state}` : 'Placement Office Address',
    pincode: '600001',
  };
}

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantId(session);
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const res = await query(
      `SELECT
        name, website, logo_url, email, communication_email, phone, address, city, state, pincode,
        accreditation, naac_grade, nirf_rank, settings, short_code
       FROM tenants
       WHERE id = $1::uuid`,
      [tenantId]
    );
    if (!res.rows.length) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const t = res.rows[0];
    const settings = t.settings || {};
    const fallback = fallbackInstitutionContact(t);

    let academicYearsWithData = [];
    try {
      const configured = await query(
        `SELECT label FROM tenant_academic_years
         WHERE tenant_id = $1::uuid
         ORDER BY sequence_number ASC`,
        [tenantId],
      );
      academicYearsWithData = configured.rows.map((r) => r.label).filter(Boolean);
    } catch {
      /* table may not exist before migration */
    }
    if (!academicYearsWithData.length) {
      const yearsRes = await query(
        `WITH years AS (
           SELECT DISTINCT EXTRACT(YEAR FROM d.drive_date)::int AS y
           FROM placement_drives d
           WHERE d.tenant_id = $1::uuid AND d.drive_date IS NOT NULL ${AND_DRIVE_NOT_DELETED}
           UNION
           SELECT DISTINCT jp.batch_year::int AS y
           FROM job_postings jp
           JOIN job_posting_visibility jpv ON jpv.job_id = jp.id
           WHERE jpv.tenant_id = $1::uuid AND jp.batch_year IS NOT NULL ${AND_JP_NOT_DELETED}
           UNION
           SELECT DISTINCT EXTRACT(YEAR FROM a.applied_at)::int AS y
           FROM applications a
           JOIN student_profiles sp ON sp.id = a.student_id
           WHERE sp.tenant_id = $1::uuid AND a.applied_at IS NOT NULL AND ${SP_ACTIVE_CLAUSE}
             ${AND_APP_NOT_DELETED}
         )
         SELECT y FROM years WHERE y IS NOT NULL ORDER BY y DESC`,
        [tenantId],
      );
      academicYearsWithData = yearsRes.rows
        .map((r) => formatAcademicYear(r.y))
        .filter(Boolean);
    }

    return NextResponse.json({
      website: t.website || '',
      logoUrl: t.logo_url || '',
      websiteApi: settings.websiteApi || '',
      placementSeasonLabel: settings.placementSeasonLabel || '',
      social: {
        twitter: settings.social?.twitter || '',
        facebook: settings.social?.facebook || '',
        instagram: settings.social?.instagram || '',
        linkedin: settings.social?.linkedin || '',
      },
      institution: {
        collegeName: t.name || '',
        shortCode: t.short_code || '',
        email: t.email || '',
        communicationEmail: t.communication_email || t.email || '',
        phone: t.phone || fallback.phone,
      },
      address: {
        address: t.address || fallback.address,
        city: t.city || '',
        state: t.state || '',
        pincode: t.pincode || fallback.pincode,
      },
      accreditation: {
        body: t.accreditation || '',
        naacGrade: t.naac_grade || '',
        nirfRank: t.nirf_rank ?? '',
      },
      institutionShowcase: {
        nbaAccreditedPrograms: settings.institutionShowcase?.nbaAccreditedPrograms || '',
        nirfCategoryRanks: settings.institutionShowcase?.nirfCategoryRanks || '',
        notableAlumni: settings.institutionShowcase?.notableAlumni || '',
        patentCount: settings.institutionShowcase?.patentCount ?? '',
        startupCount: settings.institutionShowcase?.startupCount ?? '',
        incubationCells: settings.institutionShowcase?.incubationCells || '',
        researchCenters: settings.institutionShowcase?.researchCenters || '',
      },
      placementOfficer: {
        name: settings.placementOfficer?.name || session.user.name || '',
        email: settings.placementOfficer?.email || session.user.email || '',
        designation: settings.placementOfficer?.designation || '',
      },
      requireCvVerification: Boolean(settings.requireCvVerification),
      delegateCvVerificationToCommittee: Boolean(settings.delegateCvVerificationToCommittee),
      academicYearsWithData,
    });
  } catch (error) {
    console.error('Failed to load college settings:', error);
    return NextResponse.json({ error: 'Failed to load college settings' }, { status: 500 });
  }
}

async function __platform_POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantId(session);
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const body = await request.json();
    const website = body?.website || '';
    const logoUrlRaw = String(body?.logoUrl || '').trim();
    if (logoUrlRaw && !isBrowserLoadableAssetUrl(logoUrlRaw)) {
      return NextResponse.json(
        {
          error:
            'Logo URL must be a web address (https://…) or site path (/…). Use Upload college logo instead of a file path on your computer.',
        },
        { status: 400 },
      );
    }
    const logoUrl = logoUrlRaw;
    const websiteApi = body?.websiteApi || '';
    const social = body?.social || {};
    const institution = body?.institution || {};
    const address = body?.address || {};
    const accreditation = body?.accreditation || {};
    const institutionShowcase = body?.institutionShowcase || {};
    const placementOfficer = body?.placementOfficer || {};

    const existing = await query(`SELECT settings FROM tenants WHERE id = $1::uuid`, [tenantId]);
    const existingSettings = existing.rows[0]?.settings || {};
    const mergedSettings = {
      ...existingSettings,
      websiteApi,
      placementSeasonLabel: String(body?.placementSeasonLabel ?? existingSettings.placementSeasonLabel ?? '').trim(),
      social: {
        ...(existingSettings.social || {}),
        twitter: social.twitter || '',
        facebook: social.facebook || '',
        instagram: social.instagram || '',
        linkedin: social.linkedin || '',
      },
      placementOfficer: {
        ...(existingSettings.placementOfficer || {}),
        name: placementOfficer.name || '',
        email: placementOfficer.email || '',
        designation: placementOfficer.designation || '',
      },
      institutionShowcase: {
        ...(existingSettings.institutionShowcase || {}),
        nbaAccreditedPrograms: institutionShowcase.nbaAccreditedPrograms || '',
        nirfCategoryRanks: institutionShowcase.nirfCategoryRanks || '',
        notableAlumni: institutionShowcase.notableAlumni || '',
        patentCount: institutionShowcase.patentCount ? Number(institutionShowcase.patentCount) : null,
        startupCount: institutionShowcase.startupCount ? Number(institutionShowcase.startupCount) : null,
        incubationCells: institutionShowcase.incubationCells || '',
        researchCenters: institutionShowcase.researchCenters || '',
      },
      requireCvVerification: body?.requireCvVerification === true,
      delegateCvVerificationToCommittee:
        body?.requireCvVerification === true && body?.delegateCvVerificationToCommittee === true,
    };

    const comm = String(institution.communicationEmail ?? '').trim().toLowerCase();
    const primaryEmail = String(institution.email ?? '').trim().toLowerCase();
    const collegeName = normalizeOrganizationName(institution.collegeName ?? '');

    if (collegeName) {
      try {
        await assertCollegeNameAvailable(query, collegeName, { excludeTenantId: tenantId });
      } catch (e) {
        if (e.message === 'COLLEGE_NAME_EXISTS') {
          return NextResponse.json(
            { error: formatCollegeNameInUseMessage(e.existing, { name: collegeName }) },
            { status: 409 },
          );
        }
        throw e;
      }
    }

    await query(
      `UPDATE tenants
       SET
         name = $1,
         website = $2,
         logo_url = $3,
         email = $4,
         communication_email = $5,
         phone = $6,
         address = $7,
         city = $8,
         state = $9,
         pincode = $10,
         accreditation = $11,
         naac_grade = $12,
         nirf_rank = $13,
         settings = $14::jsonb,
         updated_at = NOW()
       WHERE id = $15::uuid`,
      [
        collegeName,
        website || '',
        logoUrl || '',
        primaryEmail || '',
        comm || primaryEmail || '',
        institution.phone || '',
        address.address || '',
        address.city || '',
        address.state || '',
        address.pincode || '',
        accreditation.body || '',
        accreditation.naacGrade || '',
        accreditation.nirfRank ? Number(accreditation.nirfRank) : null,
        JSON.stringify(mergedSettings),
        tenantId,
      ]
    );

    return NextResponse.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Failed to save college settings:', error);
    return NextResponse.json({ error: 'Failed to save college settings' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
}, { context: 'api_college_settings' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
