const { jobTypesClauseForAssessmentKind } = require('@/lib/employerAssessmentTargetKinds');

describe('jobTypesClauseForAssessmentKind', () => {
  it('scopes internship tab to internship postings only', () => {
    const { clause, params } = jobTypesClauseForAssessmentKind('internship');
    expect(clause).toContain('job_type = $3');
    expect(params).toEqual(['internship']);
  });

  it('scopes projects tab to short_project and hackathon', () => {
    const { clause, params } = jobTypesClauseForAssessmentKind('projects');
    expect(clause).toContain('ANY($3::text[])');
    expect(params[0]).toEqual(expect.arrayContaining(['short_project', 'hackathon']));
  });

  it('scopes jobs tab away from internship and program types', () => {
    const { clause, params } = jobTypesClauseForAssessmentKind('jobs');
    expect(clause).toContain('<> ALL($3::text[])');
    expect(params[0]).toEqual(expect.arrayContaining(['internship', 'short_project', 'hackathon']));
  });

  it('returns no job filter for drive tab', () => {
    const { clause, params } = jobTypesClauseForAssessmentKind('drive');
    expect(clause).toBe('');
    expect(params).toEqual([]);
  });

  it('supports custom bind index for multi-placeholder queries', () => {
    const { clause, params } = jobTypesClauseForAssessmentKind('internship', { paramIndex: 4 });
    expect(clause).toContain('job_type = $4');
    expect(params).toEqual(['internship']);
  });

  it('scopes alumni jobs tab to alumni employment types', () => {
    const { clause, params } = jobTypesClauseForAssessmentKind('jobs', { alumniOnly: true, paramIndex: 4 });
    expect(clause).toContain('ANY($4::text[])');
    expect(params[0]).toEqual(expect.arrayContaining(['full_time', 'contract']));
  });
});
