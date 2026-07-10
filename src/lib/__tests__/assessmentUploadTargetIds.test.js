const { resolveAssessmentTargetIds } = require('@/lib/assessmentUploadProcessCore');
const {
  inferAssessmentUploadTargetFromCsv,
  resolveAssessmentUploadTarget,
} = require('@/lib/assessmentUploadInferTarget');

const JOB_ID = '123132a1-dced-47b7-927e-f5ff1a8fdd3d';
const DRIVE_ID = 'e1000000-0000-0000-0000-000000000001';

describe('resolveAssessmentTargetIds', () => {
  it('treats matching placement_drive_id and job_id as a job posting export', () => {
    expect(resolveAssessmentTargetIds({ driveId: JOB_ID, jobId: JOB_ID })).toEqual({
      driveId: '',
      jobId: JOB_ID,
      error: null,
    });
  });

  it('keeps drive-only rows on the drive path', () => {
    expect(resolveAssessmentTargetIds({ driveId: DRIVE_ID, jobId: '' })).toEqual({
      driveId: DRIVE_ID,
      jobId: '',
      error: null,
    });
  });

  it('rejects conflicting ids', () => {
    const result = resolveAssessmentTargetIds({ driveId: DRIVE_ID, jobId: JOB_ID });
    expect(result.error).toMatch(/differ/i);
  });
});

describe('inferAssessmentUploadTargetFromCsv', () => {
  const headerIdx = { placement_drive_id: 0, job_id: 1 };

  it('infers jobId when both columns repeat the same posting UUID', () => {
    const parsed = {
      rows: [
        [JOB_ID, JOB_ID],
        [JOB_ID, JOB_ID],
      ],
    };
    expect(inferAssessmentUploadTargetFromCsv(parsed, headerIdx)).toEqual({
      driveId: '',
      jobId: JOB_ID,
    });
  });
});

describe('resolveAssessmentUploadTarget', () => {
  it('accepts duplicate form ids for internship uploads', () => {
    expect(
      resolveAssessmentUploadTarget({
        kind: 'internship',
        formDriveId: JOB_ID,
        formJobId: JOB_ID,
        inferred: { driveId: '', jobId: '' },
      }),
    ).toEqual({ driveId: '', jobId: JOB_ID });
  });
});
