import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { validateCollegeRulesPayload } from '@/lib/apiInputValidation';
import { MAX_INTERNSHIPS_PER_STUDENT } from '@/lib/internshipPlacementRules';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenant_id ?? session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const result = await query(`SELECT * FROM college_settings WHERE tenant_id = $1`, [tenantId]);

    const defaultRules = {
      maxOffers: 1,
      maxInternshipsPerStudent: MAX_INTERNSHIPS_PER_STUDENT,
      acceptanceWindow: 7,
      minCGPA: 6,
      allowBacklogs: false,
      maxBacklogs: 0,
      requirePPT: false,
      autoVerify: false,
      fcfsEnabled: false,
      bufferDays: 0,
      seasonStart: null,
      seasonEnd: null,
    };

    if (!result.rows.length) {
      return NextResponse.json(defaultRules);
    }

    const dbRules = result.rows[0];
    return NextResponse.json({
      maxOffers: dbRules.max_offers_per_student,
      maxInternshipsPerStudent: MAX_INTERNSHIPS_PER_STUDENT,
      acceptanceWindow: dbRules.offer_acceptance_window_days,
      minCGPA: parseFloat(dbRules.min_cgpa_threshold),
      allowBacklogs: dbRules.allow_backlog_students,
      maxBacklogs: dbRules.max_backlogs_allowed,
      requirePPT: dbRules.require_ppt_before_apply,
      autoVerify: dbRules.auto_verify_students,
      fcfsEnabled: dbRules.fcfs_enabled,
      bufferDays: dbRules.buffer_days_between_drives,
      seasonStart: dbRules.placement_season_start ? dbRules.placement_season_start.toISOString().split('T')[0] : null,
      seasonEnd: dbRules.placement_season_end ? dbRules.placement_season_end.toISOString().split('T')[0] : null,
    });
  } catch (error) {
    console.error('Failed to fetch college rules:', error);
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
  }
}

async function __platform_POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenant_id ?? session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }
    const data = await req.json();
    const rulesErr = validateCollegeRulesPayload(data);
    if (rulesErr) {
      return NextResponse.json({ error: rulesErr }, { status: 400 });
    }

    const saved = await query(
      `INSERT INTO college_settings (
        tenant_id,
        max_offers_per_student,
        offer_acceptance_window_days,
        min_cgpa_threshold,
        allow_backlog_students,
        max_backlogs_allowed,
        require_ppt_before_apply,
        auto_verify_students,
        fcfs_enabled,
        buffer_days_between_drives,
        placement_season_start,
        placement_season_end
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (tenant_id)
      DO UPDATE SET
        max_offers_per_student = EXCLUDED.max_offers_per_student,
        offer_acceptance_window_days = EXCLUDED.offer_acceptance_window_days,
        min_cgpa_threshold = EXCLUDED.min_cgpa_threshold,
        allow_backlog_students = EXCLUDED.allow_backlog_students,
        max_backlogs_allowed = EXCLUDED.max_backlogs_allowed,
        require_ppt_before_apply = EXCLUDED.require_ppt_before_apply,
        auto_verify_students = EXCLUDED.auto_verify_students,
        fcfs_enabled = EXCLUDED.fcfs_enabled,
        buffer_days_between_drives = EXCLUDED.buffer_days_between_drives,
        placement_season_start = EXCLUDED.placement_season_start,
        placement_season_end = EXCLUDED.placement_season_end,
        updated_at = NOW()
      RETURNING tenant_id`,
      [
        tenantId,
        Number(data?.maxOffers ?? 0),
        Number(data?.acceptanceWindow ?? 0),
        Number(data?.minCGPA ?? 0),
        Boolean(data?.allowBacklogs),
        Number(data?.maxBacklogs ?? 0),
        Boolean(data?.requirePPT),
        Boolean(data?.autoVerify),
        Boolean(data?.fcfsEnabled),
        Number(data?.bufferDays ?? 0),
        data?.seasonStart || null,
        data?.seasonEnd || null,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Rules saved successfully',
      tenantId: saved.rows[0]?.tenant_id ?? tenantId,
    });
  } catch (error) {
    console.error('Failed to update college rules:', error);
    return NextResponse.json({ error: 'Failed to update rules' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
}, { context: 'api_college_rules' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
