import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

const ALLOWED_CATEGORIES = new Set(['Feature Request', 'Bug Report', 'General Feedback']);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.user.role === 'super_admin';
    const params = [];
    const where = isSuperAdmin ? '' : 'WHERE f.user_id = $1';
    if (!isSuperAdmin) params.push(session.user.id);

    const res = await query(
      `SELECT f.id, f.title, f.category, f.description, f.status, f.created_at, f.updated_at,
              u.email AS user_email,
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS user_name,
              u.role AS user_role,
              COALESCE((SELECT COUNT(*) FROM platform_feedback_replies r WHERE r.feedback_id = f.id), 0) AS reply_count,
              (SELECT r.message FROM platform_feedback_replies r WHERE r.feedback_id = f.id ORDER BY r.created_at DESC LIMIT 1) AS latest_reply,
              (SELECT r.created_at FROM platform_feedback_replies r WHERE r.feedback_id = f.id ORDER BY r.created_at DESC LIMIT 1) AS latest_reply_at
       FROM platform_feedback f
       LEFT JOIN users u ON u.id = f.user_id
       ${where}
       ORDER BY f.created_at DESC`,
      params,
    );
    return NextResponse.json({ items: res.rows });
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

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const title = String(body.title || '').trim();
    const category = String(body.category || '').trim();
    const description = String(body.description || '').trim();

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }
    if (!ALLOWED_CATEGORIES.has(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const ins = await query(
      `INSERT INTO platform_feedback (user_id, title, category, description, status)
       VALUES ($1, $2, $3, $4, 'Submitted')
       RETURNING id, title, category, description, status, created_at`,
      [session.user.id, title, category, description],
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
