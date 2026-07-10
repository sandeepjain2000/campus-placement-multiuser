import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import {
  normalizePostingCampusConstraints,
  POSTING_CAMPUS_CONSTRAINT_CATEGORIES,
  validateCategoryConstraintInput,
} from '@/lib/employerPostingCampusConstraints';
import { respondPlatformError , withApiHandlers } from '@/lib/platformErrorRoute';
import { PLATFORM_ERROR_CONTEXT } from '@/lib/platformErrorContext';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getEmployerId(userId) {
  const res = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  return res.rows[0]?.id || null;
}

async function loadApprovedTenantIds(employerId) {
  const res = await query(
    `SELECT tenant_id::text AS id
     FROM employer_approvals
     WHERE employer_id = $1::uuid AND status = 'approved'`,
    [employerId],
  );
  return new Set(res.rows.map((r) => String(r.id)));
}

async function readConstraints(employerId) {
  try {
    const res = await query(
      `SELECT posting_campus_constraints FROM employer_profiles WHERE id = $1::uuid LIMIT 1`,
      [employerId],
    );
    return normalizePostingCampusConstraints(res.rows[0]?.posting_campus_constraints);
  } catch (err) {
    if (err?.code === '42703') return normalizePostingCampusConstraints({});
    throw err;
  }
}

async function __platform_GET() {
  let session = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employerId = await getEmployerId(session.user.id || session.user.sub);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const constraints = await readConstraints(employerId);
    const approvedTenantIds = [...(await loadApprovedTenantIds(employerId))];

    return NextResponse.json({
      constraints,
      categories: POSTING_CAMPUS_CONSTRAINT_CATEGORIES,
      approvedTenantIds,
    });
  } catch (e) {
    return respondPlatformError(e, {
      context: PLATFORM_ERROR_CONTEXT.EMPLOYER_PROFILE_READ,
      sessionUser: session?.user,
      defaultMessage: 'Failed to load posting campus limits',
      logLabel: 'GET /api/employer/posting-campus-constraints',
    });
  }
}

async function __platform_PATCH(request) {
  let session = null;
  let body = {};
  try {
    session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employerId = await getEmployerId(session.user.id || session.user.sub);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    body = await request.json().catch(() => ({}));
    const category = String(body?.category || '').trim();
    const restricted = body?.restricted === true;
    const tenantIds = Array.isArray(body?.tenantIds) ? body.tenantIds : [];

    const approvedSet = await loadApprovedTenantIds(employerId);
    const current = await readConstraints(employerId);

    if (!category) {
      return NextResponse.json({ error: 'category is required' }, { status: 400 });
    }

    let nextIds = [];
    if (restricted) {
      const validated = validateCategoryConstraintInput(current, category, tenantIds, approvedSet);
      if (!validated.ok) {
        return NextResponse.json({ error: validated.error }, { status: 400 });
      }
      if (!validated.tenantIds.length) {
        return NextResponse.json(
          { error: 'Select at least one approved college when limiting a posting type.' },
          { status: 400 },
        );
      }
      nextIds = validated.tenantIds;
    }

    const next = { ...current, [category]: nextIds };

    try {
      await query(
        `UPDATE employer_profiles
         SET posting_campus_constraints = $1::jsonb, updated_at = NOW()
         WHERE id = $2::uuid`,
        [JSON.stringify(next), employerId],
      );
    } catch (err) {
      if (err?.code === '42703') {
        return NextResponse.json(
          { error: 'Run migration 085_employer_posting_campus_constraints.sql on the database.' },
          { status: 503 },
        );
      }
      throw err;
    }

    return NextResponse.json({ ok: true, constraints: next });
  } catch (e) {
    return respondPlatformError(e, {
      context: PLATFORM_ERROR_CONTEXT.EMPLOYER_PROFILE_UPDATE,
      sessionUser: session?.user,
      requestBody: body,
      defaultMessage: 'Failed to save posting campus limits',
      logLabel: 'PATCH /api/employer/posting-campus-constraints',
    });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  PATCH: __platform_PATCH,
}, { context: 'api_employer_posting_campus_constraints' });
export const GET = __platformApiHandlers.GET;
export const PATCH = __platformApiHandlers.PATCH;
