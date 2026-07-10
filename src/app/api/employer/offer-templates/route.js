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

function mapTemplateRow(row) {
  return {
    id: String(row.id),
    name: row.name,
    jobTitle: row.job_title,
    salary: Number(row.salary) || 0,
    location: row.location || '',
    joiningDate: row.joining_date ? toDateOnlyString(row.joining_date) : '',
    responseDeadline: row.response_deadline ? toDateOnlyString(row.response_deadline) : '',
    bodyTemplate: row.body_template,
    eventType: normalizeOfferEventType(row.event_type),
    isActive: row.is_active !== false,
    updatedAt: row.updated_at,
  };
}

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const employerId = await getEmployerId(session);
    if (!employerId) return NextResponse.json({ templates: [] });

    const res = await query(
      `SELECT id, name, job_title, salary, location, joining_date, response_deadline, body_template, event_type, is_active, updated_at
       FROM employer_offer_templates
       WHERE employer_id = $1::uuid AND is_active = true
       ORDER BY updated_at DESC`,
      [employerId],
    ).catch((e) => {
      if (e?.code === '42P01') return { rows: [] };
      throw e;
    });

    return NextResponse.json({ templates: res.rows.map(mapTemplateRow) });
  } catch (error) {
    console.error('GET /api/employer/offer-templates', error);
    return NextResponse.json({ error: 'Failed to load offer templates' }, { status: 500 });
  }
}

async function __platform_POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const employerId = await getEmployerId(session);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const body = await request.json();
    const name = String(body?.name || '').trim();
    const jobTitle = normalizeTitle(body?.jobTitle || body?.job_title);
    const salary = Number(body?.salary ?? 0);
    const location = String(body?.location || '').trim() || null;
    const joiningDate = body?.joiningDate || body?.joining_date ? toDateOnlyString(String(body.joiningDate || body.joining_date).trim()) : '';
    const responseDeadline =
      body?.responseDeadline || body?.response_deadline
        ? toDateOnlyString(String(body.responseDeadline || body.response_deadline).trim())
        : '';
    const bodyTemplate = String(body?.bodyTemplate || body?.body_template || DEFAULT_OFFER_TEMPLATE_BODY).trim();

    if (!name) return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    const titleErr = validateTitlePayload(jobTitle, { label: 'Job title' });
    if (titleErr) return NextResponse.json({ error: titleErr }, { status: 400 });
    const offerErr = validateEmployerOfferPayload({
      salary,
      deadline: responseDeadline,
      joiningDate,
    });
    if (offerErr) return NextResponse.json({ error: offerErr }, { status: 400 });
    if (!bodyTemplate) return NextResponse.json({ error: 'Letter body is required' }, { status: 400 });
    const eventType = normalizeOfferEventType(body?.eventType ?? body?.event_type);

    const ins = await query(
      `INSERT INTO employer_offer_templates (
         employer_id, name, job_title, salary, location, joining_date, response_deadline, body_template, event_type
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, job_title, salary, location, joining_date, response_deadline, body_template, event_type, is_active, updated_at`,
      [
        employerId,
        name,
        jobTitle,
        Number.isFinite(salary) ? salary : 0,
        location,
        joiningDate || null,
        responseDeadline || null,
        bodyTemplate,
        eventType,
      ],
    );

    return NextResponse.json({ template: mapTemplateRow(ins.rows[0]) }, { status: 201 });
  } catch (error) {
    console.error('POST /api/employer/offer-templates', error);
    if (error?.code === '42P01') {
      return NextResponse.json(
        { error: 'Offer templates are not available until migration 089_employer_offer_templates.sql is applied.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Failed to create offer template' }, { status: 500 });
  }
}

const handlers = withApiHandlers({ GET: __platform_GET, POST: __platform_POST }, { context: 'api_employer_offer_templates' });
export const GET = handlers.GET;
export const POST = handlers.POST;
