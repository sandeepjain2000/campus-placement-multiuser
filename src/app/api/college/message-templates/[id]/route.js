import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getSessionTenantId, isUuid } from '@/lib/tenantContext';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




function normalizeVariables(raw) {
  if (raw === undefined) return undefined;
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

async function __platform_PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = getSessionTenantId(session.user);
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant' }, { status: 400 });
    }

    const { id: rawId } = await params;
    const id = rawId ? String(rawId).trim() : '';
    if (!id || !isUuid(id)) {
      return NextResponse.json({ error: 'Invalid template id' }, { status: 400 });
    }

    const body = await request.json();
    const updates = [];
    const values = [];
    let i = 1;

    if (body.name !== undefined) {
      const name = String(body.name || '').trim();
      if (!name) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      updates.push(`name = $${i++}`);
      values.push(name);
    }
    if (body.subject !== undefined) {
      updates.push(`subject = $${i++}`);
      values.push(String(body.subject || '').trim() || null);
    }
    if (body.body !== undefined) {
      const textBody = String(body.body || '').trim();
      if (!textBody) return NextResponse.json({ error: 'Body cannot be empty' }, { status: 400 });
      updates.push(`body = $${i++}`);
      values.push(textBody);
    }
    if (body.templateType !== undefined || body.template_type !== undefined) {
      const templateType = String(body.templateType || body.template_type || 'email').toLowerCase();
      if (!['email', 'sms', 'notification'].includes(templateType)) {
        return NextResponse.json({ error: 'Invalid template type' }, { status: 400 });
      }
      updates.push(`template_type = $${i++}`);
      values.push(templateType);
    }
    if (body.variables !== undefined) {
      const variables = normalizeVariables(body.variables);
      updates.push(`variables = $${i++}::text[]`);
      values.push(variables.length ? variables : null);
    }
    if (body.isActive !== undefined || body.is_active !== undefined) {
      const isActive = Boolean(body.isActive ?? body.is_active);
      updates.push(`is_active = $${i++}::boolean`);
      values.push(isActive);
    }

    if (!updates.length) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    const idParam = values.length + 1;
    values.push(id, tenantId);

    const r = await query(
      `UPDATE message_templates
       SET ${updates.join(', ')}
       WHERE id = $${idParam}::uuid AND tenant_id = $${idParam + 1}::uuid
       RETURNING id, name, subject, body, template_type, variables, is_active, created_at, updated_at`,
      values,
    );

    if (!r.rows[0]) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template: r.rows[0] });
  } catch (e) {
    console.error('PATCH /api/college/message-templates/[id]', e);
    return NextResponse.json({ error: e.message || 'Failed to update template' }, { status: 500 });
  }
}

async function __platform_DELETE(_request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = getSessionTenantId(session.user);
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant' }, { status: 400 });
    }

    const { id: rawId } = await params;
    const id = rawId ? String(rawId).trim() : '';
    if (!id || !isUuid(id)) {
      return NextResponse.json({ error: 'Invalid template id' }, { status: 400 });
    }

    const r = await query(
      `DELETE FROM message_templates WHERE id = $1::uuid AND tenant_id = $2::uuid RETURNING id`,
      [id, tenantId],
    );

    if (!r.rows[0]) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/college/message-templates/[id]', e);
    return NextResponse.json({ error: e.message || 'Failed to delete template' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  PATCH: __platform_PATCH,
  DELETE: __platform_DELETE,
}, { context: 'api_college_message_templates_id' });
export const PATCH = __platformApiHandlers.PATCH;
export const DELETE = __platformApiHandlers.DELETE;
