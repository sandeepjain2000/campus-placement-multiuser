const { evaluateStudentOverviewCompletion } = require('@/lib/studentProfileCompletion');

describe('evaluateStudentOverviewCompletion', () => {
  const collegeFilledProfile = {
    roll_number: 'CS2021001',
    user_phone: '+919876543210',
    branch: 'CSE',
    department: 'Computer Science',
    cgpa: 8.5,
    tenth_percentage: 92,
    twelfth_percentage: 88,
    resume_url: null,
  };

  it('returns 50% when education and personal info are done but skills and resume are missing', () => {
    const { profileCompletion, items } = evaluateStudentOverviewCompletion(collegeFilledProfile, {
      skillsCount: 0,
    });
    expect(profileCompletion).toBe(50);
    expect(items.find((i) => i.id === 'skills')?.complete).toBe(false);
    expect(items.find((i) => i.id === 'resume')?.complete).toBe(false);
    expect(items.find((i) => i.id === 'education')?.complete).toBe(true);
    expect(items.find((i) => i.id === 'personalInfo')?.complete).toBe(true);
  });

  it('returns 100% when all four buckets are satisfied', () => {
    const { profileCompletion } = evaluateStudentOverviewCompletion(
      { ...collegeFilledProfile, resume_url: '/uploads/resume.pdf' },
      { skillsCount: 3 },
    );
    expect(profileCompletion).toBe(100);
  });

  it('does not count a fake semester field toward completion', () => {
    const { profileCompletion } = evaluateStudentOverviewCompletion(
      { current_semester: 8 },
      { skillsCount: 0 },
    );
    expect(profileCompletion).toBe(0);
  });
});
