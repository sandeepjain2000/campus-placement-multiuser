import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import { SP_ACTIVE_ON } from '@/lib/studentProfileActive';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_GET(request) {
  const auth = await requireSuperAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const roleFilter = String(searchParams.get('role') || 'all').trim().toLowerCase();
  const q = String(searchParams.get('q') || '').trim().toLowerCase();
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(200, Math.max(1, Number.parseInt(searchParams.get('limit') || '100', 10)));
  const offset = (page - 1) * limit;

  const includeCollege = roleFilter === 'all' || roleFilter === 'college';
  const includeEmployer = roleFilter === 'all' || roleFilter === 'employer';
  const includeStudent = roleFilter === 'all' || roleFilter === 'student';

  const parts = [];
  const params = [];

  if (includeCollege) {
    params.push(q ? `%${q}%` : null);
    const nameParam = params.length;
    parts.push(`
      SELECT
        'college'::text AS entity_type,
        t.id::text AS entity_id,
        t.name::text AS entity_name,
        COALESCE(t.city, '')::text AS entity_detail,
        t.created_at AS created_at
      FROM tenants t
      WHERE t.type = 'college'
        AND (
          $${nameParam}::text IS NULL
          OR LOWER(t.name) LIKE $${nameParam}
          OR LOWER(COALESCE(t.city, '')) LIKE $${nameParam}
        )
    `);
  }

  if (includeEmployer) {
    params.push(q ? `%${q}%` : null);
    const nameParam = params.length;
    parts.push(`
      SELECT
        'employer'::text AS entity_type,
        ep.id::text AS entity_id,
        ep.company_name::text AS entity_name,
        COALESCE(u.email, '')::text AS entity_detail,
        COALESCE(ep.created_at, u.created_at) AS created_at
      FROM employer_profiles ep
      INNER JOIN users u ON u.id = ep.user_id
      WHERE (
        $${nameParam}::text IS NULL
        OR LOWER(ep.company_name) LIKE $${nameParam}
        OR LOWER(COALESCE(u.email, '')) LIKE $${nameParam}
      )
    `);
  }

  if (includeStudent) {
    params.push(q ? `%${q}%` : null);
    const nameParam = params.length;
    parts.push(`
      SELECT
        'student'::text AS entity_type,
        u.id::text AS entity_id,
        TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))::text AS entity_name,
        COALESCE(u.email, '')::text AS entity_detail,
        u.created_at AS created_at
      FROM users u
      INNER JOIN student_profiles sp ON sp.user_id = u.id AND ${SP_ACTIVE_ON}
      WHERE u.role = 'student'
        AND (
          $${nameParam}::text IS NULL
          OR LOWER(COALESCE(u.first_name, '')) LIKE $${nameParam}
          OR LOWER(COALESCE(u.last_name, '')) LIKE $${nameParam}
          OR LOWER(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))) LIKE $${nameParam}
          OR LOWER(COALESCE(u.email, '')) LIKE $${nameParam}
        )
    `);
  }

  if (parts.length === 0) {
    return NextResponse.json({ entities: [], page, limit, total: 0 });
  }

  const unionSql = parts.join('\nUNION ALL\n');
  params.push(limit, offset);
  const limitParam = params.length - 1;
  const offsetParam = params.length;

  const countResult = await query(`SELECT COUNT(*)::int AS total FROM (${unionSql}) entities`, params.slice(0, -2));
  const total = Number(countResult.rows[0]?.total || 0);

  const result = await query(
    `SELECT entity_type, entity_id, entity_name, entity_detail, created_at
     FROM (${unionSql}) entities
     ORDER BY created_at ASC NULLS LAST, entity_type ASC, entity_name ASC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    params,
  );

  return NextResponse.json({
    entities: (result.rows || []).map((row) => ({
      type: row.entity_type,
      id: row.entity_id,
      name: row.entity_name || '—',
      detail: row.entity_detail || '',
      createdAt: row.created_at,
    })),
    page,
    limit,
    total,
  });
}

const __platformApiHandlers = withApiHandlers(
  { GET: __platform_GET },
  { context: 'api_admin_menu_highlight_entities' },
);
export const GET = __platformApiHandlers.GET;
