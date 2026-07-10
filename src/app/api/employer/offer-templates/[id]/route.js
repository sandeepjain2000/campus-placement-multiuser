import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { DEFAULT_OFFER_TEMPLATE_BODY } from '@/lib/offerTemplateRender';
import { validateEmployerOfferPayload, validateTitlePayload } from '@/lib/apiInputValidation';
import { normalizeTitle } from '@/lib/validators';
import { toDateOnlyString } from '@/lib/dateOnly';
import { normalizeOfferEventType } from '@/lib/offerEventType';
import { withApiHandlers } from '@/lib/platformErrorRoute';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getEmployerId(session) {
  const userId = session?.user?.id;
  if (!userId) return null;
  const r = await query(`SELECT id FROM employer_profiles WHERE user_id = $1 LIMIT 1`, [userId]);
  return r.rows[0]?.id || null;
}

async function __platform_PATCH(request, routeContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const employerId = await getEmployerId(session);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const { id: rawId } = await routeContext.params;
    const id = String(rawId || '').trim();
    if (!id) return NextResponse.json({ error: 'Template id required' }, { status: 400 });

    const body = await request.json();
    const sets = [];
    const vals = [];
    const push = (frag, val) => {
      vals.push(val);
      sets.push(`${frag} $${vals.length}`);
    };

    if (body.name != null) push('name =', String(body.name).trim());
    if (body.jobTitle != null || body.job_title != null) {
      const jobTitle = normalizeTitle(body.jobTitle ?? body.job_title);
      const titleErr = validateTitlePayload(jobTitle, { label: 'Job title' });
      if (titleErr) return NextResponse.json({ error: titleErr }, { status: 400 });
      push('job_title =', jobTitle);
    }
    if (body.salary != null) push('salary =', Number(body.salary) || 0);
    if (body.location != null) push('location =', String(body.location).trim() || null);
    if (body.joiningDate != null || body.joining_date != null) {
      const jd = body.joiningDate ?? body.joining_date;
      push('joining_date =', jd ? toDateOnlyString(String(jd).trim()) : null);
    }
    if (body.responseDeadline != null || body.response_deadline != null) {
      const rd = body.responseDeadline ?? body.response_deadline;
      push('response_deadline =', rd ? toDateOnlyString(String(rd).trim()) : null);
    }
    if (body.bodyTemplate != null || body.body_template != null) {
      const bt = String(body.bodyTemplate ?? body.body_template ?? DEFAULT_OFFER_TEMPLATE_BODY).trim();
      if (!bt) return NextResponse.json({ error: 'Letter body is required' }, { status: 400 });
      push('body_template =', bt);
    }
    if (body.eventType != null || body.event_type != null) {
      push('event_type =', normalizeOfferEventType(body.eventType ?? body.event_type));
    }

    if (!sets.length) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    push('updated_at =', new Date().toISOString());
    vals.push(id, employerId);

    const res = await query(
      `UPDATE employer_offer_templates SET ${sets.join(', ')}
       WHERE id = $${vals.length - 1}::uuid AND employer_id = $${vals.length}::uuid
       RETURNING id`,
      vals,
    );
    if (!res.rows[0]) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/employer/offer-templates/[id]', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

async function __platform_DELETE(_request, routeContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const employerId = await getEmployerId(session);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const { id: rawId } = await routeContext.params;
    const id = String(rawId || '').trim();
    if (!id) return NextResponse.json({ error: 'Template id required' }, { status: 400 });
    await query(
      `UPDATE employer_offer_templates SET is_active = false, updated_at = NOW()
       WHERE id = $1::uuid AND employer_id = $2::uuid`,
      [id, employerId],
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/employer/offer-templates/[id]', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}

const handlers = withApiHandlers(
  { PATCH: __platform_PATCH, DELETE: __platform_DELETE },
  { context: 'api_employer_offer_templates_id' },
);
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
