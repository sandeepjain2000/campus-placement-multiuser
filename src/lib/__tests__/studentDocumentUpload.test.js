const {
  validateStudentResumeFile,
  validateStudentDocumentFileForType,
  isResumeDocumentType,
} = require('@/lib/studentDocumentUpload');

describe('validateStudentResumeFile', () => {
  it('accepts PDF', () => {
    const result = validateStudentResumeFile({
      name: 'cv.pdf',
      type: 'application/pdf',
      size: 1024,
    });
    expect(result.ok).toBe(true);
    expect(result.contentType).toBe('application/pdf');
  });

  it('rejects PNG by extension', () => {
    const result = validateStudentResumeFile({
      name: 'resume.png',
      type: 'image/png',
      size: 1024,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/PNG/i);
  });

  it('metadata pass alone does not prove PNG bytes (magic check is separate)', () => {
    const meta = validateStudentResumeFile({
      name: 'resume.pdf',
      type: 'application/pdf',
      size: 1024,
    });
    expect(meta.ok).toBe(true);
  });

  it('rejects PNG by MIME when extension is missing', () => {
    const result = validateStudentResumeFile({
      name: 'resume',
      type: 'image/png',
      size: 1024,
    });
    expect(result.ok).toBe(false);
  });
});

describe('validateStudentDocumentFileForType', () => {
  it('routes resume type to resume rules', () => {
    expect(
      validateStudentDocumentFileForType(
        { name: 'x.png', type: 'image/png', size: 100 },
        'resume',
      ).ok,
    ).toBe(false);
  });

  it('allows PNG for non-resume document types', () => {
    expect(
      validateStudentDocumentFileForType(
        { name: 'id.png', type: 'image/png', size: 100 },
        'id_proof',
      ).ok,
    ).toBe(true);
  });
});

describe('isResumeDocumentType', () => {
  it('matches resume case-insensitively', () => {
    expect(isResumeDocumentType('Resume')).toBe(true);
    expect(isResumeDocumentType('certificate')).toBe(false);
  });
});
