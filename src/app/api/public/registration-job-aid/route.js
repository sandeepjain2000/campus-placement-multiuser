import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isRegistrationJobAidEnabled, sampleForCollegeSlug } from '@/lib/registrationJobAid';

async function __platform_GET() {
  if (!isRegistrationJobAidEnabled()) {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  try {
    const result = await query(
      `SELECT t.name, t.slug, s.surface_token AS enrollment_key
       FROM tenants t
       INNER JOIN shard_binding_pairs s ON s.ref_scope_id = t.id
       WHERE t.type = 'college' AND t.is_active = true
       ORDER BY t.name ASC
       LIMIT 50`
    );

    const colleges = (result.rows || []).map((row) => {
      const sample = sampleForCollegeSlug(row.slug);
      return {
        name: row.name,
        slug: row.slug,
        enrollmentKey: row.enrollment_key,
        sampleRoll: sample?.sampleRoll || null,
        sampleEmail: sample?.sampleEmail || null,
      };
    });

    return NextResponse.json({ colleges });
  } catch (error) {
    console.error('GET /api/public/registration-job-aid', error.message);
    return NextResponse.json({ error: 'Failed to load job aid' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_public_registration_job_aid' });
export const GET = __platformApiHandlers.GET;
