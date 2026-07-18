const {
  resolveOfferLetterFileUrl,
  buildOfferLetterFallbackText,
  resolveStudentOfferLetterPayload,
  resolveStudentOfferLetterErrorMessage,
  STUDENT_OFFER_LETTER_ERRORS,
} = require('../studentOfferLetter');

describe('studentOfferLetter', () => {
  it('accepts https and site-path letter URLs', () => {
    expect(resolveOfferLetterFileUrl('https://cdn.example.com/letter.pdf')).toContain('https://');
    expect(resolveOfferLetterFileUrl('/files/letter.pdf')).toBe('/files/letter.pdf');
  });

  it('rejects broken relative app paths that would 404', () => {
    expect(resolveOfferLetterFileUrl('C:\\Users\\letter.pdf')).toBeNull();
    expect(resolveOfferLetterFileUrl('file:///tmp/letter.pdf')).toBeNull();
    expect(resolveOfferLetterFileUrl('')).toBeNull();
  });

  it('builds fallback letter text from offer terms', () => {
    const text = buildOfferLetterFallbackText({
      company: 'TechCorp',
      role: 'SDE',
      salary: 100000,
      location: 'Pune',
      joiningDate: '2026-08-16',
    });
    expect(text).toContain('TechCorp');
    expect(text).toContain('SDE');
    expect(text).toContain('Pune');
  });

  it('prefers drafted letter body when present', () => {
    const payload = resolveStudentOfferLetterPayload({
      id: 'abc',
      company: 'Test QA Co',
      role: 'E2E Offer Test',
      salary: 200000,
      status: 'accepted',
      renderedLetterHtml: 'Dear Student,\nWelcome.',
      offerLetterUrl: null,
    });
    expect(payload.letterSource).toBe('draft');
    expect(payload.letterText).toContain('Welcome');
    expect(payload.hasLetter).toBe(true);
  });

  it('maps statuses to predefined error messages only', () => {
    expect(resolveStudentOfferLetterErrorMessage(401)).toBe(STUDENT_OFFER_LETTER_ERRORS.UNAUTHORIZED);
    expect(resolveStudentOfferLetterErrorMessage(404)).toBe(STUDENT_OFFER_LETTER_ERRORS.NOT_FOUND);
    expect(resolveStudentOfferLetterErrorMessage(500)).toBe(STUDENT_OFFER_LETTER_ERRORS.LOAD_FAILED);
    expect(resolveStudentOfferLetterErrorMessage(0)).toBe(STUDENT_OFFER_LETTER_ERRORS.NETWORK);
    expect(resolveStudentOfferLetterErrorMessage(503, 'NOT_FOUND')).toBe(STUDENT_OFFER_LETTER_ERRORS.NOT_FOUND);
  });

  it('flags invalid attached file URLs without exposing the path', () => {
    const payload = resolveStudentOfferLetterPayload({
      id: 'abc',
      company: 'TechCorp',
      role: 'SDE',
      status: 'accepted',
      offerLetterUrl: 'C:\\Users\\secret\\letter.pdf',
    });
    expect(payload.fileUrl).toBeNull();
    expect(payload.fileUnavailable).toBe(true);
    expect(payload.letterSource).toBe('fallback');
  });
});
