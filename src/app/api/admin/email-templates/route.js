import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { EDITABLE_SYSTEM_EMAIL_TEMPLATE_KEY_SET } from '@/lib/systemEmailTemplates';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let rows;
    try {
      const r = await query(
        `SELECT template_key, description, subject_template, body_template, updated_at
         FROM system_email_templates
         ORDER BY template_key`,
      );
      rows = r.rows;
    } catch (e) {
      console.error('GET /api/admin/email-templates', e);
      return NextResponse.json(
        { error: 'Email templates table not found. Apply migration 027_campus_guest_confirmation_email.sql.' },
        { status: 503 },
      );
    }

    return NextResponse.json({ templates: rows });
  } catch (e) {
    console.error('GET /api/admin/email-templates', e);
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 });
  }
}

async function __platform_PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const templateKey = String(body.templateKey || '').trim();
    const subjectTemplate = body.subjectTemplate != null ? String(body.subjectTemplate) : '';
    const bodyTemplate = body.bodyTemplate != null ? String(body.bodyTemplate) : '';

    if (!templateKey) {
      return NextResponse.json({ error: 'templateKey is required' }, { status: 400 });
    }
    if (!subjectTemplate.trim()) {
      return NextResponse.json({ error: 'Subject template cannot be empty' }, { status: 400 });
    }
    if (!bodyTemplate.trim()) {
      return NextResponse.json({ error: 'Body template cannot be empty' }, { status: 400 });
    }

    if (!EDITABLE_SYSTEM_EMAIL_TEMPLATE_KEY_SET.has(templateKey)) {
      return NextResponse.json({ error: 'Unknown template key' }, { status: 400 });
    }

    const r = await query(
      `UPDATE system_email_templates
       SET subject_template = $2,
           body_template = $3,
           updated_at = NOW(),
           updated_by = $4::uuid
       WHERE template_key = $1
       RETURNING template_key, description, subject_template, body_template, updated_at`,
      [templateKey, subjectTemplate, bodyTemplate, session.user.id],
    );

    if (r.rowCount === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template: r.rows[0] });
  } catch (e) {
    console.error('PATCH /api/admin/email-templates', e);
    return NextResponse.json({ error: 'Failed to save template' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  PATCH: __platform_PATCH,
}, { context: 'api_admin_email_templates' });
export const GET = __platformApiHandlers.GET;
export const PATCH = __platformApiHandlers.PATCH;
