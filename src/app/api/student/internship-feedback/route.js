import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import {
  isEligibleInternshipApplicationStatus,
  mapInternshipFeedbackRow,
  normalizeInternshipFeedbackRating,
  validateInternshipFeedbackText,
} from '@/lib/internshipFeedback';
import { mapInternshipGuideRow } from '@/lib/internshipGuide';
import { mapInternshipSupervisorRow } from '@/lib/internshipSupervisor';
import { getOrCreateStudentProfileId } from '@/lib/studentServer';
import { AND_JP_NOT_DELETED, AND_PA_NOT_DELETED } from '@/lib/softDeleteSql';
import { STUDENT_PROFILE_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { withApiHandlers } from '@/lib/platformErrorRoute';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    const studentId = await getOrCreateStudentProfileId(userId);
    if (!studentId) {
      return NextResponse.json({ items: [] });
    }

    const apps = await query(
      `SELECT pa.id AS program_application_id,
              pa.status,
              pa.applied_at,
              jp.id AS job_id,
              jp.title AS opening_title,
              ep.company_name,
              ep.website,
              fb.id AS feedback_id,
              fb.rating,
              fb.feedback_text,
              fb.updated_at AS feedback_updated_at,
              ig.id AS guide_id,
              ig.guide_name,
              ig.guide_email,
              ig.guide_phone,
              ig.guide_department,
              ig.guide_notes,
              ig.updated_at AS guide_updated_at,
              isv.id AS supervisor_id,
              isv.supervisor_name,
              isv.supervisor_email,
              isv.supervisor_phone,
              isv.supervisor_team,
              isv.supervisor_notes,
              isv.updated_at AS supervisor_updated_at
       FROM program_applications pa
       INNER JOIN job_postings jp ON jp.id = pa.job_id AND jp.job_type = 'internship'
       INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
       LEFT JOIN internship_feedback fb
         ON fb.program_application_id = pa.id AND fb.author_role = 'student'
       LEFT JOIN internship_guides ig ON ig.program_application_id = pa.id
       LEFT JOIN internship_supervisors isv ON isv.program_application_id = pa.id
       WHERE pa.student_id = $1::uuid
         AND pa.status = ANY($2::text[])
         ${AND_PA_NOT_DELETED}
         ${AND_JP_NOT_DELETED}
       ORDER BY pa.applied_at DESC`,
      [studentId, ['selected', 'in_progress']],
    );

    return NextResponse.json({
      items: apps.rows.map((row) => ({
        programApplicationId: String(row.program_application_id),
        status: row.status,
        appliedAt: row.applied_at,
        jobId: String(row.job_id),
        openingTitle: row.opening_title || 'Internship',
        companyName: row.company_name || 'Company',
        website: row.website || null,
        feedback: row.feedback_id
          ? {
              id: String(row.feedback_id),
              rating: row.rating != null ? Number(row.rating) : null,
              feedbackText: row.feedback_text,
              updatedAt: row.feedback_updated_at,
            }
          : null,
        guide: mapInternshipGuideRow(
          row.guide_id
            ? {
                id: row.guide_id,
                program_application_id: row.program_application_id,
                guide_name: row.guide_name,
                guide_email: row.guide_email,
                guide_phone: row.guide_phone,
                guide_department: row.guide_department,
                guide_notes: row.guide_notes,
                updated_at: row.guide_updated_at,
              }
            : null,
        ),
        supervisor: mapInternshipSupervisorRow(
          row.supervisor_id
            ? {
                id: row.supervisor_id,
                program_application_id: row.program_application_id,
                supervisor_name: row.supervisor_name,
                supervisor_email: row.supervisor_email,
                supervisor_phone: row.supervisor_phone,
                supervisor_team: row.supervisor_team,
                supervisor_notes: row.supervisor_notes,
                updated_at: row.supervisor_updated_at,
              }
            : null,
        ),
      })),
    });
  } catch (error) {
    if (error?.code === '42P01') {
      return NextResponse.json(
        { error: 'Internship Progress Reviews is not available yet. Apply migration 090_internship_feedback.sql.' },
        { status: 503 },
      );
    }
    console.error('GET /api/student/internship-feedback', error);
    return NextResponse.json({ error: 'Failed to load internship progress reviews' }, { status: 500 });
  }
}

async function __platform_POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    const studentId = await getOrCreateStudentProfileId(userId);
    if (!studentId) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 400 });
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
      `SELECT pa.id, pa.status, pa.student_id, sp.tenant_id, pa.job_id, jp.employer_id
       FROM program_applications pa
       INNER JOIN student_profiles sp ON sp.id = pa.student_id AND ${STUDENT_PROFILE_ACTIVE_CLAUSE}
       INNER JOIN job_postings jp ON jp.id = pa.job_id AND jp.job_type = 'internship'
       WHERE pa.id = $1::uuid AND pa.student_id = $2::uuid ${AND_PA_NOT_DELETED}`,
      [programApplicationId, studentId],
    );
    const app = appRes.rows[0];
    if (!app) {
      return NextResponse.json({ error: 'Internship application not found.' }, { status: 404 });
    }
    if (!isEligibleInternshipApplicationStatus(app.status)) {
      return NextResponse.json(
        { error: 'Feedback is available after you are selected or your internship is in progress.' },
        { status: 400 },
      );
    }

    const upsert = await query(
      `INSERT INTO internship_feedback (
         program_application_id, tenant_id, student_profile_id, job_id, employer_id,
         author_role, author_user_id, rating, feedback_text, updated_at
       ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, 'student', $6::uuid, $7, $8, NOW())
       ON CONFLICT (program_application_id, author_role)
       DO UPDATE SET rating = EXCLUDED.rating,
                     feedback_text = EXCLUDED.feedback_text,
                     author_user_id = EXCLUDED.author_user_id,
                     updated_at = NOW()
       RETURNING id, rating, feedback_text, updated_at`,
      [
        app.id,
        app.tenant_id,
        studentId,
        app.job_id,
        app.employer_id,
        userId,
        rating,
        feedbackText,
      ],
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
    console.error('POST /api/student/internship-feedback', error);
    return NextResponse.json({ error: 'Failed to save progress review' }, { status: 500 });
  }
}

const handlers = withApiHandlers({ GET: __platform_GET, POST: __platform_POST }, { context: 'api_student_internship_feedback' });
export const GET = handlers.GET;
export const POST = handlers.POST;
