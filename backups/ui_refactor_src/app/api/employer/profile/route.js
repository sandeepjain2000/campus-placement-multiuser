import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { EMPLOYER_COMPANY_TYPE_OPTIONS } from '@/lib/employerCompanyTypeLabels';

const ALLOWED_COMPANY_TYPES = new Set(EMPLOYER_COMPANY_TYPE_OPTIONS.map((o) => o.value));

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
       ep.reliability_score
     FROM employer_profiles ep
     WHERE ep.user_id = $1
     LIMIT 1`,
    [userId]
  );
  return res.rows[0] || null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await getEmployerByUser(session.user.id);
    if (!profile) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('GET /api/employer/profile', error);
    return NextResponse.json({ error: 'Failed to load employer profile' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await getEmployerByUser(session.user.id);
    if (!profile) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const body = await request.json();
    const description = String(body?.description || '').trim();
    const contactPerson = String(body?.contactPerson || '').trim();
    const contactEmail = String(body?.contactEmail || '').trim();
    const contactPhone = String(body?.contactPhone || '').trim();
    const headquarters = String(body?.headquarters || '').trim();
    const website = String(body?.website || '').trim();
    const logoUrl = String(body?.logoUrl || '').trim();
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
      ]
    );

    const updated = await getEmployerByUser(session.user.id);
    return NextResponse.json({ profile: updated });
  } catch (error) {
    console.error('PATCH /api/employer/profile', error);
    return NextResponse.json({ error: 'Failed to update employer profile' }, { status: 500 });
  }
}
