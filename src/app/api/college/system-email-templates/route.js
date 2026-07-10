import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getSessionTenantId } from '@/lib/tenantContext';
import {


  COLLEGE_EMAIL_TEMPLATE_KEY_SET,
  COLLEGE_EMAIL_TEMPLATE_KEYS,
  deleteEmailTemplateOverride,
  loadEmailTemplateOverride,
  loadResolvedEmailTemplate,
  upsertEmailTemplateOverride,
} from '@/lib/emailTemplateResolve';
import { SYSTEM_EMAIL_TEMPLATE_META } from '@/lib/systemEmailTemplates';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;


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

    const templates = [];
    for (const templateKey of COLLEGE_EMAIL_TEMPLATE_KEYS) {
      const meta = SYSTEM_EMAIL_TEMPLATE_META[templateKey];
      const resolved = await loadResolvedEmailTemplate(templateKey, {
        scopeType: 'college',
        scopeId: tenantId,
      });
      const override = await loadEmailTemplateOverride('college', tenantId, templateKey);
      if (!resolved) continue;
      templates.push({
        template_key: templateKey,
        title: meta?.title || templateKey,
        summary: meta?.summary || '',
        placeholders: meta?.placeholders || [],
        subject_template: resolved.subject_template,
        body_template: resolved.body_template,
        description: resolved.description || '',
        updated_at: resolved.updated_at || null,
        source: resolved.source || 'system',
        has_override: Boolean(override),
      });
    }

    return NextResponse.json({ templates, tenantId });
  } catch (e) {
    console.error('GET /api/college/system-email-templates', e);
    if (e.message?.includes('email_template_overrides')) {
      return NextResponse.json(
        { error: 'Email template overrides table missing. Apply migration 058_email_template_overrides.sql.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 });
  }
}

async function __platform_PATCH(request) {
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
    const templateKey = String(body.templateKey || '').trim();
    const subjectTemplate = body.subjectTemplate != null ? String(body.subjectTemplate) : '';
    const bodyTemplate = body.bodyTemplate != null ? String(body.bodyTemplate) : '';
    const resetToPlatform = body.resetToPlatform === true;

    if (!templateKey) {
      return NextResponse.json({ error: 'templateKey is required' }, { status: 400 });
    }
    if (!COLLEGE_EMAIL_TEMPLATE_KEY_SET.has(templateKey)) {
      return NextResponse.json({ error: 'This template cannot be edited by your college' }, { status: 400 });
    }

    if (resetToPlatform) {
      await deleteEmailTemplateOverride('college', tenantId, templateKey);
      const resolved = await loadResolvedEmailTemplate(templateKey, {
        scopeType: 'college',
        scopeId: tenantId,
      });
      return NextResponse.json({ template: resolved, reset: true });
    }

    if (!subjectTemplate.trim()) {
      return NextResponse.json({ error: 'Subject template cannot be empty' }, { status: 400 });
    }
    if (!bodyTemplate.trim()) {
      return NextResponse.json({ error: 'Body template cannot be empty' }, { status: 400 });
    }

    const row = await upsertEmailTemplateOverride(
      'college',
      tenantId,
      templateKey,
      subjectTemplate,
      bodyTemplate,
      session.user.id,
    );

    return NextResponse.json({
      template: {
        template_key: row.template_key,
        subject_template: row.subject_template,
        body_template: row.body_template,
        updated_at: row.updated_at,
        source: 'override',
      },
    });
  } catch (e) {
    console.error('PATCH /api/college/system-email-templates', e);
    return NextResponse.json({ error: 'Failed to save template' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  PATCH: __platform_PATCH,
}, { context: 'api_college_system_email_templates' });
export const GET = __platformApiHandlers.GET;
export const PATCH = __platformApiHandlers.PATCH;
