import {
  buildCvDownloadFileName,
  CV_LABEL_MAX_LENGTH,
  extractFileExtension,
  mapStudentCvRow,
  sanitizeCvDownloadBaseName,
  validateCvLabel,
} from '../studentCvShared';

describe('validateCvLabel', () => {
  it('requires a non-empty label up to 20 chars', () => {
    expect(validateCvLabel('').error).toMatch(/required/i);
    expect(validateCvLabel('a'.repeat(21)).error).toMatch(/20/);
    expect(validateCvLabel('  Tech CV  ').label).toBe('Tech CV');
  });

  it('rejects unsafe characters', () => {
    expect(validateCvLabel('bad/name').error).toBeTruthy();
  });
});

describe('mapStudentCvRow', () => {
  it('marks hasFile false when SQL flag or URL is empty', () => {
    expect(mapStudentCvRow({ id: '1', label: 'A', has_file: false }).hasFile).toBe(false);
    expect(mapStudentCvRow({ id: '2', label: 'B', file_url: '   ' }).hasFile).toBe(false);
    expect(mapStudentCvRow({ id: '3', label: 'C', has_file: true }).hasFile).toBe(true);
  });
});

describe('buildCvDownloadFileName', () => {
  it('uses label and original extension for employer download', () => {
    expect(buildCvDownloadFileName('Product Resume', '.pdf')).toBe('Product Resume.pdf');
    expect(buildCvDownloadFileName('Sanjay (1)', 'docx')).toBe('Sanjay (1).docx');
  });

  it('sanitizes illegal filename characters', () => {
    expect(sanitizeCvDownloadBaseName('A:B*C')).toBe('ABC');
  });

  it('extracts extension from messy upload names', () => {
    expect(extractFileExtension('Sandeep (1) (1).docx.docx')).toBe('.docx');
  });
});

describe('CV_LABEL_MAX_LENGTH', () => {
  it('is 20', () => {
    expect(CV_LABEL_MAX_LENGTH).toBe(20);
  });
});
