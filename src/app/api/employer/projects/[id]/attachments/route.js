import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { uploadProjectAttachmentBuffer, isS3Configured } from '@/lib/s3';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// ── GET /api/employer/projects/[id]/attachments ──────────────────────────────
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'employer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: jobId } = await params;
  if (!jobId) return NextResponse.json({ error: 'Missing project id' }, { status: 400 });

  const epRow = await query(
    'SELECT id FROM employer_profiles WHERE user_id = $1 LIMIT 1',
    [session.user.id],
  );
  const employerId = epRow.rows[0]?.id;
  if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 403 });

  const owns = await query(
    'SELECT id FROM job_postings WHERE id = $1 AND employer_id = $2 LIMIT 1',
    [jobId, employerId],
  );
  if (!owns.rows.length) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const result = await query(
    `SELECT id, file_url, s3_key, original_filename, content_type, file_size_bytes, created_at
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

// ── POST /api/employer/projects/[id]/attachments ─────────────────────────────
export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'employer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: jobId } = await params;
  if (!jobId) return NextResponse.json({ error: 'Missing project id' }, { status: 400 });

  if (!isS3Configured()) {
    return NextResponse.json({ error: 'File storage is not configured on the server.' }, { status: 503 });
  }

  const epRow = await query(
    'SELECT id FROM employer_profiles WHERE user_id = $1 LIMIT 1',
    [session.user.id],
  );
  const employerId = epRow.rows[0]?.id;
  if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 403 });

  const owns = await query(
    'SELECT id FROM job_postings WHERE id = $1 AND employer_id = $2 LIMIT 1',
    [jobId, employerId],
  );
  if (!owns.rows.length) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const countRow = await query(
    'SELECT COUNT(*) AS c FROM project_attachments WHERE job_posting_id = $1',
    [jobId],
  ).catch(() => ({ rows: [{ c: 0 }] }));
  if (Number(countRow.rows[0]?.c) >= 5) {
    return NextResponse.json({ error: 'Maximum 5 attachments per project.' }, { status: 400 });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }

  const mime = file.type || 'application/octet-stream';
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json(
      { error: 'Only PDF and image files (JPEG, PNG, GIF, WebP) are allowed.' },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'File exceeds 10 MB limit.' }, { status: 400 });
  }

  try {
    const { fileUrl, key } = await uploadProjectAttachmentBuffer({
      employerId,
      jobPostingId: jobId,
      fileName: file.name || 'attachment',
      contentType: mime,
      body: buffer,
    });

    const ins = await query(
      `INSERT INTO project_attachments
         (job_posting_id, employer_id, file_url, s3_key, original_filename, content_type, file_size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, file_url, s3_key, original_filename, content_type, file_size_bytes, created_at`,
      [jobId, employerId, fileUrl, key, file.name || 'attachment', mime, buffer.byteLength],
    ).catch((err) => {
      if (err?.code === '42P01') throw new Error('Attachment storage table is not set up on this server yet.');
      throw err;
    });

    return NextResponse.json({ attachment: ins.rows[0] }, { status: 201 });
  } catch (err) {
    console.error('[project-attachments] upload error:', err);
    return NextResponse.json({ error: err.message || 'Upload failed. Please try again.' }, { status: 500 });
  }
}

// ── DELETE /api/employer/projects/[id]/attachments?attachmentId=… ────────────
export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'employer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: jobId } = await params;
  const { searchParams } = new URL(request.url);
  const attachmentId = searchParams.get('attachmentId');
  if (!jobId || !attachmentId) {
    return NextResponse.json({ error: 'Missing id or attachmentId' }, { status: 400 });
  }

  const epRow = await query(
    'SELECT id FROM employer_profiles WHERE user_id = $1 LIMIT 1',
    [session.user.id],
  );
  const employerId = epRow.rows[0]?.id;
  if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 403 });

  const del = await query(
    `DELETE FROM project_attachments
     WHERE id = $1 AND job_posting_id = $2 AND employer_id = $3
     RETURNING id`,
    [attachmentId, jobId, employerId],
  );

  if (!del.rows.length) {
    return NextResponse.json({ error: 'Attachment not found or not yours.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
