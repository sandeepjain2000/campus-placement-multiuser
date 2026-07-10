import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { fetchCollegeAdminUserIds, notifyUsersOneAtATime } from '@/lib/notificationService';

export const dynamic = 'force-dynamic';

// GET /api/employer/campuses
// Returns all colleges with this employer's approval status for each
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    if (!userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get employer profile
    const empResult = await query(
      `SELECT ep.id, ep.company_name FROM employer_profiles ep
       JOIN users u ON u.id = ep.user_id
       WHERE u.id = $1`,
      [userId]
    );
    if (!empResult.rows.length) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });
    }
    const employer = empResult.rows[0];

    // Get all active colleges with stats and this employer's approval status
    const result = await query(
      `SELECT
          t.id,
          t.name,
          t.slug,
          t.city,
          t.state,
          t.logo_url,
          t.naac_grade,
          t.nirf_rank,
          t.accreditation,
          t.website,
          -- Student stats per college
          COUNT(DISTINCT sp.id) AS total_students,
          COUNT(DISTINCT sp.id) FILTER (WHERE sp.placement_status = 'placed') AS placed_students,
          ROUND(AVG(sp.cgpa), 2) AS avg_cgpa,
          -- Employer approval status
          ea.status AS approval_status,
          ea.created_at AS requested_at,
          ea.approved_at,
          -- Active drives count
          COUNT(DISTINCT pd.id) FILTER (WHERE pd.status IN ('scheduled','approved','in_progress')) AS active_drives
       FROM tenants t
       LEFT JOIN student_profiles sp ON sp.tenant_id = t.id
       LEFT JOIN employer_approvals ea ON ea.tenant_id = t.id AND ea.employer_id = $1
       LEFT JOIN placement_drives pd ON pd.tenant_id = t.id AND pd.employer_id = $1
       WHERE t.is_active = true AND t.type = 'college'
       GROUP BY t.id, t.name, t.slug, t.city, t.state, t.logo_url,
                t.naac_grade, t.nirf_rank, t.accreditation, t.website,
                ea.status, ea.created_at, ea.approved_at
       ORDER BY t.name`,
      [employer.id]
    );

    const colleges = result.rows.map((row) => ({
      ...row,
      approval_status: row.approval_status != null ? String(row.approval_status).trim() : null,
    }));

    return NextResponse.json({
      employerId: employer.id,
      companyName: employer.company_name,
      colleges,
    });
  } catch (error) {
    console.error('Campuses API error:', error);
    return NextResponse.json({ error: 'Failed to fetch campuses' }, { status: 500 });
  }
}

// POST /api/employer/campuses
// Request access to a college
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { collegeId } = await req.json();
    if (!collegeId) {
      return NextResponse.json({ error: 'collegeId is required' }, { status: 400 });
    }

    const userId = session.user.id || session.user.sub;
    if (!userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const empResult = await query(
      `SELECT ep.id FROM employer_profiles ep JOIN users u ON u.id = ep.user_id WHERE u.id = $1`,
      [userId]
    );
    if (!empResult.rows.length) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });
    }
    const employerId = empResult.rows[0].id;

    const empName = await query(`SELECT company_name FROM employer_profiles WHERE id = $1::uuid`, [employerId]);
    const companyName = empName.rows[0]?.company_name || 'An employer';

    // New row, or re-open a rejected / blacklisted tie-up as pending again.
    const ins = await query(
      `INSERT INTO employer_approvals (tenant_id, employer_id, status)
       VALUES ($1::uuid, $2::uuid, 'pending')
       ON CONFLICT (tenant_id, employer_id) DO UPDATE SET
         status = 'pending',
         rejection_reason = NULL,
         approved_by = NULL,
         approved_at = NULL
       WHERE employer_approvals.status IN ('rejected', 'blacklisted')
       RETURNING id`,
      [collegeId, employerId],
    );

    if (ins.rows.length > 0) {
      const college = await query(`SELECT name FROM tenants WHERE id = $1::uuid`, [collegeId]);
      const collegeName = college.rows[0]?.name || 'your institution';
      const adminIds = await fetchCollegeAdminUserIds(collegeId);
      await notifyUsersOneAtATime(adminIds, {
        title: `${companyName} requested campus access`,
        message: `${companyName} has requested to partner with ${collegeName}. Review pending employer requests.`,
        type: 'info',
        link: '/dashboard/college/employers/requests',
      });
      return NextResponse.json({
        success: true,
        message: 'Tie-up request submitted',
        notified: true,
      });
    }

    const existing = await query(
      `SELECT status FROM employer_approvals WHERE tenant_id = $1::uuid AND employer_id = $2::uuid`,
      [collegeId, employerId],
    );
    const st = existing.rows[0]?.status;
    if (st === 'pending') {
      return NextResponse.json({
        success: true,
        message: 'A tie-up request is already pending for this campus',
        notified: false,
        alreadyPending: true,
      });
    }
    if (st === 'approved') {
      return NextResponse.json(
        { error: 'You already have an approved tie-up with this campus. Open it from the table.' },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: 'Could not create tie-up request' }, { status: 400 });
  } catch (error) {
    console.error('Campus request error:', error);
    return NextResponse.json({ error: 'Failed to request access' }, { status: 500 });
  }
}
