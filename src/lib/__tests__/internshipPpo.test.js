const {
  isEligibleInternshipPpoApplicationStatus,
  isInternshipStartDateReached,
  validateInternshipPpoEmployerNotes,
  canEmployerRevokePpo,
  canEmployerGeneratePpoJobOffer,
  canEmployerConfirmPpo,
  mapInternshipPpoRow,
  ppoStatusLabel,
  employerPpoStatusLabel,
  INTERNSHIP_PPO_ACCEPTED,
  INTERNSHIP_PPO_STUDENT_PENDING,
} = require('@/lib/internshipPpo');

describe('internshipPpo', () => {
  it('limits PPO to selected or in_progress interns', () => {
    expect(isEligibleInternshipPpoApplicationStatus('selected')).toBe(true);
    expect(isEligibleInternshipPpoApplicationStatus('in_progress')).toBe(true);
    expect(isEligibleInternshipPpoApplicationStatus('applied')).toBe(false);
  });

  it('requires internship start date on or before today', () => {
    expect(isInternshipStartDateReached('2099-01-01', new Date('2026-06-02'))).toBe(false);
    expect(isInternshipStartDateReached('2026-06-02', new Date('2026-06-02'))).toBe(true);
    expect(isInternshipStartDateReached('2026-06-01', new Date('2026-06-02'))).toBe(true);
    expect(isInternshipStartDateReached(null)).toBe(false);
  });

  it('validates employer notes length', () => {
    expect(validateInternshipPpoEmployerNotes('ok')).toBeNull();
    expect(validateInternshipPpoEmployerNotes('x'.repeat(2001))).toMatch(/2000/);
  });

  it('guards employer actions by PPO state', () => {
    expect(canEmployerConfirmPpo(null)).toBe(true);
    expect(canEmployerConfirmPpo({ status: 'declined' })).toBe(true);
    expect(canEmployerConfirmPpo({ status: INTERNSHIP_PPO_STUDENT_PENDING })).toBe(false);

    expect(canEmployerRevokePpo({ status: INTERNSHIP_PPO_STUDENT_PENDING })).toBe(true);
    expect(canEmployerRevokePpo({ status: INTERNSHIP_PPO_ACCEPTED, offerId: 'o1' })).toBe(false);

    expect(canEmployerGeneratePpoJobOffer({ status: INTERNSHIP_PPO_ACCEPTED })).toBe(true);
    expect(canEmployerGeneratePpoJobOffer({ status: INTERNSHIP_PPO_STUDENT_PENDING })).toBe(false);
  });

  it('maps database row and status labels', () => {
    expect(
      mapInternshipPpoRow({
        id: 'p1',
        program_application_id: 'pa1',
        status: INTERNSHIP_PPO_STUDENT_PENDING,
        employer_notes: 'Great intern',
        confirmed_at: '2026-06-02T00:00:00.000Z',
        offer_id: null,
        updated_at: '2026-06-02T00:00:00.000Z',
      }),
    ).toMatchObject({
      id: 'p1',
      employerNotes: 'Great intern',
    });
    expect(ppoStatusLabel(INTERNSHIP_PPO_STUDENT_PENDING)).toMatch(/Awaiting your response/);
    expect(employerPpoStatusLabel(INTERNSHIP_PPO_ACCEPTED)).toMatch(/job offer/);
    expect(mapInternshipPpoRow(null)).toBeNull();
  });
});
