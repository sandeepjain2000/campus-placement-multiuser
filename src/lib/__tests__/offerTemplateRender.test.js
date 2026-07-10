import {
  buildOfferEmailLetterSection,
  buildRenderedOfferLetter,
  renderOfferTemplateBody,
} from '@/lib/offerTemplateRender';

describe('offerTemplateRender', () => {
  it('replaces known placeholders and strips unknown ones', () => {
    const body = 'Hi {{student_name}}, role {{role}}, unknown {{ctc}}';
    const out = renderOfferTemplateBody(body, {
      student_name: 'Ada',
      role: 'SDE',
    });
    expect(out).toContain('Ada');
    expect(out).toContain('SDE');
    expect(out).not.toContain('{{');
  });

  it('builds letter from template fields without CTC placeholder', () => {
    const letter = buildRenderedOfferLetter({
      template: {
        body_template: 'Dear {{student_name}}, offer for {{role}} at {{company_name}}.',
        job_title: 'Analyst',
        location: 'Bengaluru',
        joining_date: '2026-07-01',
        response_deadline: '2026-06-15',
        salary: 1200000,
      },
      studentName: 'Ravi',
      companyName: 'Acme Corp',
      collegeName: 'Test College',
    });
    expect(letter).toContain('Ravi');
    expect(letter).toContain('Analyst');
    expect(letter).toContain('Acme Corp');
    expect(letter).not.toMatch(/1200000|CTC/i);
  });

  it('prepends fixed CTC line in email section', () => {
    const section = buildOfferEmailLetterSection({
      renderedLetter: 'Dear student…',
      salary: 900000,
    });
    expect(section).toMatch(/^CTC:/);
    expect(section).toContain('Dear student');
  });
});
