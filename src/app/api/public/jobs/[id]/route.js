import { NextResponse } from 'next/server';
import { loadPublicJobPosting } from '@/lib/publicJobPosting';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';

async function __platform_GET(_request, { params }) {
  try {
    const jobId = params?.id;
    const job = await loadPublicJobPosting(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found or not publicly available' }, { status: 404 });
    }
    return NextResponse.json({ job });
  } catch (e) {
    console.error('GET /api/public/jobs/[id]', e);
    return NextResponse.json({ error: 'Failed to load job' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_public_jobs_id' });
export const GET = __platformApiHandlers.GET;
