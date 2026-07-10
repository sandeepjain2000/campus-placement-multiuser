import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { AND_APP_NOT_DELETED, AND_DRIVE_NOT_DELETED } from '@/lib/softDeleteSql';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { syncPlacementDriveRegisteredCount } from '@/lib/employerApplicationCounts';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function __platform_POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { application_id, withdrawal_reason } = await req.json();

    if (!application_id) {
      return NextResponse.json({ error: 'Application ID required' }, { status: 400 });
    }

    // Identify the student and the drive
    const appQuery = await query(`
      SELECT a.id, a.drive_id, d.max_students
      FROM applications a
      JOIN student_profiles sp ON a.student_id = sp.id
      JOIN placement_drives d ON a.drive_id = d.id
      WHERE a.id = $1::uuid AND sp.user_id = $2::uuid
        AND ${SP_ACTIVE_CLAUSE} ${AND_APP_NOT_DELETED} ${AND_DRIVE_NOT_DELETED}
    `, [application_id, userId]);

    if (appQuery.rowCount === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const { drive_id, max_students } = appQuery.rows[0];

    // Withdraw the application
    await query(`
      UPDATE applications 
      SET status = 'withdrawn', current_round = NULL, withdrawal_reason = $1, updated_at = NOW()
      WHERE id = $2
    `, [withdrawal_reason || 'Student cancelled', application_id]);

    let promotedStudent = null;

    // WAITLIST AUTO-PROMOTION LOGIC
    if (max_students && max_students > 0) {
      // Check current capacity of active people in the drive
      const activeCountReq = await query(`
        SELECT COUNT(*) as count 
        FROM applications a
        WHERE a.drive_id = $1 AND a.status IN ('applied', 'shortlisted', 'in_progress', 'selected')
          ${AND_APP_NOT_DELETED}
      `, [drive_id]);
      
      const activeCount = parseInt(activeCountReq.rows[0].count);

      // If we fall below max capacity, see if there's someone on the waitlist
      if (activeCount < max_students) {
        // Technically waitlists might be logged in `shortlists` or `applications`.
        // We'll assume applications could have a status 'waitlisted' or 'on_hold'.
        
        const nextWaiting = await query(`
          SELECT id 
          FROM applications a
          WHERE a.drive_id = $1 AND a.status = 'on_hold' ${AND_APP_NOT_DELETED}
          ORDER BY applied_at ASC
          LIMIT 1
        `, [drive_id]);

        if (nextWaiting.rowCount > 0) {
          const waitlistId = nextWaiting.rows[0].id;
          
          await query(`
            UPDATE applications 
            SET status = 'applied', updated_at = NOW(), notes = CONCAT(notes, ' [Auto-Promoted from Waitlist]')
            WHERE id = $1
          `, [waitlistId]);

          promotedStudent = waitlistId;
          
          // Optionally trigger an email/notification to the promoted student here
          // INSERT INTO notifications ...
        }
      }
    }

    await syncPlacementDriveRegisteredCount(drive_id);

    return NextResponse.json({ 
      success: true, 
      message:
        'Application withdrawn permanently. You cannot apply again to this opening, and employers will no longer see you as an applicant.',
      waitlist_promoted: promotedStudent !== null
    });

  } catch (error) {
    console.error('Cancel Application Error:', error);
    return NextResponse.json(
      { error: 'Failed to withdraw application' },
      { status: 500 }
    );
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_student_applications_cancel' });
export const POST = __platformApiHandlers.POST;
