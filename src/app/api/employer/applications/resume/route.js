import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  canEmployerAccessStudent,
  getEmployerProfileId,
} from '@/lib/employerApplicationAccess';
import { resolveEmployerApplicationResume } from '@/lib/employerApplicationResume';
import { isS3Configured } from '@/lib/s3';
import { isCvDownloadRequest, presignStudentCvFile, presignLegacyResumeFile } from '@/lib/studentCvPresign';
import { withApiHandlers } from '@/lib/platformErrorRoute';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isS3Url(url) {
  try {
    const host = new URL(String(url || '')).hostname.toLowerCase();
    return host.includes('.s3.') || host.includes('amazonaws.com');
  } catch {
    return false;
  }
}

async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    const params = new URL(request.url).searchParams;
    const studentId = String(params.get('studentId') || '').trim();
    const applicationId = String(params.get('applicationId') || '').trim() || null;
    const sourceKind = String(params.get('source') || '').trim() || null;

    if (!userId || !studentId) {
      return NextResponse.json({ error: 'Missing student id' }, { status: 400 });
    }

    const employerId = await getEmployerProfileId(userId);
    if (!employerId) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });
    }

    const allowed = await canEmployerAccessStudent(employerId, studentId);
    if (!allowed) {
      return NextResponse.json({ error: 'Resume not available for this employer' }, { status: 403 });
    }

    const resolved = await resolveEmployerApplicationResume({ studentId, applicationId, sourceKind });
    if (!resolved?.fileUrl) {
      return NextResponse.json({ error: 'No uploaded resume found for this student' }, { status: 404 });
    }

    const { fileUrl, downloadFileName, cvLabel, fileExtension } = resolved;
    const mode = isCvDownloadRequest(request) ? 'download' : 'view';

    if (isS3Url(fileUrl) && isS3Configured()) {
      try {
        const presigned = fileExtension
          ? await presignStudentCvFile({
              fileUrl,
              label: cvLabel,
              fileExtension,
              mode,
            })
          : await presignLegacyResumeFile({
              fileUrl,
              fileName: downloadFileName,
              mode,
            });
        return NextResponse.redirect(presigned.downloadUrl);
      } catch (presignErr) {
        console.error('employer resume presign failed', presignErr);
      }
    }

    return NextResponse.redirect(fileUrl);
  } catch (e) {
    console.error('GET /api/employer/applications/resume', e);
    return NextResponse.json({ error: 'Could not open resume' }, { status: 500 });
  }
}

const __platformApiHandlers = withApiHandlers(
  { GET: __platform_GET },
  { context: 'api_employer_applications_resume' },
);
export const GET = __platformApiHandlers.GET;
