import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isUuid, requireSuperAdmin } from '@/lib/adminAuth';
import {


  assertEmployerNameAvailable,
  formatEmployerNameInUseMessage,
  normalizeOrganizationName,
} from '@/lib/organizationNames';
import { validateAdminEmployerForm } from '@/lib/adminEmployerForm';
import { setEmployerUserActive } from '@/lib/adminOrganizationActive';

export const dynamic = 'force-dynamic';
import { withApiHandlers, respondPlatformError } from '@/lib/platformErrorRoute';
export const revalidate = 0;


async function loadEmployer(id) {
  const result = await query(
    `SELECT
        ep.id,
        ep.company_name,
        ep.industry,
        ep.website,
        ep.headquarters,
        ep.contact_person,
        ep.contact_email,
        ep.contact_phone,
        ep.total_hires,
        ep.is_verified,
        ep.is_blacklisted,
        ep.blacklist_reason,
        ep.created_at,
        u.id AS user_id,
        u.email AS account_email,
        u.first_name,
        u.last_name,
        u.is_active AS account_active
      FROM employer_profiles ep
      INNER JOIN users u ON u.id = ep.user_id
      WHERE ep.id = $1::uuid
      LIMIT 1`,
    [id],
  );
  return result.rows[0] || null;
}

function mapEmployer(row) {
  return {
    id: row.id,
    name: row.company_name,
    industry: row.industry || '',
    website: row.website || '',
    headquarters: row.headquarters || '',
    contactPerson: row.contact_person || '',
    contactEmail: row.contact_email || '',
    contactPhone: row.contact_phone || '',
    hires: Number(row.total_hires || 0),
    verified: Boolean(row.is_verified),
    blacklisted: Boolean(row.is_blacklisted),
    blacklistReason: row.blacklist_reason || '',
    createdAt: row.created_at,
    userId: row.user_id,
    accountEmail: row.account_email || '',
    accountName: [row.first_name, row.last_name].filter(Boolean).join(' ') || '',
    accountActive: Boolean(row.account_active),
  };
}

async function __platform_GET(request, { params }) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    if (!isUuid(id)) return NextResponse.json({ error: 'Invalid employer id' }, { status: 400 });

    const row = await loadEmployer(id);
    if (!row) return NextResponse.json({ error: 'Employer not found' }, { status: 404 });

    return NextResponse.json({ employer: mapEmployer(row) });
  } catch (error) {
    return respondPlatformError(error, {
      context: 'api_admin_employers_id',
      request,
      defaultMessage: 'Failed to load employer',
    });
  }
}

async function __platform_PATCH(request, { params }) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    if (!isUuid(id)) return NextResponse.json({ error: 'Invalid employer id' }, { status: 400 });

    const body = await request.json();
    const existing = await loadEmployer(id);
    if (!existing) {
      return NextResponse.json({ error: 'Employer not found' }, { status: 404 });
    }

    const formErr = validateAdminEmployerForm({
      name: body?.name ?? body?.companyName ?? existing.company_name,
      contactPerson: body?.contactPerson ?? body?.contact_person ?? existing.contact_person,
      contactEmail: body?.contactEmail ?? body?.contact_email ?? existing.contact_email,
      contactPhone: body?.contactPhone ?? body?.contact_phone ?? existing.contact_phone,
    });
    if (formErr) {
      return NextResponse.json({ error: formErr }, { status: 400 });
    }

    const name = normalizeOrganizationName(body?.name ?? body?.companyName ?? existing.company_name);

    try {
      await assertEmployerNameAvailable(query, name, { excludeEmployerId: id });
    } catch (e) {
      if (e.message === 'EMPLOYER_NAME_EXISTS') {
        return NextResponse.json(
          { error: formatEmployerNameInUseMessage(e.existing, { name }) },
          { status: 409 },
        );
      }
      throw e;
    }

    const industry =
      body?.industry !== undefined ? String(body.industry ?? '').trim() : String(existing.industry ?? '').trim();
    const website =
      body?.website !== undefined ? String(body.website ?? '').trim() : String(existing.website ?? '').trim();
    const headquarters =
      body?.headquarters !== undefined
        ? String(body.headquarters ?? '').trim()
        : String(existing.headquarters ?? '').trim();
    const contactPerson =
      body?.contactPerson !== undefined || body?.contact_person !== undefined
        ? String(body?.contactPerson ?? body?.contact_person ?? '').trim()
        : String(existing.contact_person ?? '').trim();
    const contactEmail =
      body?.contactEmail !== undefined || body?.contact_email !== undefined
        ? String(body?.contactEmail ?? body?.contact_email ?? '').trim()
        : String(existing.contact_email ?? '').trim();
    const contactPhone =
      body?.contactPhone !== undefined || body?.contact_phone !== undefined
        ? String(body?.contactPhone ?? body?.contact_phone ?? '').trim()
        : String(existing.contact_phone ?? '').trim();
    const verified =
      body?.verified !== undefined || body?.is_verified !== undefined
        ? Boolean(body?.verified ?? body?.is_verified)
        : Boolean(existing.is_verified);
    const blacklisted =
      body?.blacklisted !== undefined || body?.is_blacklisted !== undefined
        ? Boolean(body?.blacklisted ?? body?.is_blacklisted)
        : Boolean(existing.is_blacklisted);
    const blacklistReason =
      body?.blacklistReason !== undefined || body?.blacklist_reason !== undefined
        ? String(body?.blacklistReason ?? body?.blacklist_reason ?? '').trim()
        : String(existing.blacklist_reason ?? '').trim();
    const accountActive =
      body?.accountActive !== undefined || body?.active !== undefined
        ? Boolean(body?.accountActive ?? body?.active)
        : Boolean(existing.account_active);

    const updated = await query(
      `UPDATE employer_profiles
       SET
         company_name = $2,
         industry = NULLIF($3, ''),
         website = NULLIF($4, ''),
         headquarters = NULLIF($5, ''),
         contact_person = NULLIF($6, ''),
         contact_email = NULLIF($7, ''),
         contact_phone = NULLIF($8, ''),
         is_verified = $9,
         is_blacklisted = $10,
         blacklist_reason = CASE WHEN $10 THEN NULLIF($11, '') ELSE NULL END,
         updated_at = NOW()
       WHERE id = $1::uuid
       RETURNING id`,
      [
        id,
        name,
        industry,
        website,
        headquarters,
        contactPerson,
        contactEmail,
        contactPhone,
        verified,
        blacklisted,
        blacklistReason,
      ],
    );

    if (!updated.rowCount) {
      return NextResponse.json({ error: 'Employer not found' }, { status: 404 });
    }

    if (accountActive !== Boolean(existing.account_active)) {
      await setEmployerUserActive(query, existing.user_id, accountActive);
    }

    const row = await loadEmployer(id);
    return NextResponse.json({ employer: mapEmployer(row) });
  } catch (error) {
    return respondPlatformError(error, {
      context: 'api_admin_employers_id',
      request,
      defaultMessage: 'Failed to update employer',
    });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  PATCH: __platform_PATCH,
}, { context: 'api_admin_employers_id' });
export const GET = __platformApiHandlers.GET;
export const PATCH = __platformApiHandlers.PATCH;
