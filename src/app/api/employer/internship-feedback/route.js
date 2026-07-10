import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getEmployerProfileId } from '@/lib/employerApplicationAccess';
import {
  isEligibleInternshipApplicationStatus,
  normalizeInternshipFeedbackRating,
  validateInternshipFeedbackText,
} from '@/lib/internshipFeedback';
import { formatStudentSystemId } from '@/lib/studentSystemId';
import { AND_JP_NOT_DELETED, AND_PA_NOT_DELETED } from '@/lib/softDeleteSql';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { withApiHandlers } from '@/lib/platformErrorRoute';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    const employerId = await getEmployerProfileId(userId);
    if (!employerId) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });
    }

    const res = await query(
      `SELECT pa.id AS program_application_id,
              pa.status,
              sp.roll_number,
              t.short_code,
              u.first_name,
              u.last_name,
              jp.id AS job_id,
              jp.title AS opening_title,
              fb.id AS employer_feedback_id,
              fb.rating AS employer_rating,
              fb.feedback_text AS employer_feedback_text,
              fb.updated_at AS employer_feedback_updated_at,
              sfb.rating AS student_rating,
              sfb.feedback_text AS student_feedback_text
       FROM program_applications pa
       INNER JOIN job_postings jp ON jp.id = pa.job_id AND jp.job_type = 'internship' AND jp.employer_id = $1::uuid
       INNER JOIN student_profiles sp ON sp.id = pa.student_id AND ${SP_ACTIVE_CLAUSE}
       INNER JOIN users u ON u.id = sp.user_id
       LEFT JOIN tenants t ON t.id = sp.tenant_id
       LEFT JOIN internship_feedback fb
         ON fb.program_application_id = pa.id AND fb.author_role = 'employer'
       LEFT JOIN internship_feedback sfb
         ON sfb.program_application_id = pa.id AND sfb.author_role = 'student'
       WHERE pa.status = ANY($2::text[])
         ${AND_PA_NOT_DELETED}
         ${AND_JP_NOT_DELETED}
       ORDER BY jp.title, u.first_name`,
      [employerId, ['selected', 'in_progress']],
    );

    return NextResponse.json({
      items: res.rows.map((row) => {
        const first = row.first_name || '';
        const last = row.last_name || '';
        return {
          programApplicationId: String(row.program_application_id),
          status: row.status,
          studentName: `${first} ${last}`.trim() || 'Student',
          rollNumber: row.roll_number || '',
          systemId: formatStudentSystemId(row.short_code, row.roll_number),
          jobId: String(row.job_id),
          openingTitle: row.opening_title || 'Internship',
          employerFeedback: row.employer_feedback_id
            ? {
                id: String(row.employer_feedback_id),
                rating: row.employer_rating != null ? Number(row.employer_rating) : null,
                feedbackText: row.employer_feedback_text,
                updatedAt: row.employer_feedback_updated_at,
              }
            : null,
          studentFeedback: row.student_feedback_text
            ? {
                rating: row.student_rating != null ? Number(row.student_rating) : null,
                feedbackText: row.student_feedback_text,
              }
            : null,
        };
      }),
    });
  } catch (error) {
    if (error?.code === '42P01') {
      return NextResponse.json(
        { error: 'Internship Progress Reviews is not available yet. Apply migration 090_internship_feedback.sql.' },
        { status: 503 },
      );
    }
    console.error('GET /api/employer/internship-feedback', error);
    return NextResponse.json({ error: 'Failed to load internship progress reviews' }, { status: 500 });
  }
}

async function __platform_POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    const employerId = await getEmployerProfileId(userId);
    if (!employerId) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const programApplicationId = String(body.programApplicationId || '').trim();
    const rating = normalizeInternshipFeedbackRating(body.rating);
    const textErr = validateInternshipFeedbackText(body.feedbackText);
    if (!programApplicationId) {
      return NextResponse.json({ error: 'Internship application is required.' }, { status: 400 });
    }
    if (textErr) {
      return NextResponse.json({ error: textErr }, { status: 400 });
    }
    const feedbackText = String(body.feedbackText || '').trim();

    const appRes = await query(
      `SELECT pa.id, pa.status, pa.student_id, sp.tenant_id, pa.job_id
       FROM program_applications pa
       INNER JOIN student_profiles sp ON sp.id = pa.student_id AND ${SP_ACTIVE_CLAUSE}
       INNER JOIN job_postings jp ON jp.id = pa.job_id AND jp.job_type = 'internship' AND jp.employer_id = $2::uuid
       WHERE pa.id = $1::uuid ${AND_PA_NOT_DELETED}`,
      [programApplicationId, employerId],
    );
    const app = appRes.rows[0];
    if (!app) {
      return NextResponse.json({ error: 'Internship application not found.' }, { status: 404 });
    }
    if (!isEligibleInternshipApplicationStatus(app.status)) {
      return NextResponse.json({ error: 'Feedback applies to selected or in-progress interns only.' }, { status: 400 });
    }

    const upsert = await query(
      `INSERT INTO internship_feedback (
         program_application_id, tenant_id, student_profile_id, job_id, employer_id,
         author_role, author_user_id, rating, feedback_text, updated_at
       ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, 'employer', $6::uuid, $7, $8, NOW())
       ON CONFLICT (program_application_id, author_role)
       DO UPDATE SET rating = EXCLUDED.rating,
                     feedback_text = EXCLUDED.feedback_text,
                     author_user_id = EXCLUDED.author_user_id,
                     updated_at = NOW()
       RETURNING id, rating, feedback_text, updated_at`,
      [app.id, app.tenant_id, app.student_id, app.job_id, employerId, userId, rating, feedbackText],
    );

    const row = upsert.rows[0];
    return NextResponse.json({
      success: true,
      feedback: {
        id: String(row.id),
        rating: row.rating != null ? Number(row.rating) : null,
        feedbackText: row.feedback_text,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    if (error?.code === '42P01') {
      return NextResponse.json(
        { error: 'Internship Progress Reviews is not available yet. Apply migration 090_internship_feedback.sql.' },
        { status: 503 },
      );
    }
    console.error('POST /api/employer/internship-feedback', error);
    return NextResponse.json({ error: 'Failed to save progress review' }, { status: 500 });
  }
}

const handlers = withApiHandlers({ GET: __platform_GET, POST: __platform_POST }, { context: 'api_employer_internship_feedback' });
export const GET = handlers.GET;
export const POST = handlers.POST;
