import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

const ALLOWED_STATUS = new Set(['Submitted', 'Under Review', 'Planned', 'Closed']);

export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const isSuperAdmin = session.user.role === 'super_admin';
    const where = isSuperAdmin ? 'f.id = $1' : 'f.id = $1 AND f.user_id = $2';
    const args = isSuperAdmin ? [id] : [id, session.user.id];

    const itemRes = await query(
      `SELECT f.id, f.title, f.category, f.description, f.status, f.created_at, f.updated_at,
              u.email AS user_email,
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS user_name,
              u.role AS user_role
       FROM platform_feedback f
       LEFT JOIN users u ON u.id = f.user_id
       WHERE ${where}
       LIMIT 1`,
      args,
    );

    if (itemRes.rowCount === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    let replies = [];
    try {
      const repliesRes = await query(
        `SELECT r.id, r.feedback_id, r.message, r.channel, r.created_at,
                ru.email AS author_email,
                TRIM(CONCAT(COALESCE(ru.first_name, ''), ' ', COALESCE(ru.last_name, ''))) AS author_name,
                ru.role AS author_role
         FROM platform_feedback_replies r
         LEFT JOIN users ru ON ru.id = r.author_user_id
         WHERE r.feedback_id = $1
         ORDER BY r.created_at ASC`,
        [id],
      );
      replies = repliesRes.rows;
    } catch (inner) {
      if (inner.code !== '42P01') throw inner;
    }

    return NextResponse.json({ item: itemRes.rows[0], replies });
  } catch (e) {
    console.error('GET /api/feedback/[id]', e);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const body = await req.json();
    const status = String(body.status || '').trim();
    if (!ALLOWED_STATUS.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const res = await query(
      `UPDATE platform_feedback SET status = $1, updated_at = NOW() WHERE id = $2
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

export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const body = await req.json();
    const message = String(body.message || '').trim();
    if (!message) return NextResponse.json({ error: 'Reply message required' }, { status: 400 });

    const feedback = await query(`SELECT id, status FROM platform_feedback WHERE id = $1`, [id]);
    if (feedback.rowCount === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    try {
      const ins = await query(
        `INSERT INTO platform_feedback_replies (feedback_id, author_user_id, message, channel)
         VALUES ($1, $2, $3, 'dashboard')
         RETURNING id, feedback_id, message, channel, created_at`,
        [id, session.user.id, message],
      );

      const existingStatus = feedback.rows[0].status;
      const nextStatus = existingStatus === 'Submitted' ? 'Under Review' : existingStatus;
      await query(
        `UPDATE platform_feedback
         SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [nextStatus, id],
      );

      return NextResponse.json({ reply: ins.rows[0], status: nextStatus }, { status: 201 });
    } catch (inner) {
      if (inner.code === '42P01') {
        return NextResponse.json(
          { error: 'Table platform_feedback_replies missing — run db/migrations/003_platform_feedback_replies.sql' },
          { status: 503 },
        );
      }
      throw inner;
    }
  } catch (e) {
    console.error('POST /api/feedback/[id]', e);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}
