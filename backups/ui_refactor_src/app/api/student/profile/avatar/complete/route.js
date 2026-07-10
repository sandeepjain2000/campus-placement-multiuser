import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const file_url = String(body.file_url || '').trim();

    if (!file_url || !file_url.startsWith('https://')) {
      return NextResponse.json({ error: 'file_url must be an https URL' }, { status: 400 });
    }

    const upd = await query(
      `UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2 AND role = 'student' RETURNING id, avatar_url`,
      [file_url, session.user.id],
    );

    if (!upd.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ avatar_url: upd.rows[0].avatar_url });
  } catch (e) {
    console.error('POST /api/student/profile/avatar/complete', e);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}
