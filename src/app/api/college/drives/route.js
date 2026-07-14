import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { isFacebookPageShareConfigured } from '@/lib/facebookPageShare';
import { emailPlacementDriveApproved } from '@/lib/placementDriveEmail';
import { resolveTenantAcademicYear } from '@/lib/resolveAcademicYearFromRequest';
import { AND_DRIVE_NOT_DELETED } from '@/lib/softDeleteSql';
import { DRIVE_APPLICANT_COUNT_SUBQUERY, DRIVE_SELECTED_COUNT_SUBQUERY } from '@/lib/employerApplicationCounts';
import {
  detectDriveApprovalClashes,
  formatClashSummary,
} from '@/lib/calendarClashDetection';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

function getTenantId(session) {
  return session?.user?.tenant_id ?? session?.user?.tenantId ?? null;
}

function mapDriveRow(row, { socialShared = [], staffIds = [] } = {}) {
  return {
    ...row,
    social_shared: socialShared,
    attached_staff_user_ids: staffIds,
  };
}

/**
 * Load drives with tiered SELECTs for DBs missing optional columns
 * (e.g. social_shared from migration 012).
 */
async function loadDrivesForTenant(tenantId, academicYearId = null) {
  const yearFilter = academicYearId
    ? ` AND (d.academic_year_id = $2::uuid OR d.academic_year_id IS NULL OR d.status = 'requested')`
    : '';
  const params = academicYearId ? [tenantId, academicYearId] : [tenantId];
  const baseFrom = `
      FROM placement_drives d
      LEFT JOIN employer_profiles ep ON ep.id = d.employer_id
      WHERE d.tenant_id = $1::uuid${yearFilter} ${AND_DRIVE_NOT_DELETED}
      ORDER BY d.drive_date DESC NULLS LAST, d.created_at DESC`;

  const coreSelectBase = `
        d.id,
        ep.company_name AS company,
        ep.website AS website,
        d.title AS role,
        d.drive_date AS date,
        d.drive_type AS type,
        d.status,
        ${DRIVE_APPLICANT_COUNT_SUBQUERY} AS registered,
        ${DRIVE_SELECTED_COUNT_SUBQUERY} AS selected,
        d.venue,
        d.min_cgpa,
        d.description`;

  const coreSelectJob = `
        d.job_type,
        d.salary_min,
        d.salary_max,
        d.eligible_branches,
        d.max_backlogs,
        d.batch_year,
        d.skills_required,
        d.max_students`;

  const coreSelect = `${coreSelectBase},
        ${coreSelectJob}`;

  const tiers = [
    {
      select: `${coreSelect},
        COALESCE(d.social_shared, ARRAY[]::text[]) AS social_shared,
        COALESCE(d.attached_staff_user_ids, ARRAY[]::uuid[]) AS attached_staff_user_ids`,
      map: (r) =>
        mapDriveRow(r, {
          socialShared: r.social_shared ?? [],
          staffIds: r.attached_staff_user_ids ?? [],
        }),
    },
    {
      select: `${coreSelect},
        COALESCE(d.attached_staff_user_ids, ARRAY[]::uuid[]) AS attached_staff_user_ids`,
      map: (r) => mapDriveRow(r, { socialShared: [], staffIds: r.attached_staff_user_ids ?? [] }),
    },
    {
      select: coreSelect,
      map: (r) => mapDriveRow(r),
    },
    {
      select: `${coreSelectBase},
        COALESCE(d.social_shared, ARRAY[]::text[]) AS social_shared,
        COALESCE(d.attached_staff_user_ids, ARRAY[]::uuid[]) AS attached_staff_user_ids`,
      map: (r) =>
        mapDriveRow(r, {
          socialShared: r.social_shared ?? [],
          staffIds: r.attached_staff_user_ids ?? [],
        }),
    },
    {
      select: coreSelectBase,
      map: (r) => mapDriveRow(r),
    },
  ];

  let lastErr = null;
  for (const tier of tiers) {
    try {
      const res = await query(`SELECT ${tier.select} ${baseFrom}`, params);
      return { rows: res.rows.map(tier.map) };
    } catch (err) {
      lastErr = err;
      if (err?.code === '42703') {
        const msg = String(err?.message || '');
        if (msg.includes('academic_year_id') && academicYearId) {
          return loadDrivesForTenant(tenantId, null);
        }
        continue;
      }
      throw err;
    }
  }

  throw lastErr || new Error('Could not load placement drives');
}

async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantId(session);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    let academicYearId = null;
    try {
      const ay = await resolveTenantAcademicYear(tenantId, searchParams);
      academicYearId = ay.year?.id || null;
    } catch (ayErr) {
      console.warn('College drives: academic year filter skipped:', ayErr?.message || ayErr);
    }

    const drives = await loadDrivesForTenant(tenantId, academicYearId);

    const staff = await query(
      `SELECT id, first_name, last_name, role
       FROM users
       WHERE tenant_id = $1::uuid
         AND role = 'college_admin'
         AND is_active = true
       ORDER BY first_name ASC, last_name ASC`,
      [tenantId],
    );

    return NextResponse.json({
      drives: drives.rows,
      staffDirectory: staff.rows.map((s) => ({
        id: s.id,
        name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
        role: s.role === 'college_admin' ? 'Placement Coordinator' : s.role,
      })),
      integrations: {
        facebookPageShare: isFacebookPageShareConfigured(),
      },
    });
  } catch (error) {
    console.error('Failed to load college drives:', error);
    return NextResponse.json(
      {
        error: 'Failed to load college drives',
        details: error?.message || String(error),
      },
      { status: 500 },
    );
  }
}

async function __platform_PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantId(session);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const body = await request.json();
    const { driveId, action, force } = body || {};
    if (!driveId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'driveId and valid action are required' }, { status: 400 });
    }

    if (action === 'approve' && !force) {
      const pending = await query(
        `SELECT drive_date FROM placement_drives d
         WHERE d.id = $1::uuid AND d.tenant_id = $2::uuid AND d.status = 'requested'
         ${AND_DRIVE_NOT_DELETED}`,
        [driveId, tenantId],
      );
      const driveDate = pending.rows[0]?.drive_date;
      if (driveDate) {
        const clashResult = await detectDriveApprovalClashes(query, tenantId, driveDate, {
          excludeDriveId: driveId,
        });
        if (clashResult.clashes.length) {
          return NextResponse.json(
            {
              error: 'This drive clashes with college academic calendar.',
              code: 'CALENDAR_CLASH',
              clashes: clashResult.clashes,
              bufferDays: clashResult.bufferDays,
              summary: formatClashSummary(clashResult.clashes, {
                bufferDays: clashResult.bufferDays,
              }),
            },
            { status: 409 },
          );
        }
      }
    }

    const nextStatus = action === 'approve' ? 'approved' : 'cancelled';
    const updated = await query(
      `UPDATE placement_drives
       SET status = $1::varchar,
           approved_by = CASE WHEN $1::varchar = 'approved' THEN $2::uuid ELSE approved_by END,
           approved_at = CASE WHEN $1::varchar = 'approved' THEN NOW() ELSE approved_at END,
           updated_at = NOW()
       WHERE id = $3::uuid
         AND tenant_id = $4::uuid
         AND status = 'requested'
       RETURNING id, status, title, drive_date, drive_type, tenant_id, employer_id`,
      [nextStatus, session.user.id, driveId, tenantId],
    );

    if (!updated.rows.length) {
      const meta = await query(
        `SELECT status FROM placement_drives d WHERE d.id = $1::uuid AND d.tenant_id = $2::uuid ${AND_DRIVE_NOT_DELETED}`,
        [driveId, tenantId],
      );
      if (!meta.rows[0]) {
        return NextResponse.json({ error: 'Drive not found' }, { status: 404 });
      }
      const currentStatus = meta.rows[0].status;
      const rejectedAlready = currentStatus === 'cancelled' || currentStatus === 'rejected';
      let error = 'This drive is not awaiting approval.';
      if (action === 'approve' && rejectedAlready) {
        error = 'This drive was rejected and cannot be approved again.';
      } else if (action === 'reject' && currentStatus === 'approved') {
        error = 'This drive is already approved and cannot be rejected.';
      } else if (action === 'reject' && rejectedAlready) {
        error = 'This drive is already rejected.';
      }
      return NextResponse.json({ error, currentStatus }, { status: 409 });
    }

    const row = updated.rows[0];
    if (row.status === 'approved') {
      const meta = await query(
        `SELECT t.name AS college_name, ep.company_name
         FROM placement_drives d
         JOIN tenants t ON t.id = d.tenant_id
         JOIN employer_profiles ep ON ep.id = d.employer_id
         WHERE d.id = $1::uuid ${AND_DRIVE_NOT_DELETED}`,
        [row.id],
      );
      const m = meta.rows[0];
      const dateLabel = row.drive_date
        ? new Date(row.drive_date).toLocaleDateString(undefined, { dateStyle: 'medium' })
        : 'date TBD';
      void emailPlacementDriveApproved({
        companyName: m?.company_name || 'Employer',
        driveTitle: row.title || 'Untitled',
        collegeName: m?.college_name || 'College',
        driveDateLabel: dateLabel,
        driveType: row.drive_type,
        driveId: row.id,
      }).catch((err) => console.error('[mail] placement drive approved', err));
    }

    return NextResponse.json({ success: true, drive: { id: row.id, status: row.status } });
  } catch (error) {
    console.error('Failed to update drive status:', error);
    return NextResponse.json(
      { error: 'Failed to update drive status: ' + (error?.message || String(error)) },
      { status: 500 },
    );
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  PATCH: __platform_PATCH,
}, { context: 'api_college_drives' });
export const GET = __platformApiHandlers.GET;
export const PATCH = __platformApiHandlers.PATCH;
