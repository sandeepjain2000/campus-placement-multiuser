const {
  STUDENT_CV_LOAD,
  classifyStudentCvListResponse,
  studentCvRowMissingFile,
} = require('@/lib/studentCvLoadClient');

describe('studentCvLoadClient', () => {
  it('treats empty successful list as EMPTY, not a request failure', () => {
    const result = classifyStudentCvListResponse({ ok: true, status: 200 }, { items: [] });
    expect(result.status).toBe(STUDENT_CV_LOAD.EMPTY);
    expect(result.items).toEqual([]);
  });

  it('treats HTTP errors as REQUEST_FAILED', () => {
    const result = classifyStudentCvListResponse(
      { ok: false, status: 500 },
      { error: 'Failed to load CVs' },
    );
    expect(result.status).toBe(STUDENT_CV_LOAD.REQUEST_FAILED);
    expect(result.message).toMatch(/could not load|Failed to load/i);
  });

  it('treats soft unavailable as UNAVAILABLE', () => {
    const result = classifyStudentCvListResponse(
      { ok: true, status: 200 },
      { items: [], unavailable: true, error: 'CV management is not available until setup is finished.' },
    );
    expect(result.status).toBe(STUDENT_CV_LOAD.UNAVAILABLE);
  });

  it('detects missing file rows', () => {
    expect(studentCvRowMissingFile({ hasFile: false })).toBe(true);
    expect(studentCvRowMissingFile({ hasFile: true })).toBe(false);
  });
});
