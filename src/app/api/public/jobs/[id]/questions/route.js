import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { loadPublicJobPosting, resolvePublicJobQuestionContext } from '@/lib/publicJobPosting';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';

async function __platform_POST(request, { params }) {
  try {
    const jobId = params?.id;
    const job = await loadPublicJobPosting(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found or not accepting questions' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const questionText = String(body?.question || body?.questionText || '').trim();

    if (!name || !email || !questionText) {
      return NextResponse.json(
        { error: 'Name, email, and question are required' },
        { status: 400 },
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }
    if (questionText.length > 2000) {
      return NextResponse.json({ error: 'Question is too long (max 2000 characters)' }, { status: 400 });
    }

    const ctx = await resolvePublicJobQuestionContext(jobId);
    if (!ctx) {
      return NextResponse.json({ error: 'Could not route question to placement office' }, { status: 400 });
    }

    const postedBy = `${name} <${email}> — re: ${job.title}`;
    const batchInsert = await query(
      `INSERT INTO clarification_batches (tenant_id, company, posted_by, posted_at, created_by)
       VALUES ($1::uuid, $2, $3, CURRENT_DATE, NULL)
       RETURNING id`,
      [ctx.tenantId, ctx.companyName, postedBy],
    );
    const batchId = batchInsert.rows[0]?.id;
    if (!batchId) {
      return NextResponse.json({ error: 'Failed to save question' }, { status: 500 });
    }

    await query(
      `INSERT INTO clarification_questions (batch_id, question_text)
       VALUES ($1::uuid, $2)`,
      [batchId, `[Public job inquiry — ${job.title}]\n${questionText}`],
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST /api/public/jobs/[id]/questions', e);
    return NextResponse.json({ error: 'Failed to submit question' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_public_jobs_id_questions' });
export const POST = __platformApiHandlers.POST;
