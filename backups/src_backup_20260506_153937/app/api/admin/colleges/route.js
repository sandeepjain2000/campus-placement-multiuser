import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT
        t.id,
        t.name,
        t.slug,
        t.city,
        t.naac_grade,
        t.is_active,
        t.created_at,
        COUNT(sp.id) AS students,
        SUM(CASE WHEN sp.placement_status = 'placed' THEN 1 ELSE 0 END) AS placed
      FROM tenants t
      LEFT JOIN student_profiles sp ON sp.tenant_id = t.id
      WHERE t.type = 'college'
      GROUP BY t.id, t.name, t.slug, t.city, t.naac_grade, t.is_active, t.created_at
      ORDER BY t.created_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const rows = result?.rows || [];
    return NextResponse.json({
      colleges: rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        city: r.city || '—',
        naac: r.naac_grade || '—',
        students: Number(r.students || 0),
        placed: Number(r.placed || 0),
        active: Boolean(r.is_active),
      })),
      page,
      limit,
    });
  } catch (error) {
    console.error('Failed to load admin colleges:', error.message);
    return NextResponse.json({ error: 'Failed to load colleges' }, { status: 500 });
  }
}
