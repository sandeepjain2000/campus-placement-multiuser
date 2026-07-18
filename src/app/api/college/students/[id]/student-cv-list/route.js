import { withApiHandlers } from '@/lib/platformErrorRoute';
import {
  collegeCvListSoftEmptyResponse,
  getCollegeStudentCvListResponse,
} from '@/lib/collegeStudentCvListGet';
import { PLATFORM_ERROR_CONTEXT } from '@/lib/platformErrorContext';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_GET(request, { params }) {
  try {
    const resolved = await params;
    const id = resolved?.id;
    return await getCollegeStudentCvListResponse(request, id);
  } catch (e) {
    // Always soft-empty — never HTTP 500 (that produced empty api_response logs with no stack).
    return collegeCvListSoftEmptyResponse(request, e);
  }
}

const __platformApiHandlers = withApiHandlers(
  { GET: __platform_GET },
  { context: PLATFORM_ERROR_CONTEXT.COLLEGE_STUDENT_CV_LIST },
);
export const GET = __platformApiHandlers.GET;
