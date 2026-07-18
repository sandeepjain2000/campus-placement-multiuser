import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




const LIMIT = 50;

function mailboxFromUrl(url) {
  const sp = new URL(url).searchParams.get('mailbox');
  if (sp === 'trash') return 'trash';
  if (sp === 'starred') return 'starred';
  return 'inbox';
}

function mailboxWhereClause(mailbox) {
  if (mailbox === 'trash') {
    return 'deleted_at IS NOT NULL';
  }
  if (mailbox === 'starred') {
    return 'deleted_at IS NULL AND is_starred = true';
  }
  return 'deleted_at IS NULL';
}

async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mailbox = mailboxFromUrl(request.url);

    const whereMailbox = mailboxWhereClause(mailbox);

    const res = await query(
      `SELECT id, title, message, type, link, is_read, is_starred, created_at, deleted_at
       FROM notifications
       WHERE user_id = $1::uuid
         AND ${whereMailbox}
       ORDER BY created_at DESC
       LIMIT $2`,
      [session.user.id, LIMIT],
    );

    const counts = await query(
      `SELECT
         COUNT(*) FILTER (WHERE deleted_at IS NULL)::int AS inbox_total,
         COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_read = false)::int AS inbox_unread,
         COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_starred = true)::int AS starred_total,
         COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_starred = true AND is_read = false)::int AS starred_unread,
         COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::int AS trash_total
       FROM notifications
       WHERE user_id = $1::uuid`,
      [session.user.id],
    );
    const c = counts.rows[0] || {};

    const settingsRes = await query(
      `SELECT
         COALESCE(NULLIF(TRIM(settings->'adminSettings'->>'fromEmail'), ''), NULLIF(TRIM(settings->'adminSettings'->>'supportEmail'), '')) AS sender
       FROM tenants
       ORDER BY created_at ASC
       LIMIT 1`,
    );
    const notificationSenderEmail = settingsRes.rows[0]?.sender || null;

    return NextResponse.json({
      notifications: res.rows,
      unreadCount: c.inbox_unread ?? 0,
      inboxCount: c.inbox_total ?? 0,
      starredCount: c.starred_total ?? 0,
      starredUnreadCount: c.starred_unread ?? 0,
      trashCount: c.trash_total ?? 0,
      notificationSenderEmail,
      mailbox,
    });
  } catch (e) {
    console.error('GET /api/notifications', e);
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
  }
}

async function __platform_PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { markAllRead, ids, trashIds, restoreIds, starIds, unstarIds } = body;

    if (markAllRead) {
      await query(
        `UPDATE notifications SET is_read = true
         WHERE user_id = $1::uuid AND is_read = false AND deleted_at IS NULL`,
        [session.user.id],
      );
      return NextResponse.json({ ok: true });
    }

    if (Array.isArray(ids) && ids.length) {
      await query(
        `UPDATE notifications SET is_read = true
         WHERE user_id = $1::uuid AND id = ANY($2::uuid[]) AND deleted_at IS NULL`,
        [session.user.id, ids],
      );
      return NextResponse.json({ ok: true });
    }

    if (Array.isArray(trashIds) && trashIds.length) {
      await query(
        `UPDATE notifications SET deleted_at = NOW()
         WHERE user_id = $1::uuid AND id = ANY($2::uuid[]) AND deleted_at IS NULL`,
        [session.user.id, trashIds],
      );
      return NextResponse.json({ ok: true });
    }

    if (Array.isArray(restoreIds) && restoreIds.length) {
      await query(
        `UPDATE notifications SET deleted_at = NULL
         WHERE user_id = $1::uuid AND id = ANY($2::uuid[]) AND deleted_at IS NOT NULL`,
        [session.user.id, restoreIds],
      );
      return NextResponse.json({ ok: true });
    }

    if (Array.isArray(starIds) && starIds.length) {
      await query(
        `UPDATE notifications SET is_starred = true
         WHERE user_id = $1::uuid AND id = ANY($2::uuid[]) AND deleted_at IS NULL`,
        [session.user.id, starIds],
      );
      return NextResponse.json({ ok: true });
    }

    if (Array.isArray(unstarIds) && unstarIds.length) {
      await query(
        `UPDATE notifications SET is_starred = false
         WHERE user_id = $1::uuid AND id = ANY($2::uuid[])`,
        [session.user.id, unstarIds],
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: 'markAllRead, ids, trashIds, restoreIds, starIds, or unstarIds required' },
      { status: 400 },
    );
  } catch (e) {
    console.error('PATCH /api/notifications', e);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}

async function __platform_DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { ids, emptyTrash } = body;

    if (emptyTrash === true) {
      await query(`DELETE FROM notifications WHERE user_id = $1::uuid AND deleted_at IS NOT NULL`, [
        session.user.id,
      ]);
      return NextResponse.json({ ok: true });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array or emptyTrash required' }, { status: 400 });
    }

    await query(
      `DELETE FROM notifications
       WHERE user_id = $1::uuid AND id = ANY($2::uuid[]) AND deleted_at IS NOT NULL`,
      [session.user.id, ids],
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/notifications', e);
    return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  PATCH: __platform_PATCH,
  DELETE: __platform_DELETE,
}, { context: 'api_notifications' });
export const GET = __platformApiHandlers.GET;
export const PATCH = __platformApiHandlers.PATCH;
export const DELETE = __platformApiHandlers.DELETE;
