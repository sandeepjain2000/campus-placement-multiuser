import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getSessionUserId, isSuperAdmin } from '@/lib/sessionUser';
import { MAX_FEEDBACK_TITLE_LENGTH, normalizeTitle, validateTitle } from '@/lib/validators';

const ALLOWED_CATEGORIES = new Set(['Feature Request', 'Bug Report', 'General Feedback']);

const EMPTY_STATUS_COUNTS = () => ({
  Submitted: 0,
  'Under Review': 0,
  Planned: 0,
  Closed: 0,
});

function mergeStatusCounts(rows) {
  const out = EMPTY_STATUS_COUNTS();
  for (const r of rows || []) {
    if (Object.prototype.hasOwnProperty.call(out, r.status)) {
      out[r.status] = Number(r.n) || 0;
    }
  }
  return out;
}

async function __platform_GET(req) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getSessionUserId(session);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const pageParam = url.searchParams.get('page');
    const pageSizeParam = url.searchParams.get('pageSize');
    const paginate = pageParam != null || pageSizeParam != null;
    const page = Math.max(1, Number.parseInt(pageParam || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(pageSizeParam || '10', 10) || 10));

    const superAdmin = isSuperAdmin(session);
    const params = [];
    const where = superAdmin ? '' : 'WHERE f.user_id = $1::uuid';
    if (!superAdmin) params.push(userId);

    const fromJoins = `
      FROM platform_feedback f
      LEFT JOIN users u ON u.id = f.user_id
      LEFT JOIN tenants t ON t.id = u.tenant_id
      LEFT JOIN employer_profiles ep ON ep.user_id = u.id AND u.role = 'employer'
    `;

    const totalRes = await query(
      `SELECT COUNT(*)::int AS total ${fromJoins} ${where}`,
      [...params],
    );
    const total = totalRes.rows[0]?.total ?? 0;

    const statusRes = await query(
      `SELECT f.status, COUNT(*)::int AS n ${fromJoins} ${where} GROUP BY f.status`,
      [...params],
    );
    const statusCounts = mergeStatusCounts(statusRes.rows);

    let replyCountExpr = '0';
    let latestReplyExpr = 'NULL::text';
    let latestReplyAtExpr = 'NULL::timestamptz';
    try {
      await query(`SELECT 1 FROM platform_feedback_replies LIMIT 0`);
      replyCountExpr = `COALESCE((SELECT COUNT(*)::int FROM platform_feedback_replies r WHERE r.feedback_id = f.id), 0)`;
      latestReplyExpr = `(SELECT r.message FROM platform_feedback_replies r WHERE r.feedback_id = f.id ORDER BY r.created_at DESC LIMIT 1)`;
      latestReplyAtExpr = `(SELECT r.created_at FROM platform_feedback_replies r WHERE r.feedback_id = f.id ORDER BY r.created_at DESC LIMIT 1)`;
    } catch (probe) {
      if (probe.code !== '42P01') throw probe;
    }

    const limitOffset = paginate
      ? `LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
      : '';

    const listParams = paginate ? [...params, pageSize, (page - 1) * pageSize] : [...params];

    const res = await query(
      `SELECT f.id, f.title, f.category, f.description, f.status, f.created_at, f.updated_at,
              u.email AS user_email,
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS user_name,
              u.role AS user_role,
              CASE
                WHEN u.role = 'employer' THEN ep.company_name
                ELSE t.name
              END AS organization_name,
              ${replyCountExpr} AS reply_count,
              ${latestReplyExpr} AS latest_reply,
              ${latestReplyAtExpr} AS latest_reply_at
       ${fromJoins}
       ${where}
       ORDER BY (${replyCountExpr} > 0) DESC, f.created_at DESC
       ${limitOffset}`,
      listParams,
    );

    const payload = {
      items: res.rows,
      total,
      statusCounts,
    };
    if (paginate) {
      payload.page = page;
      payload.pageSize = pageSize;
    }
    return NextResponse.json(payload);
  } catch (e) {
    console.error('GET /api/feedback', e);
    if (e.code === '42P01') {
      return NextResponse.json(
        { error: 'Feedback tables missing — run db migrations for platform feedback.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}

async function __platform_POST(req) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getSessionUserId(session);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const title = normalizeTitle(body.title);
    const category = String(body.category || '').trim();
    const description = String(body.description || '').trim();

    const titleErr = validateTitle(title, {
      label: 'Feedback title',
      maxLength: MAX_FEEDBACK_TITLE_LENGTH,
    });
    if (titleErr) {
      return NextResponse.json({ error: titleErr }, { status: 400 });
    }
    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }
    if (!ALLOWED_CATEGORIES.has(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const ins = await query(
      `INSERT INTO platform_feedback (user_id, title, category, description, status)
       VALUES ($1, $2, $3, $4, 'Submitted')
       RETURNING id, title, category, description, status, created_at`,
      [userId, title, category, description],
    );

    return NextResponse.json({ item: ins.rows[0] }, { status: 201 });
  } catch (e) {
    console.error('POST /api/feedback', e);
    if (e.code === '42P01') {
      return NextResponse.json(
        { error: 'Table platform_feedback missing — run db/migrations/002_platform_feedback.sql' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
}, { context: 'api_feedback' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
