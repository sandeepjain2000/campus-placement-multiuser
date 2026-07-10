import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { isUuid } from '@/lib/adminAuth';
import { getSessionUserId, isSuperAdmin } from '@/lib/sessionUser';
import { notifyFeedbackReply } from '@/lib/feedbackNotify';

const ALLOWED_STATUS = new Set(['Submitted', 'Under Review', 'Planned', 'Closed']);

async function loadReplies(feedbackId) {
  try {
    const repliesRes = await query(
      `SELECT r.id, r.feedback_id, r.message, r.channel, r.created_at,
              ru.email AS author_email,
              TRIM(CONCAT(COALESCE(ru.first_name, ''), ' ', COALESCE(ru.last_name, ''))) AS author_name,
              ru.role AS author_role
       FROM platform_feedback_replies r
       LEFT JOIN users ru ON ru.id = r.author_user_id
       WHERE r.feedback_id = $1::uuid
       ORDER BY r.created_at ASC`,
      [feedbackId],
    );
    return { missingTable: false, rows: repliesRes.rows };
  } catch (e) {
    if (e.code === '42P01') return { missingTable: true, rows: [] };
    throw e;
  }
}

async function __platform_GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getSessionUserId(session);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id || !isUuid(id)) {
      return NextResponse.json({ error: 'Invalid feedback id' }, { status: 400 });
    }

    const superAdmin = isSuperAdmin(session);
    const where = superAdmin ? 'f.id = $1::uuid' : 'f.id = $1::uuid AND f.user_id = $2::uuid';
    const args = superAdmin ? [id] : [id, userId];

    const itemRes = await query(
      `SELECT f.id, f.title, f.category, f.description, f.status, f.created_at, f.updated_at,
              f.user_id,
              u.email AS user_email,
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS user_name,
              u.role AS user_role,
              CASE
                WHEN u.role = 'employer' THEN ep.company_name
                ELSE t.name
              END AS organization_name
       FROM platform_feedback f
       LEFT JOIN users u ON u.id = f.user_id
       LEFT JOIN tenants t ON t.id = u.tenant_id
       LEFT JOIN employer_profiles ep ON ep.user_id = u.id AND u.role = 'employer'
       WHERE ${where}
       LIMIT 1`,
      args,
    );

    if (itemRes.rowCount === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const repliesResult = await loadReplies(id);
    if (repliesResult.missingTable) {
      return NextResponse.json({
        item: itemRes.rows[0],
        replies: [],
        repliesUnavailable: true,
        error: 'Replies table missing — run db/migrations/003_platform_feedback_replies.sql',
      });
    }

    return NextResponse.json({ item: itemRes.rows[0], replies: repliesResult.rows });
  } catch (e) {
    console.error('GET /api/feedback/[id]', e);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}

async function __platform_PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getSessionUserId(session);
    if (!userId || !isSuperAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    if (!id || !isUuid(id)) {
      return NextResponse.json({ error: 'Invalid feedback id' }, { status: 400 });
    }

    const body = await req.json();
    const status = String(body.status || '').trim();
    if (!ALLOWED_STATUS.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const res = await query(
      `UPDATE platform_feedback SET status = $1, updated_at = NOW() WHERE id = $2::uuid
       RETURNING id, status, updated_at`,
      [status, id],
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ item: res.rows[0] });
  } catch (e) {
    console.error('PATCH /api/feedback/[id]', e);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}

async function __platform_POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const authorUserId = getSessionUserId(session);
    if (!authorUserId || !isSuperAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    if (!id || !isUuid(id)) {
      return NextResponse.json({ error: 'Invalid feedback id' }, { status: 400 });
    }

    const body = await req.json();
    const message = String(body.message || '').trim();
    if (!message) {
      return NextResponse.json({ error: 'Reply message required' }, { status: 400 });
    }

    const feedbackRes = await query(
      `SELECT f.id, f.status, f.title, f.user_id,
              u.email AS user_email,
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS user_name
       FROM platform_feedback f
       LEFT JOIN users u ON u.id = f.user_id
       WHERE f.id = $1::uuid`,
      [id],
    );
    if (feedbackRes.rowCount === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const feedback = feedbackRes.rows[0];

    let replyRow;
    try {
      const ins = await query(
        `INSERT INTO platform_feedback_replies (feedback_id, author_user_id, message, channel)
         VALUES ($1::uuid, $2::uuid, $3, 'dashboard')
         RETURNING id, feedback_id, message, channel, created_at`,
        [id, authorUserId, message],
      );
      replyRow = ins.rows[0];
    } catch (inner) {
      if (inner.code === '42P01') {
        return NextResponse.json(
          {
            error:
              'Replies are not enabled yet. Run db/migrations/003_platform_feedback_replies.sql on your database, then try again.',
          },
          { status: 503 },
        );
      }
      console.error('POST /api/feedback/[id] insert failed', inner);
      return NextResponse.json(
        { error: inner.message || 'Could not save reply' },
        { status: 500 },
      );
    }

    const existingStatus = feedback.status;
    const nextStatus = existingStatus === 'Submitted' ? 'Under Review' : existingStatus;
    await query(
      `UPDATE platform_feedback SET status = $1, updated_at = NOW() WHERE id = $2::uuid`,
      [nextStatus, id],
    );

    void notifyFeedbackReply({
      submitterUserId: feedback.user_id,
      submitterEmail: feedback.user_email,
      submitterName: feedback.user_name,
      feedbackTitle: feedback.title,
      replyMessage: message,
    });

    const authorRes = await query(
      `SELECT email,
              TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))) AS author_name,
              role AS author_role
       FROM users WHERE id = $1::uuid`,
      [authorUserId],
    );
    const author = authorRes.rows[0] || {};

    return NextResponse.json(
      {
        reply: {
          ...replyRow,
          author_email: author.email || null,
          author_name: (author.author_name && author.author_name.trim()) || 'Super Admin',
          author_role: author.author_role || 'super_admin',
        },
        status: nextStatus,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error('POST /api/feedback/[id]', e);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
  PATCH: __platform_PATCH,
}, { context: 'api_feedback_id' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
export const PATCH = __platformApiHandlers.PATCH;
