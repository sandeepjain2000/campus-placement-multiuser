import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { AND_APP_NOT_DELETED, AND_DRIVE_NOT_DELETED, AND_JP_NOT_DELETED } from '@/lib/softDeleteSql';
import { STUDENT_PROFILE_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { ALUMNI_BROWSE_JOBS_PATH } from '@/lib/alumniRoutes';
import { EMPLOYER_ALUMNI_JOBS_PATH } from '@/lib/employerAlumniRoutes';
import { programApplicationNotDeletedSql } from '@/lib/migrationReady';
import { resolveAlumniStudentFlag } from '@/lib/studentAlumniServer';

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const role = session.user.role;

    let progress = {
      isComplete: false,
      steps: [],
      dismissed: false
    };

    if (role === 'student') {
      const isAlumni = await resolveAlumniStudentFlag(userId, session.user);

      // Step 1: Complete Academic Profile
      // Step 2: Upload Resume
      const profileRes = await query(
        `SELECT id, cgpa, resume_url FROM student_profiles WHERE user_id = $1 AND ${STUDENT_PROFILE_ACTIVE_CLAUSE} LIMIT 1`,
        [userId]
      );
      const profile = profileRes.rows[0];
      
      const hasCgpa = profile && profile.cgpa !== null && profile.cgpa > 0;
      const hasResume = profile && profile.resume_url !== null && profile.resume_url.trim() !== '';

      // Step 3: first application (placement drives vs alumni jobs)
      let hasApplications = false;
      if (profile) {
        if (isAlumni) {
          const paNotDeletedSql = await programApplicationNotDeletedSql('pa');
          const appsRes = await query(
            `SELECT 1 FROM program_applications pa WHERE pa.student_id = $1::uuid ${paNotDeletedSql} LIMIT 1`,
            [profile.id],
          );
          hasApplications = appsRes.rowCount > 0;
        } else {
          const appsRes = await query(
            `SELECT 1 FROM applications a WHERE a.student_id = $1 ${AND_APP_NOT_DELETED} LIMIT 1`,
            [profile.id],
          );
          hasApplications = appsRes.rowCount > 0;
        }
      }

      progress.steps = [
        { id: 'academic', title: 'Complete Academic Profile', completed: !!hasCgpa, href: '/dashboard/student/profile' },
        { id: 'resume', title: 'Upload Resume', completed: !!hasResume, href: '/dashboard/student/documents' },
        {
          id: 'apply',
          title: isAlumni ? 'Apply to Your First Alumni Job' : 'Apply to First Job',
          completed: !!hasApplications,
          href: isAlumni ? ALUMNI_BROWSE_JOBS_PATH : '/dashboard/student/drives',
        },
      ];
      
      progress.isComplete = progress.steps.every(s => s.completed);

    } else if (role === 'employer') {
      const profileRes = await query(
        `SELECT id, company_name FROM employer_profiles WHERE user_id = $1 LIMIT 1`,
        [userId]
      );
      const profile = profileRes.rows[0];
      const hasProfile = Boolean(profile?.company_name?.trim());

      let hasCampusPartnership = false;
      let hasRecruitingActivity = false;

      if (profile) {
        const [campusRes, drivesRes, jobsRes] = await Promise.all([
          query(
            `SELECT 1 FROM employer_approvals WHERE employer_id = $1 AND status = 'approved' LIMIT 1`,
            [profile.id]
          ),
          query(
            `SELECT 1 FROM placement_drives d WHERE d.employer_id = $1 ${AND_DRIVE_NOT_DELETED} LIMIT 1`,
            [profile.id]
          ),
          query(
            `SELECT 1 FROM job_postings jp WHERE jp.employer_id = $1 ${AND_JP_NOT_DELETED} LIMIT 1`,
            [profile.id]
          ),
        ]);
        hasCampusPartnership = campusRes.rowCount > 0;
        hasRecruitingActivity = drivesRes.rowCount > 0 || jobsRes.rowCount > 0;
      }

      progress.steps = [
        {
          id: 'profile',
          title: 'Complete Company Profile',
          completed: hasProfile,
          href: '/dashboard/employer/profile',
        },
        {
          id: 'campus',
          title: 'Connect with a Campus',
          completed: hasCampusPartnership,
          href: '/dashboard/employer/select-campus',
        },
        {
          id: 'drive',
          title: 'Post a Job or Schedule a Drive',
          completed: hasRecruitingActivity,
          href: EMPLOYER_ALUMNI_JOBS_PATH,
        },
      ];

      progress.isComplete = progress.steps.every((s) => s.completed);
    } else if (role === 'college_admin') {
      // Basic static steps for college admin
      progress.steps = [
        { id: 'settings', title: 'Configure Campus Settings', completed: false, href: '/dashboard/college/settings' },
        { id: 'employers', title: 'Review Employer Requests', completed: false, href: '/dashboard/college/employers/requests' },
        { id: 'students', title: 'Invite Students', completed: false, href: '/dashboard/college/students' },
      ];
      progress.isComplete = false;
    } else {
      // Basic static steps for super admin
      progress.steps = [
        {
          id: 'onboard-orgs',
          title: 'Onboard new colleges & employers',
          completed: false,
          href: '/dashboard/admin/pending-registrations',
        },
        { id: 'colleges', title: 'Manage college directory', completed: false, href: '/dashboard/admin/colleges' },
        { id: 'employers', title: 'Manage employer directory', completed: false, href: '/dashboard/admin/employers' },
        { id: 'settings', title: 'Platform Settings', completed: false, href: '/dashboard/admin/settings' },
      ];
      progress.isComplete = false;
    }

    return NextResponse.json({ progress });
  } catch (error) {
    console.error('Failed to load onboarding progress:', error);
    return NextResponse.json(
      { error: 'Failed to load onboarding progress' },
      { status: 500 }
    );
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_user_onboarding' });
export const GET = __platformApiHandlers.GET;
