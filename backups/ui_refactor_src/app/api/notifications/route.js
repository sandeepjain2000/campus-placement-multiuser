import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

const LIMIT = 50;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await query(
      `SELECT id, title, message, type, link, is_read, created_at
       FROM notifications
       WHERE user_id = $1::uuid
       ORDER BY created_at DESC
       LIMIT $2`,
      [session.user.id, LIMIT],
    );

    const unread = await query(
      `SELECT COUNT(*)::int AS c FROM notifications WHERE user_id = $1::uuid AND is_read = false`,
      [session.user.id],
    );

    const settingsRes = await query(
      `SELECT
         COALESCE(NULLIF(TRIM(settings->'adminSettings'->>'fromEmail'), ''), NULLIF(TRIM(settings->'adminSettings'->>'supportEmail'), '')) AS sender
       FROM tenants
       ORDER BY created_at ASC
       LIMIT 1`
    );
    const notificationSenderEmail = settingsRes.rows[0]?.sender || null;

    return NextResponse.json({
      notifications: res.rows,
      unreadCount: unread.rows[0]?.c ?? 0,
      notificationSenderEmail,
    });
  } catch (e) {
    console.error('GET /api/notifications', e);
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { markAllRead, ids } = body;

    if (markAllRead) {
      await query(`UPDATE notifications SET is_read = true WHERE user_id = $1::uuid AND is_read = false`, [
        session.user.id,
      ]);
      return NextResponse.json({ ok: true });
    }

    if (Array.isArray(ids) && ids.length) {
      await query(
        `UPDATE notifications SET is_read = true
         WHERE user_id = $1::uuid AND id = ANY($2::uuid[])`,
        [session.user.id, ids],
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'markAllRead or ids required' }, { status: 400 });
  } catch (e) {
    console.error('PATCH /api/notifications', e);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
