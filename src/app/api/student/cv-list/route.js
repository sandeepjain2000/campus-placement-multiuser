import { withApiHandlers } from '@/lib/platformErrorRoute';
import {
  getStudentCvsListResponse,
  studentCvListSoftEmptyResponse,
} from '@/lib/studentCvsListGet';
import { PLATFORM_ERROR_CONTEXT } from '@/lib/platformErrorContext';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_GET(request) {
  try {
    return await getStudentCvsListResponse(request);
  } catch (e) {
    return studentCvListSoftEmptyResponse(request, e);
  }
}

const __platformApiHandlers = withApiHandlers(
  { GET: __platform_GET },
  { context: PLATFORM_ERROR_CONTEXT.STUDENT_CV_LIST },
);
export const GET = __platformApiHandlers.GET;
