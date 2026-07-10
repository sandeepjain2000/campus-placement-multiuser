import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campusId = searchParams.get('campusId');
    if (!campusId) return NextResponse.json({ error: 'Campus ID is required' }, { status: 400 });

    const userId = session.user.id;
    const empQuery = await query(`SELECT id FROM employer_profiles WHERE user_id = $1`, [userId]);
    const employerId = empQuery.rows[0]?.id;
    if (!employerId) throw new Error('Employer profile not found');

    const statsQuery = await query(`
      SELECT 
        (SELECT COUNT(DISTINCT job_id) FROM placement_drives WHERE employer_id = $1 AND tenant_id = $2 AND status IN ('scheduled', 'approved')) as active_jobs,
        (SELECT COUNT(*) FROM applications a JOIN placement_drives pd ON a.drive_id = pd.id WHERE pd.employer_id = $1 AND pd.tenant_id = $2) as total_applications,
        (SELECT COUNT(*) FROM applications a JOIN placement_drives pd ON a.drive_id = pd.id WHERE pd.employer_id = $1 AND pd.tenant_id = $2 AND a.status IN ('shortlisted', 'selected')) as shortlisted,
        (SELECT COUNT(*) FROM offers o JOIN placement_drives pd ON o.drive_id = pd.id WHERE pd.employer_id = $1 AND pd.tenant_id = $2) as offers_extended,
        (SELECT COUNT(*) FROM applications a JOIN placement_drives pd ON a.drive_id = pd.id WHERE pd.employer_id = $1 AND pd.tenant_id = $2 AND a.status = 'in_progress') as interview_stage,
        (SELECT COUNT(*) FROM applications a JOIN placement_drives pd ON a.drive_id = pd.id WHERE pd.employer_id = $1 AND pd.tenant_id = $2 AND a.status = 'selected') as selected_count
    `, [employerId, campusId]);

    const appsQuery = await query(`
      SELECT a.id, u.first_name || ' ' || COALESCE(u.last_name, '') as name, j.title as role, 
             t.name as college, sp.cgpa, a.status, a.applied_at as "appliedAt"
      FROM applications a
      JOIN placement_drives pd ON a.drive_id = pd.id
      JOIN job_postings j ON pd.job_id = j.id
      JOIN student_profiles sp ON a.student_id = sp.id
      JOIN users u ON sp.user_id = u.id
      JOIN tenants t ON sp.tenant_id = t.id
      WHERE pd.employer_id = $1 AND pd.tenant_id = $2
      ORDER BY a.applied_at DESC
      LIMIT 5
    `, [employerId, campusId]);

    const drivesQuery = await query(`
      SELECT d.id, t.name as college, d.title as role, d.drive_date as date, d.drive_type as type, d.status
      FROM placement_drives d
      JOIN tenants t ON d.tenant_id = t.id
      WHERE d.employer_id = $1 AND d.tenant_id = $2 AND d.status IN ('approved', 'scheduled')
      ORDER BY d.drive_date ASC
      LIMIT 2
    `, [employerId, campusId]);

    return NextResponse.json({
      stats: {
        activeJobs: parseInt(statsQuery.rows[0].active_jobs || 0),
        totalApplications: parseInt(statsQuery.rows[0].total_applications || 0),
        shortlisted: parseInt(statsQuery.rows[0].shortlisted || 0),
        offersExtended: parseInt(statsQuery.rows[0].offers_extended || 0),
        interviewStage: parseInt(statsQuery.rows[0].interview_stage || 0),
        selectedCount: parseInt(statsQuery.rows[0].selected_count || 0),
      },
      recentApplications: appsQuery.rows,
      upcomingDrives: drivesQuery.rows,
    });
  } catch (error) {
    console.error('Failed to load employer dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to load employer dashboard data' },
      { status: 500 }
    );
  }
}
