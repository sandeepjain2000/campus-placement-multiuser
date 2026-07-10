import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { withApiHandlers } from '@/lib/platformErrorRoute';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = String(searchParams.get('search') || '').trim();
    const statusFilter = String(searchParams.get('status') || '').trim();
    const limit = Math.min(Number(searchParams.get('limit') || 200), 1000);
    const offset = Math.max(Number(searchParams.get('offset') || 0), 0);

    const params = [];
    const clauses = [];

    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(
        m.context ILIKE $${params.length} OR
        m.original_to ILIKE $${params.length} OR
        m.after_communication_to ILIKE $${params.length} OR
        m.resolved_to ILIKE $${params.length} OR
        m.recipient_login_email ILIKE $${params.length} OR
        m.recipient_name ILIKE $${params.length} OR
        m.recipient_role ILIKE $${params.length} OR
        m.subject_truncated ILIKE $${params.length} OR
        m.error_message ILIKE $${params.length}
      )`);
    }

    if (statusFilter) {
      params.push(statusFilter);
      clauses.push(`m.status = $${params.length}`);
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT count(*)::int FROM mail_delivery_logs m ${whereClause}`,
      params
    );
    const totalCount = countRes.rows[0]?.count || 0;

    params.push(limit, offset);
    const sql = `
      SELECT
        m.id, m.created_at, m.context, m.status, m.skip_reason,
        m.original_to, m.after_communication_to, m.resolved_to, m.subject_truncated,
        m.error_message, m.error_code, m.message_id, m.smtp_response, m.user_id,
        m.recipient_login_email, m.recipient_user_id, m.recipient_role,
        m.recipient_tenant_id, m.recipient_name,
        u.email AS acting_user_email,
        TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS acting_user_name
      FROM mail_delivery_logs m
      LEFT JOIN users u ON u.id = m.user_id
      ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const logsRes = await query(sql, params);

    return NextResponse.json({
      logs: logsRes.rows,
      totalCount,
    });
  } catch (error) {
    console.error('Failed to load email logs:', error);
    return NextResponse.json({ error: 'Failed to load email logs' }, { status: 500 });
  }
}

const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_admin_email_logs' });
export const GET = __platformApiHandlers.GET;
