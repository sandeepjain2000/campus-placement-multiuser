import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getSessionTenantId } from '@/lib/tenantContext';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




function normalizeVariables(raw) {
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v || '').trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = getSessionTenantId(session.user);
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant' }, { status: 400 });
    }

    const r = await query(
      `SELECT id, name, subject, body, template_type, variables, is_active, created_at, updated_at
       FROM message_templates
       WHERE tenant_id = $1::uuid
       ORDER BY updated_at DESC NULLS LAST, created_at DESC`,
      [tenantId],
    );

    return NextResponse.json({ templates: r.rows });
  } catch (e) {
    console.error('GET /api/college/message-templates', e);
    return NextResponse.json({ error: e.message || 'Failed to load templates' }, { status: 500 });
  }
}

async function __platform_POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = getSessionTenantId(session.user);
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant' }, { status: 400 });
    }

    const body = await request.json();
    const name = String(body.name || '').trim();
    const subject = String(body.subject || '').trim();
    const textBody = String(body.body || '').trim();
    const templateType = String(body.templateType || body.template_type || 'email').toLowerCase();
    const isActive = body.isActive !== false && body.is_active !== false;
    const variables = normalizeVariables(body.variables);

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!textBody) {
      return NextResponse.json({ error: 'Body is required' }, { status: 400 });
    }
    if (!['email', 'sms', 'notification'].includes(templateType)) {
      return NextResponse.json({ error: 'Invalid template type' }, { status: 400 });
    }

    const r = await query(
      `INSERT INTO message_templates (tenant_id, name, subject, body, template_type, variables, is_active)
       VALUES ($1::uuid, $2, $3, $4, $5, $6::text[], $7)
       RETURNING id, name, subject, body, template_type, variables, is_active, created_at, updated_at`,
      [tenantId, name, subject || null, textBody, templateType, variables.length ? variables : null, isActive],
    );

    return NextResponse.json({ template: r.rows[0] });
  } catch (e) {
    console.error('POST /api/college/message-templates', e);
    if (e.message?.includes('message_templates')) {
      return NextResponse.json({ error: 'message_templates table missing from database' }, { status: 503 });
    }
    return NextResponse.json({ error: e.message || 'Failed to create template' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
}, { context: 'api_college_message_templates' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
