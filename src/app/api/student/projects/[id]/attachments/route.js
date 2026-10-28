import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ── GET /api/student/projects/[id]/attachments ───────────────────────────────
// Returns public attachment metadata for a visible project.
// Any authenticated student can read this; actual file access goes through /api/s3/view.
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: jobId } = await params;
  if (!jobId) return NextResponse.json({ error: 'Missing project id' }, { status: 400 });

  // Confirm the posting exists and is published (don't leak attachments of draft projects)
  const jpRow = await query(
    `SELECT id FROM job_postings
     WHERE id = $1 AND status = 'published' AND COALESCE(is_deleted, false) = false
     LIMIT 1`,
    [jobId],
  );
  if (!jpRow.rows.length) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const result = await query(
    `SELECT id, file_url, original_filename, content_type, file_size_bytes, created_at
     FROM project_attachments
     WHERE job_posting_id = $1
     ORDER BY created_at ASC`,
    [jobId],
  ).catch((err) => {
    if (err?.code === '42P01') return { rows: [] };
    throw err;
  });

  return NextResponse.json({ attachments: result.rows });
}
