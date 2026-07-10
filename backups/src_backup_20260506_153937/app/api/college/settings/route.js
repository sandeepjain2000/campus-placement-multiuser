import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

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
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const res = await query(
      `SELECT
        name, website, logo_url, email, phone, address, city, state, pincode,
        accreditation, naac_grade, nirf_rank, settings
       FROM tenants
       WHERE id = $1::uuid`,
      [tenantId]
    );
    if (!res.rows.length) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const t = res.rows[0];
    const settings = t.settings || {};

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
        email: t.email || '',
        phone: t.phone || '',
      },
      address: {
        address: t.address || '',
        city: t.city || '',
        state: t.state || '',
        pincode: t.pincode || '',
      },
      accreditation: {
        body: t.accreditation || '',
        naacGrade: t.naac_grade || '',
        nirfRank: t.nirf_rank ?? '',
      },
      placementOfficer: {
        name: settings.placementOfficer?.name || session.user.name || '',
        email: settings.placementOfficer?.email || session.user.email || '',
        designation: settings.placementOfficer?.designation || '',
      },
    });
  } catch (error) {
    console.error('Failed to load college settings:', error);
    return NextResponse.json({ error: 'Failed to load college settings' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantId(session);
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const body = await request.json();
    const website = body?.website || '';
    const logoUrl = body?.logoUrl || '';
    const websiteApi = body?.websiteApi || '';
    const social = body?.social || {};
    const institution = body?.institution || {};
    const address = body?.address || {};
    const accreditation = body?.accreditation || {};
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
    };

    await query(
      `UPDATE tenants
       SET
         name = $1,
         website = $2,
         logo_url = $3,
         email = $4,
         phone = $5,
         address = $6,
         city = $7,
         state = $8,
         pincode = $9,
         accreditation = $10,
         naac_grade = $11,
         nirf_rank = $12,
         settings = $13::jsonb,
         updated_at = NOW()
       WHERE id = $14::uuid`,
      [
        institution.collegeName || '',
        website || '',
        logoUrl || '',
        institution.email || '',
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
