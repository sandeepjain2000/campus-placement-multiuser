import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import {
  INTERNSHIP_PPO_ACCEPTED,
  INTERNSHIP_PPO_DECLINED,
  INTERNSHIP_PPO_STUDENT_PENDING,
  mapInternshipPpoRow,
} from '@/lib/internshipPpo';
import { getOrCreateStudentProfileId } from '@/lib/studentServer';
import { AND_JP_NOT_DELETED, AND_PA_NOT_DELETED } from '@/lib/softDeleteSql';
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

    const res = await query(
      `SELECT pa.id AS program_application_id,
              pa.status,
              jp.title AS opening_title,
              ep.company_name,
              ep.website,
              jp.internship_start_date,
              ip.id AS ppo_id,
              ip.status AS ppo_status,
              ip.employer_notes,
              ip.confirmed_at,
              ip.student_responded_at,
              ip.offer_id,
              ip.revoked_at,
              ip.updated_at AS ppo_updated_at
       FROM internship_ppo ip
       INNER JOIN program_applications pa ON pa.id = ip.program_application_id AND pa.student_id = $1::uuid
       INNER JOIN job_postings jp ON jp.id = pa.job_id AND jp.job_type = 'internship'
       INNER JOIN employer_profiles ep ON ep.id = jp.employer_id
       WHERE ip.status != 'revoked'
         ${AND_PA_NOT_DELETED}
         ${AND_JP_NOT_DELETED}
       ORDER BY ip.confirmed_at DESC`,
      [studentId],
    );

    return NextResponse.json({
      items: res.rows.map((row) => ({
        programApplicationId: String(row.program_application_id),
        status: row.status,
        openingTitle: row.opening_title || 'Internship',
        companyName: row.company_name || 'Company',
        website: row.website || null,
        internshipStartDate: row.internship_start_date,
        ppo: mapInternshipPpoRow({
          id: row.ppo_id,
          program_application_id: row.program_application_id,
          status: row.ppo_status,
          employer_notes: row.employer_notes,
          confirmed_at: row.confirmed_at,
          student_responded_at: row.student_responded_at,
          offer_id: row.offer_id,
          revoked_at: row.revoked_at,
          updated_at: row.ppo_updated_at,
        }),
        canRespond: row.ppo_status === INTERNSHIP_PPO_STUDENT_PENDING,
        jobOfferIssued: Boolean(row.offer_id),
      })),
    });
  } catch (error) {
    if (error?.code === '42P01') {
      return NextResponse.json(
        { error: 'Internship PPO is not available yet. Apply migration 093_internship_ppo.sql.' },
        { status: 503 },
      );
    }
    console.error('GET /api/student/internship-ppo', error);
    return NextResponse.json({ error: 'Failed to load PPO' }, { status: 500 });
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
    const action = String(body.action || '').trim().toLowerCase();

    if (!programApplicationId) {
      return NextResponse.json({ error: 'Internship application is required.' }, { status: 400 });
    }
    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Action must be accept or decline.' }, { status: 400 });
    }

    const check = await query(
      `SELECT ip.id, ip.status, ip.offer_id
       FROM internship_ppo ip
       INNER JOIN program_applications pa ON pa.id = ip.program_application_id AND pa.student_id = $2::uuid
       WHERE ip.program_application_id = $1::uuid ${AND_PA_NOT_DELETED}`,
      [programApplicationId, studentId],
    );
    const row = check.rows[0];
    if (!row) {
      return NextResponse.json({ error: 'PPO not found.' }, { status: 404 });
    }
    if (row.status !== INTERNSHIP_PPO_STUDENT_PENDING) {
      return NextResponse.json({ error: 'This PPO has already been responded to.' }, { status: 400 });
    }

    const nextStatus = action === 'accept' ? INTERNSHIP_PPO_ACCEPTED : INTERNSHIP_PPO_DECLINED;
    const upd = await query(
      `UPDATE internship_ppo
       SET status = $2, student_responded_at = NOW(), updated_at = NOW()
       WHERE id = $1::uuid
       RETURNING id, program_application_id, status, employer_notes, confirmed_at, student_responded_at, offer_id, revoked_at, updated_at`,
      [row.id, nextStatus],
    );

    return NextResponse.json({
      success: true,
      message:
        action === 'accept'
          ? 'PPO accepted. The employer may now issue your formal job offer on My Offers.'
          : 'PPO declined.',
      ppo: mapInternshipPpoRow(upd.rows[0]),
    });
  } catch (error) {
    if (error?.code === '42P01') {
      return NextResponse.json(
        { error: 'Internship PPO is not available yet. Apply migration 093_internship_ppo.sql.' },
        { status: 503 },
      );
    }
    console.error('POST /api/student/internship-ppo', error);
    return NextResponse.json({ error: 'Failed to save PPO response' }, { status: 500 });
  }
}

const handlers = withApiHandlers(
  { GET: __platform_GET, POST: __platform_POST },
  { context: 'api_student_internship_ppo' },
);
export const GET = handlers.GET;
export const POST = handlers.POST;
