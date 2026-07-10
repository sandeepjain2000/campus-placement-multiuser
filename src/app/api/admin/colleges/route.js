import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { hash } from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { generateSurfaceToken } from '@/lib/shardBinding';
import {
  notifyCollegeEnrollmentKey,
  notifyRegistrationResolved,
} from '@/lib/registrationNotify';
import {
  assertCollegeNameAvailable,
  formatCollegeNameInUseMessage,
  normalizeOrganizationName,
} from '@/lib/organizationNames';
import { assertEmailAvailable, formatEmailInUseMessage } from '@/lib/userEmail';
import { slugify } from '@/lib/utils';
import { getPasswordValidationError, validateEmail, validatePersonName } from '@/lib/validators';
import { SP_ACTIVE_ON } from '@/lib/studentProfileActive';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function __platform_GET(request) {
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
      LEFT JOIN student_profiles sp ON sp.tenant_id = t.id AND ${SP_ACTIVE_ON}
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

async function __platform_POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const collegeName = normalizeOrganizationName(body?.collegeName || '');
    const city = String(body?.city || '').trim();
    const state = String(body?.state || '').trim();
    const naacGrade = String(body?.naacGrade || '').trim();
    const adminFirstName = String(body?.adminFirstName || '').trim();
    const adminLastName = String(body?.adminLastName || '').trim();
    const adminEmail = String(body?.adminEmail || '').trim().toLowerCase();
    const adminPassword = String(body?.adminPassword || '').trim();

    if (!collegeName) {
      return NextResponse.json({ error: 'College name is required' }, { status: 400 });
    }
    if (!city || !state) {
      return NextResponse.json({ error: 'City and state are required' }, { status: 400 });
    }
    const firstNameErr = validatePersonName(adminFirstName, { label: 'First name' });
    if (firstNameErr) {
      return NextResponse.json({ error: firstNameErr }, { status: 400 });
    }
    const lastNameErr = validatePersonName(adminLastName, { required: false, label: 'Last name' });
    if (lastNameErr) {
      return NextResponse.json({ error: lastNameErr }, { status: 400 });
    }
    if (!validateEmail(adminEmail)) {
      return NextResponse.json({ error: 'Enter a valid email for the college admin' }, { status: 400 });
    }
    const passwordErr = getPasswordValidationError(adminPassword);
    if (passwordErr) {
      return NextResponse.json({ error: passwordErr }, { status: 400 });
    }

    const passwordHash = await hash(adminPassword, 10);
    const slug = `${slugify(collegeName)}-${Date.now().toString(36)}`;
    const surfaceToken = generateSurfaceToken();

    const created = await transaction(async (client) => {
      try {
        await assertEmailAvailable(client, adminEmail);
      } catch (e) {
        if (e.message === 'EMAIL_EXISTS') {
          const err = new Error(formatEmailInUseMessage(e.existing, { email: adminEmail }));
          err.statusCode = 409;
          throw err;
        }
        if (e.message === 'EMAIL_DIFFERENT_TENANT') {
          const err = new Error(`Email "${adminEmail}" is already registered under a different institution.`);
          err.statusCode = 409;
          throw err;
        }
        throw e;
      }

      try {
        await assertCollegeNameAvailable(client, collegeName);
      } catch (e) {
        if (e.message === 'COLLEGE_NAME_EXISTS') {
          const err = new Error(formatCollegeNameInUseMessage(e.existing, { name: collegeName }));
          err.statusCode = 409;
          throw err;
        }
        throw e;
      }

      const tenantResult = await client.query(
        `INSERT INTO tenants (name, slug, city, state, email, communication_email, naac_grade, is_active)
         VALUES ($1, $2, $3, $4, $5, $5, NULLIF($6, ''), true)
         RETURNING id, name`,
        [collegeName, slug, city, state, adminEmail, naacGrade]
      );
      const tenantId = tenantResult.rows[0].id;

      await client.query(`INSERT INTO college_settings (tenant_id) VALUES ($1)`, [tenantId]);
      await client.query(
        `INSERT INTO shard_binding_pairs (ref_scope_id, surface_token) VALUES ($1, $2)`,
        [tenantId, surfaceToken]
      );

      const userResult = await client.query(
        `INSERT INTO users (
          tenant_id, email, communication_email, password_hash, role,
          first_name, last_name, is_verified, is_active, email_verified_at
        ) VALUES ($1, $2, $2, $3, 'college_admin', $4, $5, true, true, NOW())
        RETURNING id, email, first_name`,
        [tenantId, adminEmail, passwordHash, adminFirstName, adminLastName || '']
      );

      return {
        tenantId,
        collegeName: tenantResult.rows[0].name,
        admin: userResult.rows[0],
        surfaceToken,
      };
    });

    await notifyRegistrationResolved({
      email: created.admin.email,
      firstName: created.admin.first_name,
      approved: true,
      role: 'college_admin',
    });
    await notifyCollegeEnrollmentKey({
      collegeAdminEmail: created.admin.email,
      firstName: created.admin.first_name,
      collegeName: created.collegeName,
      surfaceToken: created.surfaceToken,
    });

    return NextResponse.json(
      {
        college: {
          id: created.tenantId,
          name: created.collegeName,
          city,
          state,
          naac: naacGrade || null,
        },
        admin: {
          id: created.admin.id,
          email: created.admin.email,
          firstName: created.admin.first_name,
        },
        enrollmentKey: created.surfaceToken,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error.statusCode === 409) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('Failed to create college:', error.message);
    return NextResponse.json({ error: 'Failed to create college' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
}, { context: 'api_admin_colleges' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
