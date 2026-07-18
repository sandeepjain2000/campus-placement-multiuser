import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  buildStudentsImportTemplateCsv,
  STUDENTS_IMPORT_TEMPLATE_FILENAME,
} from '@/lib/collegeStudentsCsv';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

/**
 * GET — sample students import CSV (same columns as Export CSV).
 * Auth: college_admin only (matches bulk-upload).
 */
async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let csvBody;
    try {
      csvBody = buildStudentsImportTemplateCsv();
    } catch (buildErr) {
      console.error('GET /api/college/students/import-template build failed', buildErr);
      return NextResponse.json(
        { error: 'Import template is temporarily unavailable. Please try again later.' },
        { status: 503 },
      );
    }

    if (!csvBody || !String(csvBody).trim()) {
      console.error('GET /api/college/students/import-template empty template body');
      return NextResponse.json(
        { error: 'Import template is temporarily unavailable. Please try again later.' },
        { status: 503 },
      );
    }

    const csv = `\uFEFF${csvBody}`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${STUDENTS_IMPORT_TEMPLATE_FILENAME}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('GET /api/college/students/import-template', e);
    return NextResponse.json(
      { error: 'Could not download the import template. Please try again.' },
      { status: 500 },
    );
  }
}

const __platformApiHandlers = withApiHandlers(
  {
    GET: __platform_GET,
  },
  { context: 'api_college_students_import_template' },
);
export const GET = __platformApiHandlers.GET;
