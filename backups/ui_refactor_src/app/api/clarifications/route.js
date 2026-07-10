import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

const MAX_QUESTIONS = 5;

function defaultPayload() {
  return { batches: [] };
}

function resolveTenantId(session) {
  const id = session?.user?.tenant_id ?? session?.user?.tenantId ?? null;
  return id && String(id).trim() ? String(id).trim() : null;
}

async function loadPayload(tenantId) {
  const res = await query(
    `SELECT
      b.id AS batch_id,
      b.company,
      b.posted_by,
      b.posted_at,
      q.id AS question_id,
      q.question_text,
      q.answer_text,
      q.answered_by,
      q.created_at AS question_created_at
     FROM clarification_batches b
     LEFT JOIN clarification_questions q
       ON q.batch_id = b.id
     WHERE b.tenant_id = $1::uuid
     ORDER BY b.posted_at DESC, b.created_at DESC, q.created_at ASC`,
    [tenantId]
  );

  if (res.rows.length === 0) return defaultPayload();

  const batchesById = new Map();
  for (const row of res.rows) {
    if (!batchesById.has(row.batch_id)) {
      batchesById.set(row.batch_id, {
        id: row.batch_id,
        company: row.company,
        postedBy: row.posted_by,
        postedAt: row.posted_at,
        questions: [],
      });
    }
    if (row.question_id) {
      batchesById.get(row.batch_id).questions.push({
        id: row.question_id,
        text: row.question_text,
        answer: row.answer_text || '',
        answeredBy: row.answered_by || '',
      });
    }
  }

  return { batches: Array.from(batchesById.values()) };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = resolveTenantId(session);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 403 });
    }
    const payload = await loadPayload(tenantId);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Failed to load clarifications:', error);
    return NextResponse.json({ error: 'Failed to load clarifications' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['college_admin', 'super_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = resolveTenantId(session);
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const body = await request.json();
    const company = String(body?.company || '').trim();
    const postedBy = String(body?.postedBy || '').trim();
    const questionTexts = Array.isArray(body?.questionTexts) ? body.questionTexts : [];
    const trimmed = questionTexts.map((t) => String(t || '').trim()).filter(Boolean).slice(0, MAX_QUESTIONS);
    if (!company || !postedBy || trimmed.length === 0) {
      return NextResponse.json({ error: 'company, postedBy and at least one question are required' }, { status: 400 });
    }

    const batchInsert = await query(
      `INSERT INTO clarification_batches (tenant_id, company, posted_by, posted_at, created_by)
       VALUES ($1::uuid, $2, $3, CURRENT_DATE, $4::uuid)
       RETURNING id`,
      [tenantId, company, postedBy, session?.user?.id || null]
    );
    const batchId = batchInsert.rows[0].id;

    for (const text of trimmed) {
      await query(
        `INSERT INTO clarification_questions (batch_id, question_text)
         VALUES ($1::uuid, $2)`,
        [batchId, text]
      );
    }

    const payload = await loadPayload(tenantId);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Failed to publish clarification batch:', error);
    return NextResponse.json({ error: 'Failed to publish clarification batch' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['employer', 'super_admin', 'college_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = resolveTenantId(session);
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const body = await request.json();
    const batchId = String(body?.batchId || '').trim();
    const questionId = String(body?.questionId || '').trim();
    const answer = String(body?.answer || '').trim();
    const answeredBy = String(body?.answeredBy || '').trim();
    if (!batchId || !questionId || !answer) {
      return NextResponse.json({ error: 'batchId, questionId and answer are required' }, { status: 400 });
    }

    const ownership = await query(
      `SELECT q.id
       FROM clarification_questions q
       JOIN clarification_batches b ON b.id = q.batch_id
       WHERE q.id = $1::uuid
         AND b.id = $2::uuid
         AND b.tenant_id = $3::uuid
       LIMIT 1`,
      [questionId, batchId, tenantId]
    );
    if (ownership.rows.length === 0) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    await query(
      `UPDATE clarification_questions
       SET answer_text = $1,
           answered_by = $2,
           answered_at = NOW()
       WHERE id = $3::uuid`,
      [answer, answeredBy || 'Recruitment Team', questionId]
    );

    const payload = await loadPayload(tenantId);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Failed to save clarification answer:', error);
    return NextResponse.json({ error: 'Failed to save clarification answer' }, { status: 500 });
  }
}
