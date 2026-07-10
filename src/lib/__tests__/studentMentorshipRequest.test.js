import {
  canStudentEditRequest,
  canStudentSubmitRequest,
  mentorshipStatusLabel,
  validateMentorshipRequestPayload,
} from '../studentMentorshipRequest';

describe('validateMentorshipRequestPayload', () => {
  it('requires title and summary for full payload', () => {
    expect(validateMentorshipRequestPayload({}).error).toBe('Title is required');
    expect(validateMentorshipRequestPayload({ title: 'Help' }).error).toBe('Summary is required');
    const ok = validateMentorshipRequestPayload({
      title: 'System design help',
      summary: 'Need mock interviews',
    });
    expect(ok.error).toBeUndefined();
    expect(ok.data.title).toBe('System design help');
    expect(ok.data.summary).toBe('Need mock interviews');
  });

  it('allows partial updates', () => {
    const ok = validateMentorshipRequestPayload({ summary: 'Updated text' }, { partial: true });
    expect(ok.error).toBeUndefined();
    expect(ok.data.summary).toBe('Updated text');
    expect(ok.data.title).toBeUndefined();
  });
});

describe('student mentorship status helpers', () => {
  it('gates edit and submit', () => {
    expect(canStudentEditRequest('draft')).toBe(true);
    expect(canStudentEditRequest('rejected')).toBe(true);
    expect(canStudentEditRequest('submitted')).toBe(false);
    expect(canStudentSubmitRequest('draft')).toBe(true);
    expect(canStudentSubmitRequest('approved')).toBe(false);
  });

  it('labels statuses for UI', () => {
    expect(mentorshipStatusLabel('submitted')).toBe('Pending college review');
    expect(mentorshipStatusLabel('approved')).toBe('Open for mentors');
  });
});
