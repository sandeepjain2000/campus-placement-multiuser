import { NextResponse } from 'next/server';
import {
  ASSESSMENT_UPLOAD_TEMPLATE_FILENAME,
  buildAssessmentUploadStarterCsv,
  defaultHiringResultCells,
} from '@/lib/assessmentUploadStarterCsv';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

/** Sample structure — prefer /api/employer/assessments/export for real data. */
async function __platform_GET() {
  const sample = [
    {
      student_system_id: 'CAMPUS-ROLL-001',
      college_roll_no: 'ROLL-001',
      placement_drive_id: '',
      job_id: '',
      tenant_id: '',
      college_id: '',
      employer_id: '',
      candidate_name: 'Example Student',
      ...defaultHiringResultCells(null),
    },
  ];
  const csv = `\uFEFF${buildAssessmentUploadStarterCsv(sample)}`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${ASSESSMENT_UPLOAD_TEMPLATE_FILENAME}"`,
    },
  });
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_employer_assessments_template' });
export const GET = __platformApiHandlers.GET;
