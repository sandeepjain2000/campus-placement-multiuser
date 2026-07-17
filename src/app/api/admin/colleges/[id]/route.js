import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isUuid, requireSuperAdmin } from '@/lib/adminAuth';
import {
  assertCollegeNameAvailable,
  formatCollegeNameInUseMessage,
  normalizeOrganizationName,
} from '@/lib/organizationNames';
import { SP_ACTIVE_ON } from '@/lib/studentProfileActive';
import {
  INSTITUTION_CLASSIFICATION_SELECT_SQL,
  institutionClassificationPatchEntries,
  mapInstitutionClassificationsFromRow,
  parseInstitutionClassificationsFromBody,
} from '@/lib/tenantInstitutionClassifications';
import { syncCollegeAdminUsersActive } from '@/lib/adminOrganizationActive';
import { auditNewValues, getRequestClientIp, writeAuditLog } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function loadCollege(id) {
  const result = await query(
    `SELECT
        t.id,
        t.name,
        t.slug,
        t.city,
        t.state,
        t.pincode,
        t.website,
        t.email,
        t.phone,
        t.naac_grade,
        t.nirf_rank,
        ${INSTITUTION_CLASSIFICATION_SELECT_SQL},
        t.is_active,
        t.created_at,
        COUNT(sp.id) AS students,
        SUM(CASE WHEN sp.placement_status = 'placed' THEN 1 ELSE 0 END) AS placed,
        (
          SELECT json_build_object(
            'email', u.email,
            'firstName', u.first_name,
            'lastName', u.last_name
          )
          FROM users u
          WHERE u.tenant_id = t.id AND u.role = 'college_admin'
          ORDER BY u.created_at ASC
          LIMIT 1
        ) AS primary_admin
      FROM tenants t
      LEFT JOIN student_profiles sp ON sp.tenant_id = t.id AND ${SP_ACTIVE_ON}
      WHERE t.id = $1::uuid AND t.type = 'college'
      GROUP BY t.id`,
    [id],
  );
  return result.rows[0] || null;
}

function mapCollege(row) {
  const admin = row.primary_admin || {};
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    city: row.city || '',
    state: row.state || '',
    pincode: row.pincode || '',
    website: row.website || '',
    email: row.email || '',
    phone: row.phone || '',
    naac: row.naac_grade || '',
    nirfRank: row.nirf_rank != null ? Number(row.nirf_rank) : null,
    active: Boolean(row.is_active),
    students: Number(row.students || 0),
    placed: Number(row.placed || 0),
    createdAt: row.created_at,
    adminEmail: admin.email || '',
    adminName: [admin.firstName, admin.lastName].filter(Boolean).join(' ') || '',
    institutionClassifications: mapInstitutionClassificationsFromRow(row),
  };
}

async function __platform_GET(_request, { params }) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    if (!isUuid(id)) return NextResponse.json({ error: 'Invalid college id' }, { status: 400 });

    const row = await loadCollege(id);
    if (!row) return NextResponse.json({ error: 'College not found' }, { status: 404 });

    return NextResponse.json({ college: mapCollege(row) });
  } catch (error) {
    console.error('GET /api/admin/colleges/[id]', error);
    return NextResponse.json({ error: 'Failed to load college' }, { status: 500 });
  }
}

async function __platform_PATCH(request, { params }) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    if (!isUuid(id)) return NextResponse.json({ error: 'Invalid college id' }, { status: 400 });

    const body = await request.json();
    const existing = await loadCollege(id);
    if (!existing) {
      return NextResponse.json({ error: 'College not found' }, { status: 404 });
    }

    const name = normalizeOrganizationName(body?.name ?? existing.name);
    if (!name) return NextResponse.json({ error: 'College name is required' }, { status: 400 });

    try {
      await assertCollegeNameAvailable(query, name, { excludeTenantId: id });
    } catch (e) {
      if (e.message === 'COLLEGE_NAME_EXISTS') {
        return NextResponse.json(
          { error: formatCollegeNameInUseMessage(e.existing, { name }) },
          { status: 409 },
        );
      }
      throw e;
    }

    const city = String(body?.city ?? '').trim();
    const state = String(body?.state ?? '').trim();
    const pincode = String(body?.pincode ?? '').trim();
    if (pincode && !/^\d{6}$/.test(pincode)) {
      return NextResponse.json(
        { error: 'Enter a valid 6-digit Indian pincode.' },
        { status: 400 },
      );
    }
    const website = String(body?.website ?? '').trim();
    const email = String(body?.email ?? '').trim();
    const phone = String(body?.phone ?? '').trim();
    const naac = String(body?.naac ?? body?.naacGrade ?? '').trim();
    const nirfRaw = body?.nirfRank ?? body?.nirf_rank;
    const nirfRank =
      nirfRaw === '' || nirfRaw == null || nirfRaw === undefined
        ? null
        : Number.parseInt(String(nirfRaw), 10);
    if (nirfRank != null && !Number.isFinite(nirfRank)) {
      return NextResponse.json({ error: 'NIRF rank must be a number' }, { status: 400 });
    }
    const active =
      body?.active !== undefined || body?.is_active !== undefined
        ? Boolean(body?.active ?? body?.is_active)
        : Boolean(existing.is_active);
    const classificationPatch = parseInstitutionClassificationsFromBody(body);
    const classificationEntries = classificationPatch
      ? institutionClassificationPatchEntries(classificationPatch)
      : [];

    const setParts = [
      'name = $2',
      "city = NULLIF($3, '')",
      "state = NULLIF($4, '')",
      "pincode = NULLIF($5, '')",
      "website = NULLIF($6, '')",
      "email = NULLIF($7, '')",
      "communication_email = COALESCE(NULLIF($7, ''), communication_email)",
      "phone = NULLIF($8, '')",
      "naac_grade = NULLIF($9, '')",
      'nirf_rank = $10',
      'is_active = $11',
    ];
    // Must not be named `params` — that shadows the Next.js route `params` and throws TDZ on every PATCH.
    const queryParams = [id, name, city, state, pincode, website, email, phone, naac, nirfRank, active];
    for (const entry of classificationEntries) {
      queryParams.push(entry.value);
      setParts.push(`${entry.column} = $${queryParams.length}`);
    }
    setParts.push('updated_at = NOW()');

    const updated = await query(
      `UPDATE tenants
       SET ${setParts.join(',\n         ')}
       WHERE id = $1::uuid AND type = 'college'
       RETURNING id`,
      queryParams,
    );

    if (!updated.rowCount) {
      return NextResponse.json({ error: 'College not found' }, { status: 404 });
    }

    if (active !== Boolean(existing.is_active)) {
      await syncCollegeAdminUsersActive(query, id, active);
    }

    const row = await loadCollege(id);
    const college = mapCollege(row);
    void writeAuditLog({
      userId: auth.session?.user?.id,
      tenantId: id,
      action: active !== Boolean(existing.is_active)
        ? (active ? 'REACTIVATE_COLLEGE' : 'DEACTIVATE_COLLEGE')
        : 'UPDATE_COLLEGE',
      entityType: 'tenants',
      entityId: id,
      oldValues: {
        name: existing.name,
        city: existing.city,
        state: existing.state,
        email: existing.email,
        naac: existing.naac_grade,
        nirfRank: existing.nirf_rank,
        active: Boolean(existing.is_active),
      },
      newValues: auditNewValues(`${college.name} updated`, {
        name: college.name,
        city: college.city,
        state: college.state,
        email: college.email,
        naac: college.naac,
        nirfRank: college.nirfRank,
        active: college.active,
      }),
      ipAddress: getRequestClientIp(request),
    });
    return NextResponse.json({ college });
  } catch (error) {
    console.error('PATCH /api/admin/colleges/[id]', error);
    return NextResponse.json({ error: 'Failed to update college' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  PATCH: __platform_PATCH,
}, { context: 'api_admin_colleges_id' });
export const GET = __platformApiHandlers.GET;
export const PATCH = __platformApiHandlers.PATCH;
