import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const result = await query(
    `SELECT id, email, role, success, created_at
     FROM ip_login_events
     ORDER BY created_at DESC
     LIMIT 100`,
  );
  return NextResponse.json({ items: result.rows });
}
