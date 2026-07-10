import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { parseCsv } from '@/lib/csvExport';
import { query, transaction } from '@/lib/db';
import { isS3Configured, putObjectText } from '@/lib/s3';
import { isAssessmentRoundKind } from '@/lib/assessmentRoundMap';
import { createImportStagingSession } from '@/lib/assessmentImportStaging';
import { commitValidatedAssessmentRows } from '@/lib/assessmentUploadCommit';
import { sanitizeUuidInput } from '@/lib/assessmentUploadProcessCore';
import {
  inferAssessmentUploadTargetFromCsv,
  resolveAssessmentUploadTarget,
} from '@/lib/assessmentUploadInferTarget';
import { formatAssessmentUploadErrors, validateAssessmentCsvUpload } from '@/lib/assessmentUploadValidate';
import { formatAssessImportApiError } from '@/lib/assessmentUploadDbError';
import { isUuid } from '@/lib/tenantContext';
import { respondPlatformError, writePlatformErrorLog } from '@/lib/platformErrorLog';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

async function getEmployerId(session) {
  const userId = session?.user?.id;
  if (!userId) return null;
  const res = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  return res.rows[0]?.id || null;
}

function buildReviewResponse(result) {
  return NextResponse.json(
    {
      ok: false,
      needsReview: true,
      sessionId: result.sessionId,
      totalRows: result.totalRows,
      invalidCount: result.invalidCount,
      errors: result.errors,
    },
    { status: 422 },
  );
}

async function __platform_POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const employerId = await getEmployerId(session);
    if (!employerId) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });
    }

    const form = await request.formData();
    const file = form.get('file');
    const kind = String(form.get('kind') || 'jobs').trim();

    if (!isAssessmentRoundKind(kind)) {
      return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
    }

    if (!file || typeof file.text !== 'function') {
      return NextResponse.json({ error: 'CSV file is required' }, { status: 400 });
    }

    const formDriveId = sanitizeUuidInput(form.get('driveId'));
    const formJobId = sanitizeUuidInput(form.get('jobId'));
    const defaultTenantId = sanitizeUuidInput(form.get('tenantId'));

    if (!defaultTenantId || !isUuid(defaultTenantId)) {
      return NextResponse.json({ error: 'Select a campus before uploading.' }, { status: 400 });
    }

    const csvText = await file.text();
    const parsed = parseCsv(csvText);
    if (!parsed.headers.length) {
      return NextResponse.json({ error: 'CSV is empty or invalid' }, { status: 400 });
    }

    const headers = parsed.headers.map((h) => String(h).trim().toLowerCase());
    // Accept both `student_system_id` (new) and `system_id` (legacy) column names
    const hasStudentSystemId = headers.includes('student_system_id');
    const hasSystemId = headers.includes('system_id');
    if (!headers.includes('college_roll_no') && !hasStudentSystemId && !hasSystemId) {
      return NextResponse.json(
        { error: 'CSV must include column student_system_id (or legacy system_id) and/or college_roll_no' },
        { status: 400 },
      );
    }

    const hasCollegeId = headers.includes('college_id');
    const headerIdx = {
      // Prefer student_system_id; fall back to system_id for legacy CSVs
      system_id: hasStudentSystemId ? headers.indexOf('student_system_id') : headers.indexOf('system_id'),
      college_roll_no: headers.indexOf('college_roll_no'),
      placement_drive_id: headers.indexOf('placement_drive_id'),
      job_id: headers.indexOf('job_id'),
      tenant_id: hasCollegeId ? headers.indexOf('college_id') : headers.indexOf('tenant_id'),
      employer_id: headers.indexOf('employer_id'),
      candidate_name: headers.indexOf('candidate_name'),
      remarks: headers.indexOf('remarks'),
      hiring_result: headers.indexOf('hiring_result'),
    };

    const inferred = inferAssessmentUploadTargetFromCsv(parsed, headerIdx);
    if (inferred.error) {
      return NextResponse.json({ error: inferred.error }, { status: 400 });
    }

    const resolved = resolveAssessmentUploadTarget({
      kind,
      formDriveId,
      formJobId,
      inferred,
    });
    if (resolved.error) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }

    const defaultDriveId = resolved.driveId;
    const defaultJobId = resolved.jobId;

    let s3Key = null;
    if (isS3Configured()) {
      try {
        s3Key = `employer-assessments/${employerId}/${Date.now()}-${randomUUID()}.csv`;
        await putObjectText({
          key: s3Key,
          body: csvText,
          contentType: 'text/csv; charset=utf-8',
        });
      } catch (s3Err) {
        console.warn('S3 upload skipped for assessment CSV:', s3Err?.message || s3Err);
        s3Key = null;
      }
    }

    const fileName = String(file.name || 'results.csv');

    const result = await transaction(async (client) => {
      const validation = await validateAssessmentCsvUpload(client, {
        employerId,
        parsed,
        headerIdx,
        defaultDriveId,
        defaultJobId,
        defaultTenantId,
        opportunityKind: kind,
      });

      if (validation.totalRows === 0) {
        return { ok: false, errors: ['CSV has no data rows'], totalRows: 0 };
      }

      const stagingDefaults = {
        defaultTenantId,
        defaultDriveId: defaultDriveId || null,
        defaultJobId: defaultJobId || null,
      };

      if (!validation.canCommitDirectly) {
        const sessionId = await createImportStagingSession(client, {
          employerId,
          userId: session.user.id || null,
          opportunityKind: kind,
          fileName,
          s3Key,
          stagingRows: validation.stagingRows,
          ...stagingDefaults,
        });
        return {
          ok: false,
          needsReview: true,
          sessionId,
          totalRows: validation.totalRows,
          invalidCount: validation.invalidCount,
          errors: formatAssessmentUploadErrors(validation.stagingRows),
        };
      }

      const commitResult = await commitValidatedAssessmentRows(client, {
        employerId,
        userId: session.user.id || null,
        opportunityKind: kind,
        fileName,
        s3Key,
        stagingRows: validation.stagingRows,
      });

      if (!commitResult.ok) {
        const sessionId = await createImportStagingSession(client, {
          employerId,
          userId: session.user.id || null,
          opportunityKind: kind,
          fileName,
          s3Key,
          stagingRows: validation.stagingRows.map((row) => ({
            ...row,
            validation_errors: row.validation_errors?.length
              ? row.validation_errors
              : commitResult.errors.filter((e) => e.includes(`Row ${row.rowNum}:`)),
            is_valid: false,
          })),
          ...stagingDefaults,
        });
        return {
          ok: false,
          needsReview: true,
          sessionId,
          totalRows: validation.totalRows,
          invalidCount: validation.totalRows,
          errors: commitResult.errors,
        };
      }

      return commitResult;
    });

    if (result.needsReview) {
      // Log data-level validation errors to Super Admin so they can be investigated
      writePlatformErrorLog({
        context: 'api_employer_assessments_upload_post',
        error: new Error(`CSV upload needs review: ${result.invalidCount} invalid row(s) out of ${result.totalRows}`),
        statusCode: 422,
        severity: 'warning',
        employerId,
        details: {
          fileName,
          totalRows: result.totalRows,
          invalidCount: result.invalidCount,
          errors: (result.errors || []).slice(0, 50),
          source: 'csv_data_validation',
        },
      }).catch(() => {});
      return buildReviewResponse(result);
    }

    if (!result.ok) {
      const firstError = result.errors?.[0] || '';
      // Log all failed-upload errors (empty CSV, commit failures) to Super Admin
      writePlatformErrorLog({
        context: 'api_employer_assessments_upload_post',
        error: new Error(firstError || 'Upload failed'),
        statusCode: 400,
        severity: 'warning',
        employerId,
        details: {
          fileName,
          errors: (result.errors || []).slice(0, 50),
          source: 'csv_upload_result',
        },
      }).catch(() => {});
      return NextResponse.json(
        {
          error: firstError || 'Upload failed — check your CSV and campus context.',
          errors: result.errors || [],
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        uploadId: result.uploadId,
        uploadIds: result.uploadIds,
        totalRows: result.totalRows,
        acceptedRows: result.acceptedRows,
        rejectedRows: result.rejectedRows,
        errors: result.errors,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/employer/assessments/upload failed:', error);
    // Log ALL errors including data issues to Super Admin platform_error_logs
    const { status, message } = formatAssessImportApiError(error, { upload: true });
    // Fire-and-forget log so response is not blocked
    writePlatformErrorLog({
      context: 'api_employer_assessments_upload_post',
      error,
      statusCode: status,
      userMessage: message,
      severity: status >= 500 ? 'error' : 'warning',
    }).catch(() => {});
    if (error?.statusCode === 409) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error?.statusCode === 400) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_employer_assessments_upload' });
export const POST = __platformApiHandlers.POST;
