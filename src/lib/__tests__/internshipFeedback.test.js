const {
  normalizeInternshipFeedbackRating,
  validateInternshipFeedbackText,
  isEligibleInternshipApplicationStatus,
  mapInternshipFeedbackRow,
} = require('@/lib/internshipFeedback');

describe('internshipFeedback', () => {
  it('normalizes rating 1–5 or null', () => {
    expect(normalizeInternshipFeedbackRating(4)).toBe(4);
    expect(normalizeInternshipFeedbackRating('3')).toBe(3);
    expect(normalizeInternshipFeedbackRating(3.7)).toBe(3);
    expect(normalizeInternshipFeedbackRating(0)).toBeNull();
    expect(normalizeInternshipFeedbackRating(6)).toBeNull();
    expect(normalizeInternshipFeedbackRating('')).toBeNull();
    expect(normalizeInternshipFeedbackRating(null)).toBeNull();
  });

  it('validates feedback text length', () => {
    expect(validateInternshipFeedbackText('Too short')).toMatch(/10 characters/);
    expect(validateInternshipFeedbackText('This is valid feedback.')).toBeNull();
    expect(validateInternshipFeedbackText('x'.repeat(4001))).toMatch(/4000/);
  });

  it('checks eligible application statuses', () => {
    expect(isEligibleInternshipApplicationStatus('selected')).toBe(true);
    expect(isEligibleInternshipApplicationStatus('in_progress')).toBe(true);
    expect(isEligibleInternshipApplicationStatus('applied')).toBe(false);
    expect(isEligibleInternshipApplicationStatus('SELECTED')).toBe(true);
  });

  it('maps database row to API shape', () => {
    const mapped = mapInternshipFeedbackRow({
      id: 'fb-1',
      program_application_id: 'pa-1',
      author_role: 'student',
      rating: 5,
      feedback_text: 'Great experience',
      created_at: '2026-06-01T00:00:00.000Z',
      updated_at: '2026-06-02T00:00:00.000Z',
      student_name: 'Alex',
      roll_number: 'R001',
      branch: 'CSE',
      company_name: 'TechCorp',
      opening_title: 'SDE Intern',
      application_status: 'in_progress',
    });
    expect(mapped).toMatchObject({
      id: 'fb-1',
      programApplicationId: 'pa-1',
      authorRole: 'student',
      rating: 5,
      feedbackText: 'Great experience',
      studentName: 'Alex',
      rollNumber: 'R001',
      branch: 'CSE',
      companyName: 'TechCorp',
      openingTitle: 'SDE Intern',
      applicationStatus: 'in_progress',
    });
  });
});
