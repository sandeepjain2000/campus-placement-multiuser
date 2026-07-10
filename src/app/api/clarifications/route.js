import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import {
  assertActiveEmployerTieUp,
  resolveEmployerIdByCompanyName,
} from '@/lib/employerTieUp';
import { resolveStudentProfileByUserId } from '@/lib/studentProfileResolve';
import { isUuid } from '@/lib/tenantContext';
import {
  buildPlatformErrorResponse,
  postgresErrorHint,
  sanitizePayloadForLog,
} from '@/lib/platformErrorLog';

const MAX_QUESTIONS = 5;

function defaultPayload() {
  return { batches: [] };
}

function resolveTenantId(session) {
  const id = session?.user?.tenant_id ?? session?.user?.tenantId ?? null;
  return id && String(id).trim() ? String(id).trim() : null;
}

async function resolveClarificationsTenantId(session) {
  const fromSession = resolveTenantId(session);
  if (fromSession) return fromSession;

  const userId = session?.user?.id || session?.user?.sub;
  if (!userId) return null;

  if (session?.user?.role === 'student') {
    const profile = await resolveStudentProfileByUserId(userId);
    if (profile?.tenant_id) return String(profile.tenant_id);
  }

  const r = await query(`SELECT tenant_id FROM users WHERE id = $1::uuid LIMIT 1`, [userId]);
  const tenantId = r.rows[0]?.tenant_id;
  return tenantId ? String(tenantId) : null;
}

function actorUserId(session) {
  const id = session?.user?.id || session?.user?.sub || null;
  const trimmed = id && String(id).trim() ? String(id).trim() : null;
  return trimmed && isUuid(trimmed) ? trimmed : null;
}

async function clarificationFailureResponse(error, opts) {
  if (/timeout exceeded when trying to connect/i.test(String(error?.message || ''))) {
    const err = new Error('Database connection timed out. Please try again in a few seconds.');
    err.statusCode = 503;
    return buildPlatformErrorResponse(err, opts);
  }
  if (error?.code === '42P01') {
    const err = new Error('Clarifications are not set up on this database. Contact your placement office.');
    err.statusCode = 503;
    return buildPlatformErrorResponse(err, opts);
  }
  const hint = postgresErrorHint(error);
  if (hint && error instanceof Error) {
    error.message = `${error.message || opts.defaultMessage}. ${hint}`;
  }
  return buildPlatformErrorResponse(error, opts);
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

  // Group by company name (case-insensitive) so all batches for same company merge into one card
  const companiesMap = new Map();
  for (const row of res.rows) {
    const key = row.company.trim().toLowerCase();
    if (!companiesMap.has(key)) {
      companiesMap.set(key, {
        id: row.batch_id,
        company: row.company.trim(),
        postedBy: row.posted_by,
        postedAt: row.posted_at,
        questions: [],
      });
    }
    if (row.question_id) {
      const entry = companiesMap.get(key);
      if (!entry.questions.some(q => q.id === row.question_id)) {
        entry.questions.push({
          id: row.question_id,
          text: row.question_text,
          answer: row.answer_text || '',
          answeredBy: row.answered_by || '',
        });
      }
    }
  }

  return { batches: Array.from(companiesMap.values()) };
}

async function __platform_GET(request) {
  let session = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = await resolveClarificationsTenantId(session);
    if (!tenantId || !isUuid(tenantId)) {
      return NextResponse.json(
        { error: 'Your campus could not be resolved. Sign out and sign in again, or contact your placement office.' },
        { status: 403 },
      );
    }
    const payload = await loadPayload(tenantId);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Failed to load clarifications:', error);
    const { status, body } = await clarificationFailureResponse(error, {
      context: 'api_clarifications',
      request,
      sessionUser: session?.user,
      defaultMessage: 'Failed to load clarifications',
    });
    return NextResponse.json(body, { status });
  }
}

async function __platform_POST(request) {
  let session = null;
  let requestBody = null;
  let tenantId = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user || !['college_admin', 'super_admin', 'student'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    tenantId = await resolveClarificationsTenantId(session);
    if (!tenantId || !isUuid(tenantId)) {
      return NextResponse.json(
        { error: 'Your campus could not be resolved. Sign out and sign in again, or contact your placement office.' },
        { status: 403 },
      );
    }

    requestBody = await request.json();
    const company = String(requestBody?.company || '').trim();
    const postedBy = String(requestBody?.postedBy || '').trim();
    const questionTexts = Array.isArray(requestBody?.questionTexts) ? requestBody.questionTexts : [];
    const trimmed = questionTexts.map((t) => String(t || '').trim()).filter(Boolean).slice(0, MAX_QUESTIONS);
    if (!company || !postedBy || trimmed.length === 0) {
      return NextResponse.json({ error: 'company, postedBy and at least one question are required' }, { status: 400 });
    }

    if (session.user.role === 'student') {
      const employerId = await resolveEmployerIdByCompanyName(tenantId, company);
      if (employerId) {
        const tieUp = await assertActiveEmployerTieUp(tenantId, employerId);
        if (!tieUp.ok) {
          return NextResponse.json({ error: tieUp.error }, { status: 403 });
        }
      }
    }

    const createdBy = actorUserId(session);

    await transaction(async (client) => {
      const batchInsert = await client.query(
        `INSERT INTO clarification_batches (tenant_id, company, posted_by, posted_at, created_by)
         VALUES ($1::uuid, $2, $3, CURRENT_DATE, $4::uuid)
         RETURNING id`,
        [tenantId, company, postedBy, createdBy],
      );
      const batchId = batchInsert.rows[0]?.id;
      if (!batchId) {
        throw new Error('Clarification batch was not created');
      }

      for (const text of trimmed) {
        await client.query(
          `INSERT INTO clarification_questions (batch_id, question_text)
           VALUES ($1::uuid, $2)`,
          [batchId, text],
        );
      }
    });

    try {
      const payload = await loadPayload(tenantId);
      return NextResponse.json(payload);
    } catch (reloadError) {
      console.error('Clarifications saved but reload failed:', reloadError);
      return NextResponse.json({ batches: [], published: true });
    }
  } catch (error) {
    console.error('Failed to publish clarification batch:', error);
    const { status, body } = await clarificationFailureResponse(error, {
      context: 'api_clarifications',
      request,
      sessionUser: session?.user,
      tenantId,
      requestBody: sanitizePayloadForLog(requestBody),
      defaultMessage: 'Failed to publish clarification batch',
    });
    return NextResponse.json(body, { status });
  }
}

async function __platform_PATCH(request) {
  let session = null;
  let tenantId = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user || !['employer', 'super_admin', 'college_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    tenantId = await resolveClarificationsTenantId(session);
    if (!tenantId || !isUuid(tenantId)) {
      return NextResponse.json(
        { error: 'Your campus could not be resolved. Sign out and sign in again, or contact your placement office.' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const batchId = String(body?.batchId || '').trim();
    const questionId = String(body?.questionId || '').trim();
    const answer = String(body?.answer || '').trim();
    const answeredBy = String(body?.answeredBy || '').trim();
    if (!batchId || !questionId || !answer) {
      return NextResponse.json({ error: 'batchId, questionId and answer are required' }, { status: 400 });
    }

    if (session.user.role === 'employer') {
      const batchRow = await query(
        `SELECT company FROM clarification_batches WHERE id = $1::uuid AND tenant_id = $2::uuid LIMIT 1`,
        [batchId, tenantId],
      );
      const batchCompany = batchRow.rows[0]?.company;
      if (batchCompany) {
        const employerIdRes = await query(
          `SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`,
          [session.user.id || session.user.sub],
        );
        const employerId = employerIdRes.rows[0]?.id;
        if (employerId) {
          const tieUp = await assertActiveEmployerTieUp(tenantId, employerId);
          if (!tieUp.ok) {
            return NextResponse.json({ error: tieUp.error }, { status: 403 });
          }
        }
      }
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
    const { status, body } = await clarificationFailureResponse(error, {
      context: 'api_clarifications',
      request,
      sessionUser: session?.user,
      tenantId,
      defaultMessage: 'Failed to save clarification answer',
    });
    return NextResponse.json(body, { status });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
  PATCH: __platform_PATCH,
}, { context: 'api_clarifications' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
export const PATCH = __platformApiHandlers.PATCH;
