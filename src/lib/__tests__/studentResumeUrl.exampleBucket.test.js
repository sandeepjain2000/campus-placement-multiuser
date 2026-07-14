const {
  isPlaceholderResumeUrl,
  isAuthoritativeResumeUrl,
} = require('@/lib/studentResumeUrl');

describe('studentResumeUrl placeholder detection', () => {
  it('treats example-bucket.local as a non-authoritative seed URL', () => {
    const url = 'https://example-bucket.local/docs/arjun-resume.pdf';
    expect(isPlaceholderResumeUrl(url)).toBe(true);
    expect(isAuthoritativeResumeUrl(url)).toBe(false);
  });

  it('still accepts real https resume URLs', () => {
    const url = 'https://campusplacement-docs-prod-ap-south-1.s3.ap-south-1.amazonaws.com/students/x/resume.pdf';
    expect(isPlaceholderResumeUrl(url)).toBe(false);
    expect(isAuthoritativeResumeUrl(url)).toBe(true);
  });
});
