const {
  ASSESS_UPLOAD_DB_ERROR,
  ASSESS_IMPORT_REVIEW_SCHEMA_HINT,
  formatAssessImportApiError,
  isMissingImportReviewSchema,
} = require('../assessmentUploadDbError');

describe('assessmentUploadDbError', () => {
  it('maps missing import review table to migration hint', () => {
    const err = new Error('relation "employer_assessment_import_sessions" does not exist');
    err.code = '42P01';
    expect(isMissingImportReviewSchema(err)).toBe(true);
    expect(formatAssessImportApiError(err)).toEqual({
      status: 503,
      message: ASSESS_IMPORT_REVIEW_SCHEMA_HINT,
    });
  });

  it('does not treat FK violations as missing migration', () => {
    const err = new Error(
      'insert or update on table "employer_assessment_import_sessions" violates foreign key constraint "employer_assessment_import_sessions_drive_id_fkey"',
    );
    err.code = '23503';
    expect(isMissingImportReviewSchema(err)).toBe(false);
    expect(formatAssessImportApiError(err)).toEqual({
      status: 400,
      message:
        'Selected placement drive is invalid or was removed. Refresh the page and choose the drive again.',
    });
  });

  it('maps missing FROM-clause to ASSESS-DB-01', () => {
    const err = new Error('missing FROM-clause entry for table "eau"');
    err.code = '42P01';
    expect(formatAssessImportApiError(err)).toEqual({
      status: 500,
      message: ASSESS_UPLOAD_DB_ERROR,
    });
  });
});
